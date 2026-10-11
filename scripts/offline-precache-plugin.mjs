// Vite plugin: after the bundle is written, hash every file in dist/ and generate
// dist/sw.js from src/sw/sw-template.js with the complete, versioned precache manifest
// embedded. The service worker uses this list to download, verify (SHA-256) and serve
// the entire game offline. See PWA_ARCHITECTURE.md.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep, extname, resolve } from 'node:path';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.mp3': 'audio/mpeg',
  '.txt': 'text/plain; charset=utf-8',
};

// Files that are part of the deployment but are not game resources.
const EXCLUDE = new Set(['sw.js', 'precache-manifest.json', '.nojekyll']);

export function groupFor(file) {
  const ext = extname(file).toLowerCase();
  if (ext === '.mp3') return 'audio';
  if (ext === '.woff2' || ext === '.woff') return 'fonts';
  if (ext === '.png' || ext === '.svg' || ext === '.ico') return 'art';
  if (ext === '.js' || ext === '.css' || ext === '.html' || ext === '.webmanifest') return 'code';
  return 'other';
}

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

export function buildManifest(distDir) {
  const files = walk(distDir)
    .map((full) => relative(distDir, full).split(sep).join('/'))
    .filter((rel) => !EXCLUDE.has(rel) && !rel.endsWith('.map') && !rel.split('/').some((p) => p.startsWith('.')))
    .sort();
  return files.map((url) => {
    const buf = readFileSync(join(distDir, url));
    const ext = extname(url).toLowerCase();
    return {
      url,
      hash: createHash('sha256').update(buf).digest('hex'),
      size: buf.length,
      type: TYPES[ext] || 'application/octet-stream',
      group: groupFor(url),
    };
  });
}

export function offlinePrecache({ buildId, buildTime }) {
  let outDir = 'dist';
  let root = process.cwd();
  return {
    name: 'albatross-offline-precache',
    apply: 'build',
    configResolved(config) {
      root = config.root;
      outDir = resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const manifest = buildManifest(outDir);
      if (!manifest.some((e) => e.url === 'index.html')) {
        throw new Error('[precache] index.html missing from build output');
      }
      const version = createHash('sha256')
        .update(manifest.map((e) => `${e.url}:${e.hash}`).join('\n'))
        .digest('hex')
        .slice(0, 16);
      const template = readFileSync(join(root, 'src/sw/sw-template.js'), 'utf8');
      const sw = template
        .replace('__SW_VERSION__', version)
        .replace('__BUILD_ID__', buildId)
        .replace('__BUILD_TIME__', buildTime)
        .replace('self.__PRECACHE_MANIFEST__', JSON.stringify(manifest));
      if (sw.includes('__PRECACHE_MANIFEST__') || sw.includes('__SW_VERSION__')) {
        throw new Error('[precache] service worker template placeholders were not replaced');
      }
      writeFileSync(join(outDir, 'sw.js'), sw);
      writeFileSync(
        join(outDir, 'precache-manifest.json'),
        JSON.stringify({ version, buildId, buildTime, files: manifest }, null, 2),
      );
      writeFileSync(join(outDir, '.nojekyll'), '');
      const bytes = manifest.reduce((a, e) => a + e.size, 0);
      // eslint-disable-next-line no-console
      console.log(`[precache] ${manifest.length} files, ${(bytes / 1048576).toFixed(2)} MB, version ${version}`);
    },
  };
}
