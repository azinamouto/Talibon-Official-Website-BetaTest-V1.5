import { defineConfig } from '@playwright/test';
import base from './playwright.config';

export default defineConfig({
  ...base, testIgnore: [], outputDir: './test-results/staff',
  projects: [
    { name: 'recovery-off', testMatch: ['staff-login.spec.ts', 'foundation.spec.ts', 'staff-recovery-disabled.spec.ts'], use: { ...base.use, baseURL: 'http://127.0.0.1:53148' } },
    { name: 'recovery-on', testMatch: 'staff-recovery-enabled.spec.ts', use: { ...base.use, baseURL: 'http://127.0.0.1:53149' } },
  ],
  webServer: [false, true].map(enabled => ({
    command: `npm run dev -- --host 127.0.0.1 --port ${enabled ? 53149 : 53148} --strictPort`,
    url: `http://127.0.0.1:${enabled ? 53149 : 53148}`, reuseExistingServer: false,
    env: { VITE_STAFF_PASSWORD_RECOVERY_ENABLED: enabled ? 'true' : 'false' },
  })),
});
