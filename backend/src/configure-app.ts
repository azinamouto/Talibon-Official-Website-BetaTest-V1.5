import { INestApplication, ValidationPipe } from '@nestjs/common';
import express from 'express';
import { randomUUID } from 'node:crypto';

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
    req.requestId = randomUUID();
    res.setHeader('X-Request-Id', req.requestId);
    next();
  });
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ limit: '1mb', extended: false }));
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, forbidNonWhitelisted: true, transform: true,
    forbidUnknownValues: true,
  }));
  app.enableCors({
    origin: (origin, callback) => callback(null, isAllowedOrigin(origin)),
    credentials: false,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    exposedHeaders: ['X-Request-Id', 'Retry-After'],
  });
}
