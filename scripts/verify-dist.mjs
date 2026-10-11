#!/usr/bin/env node
// Post-build checks for a GitHub Pages project-site deployment. Fails the build when:
//  - the manifest, its icons, the service worker or the precache manifest are missing/invalid
//  - index.html references root-relative ("/...") or external URLs
//  - any CSS/HTML/manifest references an external (http/https) resource
//  - a precached file is missing or its hash does not match
//  - mandatory groups (code, fonts, audio, art) are absent from the precache list
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, extname } from 'node:path';

const dist = process.argv[2] || 'dist';
const errors = [];
const warn = [];
const ok = (cond, msg) => {
  if (!cond) errors.push(msg);
};
const read = (p) => readFileSync(join(dist, p), 'utf8');

ok(existsSync(join(dist, 'index.html')), 'index.html missing');
ok(existsSync(join(dist, 'sw.js')), 'sw.js missing');
ok(existsSync(join(dist, '.nojekyll')), '.nojekyll missing');
ok(existsSync(join(dist, 'manifest.webmanifest')), 'manifest.webmanifest missing');

const html = read('index.html');
for (const m of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
  const u = m[1];
  ok(!u.startsWith('/'), `index.html uses root-relative URL ${u} (breaks on project pages)`);
  ok(!/^https?:/i.test(u), `index.html references external URL ${u}`);
  if (!u.startsWith('#') && !/^https?:/i.test(u)) ok(existsSync(join(dist, u.replace(/^\.\//, ''))), `index.html references missing file ${u}`);
}

const manifest = JSON.parse(read('manifest.webmanifest'));
for (const key of ['name', 'short_name', 'start_url', 'scope', 'display', 'icons', 'background_color', 'theme_color']) {
  ok(manifest[key] !== undefined, `manifest missing "${key}"`);
}
ok(manifest.display === 'standalone', 'manifest display must be standalone');
ok(manifest.start_url === './' && manifest.scope === './', 'manifest start_url/scope must be relative "./"');
const sizes = new Set();
for (const icon of manifest.icons || []) {
  ok(!icon.src.startsWith('/') && !/^https?:/.test(icon.src), `icon ${icon.src} must be relative`);
  ok(existsSync(join(dist, icon.src)), `icon ${icon.src} missing`);
  sizes.add(icon.sizes);
  if (existsSync(join(dist, icon.src))) {
    const buf = readFileSync(join(dist, icon.src));
    const w = buf.readUInt32BE(16);
    const h = buf.readUInt32BE(20);
    ok(`${w}x${h}` === icon.sizes, `icon ${icon.src} is ${w}x${h}, manifest says ${icon.sizes}`);
  }
}
ok(sizes.has('192x192') && sizes.has('512x512'), 'manifest needs 192 and 512 icons');
ok((manifest.icons || []).some((i) => i.purpose === 'maskable'), 'manifest needs a maskable icon');

const pre = JSON.parse(read('precache-manifest.json'));
const listed = new Set(pre.files.map((f) => f.url));
for (const f of pre.files) {
  const p = join(dist, f.url);
  if (!existsSync(p)) {
    errors.push(`precached file missing: ${f.url}`);
    continue;
  }
  const hash = createHash('sha256').update(readFileSync(p)).digest('hex');
  ok(hash === f.hash, `hash mismatch for ${f.url}`);
}
const sw = read('sw.js');
ok(sw.includes(pre.version), 'sw.js does not embed the precache version');
ok(!sw.includes('__PRECACHE_MANIFEST__'), 'sw.js placeholder not replaced');

// Every deployable file (except deployment metadata) must be precached.
function walk(dir, prefix = '') {
  return readdirSync(dir).flatMap((n) => {
    const full = join(dir, n);
    const rel = prefix + n;
    return statSync(full).isDirectory() ? walk(full, rel + '/') : [rel];
  });
}
for (const rel of walk(dist)) {
  if (['sw.js', 'precache-manifest.json', '.nojekyll'].includes(rel)) continue;
  ok(listed.has(rel), `file not precached: ${rel}`);
}

const groups = new Set(pre.files.map((f) => f.group));
for (const g of ['code', 'fonts', 'audio', 'art']) ok(groups.has(g), `no ${g} files in precache`);

for (const f of pre.files) {
  const ext = extname(f.url);
  if (['.css', '.html', '.webmanifest'].includes(ext)) {
    const text = read(f.url);
    const ext = text.match(/url\(\s*['"]?https?:\/\/[^)]+\)|@import\s+['"]?https?:/gi);
    ok(!ext, `${f.url} references an external resource: ${ext && ext[0]}`);
  }
  if (ext === '.js') {
    const text = read(f.url);
    const hits = text.match(/(fetch|import)\(\s*['"`]https?:\/\/[^'"`]+/g);
    ok(!hits, `${f.url} fetches/imports an external URL: ${hits && hits[0]}`);
    const urls = (text.match(/https?:\/\/[a-z0-9.-]+/gi) || []).filter((u) => !/w3\.org|localhost/.test(u));
    if (urls.length) warn.push(`${f.url} contains URL strings (not fetched): ${[...new Set(urls)].slice(0, 5).join(', ')}`);
  }
}

const total = pre.files.reduce((a, f) => a + f.size, 0);
console.log(`verify-dist: ${pre.files.length} precached files, ${(total / 1048576).toFixed(2)} MB, version ${pre.version}`);
for (const w of warn) console.log(`  note: ${w}`);
if (errors.length) {
  console.error('verify-dist FAILED:\n  - ' + errors.join('\n  - '));
  process.exit(1);
}
console.log('verify-dist: OK');
