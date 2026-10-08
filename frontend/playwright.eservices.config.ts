import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './test/browser', testMatch: 'eservices.spec.ts', workers: 1, outputDir: './test-results-eservices',
  use: { baseURL: 'http://127.0.0.1:5176', headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge', trace: 'retain-on-failure' },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5176 --strictPort', url: 'http://127.0.0.1:5176', reuseExistingServer: false,
    env: { VITE_SUPABASE_URL: 'http://127.0.0.1:54321', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_browser_test_only', VITE_ENABLE_MOCK_DATA: 'false', VITE_SUBMISSION_PAYMENTS_ENABLED: process.env.TEST_SUBMISSION_PAYMENTS ?? 'true' },
  },
});
