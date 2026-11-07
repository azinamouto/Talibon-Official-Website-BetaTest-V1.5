import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkRuntime, violations } from '../check-runtime.mjs';
test('active sources, configuration and lockfiles exclude retired runtime', () => assert.ok(checkRuntime() > 0));
test('gate rejects imports, credentials, URLs and transitive lock entries', () => {
  for (const text of ['import x from "@supabase/supabase-js"', 'SUPABASE_URL=', 'https://project.supabase.co/storage/v1/object', 'sb_secret_test', 'node_modules/@supabase/auth-js']) assert.equal(violations(text),true);
  assert.equal(violations('DATABASE_URL=\nSTAFF_AUTH_SECRET='),false);
});
