// Builds the extra versions used by the update tests from the current source:
//   .e2e-tmp/dist-v2      a genuine newer build (different build id ⇒ different SW version)
//   .e2e-tmp/dist-broken  the same newer build with one audio file corrupted on the server
// The main build in dist/ must already exist (CI runs `npm run build` first).
import { execSync } from 'node:child_process';
import { cpSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export default function globalSetup() {
  const root = process.cwd();
  if (!existsSync(join(root, 'dist/sw.js'))) throw new Error('Run `npm run build` before the E2E tests.');
  const tmp = join(root, '.e2e-tmp');
  const v2 = join(tmp, 'dist-v2');
  const broken = join(tmp, 'dist-broken');
  rmSync(tmp, { recursive: true, force: true });
  execSync(`npx vite build --outDir ${v2} --emptyOutDir --logLevel warn`, {
    stdio: 'inherit',
    env: { ...process.env, BUILD_ID: 'e2e-v2' },
  });
  cpSync(v2, broken, { recursive: true });
  const victim = join(broken, 'audio/bell.mp3');
  const bytes = readFileSync(victim);
  bytes[bytes.length - 10] ^= 0xff; // same size, wrong hash
  writeFileSync(victim, bytes);
}
