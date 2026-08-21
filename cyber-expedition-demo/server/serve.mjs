import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

export function createLessonServer({ rootDir, env = {} } = {}) {
  return createServer((request, response) => {
    const pathname = new URL(request.url, 'http://local').pathname;
    if (request.method === 'GET' && pathname === '/api/health') {
      return sendJson(response, 200, {
        ok: true,
        realtime: env.OPENAI_API_KEY ? 'openai' : 'demo',
      });
    }
    if (!['GET', 'HEAD'].includes(request.method)) return response.writeHead(405).end();
    const filePath = resolveStaticPath(rootDir, request.url);
    if (!filePath) return response.writeHead(404).end();
    return serveStatic(filePath, request.method, response);
  });
}

function sendJson(response, status, body) {
  const payload = JSON.stringify(body);
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
  });
  response.end(payload);
}

function resolveStaticPath(rootDir, requestUrl) {
  const rawPathname = requestUrl.split(/[?#]/, 1)[0] || '/';
  let pathname;
  try {
    pathname = decodeURIComponent(rawPathname);
  } catch {
    return null;
  }
  if (pathname.includes('\0')) return null;

  const rootPath = resolve(rootDir);
  const requestedPath = pathname === '/' ? '/index.html' : pathname;
  const filePath = resolve(rootPath, `.${requestedPath}`);
  if (filePath !== rootPath && !filePath.startsWith(`${rootPath}${sep}`)) return null;

  try {
    return statSync(filePath).isFile() ? filePath : null;
  } catch {
    return null;
  }
}

function serveStatic(filePath, method, response) {
  let content;
  try {
    content = readFileSync(filePath);
  } catch {
    return response.writeHead(404).end();
  }
  response.writeHead(200, {
    'Content-Type': MIME_TYPES[extname(filePath).toLowerCase()] || 'application/octet-stream',
    'Content-Length': content.length,
  });
  return method === 'HEAD' ? response.end() : response.end(content);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = createLessonServer({ rootDir: process.cwd(), env: process.env });
  const port = Number(process.env.PORT) || 4177;
  server.listen(port, '127.0.0.1', () => {
    console.log(`Cyber expedition demo: http://127.0.0.1:${port}/`);
  });
}
