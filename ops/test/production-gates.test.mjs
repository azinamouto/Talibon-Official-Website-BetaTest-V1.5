import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
const get = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('combined deployment routes API requests to the backend and deep links to the SPA', () => {
  assert.equal(existsSync(new URL('../../frontend/vercel.json', import.meta.url)), false,
    'Use the repository-root deployment; a frontend-only config omits the same-origin API');
  const config = JSON.parse(get('vercel.json'));
  const destination = path => config.rewrites.find(rule =>
    new RegExp(`^${rule.source}$`).test(path))?.destination;
  for (const path of ['/api/health', '/api/about/profile', '/api/auth/me']) {
    assert.equal(destination(path), '/api', `${path} must reach the backend`);
  }
  assert.equal(destination('/about/barangays'), '/index.html');
  assert.ok(existsSync(new URL('../../api/index.js', import.meta.url)));
  assert.ok(config.functions['api/index.js'].includeFiles.includes('backend/dist'));
});

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
  assert.match(get('frontend/src/App.tsx'), /path="\/payment\/\*" element=\{<EServicesPage \/>\}/);
  assert.match(get('backend/src/security/deferred-routes.middleware.ts'), /payment/);
  assert.doesNotMatch(get('frontend/src/components/PaymentButton.tsx'), /paymentService\.createCheckoutSession/);
});
test('staff may not inspect the unscoped submission queue', () => {
  const source = get('archive/r1/backend/src/api/forms/forms.controller.ts');
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

test('database backup is explicitly gated, encrypted, checksummed and retains grants', () => {
  const workflow = get('.github/workflows/database-backup.yml');
  assert.match(workflow, /if: vars\.PRODUCTION_BACKUP_ENABLED == 'true'/);
  assert.match(workflow, /PGSSLMODE: verify-full/);
  assert.match(workflow, /pg_dump --format=custom --no-owner/);
  assert.doesNotMatch(workflow, /--no-privileges|--no-acl|SUPABASE_|supabase db dump/i);
  assert.match(workflow, /age -r "\$AGE_RECIPIENT" -o ops\/backups\/database\.tar\.age/);
  assert.match(workflow, /sha256sum database\.tar\.age > database\.tar\.age\.sha256/);
  assert.match(workflow, /retention-days: 30/);
});


test('production SPA restricts scripts to self and production runtime pins supported Node',()=>{
 const config=JSON.parse(get('vercel.json'));
 const csp=config.headers[0].headers.find(x=>x.key==='Content-Security-Policy').value;
 assert.match(csp,/script-src 'self';/);assert.doesNotMatch(csp,/unsafe-eval/);assert.match(csp,/object-src 'none'/);
 assert.match(get('backend/src/configure-app.ts'),/NODE_ENV !== 'production'/);
 assert.match(JSON.parse(get('backend/package.json')).engines.node,/>=22.16.0/);
});
