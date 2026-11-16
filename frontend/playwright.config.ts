import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './test/browser',
  testIgnore: ['about-contract.spec.ts', 'public-contract.spec.ts', 'search-contract.spec.ts', 'eservices.spec.ts', 'admin.spec.ts', 'staff-recovery-enabled.spec.ts', 'login-layout-performance.spec.ts', 'route-performance.spec.ts'],
  forbidOnly: true,
  outputDir: './test-results/browser',
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:53144',
    headless: true,
    channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge',
    trace: 'retain-on-failure',
    launchOptions: { args: ['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost, EXCLUDE 127.0.0.1', '--no-proxy-server'] },
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 53144 --strictPort',
    url: 'http://127.0.0.1:53144',
    reuseExistingServer: false,
  },
});
