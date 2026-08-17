import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createAppServer } from '../server/serve.mjs';
import { TranscriptionError, createTranscriber, validateAudio } from '../server/transcription.mjs';

async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const { port } = server.address();
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

test('audio validation accepts short browser formats and rejects unsafe input', () => {
  assert.deepEqual(validateAudio({ size: 1024, type: 'audio/webm' }), { ok: true });
  assert.deepEqual(validateAudio({ size: 10, type: 'text/plain' }), { ok: false, code: 'UNSUPPORTED_AUDIO' });
  assert.deepEqual(validateAudio({ size: 4 * 1024 * 1024 + 1, type: 'audio/webm' }), { ok: false, code: 'TOO_LARGE' });
  assert.deepEqual(validateAudio({ size: 0, type: 'audio/webm' }), { ok: false, code: 'NO_AUDIO' });
});

test('OpenAI adapter returns only transcript text through the authenticated boundary', async () => {
  const fetchImpl = async (url, options) => {
    if (url !== 'https://api.openai.com/v1/audio/transcriptions') return new Response('wrong url', { status: 404 });
    if (options.headers.Authorization !== 'Bearer secret-test-key') return new Response('unauthorized', { status: 401 });
    if (options.body.get('model') !== 'gpt-transcribe') return new Response('wrong model', { status: 400 });
    return Response.json({ text: 'Я ничего не нажал и позвал взрослого', languages: [{ code: 'ru' }] });
  };
  const transcribe = createTranscriber({ apiKey: 'secret-test-key', model: 'gpt-transcribe', fetchImpl });
  const text = await transcribe(new File(['voice'], 'answer.webm', { type: 'audio/webm' }));
  assert.equal(text, 'Я ничего не нажал и позвал взрослого');
});

test('OpenAI adapter redacts upstream errors', async () => {
  const transcribe = createTranscriber({
    apiKey: 'secret-test-key',
    model: 'gpt-transcribe',
    fetchImpl: async () => new Response('account details and secret-test-key', { status: 401 }),
  });
  await assert.rejects(
    () => transcribe(new File(['voice'], 'answer.webm', { type: 'audio/webm' })),
    (error) => error instanceof TranscriptionError && error.code === 'TRANSCRIPTION_FAILED' && !error.message.includes('secret-test-key'),
  );
});

test('health reveals demo mode but never credential material', async () => {
  const server = createAppServer({ rootDir: process.cwd(), transcribe: null });
  const running = await listen(server);
  try {
    const response = await fetch(`${running.baseUrl}/api/health`);
    const body = await response.text();
    assert.equal(response.status, 200);
    assert.deepEqual(JSON.parse(body), { ok: true, transcription: 'demo' });
    assert.doesNotMatch(body, /sk-|secret/i);
  } finally {
    await running.close();
  }
});

test('transcription endpoint handles demo, validation, and injected success', async () => {
  const demo = createAppServer({ rootDir: process.cwd(), transcribe: null });
  const demoRunning = await listen(demo);
  try {
    const form = new FormData();
    form.set('audio', new Blob(['voice'], { type: 'audio/webm' }), 'answer.webm');
    const response = await fetch(`${demoRunning.baseUrl}/api/transcribe`, { method: 'POST', body: form });
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { ok: false, code: 'TRANSCRIPTION_UNAVAILABLE', mode: 'demo' });
  } finally {
    await demoRunning.close();
  }

  const active = createAppServer({ rootDir: process.cwd(), transcribe: async (file) => `Распознано ${file.type}` });
  const activeRunning = await listen(active);
  try {
    const form = new FormData();
    form.set('audio', new Blob(['voice'], { type: 'audio/webm' }), 'answer.webm');
    const response = await fetch(`${activeRunning.baseUrl}/api/transcribe`, { method: 'POST', body: form });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true, text: 'Распознано audio/webm' });

    const invalid = new FormData();
    invalid.set('audio', new Blob(['words'], { type: 'text/plain' }), 'answer.txt');
    const invalidResponse = await fetch(`${activeRunning.baseUrl}/api/transcribe`, { method: 'POST', body: invalid });
    assert.equal(invalidResponse.status, 415);
    assert.deepEqual(await invalidResponse.json(), { ok: false, code: 'UNSUPPORTED_AUDIO' });
  } finally {
    await activeRunning.close();
  }
});

test('static server serves files and blocks traversal', async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), 'voice-lesson-'));
  await writeFile(path.join(rootDir, 'index.html'), '<h1>Voice lesson</h1>');
  const server = createAppServer({ rootDir, transcribe: null });
  const running = await listen(server);
  try {
    const page = await fetch(`${running.baseUrl}/`);
    assert.equal(page.status, 200);
    assert.equal(await page.text(), '<h1>Voice lesson</h1>');
    const traversal = await fetch(`${running.baseUrl}/..%2F..%2Fetc%2Fpasswd`);
    assert.equal(traversal.status, 404);
  } finally {
    await running.close();
    await rm(rootDir, { recursive: true, force: true });
  }
});
