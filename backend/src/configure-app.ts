import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import express from 'express';
import { randomUUID } from 'node:crypto';
import { SecurityHeadersMiddleware } from './security/security-headers.middleware';

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
  return SwaggerModule.createDocument(app, config);
}
