const { test, before, after, mock } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
require('reflect-metadata');
const { Module, Logger } = require('@nestjs/common');
const { NestFactory, APP_GUARD, APP_FILTER } = require('@nestjs/core');
const { PaymentsController } = require('../dist/api/payments/payments.controller');
const { PaymentsService } = require('../dist/api/payments/payments.service');
const { AuthGuard } = require('../dist/security/auth.guard');
const { SupabaseService } = require('../dist/supabase.service');
const { AllExceptionsFilter } = require('../dist/security/all-exceptions.filter');
const { configureApp } = require('../dist/configure-app');

const origin = 'https://talibon.gov.ph';
const calls = [];
let providerError = false;
const service = new PaymentsService();
// Only the external SDK is mocked: real controller, DTOs, service and HTTP pipeline.
service.xenditClient = { Invoice: { createInvoice: async ({ data }) => {
  calls.push(data);
  if (providerError) throw { response: { data: 'PRIVATE_PROVIDER_MARKER' }, status: 401 };
  return { id: 'invoice-test', invoiceUrl: 'https://checkout.example.test/invoice-test' };
} } };
class TestModule {}
Module({ controllers: [PaymentsController], providers: [
  { provide: PaymentsService, useValue: service },
  { provide: SupabaseService, useValue: { getClient() { throw new Error('Unexpected Auth call'); } } },
  { provide: APP_GUARD, useClass: AuthGuard },
  { provide: APP_FILTER, useClass: AllExceptionsFilter },
] })(TestModule);
let app, base;
const originalEnv = { NODE_ENV: process.env.NODE_ENV, PAYMENT_RETURN_ORIGIN: process.env.PAYMENT_RETURN_ORIGIN };
before(async () => {
  process.env.NODE_ENV = 'production';
  process.env.PAYMENT_RETURN_ORIGIN = origin;
  app = await NestFactory.create(TestModule, { logger: false, bodyParser: false });
  configureApp(app);
  await app.listen(0, '127.0.0.1');
  base = await app.getUrl();
});
after(async () => {
  await app?.close();
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
});
const valid = { itemName: 'Certificate', amount: 100 };
const post = (body, headers = {}, path = '/api/payments/create-checkout-session') => new Promise((resolve, reject) => {
  // node:http preserves an explicit hostile Host header (fetch may replace it).
  const req = http.request(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers } }, res => {
    const chunks = [];
    res.on('data', chunk => chunks.push(chunk));
    res.on('end', () => resolve(new Response(Buffer.concat(chunks), { status: res.statusCode })));
    res.on('error', reject);
  });
  req.on('error', reject);
  req.end(JSON.stringify(body));
});

test('checkout defaults use configured origin, never Host or forwarded headers', async () => {
  const res = await post(valid, { Host: 'evil.example', 'X-Forwarded-Host': 'evil.example', 'X-Forwarded-Proto': 'http' });
  assert.equal(res.status, 201);
  assert.equal(calls.at(-1).successRedirectUrl, origin + '/payment/success');
  assert.equal(calls.at(-1).failureRedirectUrl, origin + '/payment/cancel');
});

test('rejects unsafe return URLs before contacting the provider', async () => {
  for (const field of ['successUrl', 'cancelUrl']) {
    for (const url of ['https://evil.example', '//evil.example', 'javascript:alert(1)', 'https://talibon.gov.ph.evil.example', 'https://user:pass@talibon.gov.ph/payment/success', 'http://talibon.gov.ph', 'https://talibon.gov.ph:444/payment', 'not a URL', null]) {
      const count = calls.length;
      assert.equal((await post({ ...valid, [field]: url })).status, 400, `${field}: ${url}`);
      assert.equal(calls.length, count);
    }
  }
  assert.equal((await post({ ...valid, successUrl: origin + '/payment/success?reference=test', cancelUrl: origin + '/payment/cancel' })).status, 201);
});

test('checkout fails closed when return origin is missing or unsafe', async () => {
  try {
    for (const value of ['', 'not a URL', 'http://talibon.gov.ph', 'https://user:pass@talibon.gov.ph', 'https://talibon.gov.ph/other']) {
      process.env.PAYMENT_RETURN_ORIGIN = value;
      const count = calls.length;
      assert.equal((await post(valid)).status, 503, value);
      assert.equal(calls.length, count);
    }
  } finally { process.env.PAYMENT_RETURN_ORIGIN = origin; }
});

test('DTOs reject overposting, invalid amounts and item names before provider access', async () => {
  for (const body of [
    { ...valid, amount: 0 }, { ...valid, amount: -1 }, { ...valid, amount: 1000001 },
    { ...valid, amount: '100' }, { ...valid, amount: null }, { ...valid, amount: 1.001 },
    { ...valid, itemName: '' }, { ...valid, itemName: '   ' }, { ...valid, itemName: 'a'.repeat(101) },
    { ...valid, status: 'paid' }, { ...valid, userId: 'another-user' },
  ]) {
    const count = calls.length;
    assert.equal((await post(body)).status, 400, JSON.stringify(body));
    assert.equal(calls.length, count);
  }
});

test('provider errors are absent from response and application logs', async () => {
  const output = [];
  const consoleSpy = mock.method(console, 'error', (...args) => output.push(args));
  const loggerSpy = mock.method(Logger.prototype, 'error', (...args) => output.push(args));
  providerError = true;
  try {
    const res = await post(valid);
    assert.equal(res.status, 500);
    assert.doesNotMatch(await res.text(), /PRIVATE_PROVIDER_MARKER/);
    assert.doesNotMatch(JSON.stringify(output), /PRIVATE_PROVIDER_MARKER/);
  } finally { providerError = false; consoleSpy.mock.restore(); loggerSpy.mock.restore(); }
});

test('concurrent checkout invoices have distinct external IDs', async () => {
  const now = mock.method(Date, 'now', () => 1700000000000);
  const start = calls.length;
  try {
    await Promise.all([post(valid), post(valid)]);
    assert.equal(new Set(calls.slice(start).map(call => call.externalId)).size, 2);
  } finally { now.mock.restore(); }
});

// No handler exists in S3-BE-02 yet. These are release blockers, not passing mock checks.
test.todo('S3-BE-02: webhook rejects missing/forged credentials and altered payloads');
test.todo('S3-BE-02: verified webhook matches invoice, submission, amount and currency');
test.todo('S3-BE-02: duplicate, concurrent and out-of-order events settle exactly once');
test.todo('S3-BE-02: persistence failure is retryable and cannot acknowledge settlement');
