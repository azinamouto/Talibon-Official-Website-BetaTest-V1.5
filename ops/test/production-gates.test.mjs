import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const get = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('static Vercel frontend has defense-in-depth headers', () => {
  const config = JSON.parse(get('vercel.json'));
  const headers = config.headers?.find(item => item.source === '/(.*)')?.headers ?? [];
  for (const key of ['X-Content-Type-Options', 'Referrer-Policy', 'X-Frame-Options', 'Strict-Transport-Security', 'Content-Security-Policy']) {
    assert.ok(headers.some(header => header.key === key), `missing ${key}`);
  }
});
test('release verifies official data and requires approval evidence', () => {
  const release = get('.github/workflows/production-release.yml');
  assert.match(release, /official_data_evidence:/);
  assert.match(release, /psql -X -v ON_ERROR_STOP=1 -f ops\/verify-official-data\.sql/);
  const gate = get('ops/verify-official-data.sql');
  assert.match(gate, /RAISE EXCEPTION/);
  assert.doesNotMatch(gate, /\b(?:DELETE|UPDATE|TRUNCATE)\s+public\./i);
});
test('unsafe client-defined checkout is disabled at both layers', () => {
  assert.match(get('backend/src/api/payments/payments.controller.ts'), /ServiceUnavailableException/);
  assert.match(get('frontend/src/services/submissionPaymentService.ts'), /submissionPaymentsEnabled = false/);
  assert.doesNotMatch(get('frontend/src/components/PaymentButton.tsx'), /paymentService\.createCheckoutSession/);
});
test('staff may not inspect the unscoped submission queue', () => {
  const source = get('backend/src/api/forms/forms.controller.ts');
  assert.doesNotMatch(source, /@Roles\([^)]*'staff'[^)]*\)/);
});

test('R2 production binding cannot load transaction or notification providers', () => {
  const module = get('backend/src/app.module.ts');
  assert.doesNotMatch(module, /\b(?:FormsService|FormsController|PaymentsModule|NotificationsModule|ChatController)\b/);
  assert.match(module, /PublicFormsController/);
  const configure = get('backend/src/configure-app.ts');
  assert.ok(configure.indexOf('app.use(deferredRoutes)') < configure.indexOf('app.use(express.json'));
  const routes = get('frontend/src/App.tsx');
  for (const path of ['/forms/*', '/payment/*', '/e-services/*']) assert.ok(routes.includes(`path="${path}" element={<EServicesPage />}`));
  assert.doesNotMatch(routes, /import (PaymentReturn|PaymentSuccess|BusinessPermitPage|BuildingPermitPage|ZoningClearancePage)/);
  assert.doesNotMatch(get('backend/src/api/notifications/email-worker.ts'), /NestFactory|processPending/);
  assert.doesNotMatch(get('supabase/functions/send-status-email/index.ts'), /createClient|fetch\(|Deno.env/);
});
