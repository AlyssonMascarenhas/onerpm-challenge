import { defineConfig, devices } from '@playwright/test';

const PORT = 4300;
const isCI = !!process.env['CI'];

/**
 * End-to-end tests run against the production build served by the real Express/SSR server
 * (`npm run build` first). Spotify is never contacted: the browser's calls to `/api/tracks` are
 * answered with recorded data, and the server runs WITHOUT credentials, so the "integration
 * unavailable" path is exercised with the real BFF.
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: true,
  // Each test drives a real browser against one Node server: a few workers are plenty and stay stable.
  workers: 2,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } },
    },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'node dist/onerpm-tracks/server/server.mjs',
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    stdout: 'ignore',
    timeout: 60_000,
    env: {
      PORT: String(PORT),
      NG_ALLOWED_HOSTS: 'localhost',
      // Empty values win over any local .env: the BFF must report the integration as unavailable.
      SPOTIFY_CLIENT_ID: '',
      SPOTIFY_CLIENT_SECRET: '',
    },
  },
});
