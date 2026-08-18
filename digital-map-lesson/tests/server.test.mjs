import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { OpenAIServiceError, createOpenAIService } from '../server/openai.mjs';
import { createLessonServer } from '../server/serve.mjs';

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

const COMPLETE_EVALUATION = {
  signals: { met: true, feedback: 'Ты заметил просьбу о секрете.' },
  safeAction: { met: true, feedback: 'Ты решил не открывать ссылку.' },
  trustedAdult: { met: false, feedback: 'Ещё назови взрослого, которому расскажешь.' },
  summary: 'Два шага щита уже готовы.',
};

test('OpenAI service sends SDP and server-owned session config to the unified endpoint', async () => {
  const calls = [];
  const service = createOpenAIService({
    apiKey: 'secret-test-key',
    realtimeModel: 'gpt-realtime-2.1',
    realtimeVoice: 'marin',
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return new Response('answer-sdp', { status: 201, headers: { 'content-type': 'application/sdp' } });
    },
  });
  assert.equal(await service.createRealtimeCall('offer-sdp'), 'answer-sdp');
  assert.equal(calls[0].url, 'https://api.openai.com/v1/realtime/calls');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer secret-test-key');
  assert.equal(calls[0].options.body.get('sdp'), 'offer-sdp');
  const session = JSON.parse(calls[0].options.body.get('session'));
  assert.equal(session.model, 'gpt-realtime-2.1');
  assert.equal(session.audio.output.voice, 'marin');
  assert.match(session.instructions, /не проси.*личн/i);
});

test('OpenAI service returns only a validated structured evaluation', async () => {
  const calls = [];
  const service = createOpenAIService({
    apiKey: 'secret-test-key',
    evaluationModel: 'gpt-5-mini',
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return Response.json({ output: [{ content: [{ type: 'output_text', text: JSON.stringify(COMPLETE_EVALUATION) }] }] });
    },
  });
  const result = await service.evaluateVoice([{ role: 'user', text: 'Я не открою ссылку.' }]);
  assert.deepEqual(result, COMPLETE_EVALUATION);
  assert.equal(calls[0].url, 'https://api.openai.com/v1/responses');
  const request = JSON.parse(calls[0].options.body);
  assert.equal(request.store, false);
  assert.equal(request.model, 'gpt-5-mini');
  assert.equal(request.text.format.type, 'json_schema');
});

test('OpenAI service redacts upstream errors and rejects malformed evaluations', async () => {
  const failed = createOpenAIService({
    apiKey: 'secret-test-key',
    fetchImpl: async () => new Response('secret-test-key account details', { status: 401 }),
  });
  await assert.rejects(
    () => failed.createRealtimeCall('offer-sdp'),
    (error) => error instanceof OpenAIServiceError && error.code === 'REALTIME_UNAVAILABLE' && !error.message.includes('secret-test-key'),
  );
  const malformed = createOpenAIService({
    apiKey: 'secret-test-key',
    fetchImpl: async () => Response.json({ output_text: '{"summary":"missing criteria"}' }),
  });
  await assert.rejects(
    () => malformed.evaluateVoice([{ role: 'user', text: 'Ответ' }]),
    (error) => error instanceof OpenAIServiceError && error.code === 'EVALUATION_UNAVAILABLE',
  );
});

test('health reports demo or openai mode without exposing credentials', async () => {
  for (const [apiKey, expected] of [['', 'demo'], ['secret-test-key', 'openai']]) {
    const server = createLessonServer({ rootDir: process.cwd(), env: { OPENAI_API_KEY: apiKey }, fetchImpl: async () => new Response('unused') });
    const running = await listen(server);
    try {
      const response = await fetch(`${running.baseUrl}/api/health`);
      const body = await response.text();
      assert.equal(response.status, 200);
      assert.deepEqual(JSON.parse(body), { ok: true, realtime: expected });
      assert.doesNotMatch(body, /secret-test-key/);
    } finally {
      await running.close();
    }
  }
});

test('server validates API bodies and returns safe public errors in demo mode', async () => {
  const server = createLessonServer({ rootDir: process.cwd(), env: {} });
  const running = await listen(server);
  try {
    const wrongType = await fetch(`${running.baseUrl}/api/realtime/session`, { method: 'POST', headers: { 'content-type': 'text/plain' }, body: 'offer' });
    assert.equal(wrongType.status, 415);
    assert.deepEqual(await wrongType.json(), { ok: false, code: 'BAD_REQUEST' });

    const demoSession = await fetch(`${running.baseUrl}/api/realtime/session`, { method: 'POST', headers: { 'content-type': 'application/sdp' }, body: 'offer' });
    assert.equal(demoSession.status, 503);
    assert.deepEqual(await demoSession.json(), { ok: false, code: 'REALTIME_UNAVAILABLE', mode: 'demo' });

    const badTurns = await fetch(`${running.baseUrl}/api/voice/evaluate`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ turns: [{ role: 'system', text: 'secret' }] }),
    });
    assert.equal(badTurns.status, 400);
    assert.deepEqual(await badTurns.json(), { ok: false, code: 'BAD_REQUEST' });
  } finally {
    await running.close();
  }
});

test('server proxies successful SDP and evaluation without leaking the key', async () => {
  const upstream = async (url) => {
    if (url.endsWith('/realtime/calls')) return new Response('answer-sdp', { status: 201, headers: { 'content-type': 'application/sdp' } });
    return Response.json({ output_text: JSON.stringify(COMPLETE_EVALUATION) });
  };
  const server = createLessonServer({ rootDir: process.cwd(), env: { OPENAI_API_KEY: 'secret-test-key' }, fetchImpl: upstream });
  const running = await listen(server);
  try {
    const session = await fetch(`${running.baseUrl}/api/realtime/session`, { method: 'POST', headers: { 'content-type': 'application/sdp' }, body: 'offer-sdp' });
    assert.equal(session.status, 200);
    assert.equal(session.headers.get('content-type'), 'application/sdp');
    assert.equal(await session.text(), 'answer-sdp');

    const evaluation = await fetch(`${running.baseUrl}/api/voice/evaluate`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ turns: [{ role: 'user', text: 'Позову взрослого.' }] }),
    });
    assert.equal(evaluation.status, 200);
    assert.deepEqual(await evaluation.json(), { ok: true, evaluation: COMPLETE_EVALUATION });
  } finally {
    await running.close();
  }
});

test('static server serves the lesson and blocks encoded traversal', async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), 'digital-map-'));
  await writeFile(path.join(rootDir, 'index.html'), '<h1>Digital map</h1>');
  const server = createLessonServer({ rootDir, env: {} });
  const running = await listen(server);
  try {
    const page = await fetch(`${running.baseUrl}/`);
    assert.equal(page.status, 200);
    assert.equal(await page.text(), '<h1>Digital map</h1>');
    const traversal = await fetch(`${running.baseUrl}/..%2F..%2Fetc%2Fpasswd`);
    assert.equal(traversal.status, 404);
  } finally {
    await running.close();
    await rm(rootDir, { recursive: true, force: true });
  }
});
