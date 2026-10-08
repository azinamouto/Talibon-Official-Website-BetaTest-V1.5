import { defineConfig } from '@playwright/test';
import base from './playwright.config';

const frontend = base.webServer as Exclude<typeof base.webServer, unknown[]>;
export default defineConfig({
  ...base,
  testMatch: ['about-contract.spec.ts', 'public-contract.spec.ts'],
  testIgnore: [],
  webServer: [
    { command: 'npm run mock:api', url: 'http://127.0.0.1:4010/api/openapi.json', reuseExistingServer: false },
    { ...frontend, env: { ...frontend.env, VITE_API_URL: 'http://127.0.0.1:4010' } },
  ],
});
