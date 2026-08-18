import { createReadStream } from 'node:fs';
import { access, readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { OpenAIServiceError, createOpenAIService } from './openai.mjs';

const MIME_TYPES = new Map([
  ['.html', 'text/html; charset=utf-8'], ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'], ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'], ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'], ['.webm', 'video/webm'], ['.mp4', 'video/mp4'],
  ['.vtt', 'text/vtt; charset=utf-8'],
]);

class RequestError extends Error {
  constructor(code, status) {
    super(code);
    this.code = code;
    this.status = status;
  }
}

function sendJson(response, status, body) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
  response.end(JSON.stringify(body));
}

async function readBody(request, maxBytes) {
  const declared = Number(request.headers['content-length'] ?? 0);
  if (declared > maxBytes) throw new RequestError('TOO_LARGE', 413);
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBytes) throw new RequestError('TOO_LARGE', 413);
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function validTurns(turns) {
  if (!Array.isArray(turns) || turns.length < 1 || turns.length > 12) return null;
  const normalized = [];
  for (const turn of turns) {
    if (!turn || !['user', 'assistant'].includes(turn.role) || typeof turn.text !== 'string') return null;
    const text = turn.text.trim();
    if (!text || text.length > 500) return null;
    normalized.push({ role: turn.role, text });
  }
  return normalized;
}

function resolveStaticPath(rootDir, requestUrl) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(requestUrl, 'http://local').pathname);
  } catch {
    return null;
  }
  if (pathname.includes('\0') || pathname.split('/').includes('..')) return null;
  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const resolvedRoot = path.resolve(rootDir);
  const resolved = path.resolve(resolvedRoot, relative);
  return resolved.startsWith(`${resolvedRoot}${path.sep}`) ? resolved : null;
}

export function createLessonServer({ rootDir, env = {}, fetchImpl = globalThis.fetch } = {}) {
  const apiKey = env.OPENAI_API_KEY?.trim();
  const service = createOpenAIService({
    apiKey,
    realtimeModel: env.OPENAI_REALTIME_MODEL || 'gpt-realtime-2.1',
    realtimeVoice: env.OPENAI_REALTIME_VOICE || 'marin',
    evaluationModel: env.OPENAI_EVALUATION_MODEL || 'gpt-5-mini',
    fetchImpl,
  });
  const rateWindows = new Map();

  return createServer(async (request, response) => {
    const pathname = new URL(request.url, 'http://local').pathname;
    if (pathname.startsWith('/api/')) {
      const now = Date.now();
      const address = request.socket.remoteAddress ?? 'local';
      const window = rateWindows.get(address);
      const active = !window || now - window.startedAt > 60_000 ? { startedAt: now, count: 1 } : { ...window, count: window.count + 1 };
      rateWindows.set(address, active);
      if (active.count > 30) {
        sendJson(response, 429, { ok: false, code: 'RATE_LIMITED' });
        return;
      }
    }

    if (request.method === 'GET' && pathname === '/api/health') {
      sendJson(response, 200, { ok: true, realtime: apiKey ? 'openai' : 'demo' });
      return;
    }

    if (request.method === 'POST' && pathname === '/api/realtime/session') {
      if (!(request.headers['content-type'] ?? '').startsWith('application/sdp')) {
        sendJson(response, 415, { ok: false, code: 'BAD_REQUEST' });
        return;
      }
      if (!apiKey) {
        sendJson(response, 503, { ok: false, code: 'REALTIME_UNAVAILABLE', mode: 'demo' });
        return;
      }
      try {
        const sdp = (await readBody(request, 64 * 1024)).toString('utf8').trim();
        if (!sdp) throw new RequestError('BAD_REQUEST', 400);
        const answer = await service.createRealtimeCall(sdp);
        response.writeHead(200, { 'content-type': 'application/sdp', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
        response.end(answer);
      } catch (error) {
        const code = error instanceof RequestError ? error.code : 'REALTIME_UNAVAILABLE';
        const status = error instanceof RequestError ? error.status : 502;
        sendJson(response, status, { ok: false, code });
      }
      return;
    }

    if (request.method === 'POST' && pathname === '/api/voice/evaluate') {
      if (!(request.headers['content-type'] ?? '').startsWith('application/json')) {
        sendJson(response, 415, { ok: false, code: 'BAD_REQUEST' });
        return;
      }
      try {
        const payload = JSON.parse((await readBody(request, 32 * 1024)).toString('utf8'));
        const turns = validTurns(payload?.turns);
        if (!turns) throw new RequestError('BAD_REQUEST', 400);
        if (!apiKey) {
          sendJson(response, 503, { ok: false, code: 'EVALUATION_UNAVAILABLE', mode: 'demo' });
          return;
        }
        const evaluation = await service.evaluateVoice(turns);
        sendJson(response, 200, { ok: true, evaluation });
      } catch (error) {
        const code = error instanceof RequestError ? error.code : error instanceof OpenAIServiceError ? error.code : 'BAD_REQUEST';
        const status = error instanceof RequestError ? error.status : error instanceof OpenAIServiceError ? 502 : 400;
        sendJson(response, status, { ok: false, code });
      }
      return;
    }

    if (!['GET', 'HEAD'].includes(request.method)) {
      response.writeHead(405, { allow: 'GET, HEAD' }).end();
      return;
    }
    const filePath = resolveStaticPath(rootDir, request.url);
    if (!filePath) {
      response.writeHead(404).end();
      return;
    }
    try {
      await access(filePath);
      response.writeHead(200, { 'content-type': MIME_TYPES.get(path.extname(filePath)) ?? 'application/octet-stream', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
      if (request.method === 'HEAD') response.end();
      else createReadStream(filePath).pipe(response);
    } catch {
      response.writeHead(404).end();
    }
  });
}

async function loadDotEnv(rootDir) {
  let text;
  try { text = await readFile(path.join(rootDir, '.env'), 'utf8'); } catch { return; }
  const allowed = new Set(['OPENAI_API_KEY', 'OPENAI_REALTIME_MODEL', 'OPENAI_REALTIME_VOICE', 'OPENAI_EVALUATION_MODEL', 'PORT']);
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match || !allowed.has(match[1]) || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
}

async function start() {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  await loadDotEnv(rootDir);
  const port = Number(process.env.PORT || 4174);
  const server = createLessonServer({ rootDir, env: process.env });
  server.listen(port, '127.0.0.1', () => {
    process.stdout.write(`Карта цифрового мира: http://127.0.0.1:${port} (${process.env.OPENAI_API_KEY ? 'OpenAI' : 'demo'})\n`);
  });
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) start();
