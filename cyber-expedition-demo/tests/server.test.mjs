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

test('standalone server serves the shell and reports demo mode', async () => {
  const server = createLessonServer({ rootDir: process.cwd(), env: {} });
  const running = await listen(server);
  try {
    const page = await fetch(`${running.baseUrl}/`);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /Киберэкспедиция/);
    assert.deepEqual(await (await fetch(`${running.baseUrl}/api/health`)).json(), {
      ok: true,
      realtime: 'demo',
    });
    const traversal = await fetch(`${running.baseUrl}/..%2F..%2Fetc%2Fpasswd`);
    assert.equal(traversal.status, 404);
  } finally {
    await running.close();
  }
});

test('starts when the server module is executed directly', async () => {
  const child = spawn(process.execPath, ['server/serve.mjs'], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: '0' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const started = new Promise((resolve, reject) => {
    child.stdout.once('data', resolve);
    child.once('error', reject);
    child.once('exit', (code) => reject(new Error(`Server exited with code ${code}`)));
  });

  try {
    assert.match((await started).toString(), /Cyber expedition demo/);
  } finally {
    if (child.exitCode === null) {
      child.kill();
      await once(child, 'exit');
    }
  }
});
