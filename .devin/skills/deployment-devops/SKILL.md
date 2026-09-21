# Deployment & DevOps Skill

Specialized skill for TAL.GOV deployment, DevOps, and infrastructure management.

## When to Use This Skill

Use this skill when:
- Setting up deployment pipelines
- Configuring CI/CD workflows
- Managing environment configurations
- Handling database migrations
- Setting up monitoring and logging
- Managing infrastructure as code

## Efficient Workflow

### 1. Understand Deployment Requirements
```bash
# Check existing deployment configuration
read vercel.json
read .env.example
find . -name "*.yml" -o -name "*.yaml"
```

### 2. Follow Deployment Patterns
```bash
# Check existing deployment scripts
grep "deploy" package.json
grep "build" package.json
```

### 3. Implementation Steps
1. Review current deployment setup
2. Plan deployment strategy
3. Configure environment variables
4. Set up CI/CD pipeline
5. Test deployment process
6. Monitor deployment
7. Document procedures

## Cost-Effective Operations

### Targeted Configuration
```bash
# Focus on specific environment configs
// Review only relevant deployment files
// Use existing deployment patterns
// Minimize infrastructure changes
```

### Efficient Monitoring
```bash
// Set up targeted monitoring
// Focus on critical metrics
// Use existing monitoring tools
// Implement cost-effective logging
```

## Environment Configuration

### Environment Variables
```bash
# .env.example template
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_URL=your_api_url

SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
DATABASE_URL=your_database_url

STRIPE_SECRET_KEY=your_stripe_key
RESEND_API_KEY=your_resend_key
```

### Environment-Specific Configs
```typescript
// config/environment.ts
export const config = {
  development: {
    apiUrl: 'http://localhost:3000',
    supabaseUrl: process.env.SUPABASE_URL,
  },
  production: {
    apiUrl: process.env.API_URL,
    supabaseUrl: process.env.SUPABASE_URL,
  },
};

export const currentConfig = config[process.env.NODE_ENV || 'development'];
```

## CI/CD Pipeline

### GitHub Actions Configuration
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Build frontend
        run: npm run build:frontend

      - name: Build backend
        run: npm run build:backend

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

### Database Migration Pipeline
```yaml
# .github/workflows/migrate.yml
name: Database Migration

on:
  push:
    paths:
      - 'supabase/migrations/**'

jobs:
  migrate:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Run migrations
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
        run: |
          npm run migrate:production
```

## Deployment Platforms

### Vercel Deployment
```json
// vercel.json
{
  "version": 2,
  "builds": [
    {
      "src": "frontend/package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/dist/$1"
    }
  ],
  "env": {
    "VITE_SUPABASE_URL": "@supabase_url",
    "VITE_SUPABASE_ANON_KEY": "@supabase_anon_key"
  }
}
```

### Serverless Deployment
```typescript
// backend/src/serverless.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ExpressAdapter } from '@nestjs/platform-express';

export const handler = async (event, context) => {
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter()
  );
  
  await app.init();
  
  const server = app.getHttpAdapter().getInstance();
  
  return new Promise((resolve, reject) => {
    server(event, context, (error, response) => {
      if (error) return reject(error);
      resolve(response);
    });
  });
};
```

## Database Migrations

### Migration Management
```bash
# Run migrations
npm run migrate

# Rollback migration
npm run migrate:rollback

# Create new migration
npm run migrate:create -- -n migration_name
```

### Supabase Migration
```sql
-- supabase/migrations/20240920150000_add_user_preferences.sql
-- Add user preferences table

CREATE TABLE user_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);

-- Enable RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own preferences"
ON user_preferences FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
ON user_preferences FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

## Monitoring & Logging

### Error Tracking (Sentry)
```typescript
// frontend/src/sentry.ts
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  beforeSend(event) {
    // Filter sensitive data
    if (event.request) {
      delete event.request.cookies;
    }
    return event;
  },
});
```

### Backend Logging
```typescript
// backend/src/logging/logger.service.ts
import { Injectable, LoggerService } from '@nestjs/common';

@Injectable()
export class CustomLogger implements LoggerService {
  log(message: string, context?: string) {
    console.log(`[${context || 'App'}] ${message}`);
  }

  error(message: string, trace?: string, context?: string) {
    console.error(`[${context || 'App'}] ERROR: ${message}`);
    if (trace) console.error(trace);
  }

  warn(message: string, context?: string) {
    console.warn(`[${context || 'App'}] WARN: ${message}`);
  }
}
```

## Health Checks

### Health Check Endpoint
```typescript
// backend/src/health/health.controller.ts
import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
    };
  }

  @Get('db')
  async checkDatabase() {
    // Check database connection
    return { status: 'database_ok' };
  }
}
```

## Backup & Recovery

### Database Backup
```bash
# Backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backup_${DATE}.sql"

pg_dump $DATABASE_URL > $BACKUP_FILE
aws s3 cp $BACKUP_FILE s3://backups/talgov/
```

### Restore Procedure
```bash
# Restore from backup
aws s3 cp s3://backups/talgov/backup_20240920_150000.sql .
psql $DATABASE_URL < backup_20240920_150000.sql
```

## Security Hardening

### Security Headers
```typescript
// backend/src/security/security-headers.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Content-Security-Policy', "default-src 'self'");
    next();
  }
}
```

### SSL Configuration
```typescript
// Ensure HTTPS in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (!req.secure) {
      return res.redirect('https://' + req.headers.host + req.url);
    }
    next();
  });
}
```

## Performance Optimization

### CDN Configuration
```json
// Cloudflare or similar CDN config
{
  "cacheRules": [
    {
      "pattern": "*.js",
      "ttl": 31536000
    },
    {
      "pattern": "*.css",
      "ttl": 31536000
    },
    {
      "pattern": "*.png",
      "ttl": 2592000
    }
  ]
}
```

### Build Optimization
```typescript
// frontend/vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['lucide-react'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
});
```

## Troubleshooting

### Common Deployment Issues

#### Build Failures
```bash
# Clear cache and rebuild
rm -rf node_modules dist
npm install
npm run build
```

#### Environment Variable Issues
```bash
# Verify environment variables
echo $VARIABLE_NAME
# Check .env file
cat .env
```

#### Database Connection Issues
```bash
# Test database connection
psql $DATABASE_URL -c "SELECT 1"
```

## Deployment Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] Code reviewed
- [ ] Environment variables configured
- [ ] Database migrations prepared
- [ ] Backup current production
- [ ] Rollback plan ready

### Post-Deployment
- [ ] Verify deployment success
- [ ] Run smoke tests
- [ ] Check error logs
- [ ] Monitor performance
- [ ] Verify database integrity
- [ ] Test critical user flows

## Quick Reference

### Common Commands
```bash
# Build
npm run build
npm run build:frontend
npm run build:backend

# Deploy
npm run deploy
npm run deploy:staging
npm run deploy:production

# Database
npm run migrate
npm run migrate:rollback

# Logs
npm run logs
npm run logs:production
```

### Environment Variables
- `NODE_ENV` - Environment (development/production)
- `DATABASE_URL` - Database connection string
- `SUPABASE_URL` - Supabase project URL
- `API_URL` - Backend API URL
- `SENTRY_DSN` - Error tracking DSN

## Checklist Before Completion

- [ ] Environment variables are secure
- [ ] CI/CD pipeline is tested
- [ ] Monitoring is configured
- [ ] Backup strategy is in place
- [ ] Security measures are implemented
- [ ] Rollback procedure is documented
- [ ] Performance is optimized
- [ ] Logging is configured
- [ ] Health checks are working
- [ ] Documentation is updated