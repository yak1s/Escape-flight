#!/usr/bin/env node
// Renders the app icons (PNG) from an inline SVG using Playwright's Chromium.
// Output is committed to public/icons so CI does not need a browser to build.
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const icon = (maskable) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <radialGradient id="bg" cx="0.5" cy="0.35" r="0.75">
      <stop offset="0" stop-color="#16294f"/>
      <stop offset="1" stop-color="#070b18"/>
    </radialGradient>
    <linearGradient id="au" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#7de3b8" stop-opacity="0"/>
      <stop offset="0.5" stop-color="#7de3b8" stop-opacity="0.9"/>
      <stop offset="1" stop-color="#a597ff" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="br" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f6dfa2"/>
      <stop offset="0.5" stop-color="#c9a45c"/>
      <stop offset="1" stop-color="#7a5a26"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="${maskable ? 0 : 112}" fill="url(#bg)"/>
  <g transform="${maskable ? 'translate(51 51) scale(0.8)' : ''}">
    <path d="M-20 230 C 120 120, 300 300, 540 170 L540 250 C 300 380, 120 200, -20 310 Z" fill="url(#au)" opacity="0.85"/>
    <path d="M-20 170 C 140 80, 320 220, 540 120 L540 160 C 320 270, 140 130, -20 215 Z" fill="url(#au)" opacity="0.5"/>
    <g transform="translate(256 262)">
      <ellipse cx="0" cy="0" rx="176" ry="54" fill="url(#br)" stroke="#3a2a10" stroke-width="6"/>
      <path d="M-150 -18 C -60 -40, 60 -40, 150 -18" stroke="#fff3c9" stroke-width="5" fill="none" opacity="0.7"/>
      ${[-110, -55, 0, 55, 110].map((x) => `<line x1="${x}" y1="-50" x2="${x}" y2="50" stroke="#7a5a26" stroke-width="4" opacity="0.7"/>`).join('')}
      <path d="M150 0 L210 -38 L208 38 Z" fill="url(#br)" stroke="#3a2a10" stroke-width="5"/>
      <rect x="-40" y="50" width="80" height="26" rx="8" fill="#7a5a26" stroke="#3a2a10" stroke-width="5"/>
    </g>
    <path d="M110 420 L402 420" stroke="#d7eef3" stroke-width="10" stroke-linecap="round" opacity="0.85"/>
    <path d="M150 448 L362 448" stroke="#d7eef3" stroke-width="7" stroke-linecap="round" opacity="0.5"/>
  </g>
</svg>`;

const targets = [
  ['public/icons/icon-192.png', 192, false],
  ['public/icons/icon-512.png', 512, false],
  ['public/icons/icon-maskable-512.png', 512, true],
  ['public/icons/apple-touch-icon.png', 180, true],
];

mkdirSync('public/icons', { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage();
for (const [file, size, maskable] of targets) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:transparent">${icon(maskable).replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
  const buf = await page.screenshot({ omitBackground: !maskable, clip: { x: 0, y: 0, width: size, height: size } });
  writeFileSync(file, buf);
  console.log('wrote', file);
}
writeFileSync('public/icons/icon.svg', icon(false));
await browser.close();
