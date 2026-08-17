import { createReadStream } from 'node:fs';
import { access, readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { TranscriptionError, createTranscriber, validateAudio } from './transcription.mjs';

const PUBLIC_ERRORS = new Map([
  ['NO_AUDIO', 400],
  ['TOO_LARGE', 413],
  ['UNSUPPORTED_AUDIO', 415],
  ['TRANSCRIPTION_UNAVAILABLE', 503],
  ['TRANSCRIPTION_FAILED', 502],
]);

const MIME_TYPES = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.webm', 'video/webm'],
  ['.mp4', 'video/mp4'],
  ['.vtt', 'text/vtt; charset=utf-8'],
]);

function sendJson(response, status, body) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  response.end(JSON.stringify(body));
}

async function readRequestBody(request, maxBytes) {
  const declared = Number(request.headers['content-length'] ?? 0);
  if (declared > maxBytes) throw new TranscriptionError('TOO_LARGE');
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBytes) throw new TranscriptionError('TOO_LARGE');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function parseAudio(request) {
  const contentType = request.headers['content-type'] ?? '';
  if (!contentType.startsWith('multipart/form-data')) throw new TranscriptionError('NO_AUDIO');
  const body = await readRequestBody(request, 4 * 1024 * 1024 + 256 * 1024);
  const webRequest = new Request('http://local/api/transcribe', {
    method: 'POST',
    headers: { 'content-type': contentType },
    body,
  });
  const form = await webRequest.formData();
  const audio = form.get('audio');
  const validation = validateAudio(audio);
  if (!validation.ok) throw new TranscriptionError(validation.code);
  return audio;
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
  const resolved = path.resolve(rootDir, relative);
  return resolved.startsWith(`${path.resolve(rootDir)}${path.sep}`) ? resolved : null;
}

export function createAppServer({ rootDir, transcribe }) {
  return createServer(async (request, response) => {
    const pathname = new URL(request.url, 'http://local').pathname;
    if (request.method === 'GET' && pathname === '/api/health') {
      sendJson(response, 200, { ok: true, transcription: transcribe ? 'openai' : 'demo' });
      return;
    }
    if (request.method === 'POST' && pathname === '/api/transcribe') {
      if (!transcribe) {
        sendJson(response, 503, { ok: false, code: 'TRANSCRIPTION_UNAVAILABLE', mode: 'demo' });
        return;
      }
      try {
        const audio = await parseAudio(request);
        const text = await transcribe(audio);
        sendJson(response, 200, { ok: true, text });
      } catch (error) {
        const code = error instanceof TranscriptionError ? error.code : 'TRANSCRIPTION_FAILED';
        sendJson(response, PUBLIC_ERRORS.get(code) ?? 502, { ok: false, code });
      }
      return;
    }
    if (!['GET', 'HEAD'].includes(request.method)) {
      response.writeHead(405).end();
      return;
    }
    const filePath = resolveStaticPath(rootDir, request.url);
    if (!filePath) {
      response.writeHead(404).end();
      return;
    }
    try {
      await access(filePath);
      response.writeHead(200, { 'content-type': MIME_TYPES.get(path.extname(filePath)) ?? 'application/octet-stream' });
      if (request.method === 'HEAD') response.end();
      else createReadStream(filePath).pipe(response);
    } catch {
      response.writeHead(404).end();
    }
  });
}

async function loadDotEnv(rootDir) {
  let text;
  try {
    text = await readFile(path.join(rootDir, '.env'), 'utf8');
  } catch {
    return;
  }
  const allowed = new Set(['OPENAI_API_KEY', 'OPENAI_TRANSCRIBE_MODEL', 'PORT']);
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match || !allowed.has(match[1]) || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
}

async function start() {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  await loadDotEnv(rootDir);
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const transcribe = apiKey
    ? createTranscriber({ apiKey, model: process.env.OPENAI_TRANSCRIBE_MODEL || 'gpt-transcribe' })
    : null;
  const port = Number(process.env.PORT || 4175);
  const server = createAppServer({ rootDir, transcribe });
  server.listen(port, '127.0.0.1', () => {
    process.stdout.write(`Voice lesson: http://127.0.0.1:${port} (${transcribe ? 'OpenAI' : 'demo'})\n`);
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) start();
