require('reflect-metadata');
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { Module } = require('@nestjs/common');
const { NestFactory, APP_GUARD } = require('@nestjs/core');
const { ChatController } = require('../dist/api/chat/chat.controller');
const { ChatService } = require('../dist/api/chat/chat.service');
const { SupabaseService } = require('../dist/supabase.service');
const { AuthGuard } = require('../dist/security/auth.guard');
const { RateLimiterGuard } = require('../dist/security/rate-limiter.guard');
const { configureApp } = require('../dist/configure-app');

const userId = randomUUID();
const validToken = `h.${Buffer.from(JSON.stringify({ session_id: userId })).toString('base64url')}.s`;

const mockClient = {
  auth: {
    getUser: async (token) => {
      if (token === validToken) {
        return { data: { user: { id: userId, email: 'citizen@talibon.gov.ph' } }, error: null };
      }
      return { data: { user: null }, error: { message: 'Invalid JWT' } };
    },
  },
  from: (table) => ({
    select: () => ({
      eq: () => ({
        maybeSingle: async () => ({
          data: { id: userId, role: 'citizen', is_verified: true, deleted_at: null },
          error: null,
        }),
      }),
    }),
  }),
  rpc: async (name) => {
    if (name === 'is_api_session_active') return { data: true };
    return { data: null };
  },
};

class TestChatModule {}
Module({
  controllers: [ChatController],
  providers: [
    ChatService,
    { provide: SupabaseService, useValue: { getClient: () => mockClient } },
    { provide: APP_GUARD, useClass: RateLimiterGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})(TestChatModule);

let app;
let baseUrl;

before(async () => {
  app = await NestFactory.create(TestChatModule, { logger: false });
  configureApp(app);
  await app.listen(0, '127.0.0.1');
  baseUrl = await app.getUrl();
});

after(async () => {
  if (app) await app.close();
});

test('POST /api/chat rejects anonymous requests with 401 Unauthorized', async () => {
  const res = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Hello' }),
  });
  assert.equal(res.status, 401);
});

test('POST /api/chat succeeds with authenticated session and returns municipal response', async () => {
  const res = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${validToken}`,
    },
    body: JSON.stringify({
      message: 'Where is the Business Permits and Licensing Office located?',
    }),
  });

  assert.equal(res.status, 201);
  const body = await res.json();
  assert.ok(body.reply, 'Response must have reply');
  assert.ok(body.conversationId, 'Response must have conversationId');
  assert.ok(Array.isArray(body.sources), 'Response must have sources array');
  assert.ok(body.sources.some((s) => s.includes('BPLO') || s.includes('Business')), 'Must identify BPLO source');
  assert.ok(body.timestamp, 'Response must have timestamp');
});

test('input validation rejects empty messages, oversized inputs, and invalid history', async () => {
  // Empty body
  let res = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${validToken}` },
    body: JSON.stringify({}),
  });
  assert.equal(res.status, 400);

  // Blank message
  res = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${validToken}` },
    body: JSON.stringify({ message: '   ' }),
  });
  assert.equal(res.status, 400);

  // Message > 2000 chars
  res = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${validToken}` },
    body: JSON.stringify({ message: 'x'.repeat(2001) }),
  });
  assert.equal(res.status, 400);

  // Invalid conversationId (not UUID)
  res = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${validToken}` },
    body: JSON.stringify({ message: 'Hello', conversationId: 'not-a-uuid' }),
  });
  assert.equal(res.status, 400);

  // History > 10 items
  res = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${validToken}` },
    body: JSON.stringify({
      message: 'Hello',
      history: Array.from({ length: 11 }, () => ({ role: 'user', content: 'hi' })),
    }),
  });
  assert.equal(res.status, 400);

  // Unknown property (overposting check)
  res = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${validToken}` },
    body: JSON.stringify({ message: 'Hello', unexpectedProperty: true }),
  });
  assert.equal(res.status, 400);
});

test('rate limiter enforces 10 queries per minute limit and provides Retry-After header', async () => {
  let hitRateLimit = false;
  let retryAfter = null;

  for (let i = 0; i < 15; i++) {
    const res = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${validToken}`,
      },
      body: JSON.stringify({ message: `Test rate limit query #${i}` }),
    });

    if (res.status === 429) {
      hitRateLimit = true;
      retryAfter = res.headers.get('Retry-After');
      break;
    }
  }

  assert.ok(hitRateLimit, 'Rate limiter must trigger 429 Too Many Requests after threshold');
  assert.ok(retryAfter, 'Rate limiter response must include Retry-After header');
});

test('OpenAPI documentation covers /api/chat with Bearer auth, schemas, and error responses', async () => {
  const res = await fetch(`${baseUrl}/api/openapi.json`);
  assert.equal(res.status, 200);

  const doc = await res.json();
  const chatPath = doc.paths['/api/chat'];
  assert.ok(chatPath, 'OpenAPI must document /api/chat');
  assert.ok(chatPath.post, 'OpenAPI must document POST /api/chat');

  const postOp = chatPath.post;
  assert.ok(postOp.security.some((s) => s.bearer || s.bearerAuth || Object.keys(s).length > 0), 'Must declare Bearer auth');
  assert.ok(postOp.responses['201'], 'Must document 201 response');
  assert.ok(postOp.responses['400'], 'Must document 400 response');
  assert.ok(postOp.responses['401'], 'Must document 401 response');
  assert.ok(postOp.responses['429'], 'Must document 429 response');
});

test('provider errors return 502 without exposing private provider details', async () => {
  const service = app.get(ChatService);
  const originalKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'test-gemini-key';

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    if (typeof url === 'string' && url.includes('generativelanguage.googleapis.com')) {
      return {
        ok: false,
        status: 500,
        text: async () => 'INTERNAL_GOOGLE_PROVIDER_SECRET_ERROR: Quota exceeded or internal crash',
      };
    }
    return originalFetch(url, opts);
  };

  try {
    let error;
    try {
      await service.chat({ message: 'Hello AI' });
    } catch (err) {
      error = err;
    }
    assert.ok(error, 'Must throw error on provider failure');
    assert.equal(error.getStatus(), 502);
    assert.doesNotMatch(error.message, /INTERNAL_GOOGLE_PROVIDER_SECRET_ERROR/);
    assert.doesNotMatch(error.message, /test-gemini-key/);
  } finally {
    globalThis.fetch = originalFetch;
    process.env.GEMINI_API_KEY = originalKey;
  }
});

test('provider timeouts return 504 Gateway Timeout cleanly', async () => {
  const service = app.get(ChatService);
  const originalKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'test-gemini-key';

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    if (typeof url === 'string' && url.includes('generativelanguage.googleapis.com')) {
      const err = new Error('The operation was aborted due to timeout');
      err.name = 'TimeoutError';
      throw err;
    }
    return originalFetch(url, opts);
  };

  try {
    let error;
    try {
      await service.chat({ message: 'Hello timeout' });
    } catch (err) {
      error = err;
    }
    assert.ok(error, 'Must throw error on provider timeout');
    assert.equal(error.getStatus(), 504);
  } finally {
    globalThis.fetch = originalFetch;
    process.env.GEMINI_API_KEY = originalKey;
  }
});

