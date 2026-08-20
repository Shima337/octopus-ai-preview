import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { expect, it } from 'vitest';

it('identity-only skips FFmpeg and rejects a changed teacher source', () => {
  const temporaryDirectory = mkdtempSync(join(tmpdir(), 'octopus-media-test-'));
  const fakeCurl = join(temporaryDirectory, 'curl');

  writeFileSync(fakeCurl, `#!/bin/sh
output=''
while [ "$#" -gt 0 ]; do
  if [ "$1" = '-o' ]; then
    shift
    output="$1"
  fi
  shift
done
printf 'mutated teacher source' > "$output"
`);
  chmodSync(fakeCurl, 0o755);

  try {
    const result = spawnSync('bash', ['scripts/prepare-media.sh', '--identity-only'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: {
        ...process.env,
        CURL_BIN: fakeCurl,
        FFMPEG_BIN: join(temporaryDirectory, 'missing-ffmpeg'),
      },
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Teacher photo checksum mismatch');
    expect(result.stderr).not.toContain('ffmpeg not found');
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
});
