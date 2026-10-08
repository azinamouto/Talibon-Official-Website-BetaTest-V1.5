import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './test/browser',
  testIgnore: ['about-contract.spec.ts', 'public-contract.spec.ts', 'eservices.spec.ts', 'admin.spec.ts'],
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:5174',
    headless: true,
    channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5174 --strictPort',
    url: 'http://127.0.0.1:5174',
    reuseExistingServer: false,
    env: {
      VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_browser_test_only',
      VITE_ENABLE_MOCK_DATA: 'false',
    },
  },
});
