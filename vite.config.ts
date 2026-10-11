import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
// @ts-expect-error — plain ESM build helper without type declarations
import { offlinePrecache } from './scripts/offline-precache-plugin.mjs';

// One build id shared by the page bundle and the service worker.
const BUILD_TIME = new Date().toISOString();
const BUILD_ID = process.env.BUILD_ID || BUILD_TIME.replace(/[-:TZ.]/g, '').slice(0, 14);

export default defineConfig({
  // Relative base: every asset URL resolves next to index.html, so the game works at
  // https://<user>.github.io/<repo>/ (or any sub-path) without hard-coding the repo name.
  base: './',
  plugins: [preact(), offlinePrecache({ buildId: BUILD_ID, buildTime: BUILD_TIME })],
  define: {
    __BUILD_ID__: JSON.stringify(BUILD_ID),
    __BUILD_TIME__: JSON.stringify(BUILD_TIME),
  },
  build: {
    target: 'es2019',
    sourcemap: false,
    chunkSizeWarningLimit: 3000,
    assetsInlineLimit: 0,
    // Everything ships in one predictable bundle; no network-loaded chunks.
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
});
