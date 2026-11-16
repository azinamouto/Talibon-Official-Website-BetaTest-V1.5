import { defineConfig } from '@playwright/test';

export default defineConfig({
  forbidOnly: true,
  testDir: './test/browser', testMatch: 'eservices.spec.ts', workers: 1, outputDir: './test-results-eservices',
  use: { baseURL: 'http://127.0.0.1:53146', headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge', trace: 'retain-on-failure', launchOptions: { args: ['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost, EXCLUDE 127.0.0.1', '--no-proxy-server'] } },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 53146 --strictPort', url: 'http://127.0.0.1:53146', reuseExistingServer: false,
  },
});
