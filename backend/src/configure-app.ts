import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import express from 'express';
import { DEFERRED_MESSAGE, deferredRoutes } from './security/deferred-routes.middleware';
import { randomUUID } from 'node:crypto';
import { SecurityHeadersMiddleware } from './security/security-headers.middleware';
import { requestMetrics } from './security/request-metrics.middleware';
import { staffAuthentication } from './authentication/runtime';

export function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  const allowed = (process.env.ALLOWED_ORIGINS || '').split(',').map(value => value.trim());
  if (allowed.includes(origin)) return true;
  if (process.env.NODE_ENV === 'production') return false;
  try {
    const url = new URL(origin);
    return ['http:', 'https:'].includes(url.protocol) &&
      ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  } catch { return false; }
}

/** Shared by standalone, serverless, and HTTP integration tests. */
export function configureApp(app: INestApplication) {
  const server = app.getHttpAdapter().getInstance();
  server.disable('x-powered-by');
  // Trust only explicitly configured proxy addresses/subnets, never arbitrary forwarded headers.
  server.set('trust proxy', (process.env.TRUSTED_PROXIES || '').split(',').map(v => v.trim()).filter(Boolean));
  app.use((req, res, next) => {
    res.vary('X-API-Version');
    req.requestId = randomUUID();
    res.setHeader('X-Request-Id', req.requestId);
    next();
  });
  app.use(new SecurityHeadersMiddleware().use);
  app.use(requestMetrics);
  app.use(deferredRoutes);
  app.use('/api/admin/media/uploads', express.json({ limit: '3mb' }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ limit: '1mb', extended: false }));
  app.use((req, res, next) => {
    if (!req.path.startsWith('/api/staff-auth') && req.path !== '/api/staff' && !req.path.startsWith('/api/staff/')) return next();
    try {
      const auth = staffAuthentication();
      if (auth) return void auth.handle(req, res, next);
    } catch (error) {
      const code = error instanceof Error ? error.name : 'unknown';
      console.error(`[staff-auth] middleware initialization failed code=${code}`);
    }
    res.setHeader('Cache-Control', 'no-store');
    res.status(503).json({ message: 'Staff authentication is unavailable.' });
  });
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, forbidNonWhitelisted: true, transform: true,
    forbidUnknownValues: true,
  }));
  // Existing clients default to v1; explicit unsupported versions receive 404.
  app.enableVersioning({
    type: VersioningType.CUSTOM,
    defaultVersion: '1',
    extractor: (req: express.Request) => req.headers['x-api-version'] ?? '1',
  });
  app.enableCors({
    origin: (origin, callback) => callback(null, isAllowedOrigin(origin)),
    credentials: false,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-API-Version'],
    exposedHeaders: ['X-Request-Id', 'Retry-After'],
  });
  if (process.env.NODE_ENV !== 'production') SwaggerModule.setup('api/docs', app, () => createApiDocument(app), {
    jsonDocumentUrl: 'api/openapi.json',
    swaggerOptions: { persistAuthorization: false },
  });
}

export function createApiDocument(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('Talibon Municipal API')
    .setDescription('Send X-API-Version: 1 (default when omitted). Legacy auth and administration routes return 410. Staff operations use Better Auth HttpOnly cookies and MFA. Errors contain success, statusCode, error, message, timestamp and requestId.')
    .setVersion('1')
    .addBearerAuth()
    .addCookieAuth('__Secure-talgov-staff.session_token', { type: 'apiKey', in: 'cookie' }, 'staffCookie')
    .addGlobalParameters({ in: 'header', name: 'X-API-Version', required: false, schema: { type: 'string', enum: ['1'], default: '1' } })
    .build();
  const document = SwaggerModule.createDocument(app, config);
  // Document the enforced boundary, including former and future-shaped workflow aliases.
  const retiredPaths: Record<string, string[]> = {
    '/api/forms/certificate': ['get', 'post'], '/api/forms/submissions': ['get', 'post'],
    '/api/forms/certificate/{ticketId}': ['get'], '/api/forms/submissions/{ticketId}': ['get'],
    '/api/forms/admin/submissions': ['get'], '/api/forms/admin/submissions/{id}': ['get'],
    '/api/forms/certificate/{id}/status': ['put'], '/api/forms/admin/submissions/{id}/status': ['put'],
    '/api/payments/create-checkout-session': ['post'], '/api/payments/submission-checkout': ['post'],
    '/api/payments/submissions/{id}': ['get'], '/api/payments/webhook': ['post'],
    '/api/notifications/process': ['post'], '/api/auth/login': ['post'], '/api/auth/refresh': ['post'],
    '/api/auth/signup': ['post'], '/api/auth/me': ['get'], '/api/auth/logout': ['post'], '/api/chat': ['post'],
    '/api/admin/reports/submissions': ['get'], '/api/admin/reports/payments': ['get'],
    '/api/admin/reports/user-activity': ['get'], '/api/admin/users': ['get'],
    '/api/admin/users/{id}': ['get', 'patch'], '/api/admin/users/{id}/role': ['patch'],
    '/api/admin/users/{id}/deactivate': ['post'],
  };
  for (const kind of ['pages', 'news', 'services']) {
    retiredPaths[`/api/${kind}`] = ['post'];
    retiredPaths[`/api/${kind}/{id}`] = ['patch', 'delete'];
  }
  for (const [path, methods] of Object.entries(retiredPaths)) {
    document.paths[path] ??= {};
    for (const method of methods) {
      const previous = document.paths[path][method] ?? {};
      const parameters = previous.parameters ?? [...path.matchAll(/\{([^}]+)\}/g)].map(match => ({ name: match[1], in: 'path', required: true, schema: { type: 'string' } }));
      document.paths[path][method] = { ...previous, parameters, deprecated: true,
        summary: 'Retired in R2', description: 'All methods in deferred namespaces return 410 before parsing or authentication. Historical request schemas do not enable this operation.',
        responses: { '410': { description: DEFERRED_MESSAGE } } };
    }
  }
  const staffSecurity = [{ staffCookie: [] }];
  const staffAuthResponses = {
    '401': { description: 'An active staff session with verified MFA is required.' },
    '403': { description: 'The staff role or action is not permitted.' },
    '503': { description: 'Staff authentication or storage is unavailable.' },
  };
  document.paths['/api/staff/me'] = { get: {
    summary: 'Get the current staff identity', tags: ['Staff'], security: staffSecurity,
    responses: { '200': { description: 'Staff identity and role.' }, ...staffAuthResponses },
  } };
  const paginationParameters = [
    { in: 'query' as const, name: 'limit', required: false, schema: { type: 'integer', minimum: 1, maximum: 100, default: 50 } },
    { in: 'query' as const, name: 'page', required: false, schema: { type: 'integer', minimum: 1, maximum: 1000, default: 1 } },
  ];
  document.paths['/api/staff'] = { get: {
    summary: 'List staff accounts', tags: ['Staff'], security: staffSecurity,
    parameters: paginationParameters,
    responses: { '200': { description: 'Bounded, paginated staff account list.' }, '400': { description: 'Invalid pagination.' }, ...staffAuthResponses },
  } };
  document.paths['/api/staff/audit'] = { get: {
    summary: 'List staff authentication and access events', tags: ['Staff'], security: staffSecurity,
    parameters: paginationParameters,
    responses: { '200': { description: 'Bounded, paginated staff audit events.' }, '400': { description: 'Invalid pagination.' }, ...staffAuthResponses },
  } };
  for (const action of ['activate', 'deactivate', 'revoke', 'role']) {
    document.paths[`/api/staff/{id}/${action}`] = { post: {
      summary: `${action[0].toUpperCase()}${action.slice(1)} staff access`,
      tags: ['Staff'], security: staffSecurity,
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
      ...(action === 'revoke' ? {} : { requestBody: {
        required: true, content: { 'application/json': { schema: { type: 'object', additionalProperties: false,
          required: action === 'role' ? ['version', 'role'] : ['version'],
          properties: { version: { type: 'integer', minimum: 1 }, ...(action === 'role' ? { role: { type: 'string', enum: ['admin', 'editor'] } } : {}) },
        } } },
      } }),
      responses: { '200': { description: 'Staff access action completed.' }, '400': { description: 'Invalid request.' },
        '404': { description: 'Staff account not found.' }, '409': { description: 'Stale version or last active administrator.' },
        ...staffAuthResponses },
    } };
  }
  const staffAuthOperation = (summary: string, required: string[],
    properties: Record<string, { type: 'string'; format?: string; minLength?: number; maxLength?: number; pattern?: string }>,
    secured: boolean, success: string) => ({ post: {
      summary, tags: ['Staff authentication'], ...(secured ? { security: staffSecurity } : {}),
      requestBody: { required: true, content: { 'application/json': { schema: {
        type: 'object' as const, additionalProperties: false, required, properties,
      } } } },
      responses: { '200': { description: success }, '400': { description: 'Invalid request.' },
        '401': { description: 'Credentials, factor, or session is invalid.' }, '403': { description: 'Request denied.' },
        '429': { description: 'Rate limited.' }, '503': { description: 'Authentication unavailable.' } },
    } });
  document.paths['/api/staff-auth/sign-in/email'] = staffAuthOperation('Start staff sign-in', ['email', 'password'],
    { email: { type: 'string', format: 'email' }, password: { type: 'string', minLength: 14, maxLength: 128 } },
    false, 'HttpOnly session cookie challenge; MFA is required before staff access.');
  document.paths['/api/staff-auth/sign-out'] = staffAuthOperation('Sign out the current staff session', [],
    {}, true, 'Session revoked and cookie cleared.');
  document.paths['/api/staff-auth/request-password-reset'] = staffAuthOperation('Request staff password recovery', ['email'],
    { email: { type: 'string', format: 'email' } }, false, 'Uniform response that does not reveal account eligibility.');
  document.paths['/api/staff-auth/reset-password'] = staffAuthOperation('Complete staff password recovery', ['token', 'newPassword'],
    { token: { type: 'string' }, newPassword: { type: 'string', minLength: 14, maxLength: 128 } },
    false, 'Password reset completed; existing sessions are revoked and MFA remains required.');
  document.paths['/api/staff-auth/two-factor/enable'] = staffAuthOperation('Enable staff authenticator MFA', ['password'],
    { password: { type: 'string', minLength: 14, maxLength: 128 } }, true, 'Authenticator enrollment secret and one-use backup codes.');
  document.paths['/api/staff-auth/two-factor/verify-totp'] = staffAuthOperation('Verify authenticator code', ['code'],
    { code: { type: 'string', pattern: '^\\d{6}$' } }, true, 'MFA assurance recorded; no session token is returned to JavaScript.');
  document.paths['/api/staff-auth/two-factor/verify-backup-code'] = staffAuthOperation('Consume one backup code', ['code'],
    { code: { type: 'string', minLength: 1, maxLength: 64 } }, true, 'MFA assurance recorded; backup code is single-use.');
  return document;
}
