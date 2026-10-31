const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
require('reflect-metadata');
const { Module } = require('@nestjs/common');
const { NestFactory, APP_GUARD, APP_FILTER } = require('@nestjs/core');
const { PaymentsController } = require('../dist/api/payments/payments.controller');
const { AuthGuard } = require('../dist/security/auth.guard');
const { SupabaseService } = require('../dist/supabase.service');
const { AllExceptionsFilter } = require('../dist/security/all-exceptions.filter');
const { configureApp } = require('../dist/configure-app');

// No Xendit client is injected. The retired endpoint must never contact a provider.
class TestModule {}
Module({
  controllers: [PaymentsController],
  providers: [
    { provide: SupabaseService, useValue: { getClient() { throw new Error('Unexpected auth/provider call'); } } },
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})(TestModule);
let app, base;
before(async () => {
  app = await NestFactory.create(TestModule, { logger: false, bodyParser: false });
  configureApp(app);
  await app.listen(0, '127.0.0.1');
  base = await app.getUrl();
});
after(async () => app?.close());
function checkout(body, headers = {}) {
  return fetch(base + '/api/payments/create-checkout-session', {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

test('public checkout is unavailable even with a well-formed client-controlled amount', async () => {
  const response = await checkout({ itemName: 'Unverified municipal fee', amount: 100 });
  assert.equal(response.status, 503);
  assert.match(await response.text(), /unavailable/i);
});
test('client amount or return URL cannot unlock checkout', async () => {
  for (const payload of [
    { itemName: 'Business Permit', amount: 1, successUrl: 'https://talibon.gov.ph/payment/success' },
    { itemName: 'Business Permit', amount: 1000000 },
  ]) assert.equal((await checkout(payload)).status, 503);
});
test('DTO validation still rejects overposting and malformed amounts', async () => {
  for (const body of [
    { itemName: 'Permit', amount: -1 },
    { itemName: 'Permit', amount: '100' },
    { itemName: 'Permit', amount: 1.001 },
    { itemName: 'Permit', amount: 100, status: 'paid' },
  ]) assert.equal((await checkout(body)).status, 400, JSON.stringify(body));
});
test('payment route has request hardening without cookies or exposed secrets', async () => {
  const response = await checkout({ itemName: 'Permit', amount: 100 });
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.match(response.headers.get('content-security-policy') ?? '', /default-src 'none'/);
});

// Explicit release blockers: these tests must be implemented before payments reopen.
test.todo('S3-BE-02: webhook rejects missing/forged credentials and altered payloads');
test.todo('S3-BE-02: verified webhook matches invoice, submission, amount and currency');
test.todo('S3-BE-02: duplicate, concurrent and out-of-order events settle exactly once');
test.todo('S3-BE-02: persistence failure is retryable and cannot acknowledge settlement');
