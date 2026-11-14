import { it, expect } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { inspectVideo } from '../../src/lib/gate1/media';
it('inspects actual video bytes and rejects text disguised as an mp4', async () => {
  const { stdout } = await promisify(execFile)('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'color=c=black:s=32x32:r=10', '-t', '1', '-c:v', 'libx264', '-movflags', 'frag_keyframe+empty_moov', '-f', 'mp4', 'pipe:1'], { encoding: 'buffer', maxBuffer: 1000000 });
  const media = await inspectVideo(stdout);
  expect(media.durationSec).toBeGreaterThanOrEqual(1); expect(media.sha256).toMatch(/^[a-f0-9]{64}$/);
  await expect(inspectVideo(Buffer.from('not a video'))).rejects.toMatchObject({ status: 422 });
});
