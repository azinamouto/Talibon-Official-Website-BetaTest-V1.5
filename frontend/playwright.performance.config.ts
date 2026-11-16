import { defineConfig } from '@playwright/test';

// Verify the actual production chunks, with all API/network fixtures kept local.
export default defineConfig({
  testDir: './test/browser',
  testMatch: ['route-performance.spec.ts', 'login-layout-performance.spec.ts', 'r2-scope.spec.ts', 'r2-frontend-migration.spec.ts', 'final-media.spec.ts', 'three-ui-fixes.spec.ts'],
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:5197',
    headless: true,
    channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 5197 --strictPort',
    url: 'http://127.0.0.1:5197',
    reuseExistingServer: false,
  },
});
