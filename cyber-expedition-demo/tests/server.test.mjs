import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import test from 'node:test';
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

test('standalone server serves the shell without advertising external integrations', async () => {
  const server = createLessonServer({ rootDir: process.cwd() });
  const running = await listen(server);
  try {
    const page = await fetch(`${running.baseUrl}/`);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /Киберэкспедиция/);
    assert.equal((await fetch(`${running.baseUrl}/api/health`)).status, 404);
    const traversal = await fetch(`${running.baseUrl}/..%2F..%2Fetc%2Fpasswd`);
    assert.equal(traversal.status, 404);
  } finally {
    await running.close();
  }
});

test('standalone server advertises the configured local media MIME types', async () => {
  const server = createLessonServer({ rootDir: process.cwd() });
  const running = await listen(server);
  try {
    const expected = {
      'sample.mp4': 'video/mp4',
      'sample.webp': 'image/webp',
      'sample.vtt': 'text/vtt; charset=utf-8',
      'sample.mp3': 'audio/mpeg',
    };
    for (const [fileName, contentType] of Object.entries(expected)) {
      const response = await fetch(`${running.baseUrl}/tests/fixtures/${fileName}`);
      assert.equal(response.status, 200, fileName);
      assert.equal(response.headers.get('content-type'), contentType, fileName);
    }
  } finally {
    await running.close();
  }
});

test('starts when the server module is executed directly', async () => {
  const { PORT: ignoredPort, ...childEnv } = process.env;
  const child = spawn(process.execPath, ['server/serve.mjs'], {
    cwd: process.cwd(),
    env: childEnv,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const started = new Promise((resolve, reject) => {
    child.stdout.once('data', resolve);
    child.once('error', reject);
    child.once('exit', (code) => reject(new Error(`Server exited with code ${code}`)));
  });

  try {
    assert.equal(
      (await started).toString().trim(),
      'Cyber expedition demo: http://127.0.0.1:4177/',
    );
    assert.equal((await fetch('http://127.0.0.1:4177/api/health')).status, 404);
  } finally {
    if (child.exitCode === null) {
      child.kill();
      await once(child, 'exit');
    }
  }
});
