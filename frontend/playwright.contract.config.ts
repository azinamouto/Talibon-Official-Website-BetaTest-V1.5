import { defineConfig } from '@playwright/test';
import base from './playwright.config';

const frontend = base.webServer as Exclude<typeof base.webServer, unknown[]>;
export default defineConfig({
  ...base,
  use: { ...base.use, baseURL: 'http://127.0.0.1:53145' },
  outputDir: './test-results/contracts',
  testMatch: ['about-contract.spec.ts', 'public-contract.spec.ts', 'search-contract.spec.ts'],
  testIgnore: [],
  webServer: [
    { command: 'npm run mock:api', url: 'http://127.0.0.1:53141/api/openapi.json', reuseExistingServer: false, env: { CONTRACT_MOCK_PORT: '53141' } },
    { ...frontend, command: 'npm run dev -- --host 127.0.0.1 --port 53145 --strictPort', url: 'http://127.0.0.1:53145', env: { ...frontend.env, VITE_API_URL: 'http://127.0.0.1:53141' } },
  ],
});
