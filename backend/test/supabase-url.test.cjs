const { test } = require('node:test');
const assert = require('node:assert/strict');
require('reflect-metadata');
const { SupabaseService } = require('../dist/supabase.service');

for (const suffix of ['', '/', '/rest/v1', '/rest/v1/']) {
  test(`authentication uses the project root for URL suffix ${JSON.stringify(suffix)}`, async () => {
    const names = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_ANON_KEY'];
    const original = Object.fromEntries(names.map(name => [name, process.env[name]]));
    const originalFetch = global.fetch;
    const requests = [];
    try {
      process.env.SUPABASE_URL = `  https://project.example.test${suffix}  `;
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'server-only-test-key';
      process.env.SUPABASE_PUBLISHABLE_KEY = 'public-test-key';
      global.fetch = async (url, options) => {
        requests.push({ url: String(url), options });
        return new Response(JSON.stringify({ error: 'invalid_grant', error_description: 'Test credentials' }), {
          status: 400, headers: { 'content-type': 'application/json' },
        });
      };
      const service = new SupabaseService();
      const authClient = service.createAuthClient();
      const { error } = await authClient.auth.signInWithPassword({ email: 'test@example.test', password: 'test-password' });
      assert.ok(error);
      assert.equal(requests.length, 1);
      assert.equal(requests[0].url, 'https://project.example.test/auth/v1/token?grant_type=password');
      assert.equal(new Headers(requests[0].options.headers).get('apikey'), 'public-test-key');
      assert.equal(service.getClient().rest.url, 'https://project.example.test/rest/v1');
    } finally {
      global.fetch = originalFetch;
      for (const name of names) {
        if (original[name] === undefined) delete process.env[name];
        else process.env[name] = original[name];
      }
    }
  });
}
