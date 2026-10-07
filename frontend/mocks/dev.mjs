import { createServer } from 'vite';
import { createMockServer } from './server.mjs';

// Process-only development settings. Never written to .env or production bundles.
process.env.VITE_API_URL = 'http://127.0.0.1:4010';
process.env.VITE_SUPABASE_URL = 'http://127.0.0.1:54321';
process.env.VITE_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_contract_examples_only';
process.env.VITE_ENABLE_MOCK_DATA = 'false';
const mock = createMockServer();
await new Promise((resolve, reject) => { mock.once('error', reject); mock.listen(4010, '127.0.0.1', resolve); });
try {
  const vite = await createServer({ server: { host: '127.0.0.1' } });
  await vite.listen();
  vite.printUrls();
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => { await vite.close(); mock.close(); });
} catch (error) { mock.close(); throw error; }
