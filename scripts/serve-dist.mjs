#!/usr/bin/env node
// Minimal static server that mimics GitHub Pages for local testing:
//  - serves a build directory under a project sub-path (default /Escape-flight/)
//  - ignores query strings, redirects /Escape-flight -> /Escape-flight/
//  - sends `Cache-Control: max-age=600` like GitHub Pages
// Usage: node scripts/serve-dist.mjs [--dir dist] [--port 4173] [--base /Escape-flight/]
// The served directory can be switched at runtime (used by update tests):
//   POST /__control/serve?dir=<absolute path>   (only when --control is passed)
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, normalize, extname, resolve } from 'node:path';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, cur, i, all) => {
    if (cur.startsWith('--')) acc.push([cur.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : 'true']);
    return acc;
  }, []),
);
let root = resolve(args.dir || 'dist');
const port = Number(args.port || process.env.PORT || 4173);
const base = (args.base || '/Escape-flight/').replace(/\/?$/, '/');
const control = args.control === 'true';
let offline = false;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg',
  '.txt': 'text/plain; charset=utf-8',
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (control && url.pathname === '/__control/serve') {
    root = resolve(url.searchParams.get('dir'));
    res.writeHead(200).end(`serving ${root}`);
    return;
  }
  if (control && url.pathname === '/__control/offline') {
    offline = url.searchParams.get('value') === '1';
    res.writeHead(200).end(`offline=${offline}`);
    return;
  }
  if (offline) {
    req.socket.destroy();
    return;
  }
  if (url.pathname === base.slice(0, -1)) {
    res.writeHead(301, { Location: base }).end();
    return;
  }
  if (!url.pathname.startsWith(base)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found (outside project path)');
    return;
  }
  let rel = decodeURIComponent(url.pathname.slice(base.length)) || 'index.html';
  if (rel.endsWith('/')) rel += 'index.html';
  const file = normalize(join(root, rel));
  if (!file.startsWith(root)) {
    res.writeHead(403).end();
    return;
  }
  try {
    const st = await stat(file);
    if (!st.isFile()) throw new Error('not a file');
    const body = await readFile(file);
    res.writeHead(200, {
      'Content-Type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream',
      'Content-Length': body.length,
      'Cache-Control': 'max-age=600',
    });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/html' }).end('<h1>404</h1>');
  }
});

server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Serving ${root} at http://localhost:${port}${base}`);
});
