export class RecorderError extends Error {
  constructor(code) {
    super(code);
    this.name = 'RecorderError';
    this.code = code;
  }
}

function publicRecorderError(error) {
  if (error?.name === 'NotAllowedError' || error?.name === 'SecurityError') return new RecorderError('MIC_PERMISSION');
  if (error?.name === 'NotFoundError') return new RecorderError('MIC_MISSING');
  return new RecorderError('MIC_UNAVAILABLE');
}

export function createRecorder({
  mediaDevices = globalThis.navigator?.mediaDevices,
  MediaRecorderClass = globalThis.MediaRecorder,
  timeoutMs = 20_000,
  clock = { now: () => Date.now(), setTimeout, clearTimeout },
} = {}) {
  let stream = null;
  let recorder = null;
  let chunks = [];
  let startedAt = 0;
  let timer = null;
  let stopReason = 'manual';
  let resultPromise = Promise.resolve(null);
  let resolveResult;
  let rejectResult;

  const stopTracks = () => {
    for (const track of stream?.getTracks?.() ?? []) track.stop();
    stream = null;
  };

  const stop = async (reason = 'manual') => {
    stopReason = reason;
    if (!recorder || recorder.state === 'inactive') return resultPromise;
    if (timer) clock.clearTimeout(timer);
    recorder.stop();
    return resultPromise;
  };

  const start = async () => {
    if (!mediaDevices?.getUserMedia || !MediaRecorderClass) throw new RecorderError('MIC_UNAVAILABLE');
    try {
      stream = await mediaDevices.getUserMedia({ audio: true, video: false });
    } catch (error) {
      throw publicRecorderError(error);
    }
    const supportedTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'];
    const mimeType = supportedTypes.find((type) => MediaRecorderClass.isTypeSupported?.(type)) ?? '';
    try {
      recorder = mimeType ? new MediaRecorderClass(stream, { mimeType }) : new MediaRecorderClass(stream);
    } catch {
      stopTracks();
      throw new RecorderError('MIC_UNAVAILABLE');
    }
    chunks = [];
    stopReason = 'manual';
    resultPromise = new Promise((resolve, reject) => { resolveResult = resolve; rejectResult = reject; });
    recorder.ondataavailable = (event) => { if (event.data?.size) chunks.push(event.data); };
    recorder.onerror = () => {
      if (timer) clock.clearTimeout(timer);
      stopTracks();
      rejectResult(new RecorderError('RECORDING_FAILED'));
    };
    recorder.onstop = () => {
      if (timer) clock.clearTimeout(timer);
      const type = chunks[0]?.type || recorder.mimeType || 'audio/webm';
      const blob = new Blob(chunks, { type });
      const durationMs = Math.max(0, clock.now() - startedAt);
      stopTracks();
      if (!blob.size) rejectResult(new RecorderError('EMPTY_AUDIO'));
      else resolveResult({ blob, durationMs, reason: stopReason });
    };
    startedAt = clock.now();
    recorder.start();
    timer = clock.setTimeout(() => { void stop('timeout'); }, timeoutMs);
    return true;
  };

  const cancel = () => {
    if (timer) clock.clearTimeout(timer);
    if (recorder?.state !== 'inactive') recorder.stop();
    chunks = [];
    stopTracks();
  };

  return {
    start,
    stop,
    cancel,
    get result() { return resultPromise; },
    get isRecording() { return recorder?.state === 'recording'; },
  };
}
