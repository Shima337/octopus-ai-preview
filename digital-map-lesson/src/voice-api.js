export class VoiceApiError extends Error {
  constructor(code) {
    super(code);
    this.name = 'VoiceApiError';
    this.code = code;
  }
}

function validCriterion(value) {
  return value && typeof value.met === 'boolean' && typeof value.feedback === 'string' && value.feedback.trim().length > 0 && value.feedback.length <= 160;
}

function validEvaluation(value) {
  return value && validCriterion(value.signals) && validCriterion(value.safeAction)
    && validCriterion(value.trustedAdult) && typeof value.summary === 'string'
    && value.summary.trim().length > 0 && value.summary.length <= 160;
}

export function createVoiceApi({ fetchImpl = globalThis.fetch, baseUrl = '', timeoutMs = 15_000 } = {}) {
  async function request(path, options, code) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(`${baseUrl}${path}`, { ...options, signal: controller.signal });
      if (!response.ok) throw new VoiceApiError(code);
      return response;
    } catch (error) {
      if (error instanceof VoiceApiError) throw error;
      throw new VoiceApiError(code);
    } finally {
      clearTimeout(timeout);
    }
  }

  return {
    async health() {
      try {
        const response = await request('/api/health', {}, 'HEALTH_FAILED');
        const body = await response.json();
        return { realtime: body?.realtime === 'openai' ? 'openai' : 'demo' };
      } catch {
        return { realtime: 'demo' };
      }
    },
    async createSession(sdp) {
      const response = await request('/api/realtime/session', {
        method: 'POST', headers: { 'content-type': 'application/sdp' }, body: sdp,
      }, 'SESSION_FAILED');
      if (!(response.headers.get('content-type') ?? '').startsWith('application/sdp')) throw new VoiceApiError('SESSION_FAILED');
      const answer = await response.text();
      if (!answer.trim()) throw new VoiceApiError('SESSION_FAILED');
      return answer;
    },
    async evaluate(turns) {
      const response = await request('/api/voice/evaluate', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ turns }),
      }, 'EVALUATION_FAILED');
      let body;
      try { body = await response.json(); } catch { throw new VoiceApiError('EVALUATION_FAILED'); }
      if (!body?.ok || !validEvaluation(body.evaluation)) throw new VoiceApiError('EVALUATION_FAILED');
      return body.evaluation;
    },
  };
}
