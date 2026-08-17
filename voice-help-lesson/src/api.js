export class VoiceApiError extends Error {
  constructor(code) {
    super(code);
    this.name = 'VoiceApiError';
    this.code = code;
  }
}

export async function getServerMode(fetchImpl = fetch) {
  try {
    const response = await fetchImpl('/api/health', { headers: { accept: 'application/json' } });
    if (!response.ok) return 'demo';
    const payload = await response.json();
    return payload?.transcription === 'openai' ? 'openai' : 'demo';
  } catch {
    return 'demo';
  }
}

export async function transcribeAudio(blob, fetchImpl = fetch) {
  const form = new FormData();
  const extension = blob.type.includes('ogg') ? 'ogg' : blob.type.includes('mp4') ? 'm4a' : 'webm';
  form.set('audio', blob, `answer.${extension}`);
  let response;
  try {
    response = await fetchImpl('/api/transcribe', { method: 'POST', body: form, headers: { accept: 'application/json' } });
  } catch {
    throw new VoiceApiError('NETWORK');
  }
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new VoiceApiError('TRANSCRIPTION_FAILED');
  }
  if (!response.ok || !payload?.ok) throw new VoiceApiError(payload?.code ?? 'TRANSCRIPTION_FAILED');
  const text = String(payload.text ?? '').trim();
  if (!text) throw new VoiceApiError('TRANSCRIPTION_FAILED');
  return { text };
}
