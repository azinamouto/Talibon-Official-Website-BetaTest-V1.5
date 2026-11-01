import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import express from 'express';
import { DEFERRED_MESSAGE, deferredRoutes } from './security/deferred-routes.middleware';
import { randomUUID } from 'node:crypto';
import { SecurityHeadersMiddleware } from './security/security-headers.middleware';
import { requestMetrics } from './security/request-metrics.middleware';

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
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ limit: '1mb', extended: false }));
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
  SwaggerModule.setup('api/docs', app, () => createApiDocument(app), {
    jsonDocumentUrl: 'api/openapi.json',
    swaggerOptions: { persistAuthorization: false },
  });
}

export function createApiDocument(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('Talibon Municipal API')
    .setDescription('Send X-API-Version: 1 (default when omitted). Bearer tokens are Supabase access tokens. Errors contain success, statusCode, error, message, timestamp and requestId.')
    .setVersion('1')
    .addBearerAuth()
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
    '/api/notifications/process': ['post'], '/api/auth/signup': ['post'], '/api/chat': ['post'],
    '/api/admin/reports/submissions': ['get'], '/api/admin/reports/payments': ['get'],
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
  return document;
}
