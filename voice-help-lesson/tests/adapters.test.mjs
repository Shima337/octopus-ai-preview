import assert from 'node:assert/strict';
import test from 'node:test';
import { VoiceApiError, getServerMode, transcribeAudio } from '../src/api.js';
import { RecorderError, createRecorder } from '../src/recorder.js';

function recorderHarness() {
  const track = { stopped: false, stop() { this.stopped = true; } };
  const stream = { getTracks: () => [track] };
  const mediaDevices = {
    lastConstraints: null,
    async getUserMedia(constraints) {
      this.lastConstraints = constraints;
      return stream;
    },
  };
  class FakeMediaRecorder {
    static isTypeSupported(type) { return type.startsWith('audio/webm'); }
    constructor(inputStream, options) {
      this.stream = inputStream;
      this.mimeType = options.mimeType;
      this.state = 'inactive';
    }
    start() { this.state = 'recording'; }
    stop() {
      this.state = 'inactive';
      this.ondataavailable?.({ data: new Blob(['voice'], { type: 'audio/webm' }) });
      this.onstop?.();
    }
  }
  const timers = new Map();
  let timerId = 0;
  const clock = {
    now: () => 1000,
    setTimeout(callback) { timerId += 1; timers.set(timerId, callback); return timerId; },
    clearTimeout(id) { timers.delete(id); },
    run() { for (const callback of [...timers.values()]) callback(); timers.clear(); },
  };
  return { track, mediaDevices, FakeMediaRecorder, clock };
}

test('recorder requests audio only and stops every track', async () => {
  const harness = recorderHarness();
  const recorder = createRecorder({
    mediaDevices: harness.mediaDevices,
    MediaRecorderClass: harness.FakeMediaRecorder,
    timeoutMs: 20_000,
    clock: harness.clock,
  });
  await recorder.start();
  const result = await recorder.stop();
  assert.deepEqual(harness.mediaDevices.lastConstraints, { audio: true, video: false });
  assert.equal(harness.track.stopped, true);
  assert.equal(result.blob.type, 'audio/webm');
  assert.equal(result.blob.size > 0, true);
});

test('recorder timeout stops an active recording', async () => {
  const harness = recorderHarness();
  const recorder = createRecorder({ mediaDevices: harness.mediaDevices, MediaRecorderClass: harness.FakeMediaRecorder, timeoutMs: 20_000, clock: harness.clock });
  await recorder.start();
  harness.clock.run();
  const result = await recorder.result;
  assert.equal(result.reason, 'timeout');
  assert.equal(harness.track.stopped, true);
});

test('permission failure becomes a public recorder error', async () => {
  const recorder = createRecorder({
    mediaDevices: { async getUserMedia() { throw new DOMException('denied', 'NotAllowedError'); } },
    MediaRecorderClass: class {},
  });
  await assert.rejects(() => recorder.start(), (error) => error instanceof RecorderError && error.code === 'MIC_PERMISSION');
});

test('health client returns server transcription mode', async () => {
  const mode = await getServerMode(async () => Response.json({ ok: true, transcription: 'openai' }));
  assert.equal(mode, 'openai');
});

test('transcription client sends multipart audio and returns text', async () => {
  const fetchImpl = async (_url, options) => {
    const audio = options.body.get('audio');
    if (!(audio instanceof Blob) || audio.type !== 'audio/webm') return new Response('bad request', { status: 400 });
    return Response.json({ ok: true, text: 'Я ничего не нажал и позвал взрослого' });
  };
  const result = await transcribeAudio(new Blob(['voice'], { type: 'audio/webm' }), fetchImpl);
  assert.equal(result.text, 'Я ничего не нажал и позвал взрослого');
});

test('transcription client maps demo and network failures to public codes', async () => {
  await assert.rejects(
    () => transcribeAudio(new Blob(['voice'], { type: 'audio/webm' }), async () => Response.json({ ok: false, code: 'TRANSCRIPTION_UNAVAILABLE', mode: 'demo' }, { status: 503 })),
    (error) => error instanceof VoiceApiError && error.code === 'TRANSCRIPTION_UNAVAILABLE',
  );
  await assert.rejects(
    () => transcribeAudio(new Blob(['voice'], { type: 'audio/webm' }), async () => { throw new Error('network details'); }),
    (error) => error instanceof VoiceApiError && error.code === 'NETWORK',
  );
});
