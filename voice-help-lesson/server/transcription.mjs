const MAX_AUDIO_BYTES = 4 * 1024 * 1024;
const AUDIO_TYPES = new Set([
  'audio/webm',
  'audio/ogg',
  'audio/mp4',
  'audio/mpeg',
  'audio/wav',
  'audio/x-wav',
]);

export class TranscriptionError extends Error {
  constructor(code) {
    super(code);
    this.name = 'TranscriptionError';
    this.code = code;
  }
}

export function validateAudio(file) {
  if (!file || !Number.isFinite(file.size) || file.size <= 0) return { ok: false, code: 'NO_AUDIO' };
  if (file.size > MAX_AUDIO_BYTES) return { ok: false, code: 'TOO_LARGE' };
  const baseType = String(file.type ?? '').split(';')[0].toLowerCase();
  if (!AUDIO_TYPES.has(baseType)) return { ok: false, code: 'UNSUPPORTED_AUDIO' };
  return { ok: true };
}

export function createTranscriber({ apiKey, model = 'gpt-transcribe', fetchImpl = fetch }) {
  return async function transcribe(file) {
    const validation = validateAudio(file);
    if (!validation.ok) throw new TranscriptionError(validation.code);
    const body = new FormData();
    body.set('file', file, file.name || 'answer.webm');
    body.set('model', model);
    body.set('language', 'ru');
    body.set('prompt', 'Детский урок цифровой безопасности: пароль, подарок, незнакомец, фотография, расписание, чат, травля, взрослый, помощь.');
    let response;
    try {
      response = await fetchImpl('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body,
      });
    } catch {
      throw new TranscriptionError('TRANSCRIPTION_FAILED');
    }
    if (!response.ok) throw new TranscriptionError('TRANSCRIPTION_FAILED');
    let payload;
    try {
      payload = await response.json();
    } catch {
      throw new TranscriptionError('TRANSCRIPTION_FAILED');
    }
    const text = String(payload?.text ?? '').trim();
    if (!text) throw new TranscriptionError('TRANSCRIPTION_FAILED');
    return text;
  };
}
