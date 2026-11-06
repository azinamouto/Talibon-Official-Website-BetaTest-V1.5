# Security Guide

## Overview

This guide outlines security best practices and requirements for TAL.GOV, the digital platform for the Municipality of Talibon.

## Security Principles

1. **Defense in Depth**: Multiple layers of security
2. **Least Privilege**: Minimum necessary access
3. **Zero Trust**: Verify every request
4. **Secure by Default**: Security first, not afterthought
5. **Transparency**: Document security decisions

## Authentication Security

### Password Requirements

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character
- No common passwords
- Password hashing with bcrypt (cost factor 12+)

### Token Security

- JWT tokens with expiration (max 7 days)
- Secure token storage (httpOnly cookies)
- Token rotation on sensitive operations
- Immediate revocation on logout
- Refresh token rotation

### Session Management

- Session timeout after inactivity (30 minutes)
- Concurrent session limits
- Secure cookie flags
- CSRF protection

## Authorization Security

### Role-Based Access Control (RBAC)

- Enforce roles at multiple levels:
  - Frontend: Hide UI elements
  - Backend: Validate permissions
  - Database: RLS policies

### Permission Validation

```typescript
// Every protected endpoint must validate
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'super_admin')
@Controller('admin')
export class AdminController {
  // Admin-only endpoints
}
```

### Row Level Security (RLS)

```sql
-- Users can only access their own data
CREATE POLICY "users_own_data"
ON users
FOR ALL
USING (auth.uid() = id);

-- Public can only see active services
CREATE POLICY "public_active_services"
ON services
FOR SELECT
USING (is_active = true);
```

## Data Security

### Encryption

- **In Transit**: TLS 1.2+ for all connections
- **At Rest**: Database encryption enabled
- **Sensitive Fields**: Encrypted in database

### Data Classification

| Classification | Example | Protection Level |
|----------------|---------|------------------|
| Public | Municipal information | None |
| Internal | Staff information | Authentication |
| Confidential | Citizen data | Encryption + RBAC |
| Restricted | System secrets | Restricted access |

### PII Protection

- Minimize data collection
- Encrypt personal information
- Implement data retention policies
- Right to deletion (GDPR compliance)
- Data portability

## API Security

### Rate Limiting

```typescript
// Implement rate limiting per endpoint
@UseGuards(ThrottlerGuard)
@Throttle(100, 60) // 100 requests per minute
@Controller('api')
export class ApiController {
  // Protected endpoints
}
```

### Input Validation

```typescript
// Validate all inputs
export class CreateServiceDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}
```

### SQL Injection Prevention

- Use parameterized queries
- ORM for database operations
- Never concatenate user input
- Validate and sanitize all inputs

### XSS Prevention

- Output encoding
- Content Security Policy (CSP)
- Sanitize HTML content
- DOM-based XSS prevention

### CSRF Protection

- CSRF tokens for state-changing operations
- SameSite cookie attribute
- Verify Origin/Referer headers

## Storage Security

### File Upload Restrictions

```typescript
// Allowed file types
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'application/pdf',
  'application/msword'
];

// File size limits
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
```

### Supabase Storage Policies

```sql
-- Public bucket policy
CREATE POLICY "Public read access"
ON storage.objects
FOR SELECT
USING (bucket_id = 'public-documents');

-- Admin write access
CREATE POLICY "Admin write access"
ON storage.objects
FOR INSERT
WITH CHECK (auth.role() = 'admin');
```

### Secure File Handling

- Scan uploads for malware
- Store files in secure storage
- Generate random filenames
- Validate file contents (not just extension)
- Remove metadata from images

## Network Security

### HTTPS/TLS

- Force HTTPS in production
- Use TLS 1.2 or higher
- Strong cipher suites
- HSTS header enabled
- Certificate monitoring

### CORS Configuration

```typescript
// Whitelist allowed origins
const corsOptions = {
  origin: [
    'https://talibon.gov.ph',
    'https://staging.talibon.gov.ph'
  ],
  credentials: true
};
```

### Firewall Rules

- Restrict database access
- Allow only necessary ports
- IP whitelisting for admin access
- DDoS protection

## Environment Security

### Secrets Management

- Never commit secrets to Git
- Use environment variables
- Rotate secrets regularly
- Separate secrets per environment
- Use secret management tools (AWS Secrets Manager, etc.)

### Environment Variables

```env
# .env (NEVER commit)
SUPABASE_SERVICE_ROLE_KEY=...
DATABASE_URL=...
JWT_SECRET=...

# .env.example (safe to commit)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=public-key
```

### Dependency Security

```bash
# Regular vulnerability scans
npm audit
npm audit fix

# Use Snyk or similar tools
snyk test
snyk monitor
```

## Monitoring and Logging

### Security Logging

- Authentication attempts (success/failure)
- Authorization failures
- Admin actions
- Data access
- API errors
- Suspicious activity

### Audit Trail

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  user_id UUID,
  action VARCHAR(100),
  entity_type VARCHAR(100),
  entity_id UUID,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP
);
```

### Alerting

- Failed login attempts (threshold-based)
- Unauthorized access attempts
- API rate limit violations
- Unusual data access patterns
- System errors

## Incident Response

### Incident Categories

| Severity | Response Time | Example |
|----------|---------------|---------|
| Critical | 1 hour | Data breach, system compromise |
| High | 4 hours | Unauthorized admin access |
| Medium | 24 hours | Security misconfiguration |
| Low | 1 week | Minor security issue |

### Response Procedure

1. **Identify**: Confirm security incident
2. **Contain**: Isolate affected systems
3. **Eradicate**: Remove threat
4. **Recover**: Restore from clean backups
5. **Review**: Post-incident analysis
6. **Document**: Update security procedures

## Compliance

### Data Privacy

- GDPR compliance for EU citizens
- Data Protection Act compliance
- Right to access and deletion
- Data breach notification
- Privacy policy published

### Government Standards

- Follow Philippine government IT standards
- DICT guidelines compliance
- National Privacy Commission requirements

## Security Checklist

### Development

- [ ] No hardcoded credentials
- [ ] All inputs validated
- [ ] Error messages don't leak info
- [ ] Dependencies are up-to-date
- [ ] Security headers configured

### Production

- [ ] HTTPS enforced
- [ ] Security headers in place
- [ ] Rate limiting enabled
- [ ] Monitoring configured
- [ ] Backups tested
- [ ] Incident response plan documented

### Regular Reviews

- [ ] Monthly: Security audit
- [ ] Quarterly: Penetration testing
- [ ] Annually: Full security review
- [ ] Ongoing: Vulnerability scanning

## Best Practices

1. **Never trust user input**: Validate everything
2. **Use prepared statements**: Prevent SQL injection
3. **Encrypt sensitive data**: Protect at rest and in transit
4. **Implement least privilege**: Minimize access
5. **Log security events**: Maintain audit trail
6. **Keep dependencies updated**: Patch vulnerabilities
7. **Educate team**: Security awareness training
8. **Plan for incidents**: Have response procedures ready

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Supabase Security](https://supabase.com/docs/guides/platform/security)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [Authentication Guide](AUTHENTICATION_GUIDE.md)
