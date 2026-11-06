# Deployment Guide

## Overview

This guide covers the deployment process for TAL.GOV, the digital platform for the Municipality of Talibon.

## Prerequisites

Before deploying, ensure:

- [ ] All tests pass
- [ ] Code reviewed and approved
- [ ] Environment variables configured
- [ ] Database migrations prepared
- [ ] Backup strategy in place
- [ ] Monitoring configured
- [ ] SSL certificates ready
- [ ] Domain configured

## Environments

### Development

- **URL**: http://localhost:5173 (frontend), http://localhost:3000 (backend)
- **Database**: Development Supabase project
- **Purpose**: Local development and testing

### Staging

- **URL**: https://staging.talibon.gov.ph
- **Database**: Staging Supabase project
- **Purpose**: Pre-production testing

### Production

- **URL**: https://talibon.gov.ph
- **Database**: Production Supabase project
- **Purpose**: Live municipal platform

## Deployment Process

### 1. Frontend Deployment (Vercel)

#### Prerequisites

- Vercel account
- Domain configured
- Environment variables set

#### Steps

1. **Build the application**

```bash
cd frontend
npm run build
```

2. **Deploy to Vercel**

```bash
npm install -g vercel
vercel --prod
```

3. **Configure environment variables in Vercel**

```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_API_URL
```

4. **Verify deployment**

```bash
vercel inspect
```

### 2. Backend Deployment

#### Option A: Vercel (Serverless)

1. **Configure vercel.json**

```json
{
  "version": 2,
  "builds": [
    {
      "src": "backend/dist/main.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/backend/dist/main.js"
    }
  ]
}
```

2. **Build backend**

```bash
cd backend
npm run build
```

3. **Deploy**

```bash
vercel --prod
```

#### Option B: Traditional Server (DigitalOcean, AWS, etc.)

1. **Prepare server**

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2
sudo npm install -g pm2
```

2. **Clone repository**

```bash
git clone <repository-url>
cd Talibon-Official-Website
```

3. **Install dependencies**

```bash
npm install
cd backend && npm install
cd ../frontend && npm install
```

4. **Build applications**

```bash
cd backend && npm run build
cd ../frontend && npm run build
```

5. **Configure environment**

```bash
cp .env.example .env
# Edit .env with production values
```

6. **Run with PM2**

```bash
cd backend
pm2 start dist/main.js --name talgov-backend
pm2 save
pm2 startup
```

7. **Configure Nginx**

```nginx
server {
    listen 80;
    server_name talibon.gov.ph;

    location / {
        root /path/to/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

8. **Configure SSL (Let's Encrypt)**

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d talibon.gov.ph
```

### 3. Database Deployment (Supabase)

#### Prerequisites

- Supabase project created
- Environment variables obtained

#### Steps

1. **Apply migrations**

```bash
supabase db push
```

2. **Enable RLS policies**

```bash
supabase db push --schema auth
```

3. **Seed initial data (if needed)**

```bash
supabase db seed
```

4. **Verify configuration**

```bash
supabase status
```

## Environment Variables

### Frontend (.env.production)

```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=https://api.talibon.gov.ph
```

### Backend (.env.production)

```env
NODE_ENV=production
PORT=3000

SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=postgresql://...

# JWT
JWT_SECRET=your-jwt-secret
JWT_EXPIRATION=7d

# CORS
CORS_ORIGIN=https://talibon.gov.ph
```

## Database Migrations

### Pre-Deployment Checklist

- [ ] Migration tested in development
- [ ] Migration tested in staging
- [ ] Rollback script prepared
- [ ] Data backup completed
- [ ] Down time communicated (if needed)

### Running Migrations

```bash
# Apply migration
supabase migration up

# Verify
supabase db diff

# Rollback if needed
supabase migration down
```

## Monitoring and Logging

### Application Monitoring

- Error tracking (Sentry)
- Performance monitoring
- Uptime monitoring

### Log Management

- Application logs
- Access logs
- Error logs
- Audit logs

### Recommended Tools

- **Logs**: Papertrail, Loggly
- **Errors**: Sentry
- **Uptime**: UptimeRobot, Pingdom
- **Performance**: New Relic, Datadog

## Backup Strategy

### Database Backups

- Daily automated backups
- Weekly full backups
- Point-in-time recovery enabled
- Backups stored in multiple locations

### File Backups

- Supabase Storage automatic backups
- Document backups to R2/S3
- Media asset backups

### Backup Verification

```bash
# Test restore process monthly
supabase db restore <backup-file>
```

## Security Checklist

### Pre-Deployment

- [ ] All secrets are environment variables
- [ ] No debug code in production
- [ ] SSL/TLS enabled
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Security headers configured
- [ ] Dependency vulnerabilities scanned
- [ ] RLS policies verified
- [ ] Admin endpoints protected
- [ ] File upload restrictions in place

### Security Headers

```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

## Rollback Procedure

### Automatic Rollback

Configure deployment tool to automatically rollback on failure.

### Manual Rollback

```bash
# Frontend
vercel rollback <deployment-url>

# Backend
pm2 restart talgov-backend --update-env

# Database
supabase migration down
```

## Post-Deployment Verification

### Health Checks

```bash
# Check backend health
curl https://api.talibon.gov.ph/health

# Check frontend
curl https://talibon.gov.ph

# Check database connection
supabase status
```

### Functional Testing

- [ ] User registration works
- [ ] Login/logout works
- [ ] Public pages load
- [ ] Admin dashboard accessible
- [ ] API endpoints respond
- [ ] File uploads work
- [ ] Search functionality works

## Maintenance

### Regular Tasks

- **Daily**: Monitor error logs
- **Weekly**: Review performance metrics
- **Monthly**: Security updates, dependency updates
- **Quarterly**: Full security audit

### Update Process

1. Create maintenance branch
2. Apply updates in staging
3. Test thoroughly
4. Schedule maintenance window
5. Deploy to production
6. Monitor for issues

## Troubleshooting

### Common Issues

**Issue**: Database connection failed
- **Solution**: Check DATABASE_URL, network connectivity, Supabase status

**Issue**: Build fails
- **Solution**: Check Node version, dependencies, environment variables

**Issue**: API returns 500 errors
- **Solution**: Check application logs, database status, RLS policies

## References

- [Supabase Deployment](https://supabase.com/docs/guides/platform/deployment)
- [Vercel Deployment](https://vercel.com/docs)
- [Nginx Configuration](https://nginx.org/en/docs/)
- [Production Checklist](../README.md#production-deployment-checklist)
