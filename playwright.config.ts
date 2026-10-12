import { defineConfig, devices } from '@playwright/test';

// End-to-end tests run against the PRODUCTION build (`npm run build` first), served the way GitHub
// Pages serves it: under a project sub-path (/Escape-flight/) with Cache-Control: max-age=600.
// The server's control endpoints (switch build, simulate no network, request log) are used by the
// offline and update tests. Tests share that server, so they run one at a time.
export const PORT = 4173;
export const ORIGIN = `http://localhost:${PORT}`;
export const BASE = `${ORIGIN}/Escape-flight/`;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 25 * 60_000,
  expect: { timeout: 15_000 },
  workers: 1,
  fullyParallel: false,
  retries: 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  globalSetup: './tests/e2e/global-setup.ts',
  use: {
    ...devices['Pixel 7'],
    baseURL: BASE,
    serviceWorkers: 'allow',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: `node scripts/serve-dist.mjs --dir dist --port ${PORT} --control`,
    url: BASE,
    reuseExistingServer: false,
    stdout: 'ignore',
  },
});
