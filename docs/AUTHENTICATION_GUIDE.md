# Authentication Guide

## Overview

This guide explains the authentication and authorization system for TAL.GOV, the digital platform for the Municipality of Talibon.

## Authentication Flow

### 1. User Registration

Citizens and municipal staff can register for accounts through the public interface:

- Email-based registration
- Municipal staff verification
- Role assignment upon approval

### 2. Login Process

The authentication flow follows these steps:

1. User enters credentials (email/password)
2. Client sends request to authentication endpoint
3. Server validates credentials
4. Server issues authentication token
5. Client stores token securely
6. Token included in subsequent requests

### 3. Session Management

- Token-based authentication
- Automatic token refresh
- Secure logout mechanism
- Session timeout configuration

## Role-Based Access Control (RBAC)

### User Roles

| Role | Description | Permissions |
|------|-------------|-------------|
| `super_admin` | Full system administration | All permissions |
| `admin` | General platform administration | Most administrative functions |
| `editor` | Content creation and editing | Content management |
| `municipal_admin` | Municipal-level administration | Municipal-wide settings |
| `barangay_admin` | Barangay-specific management | Barangay-specific content |

### Permission Matrix

Permissions are enforced at multiple levels:

- **Frontend**: UI elements hidden based on role
- **Backend**: API endpoints validated for authorization
- **Database**: Row Level Security (RLS) policies

## Security Measures

### Password Requirements

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

### Token Security

- JWT tokens with expiration
- Secure storage (httpOnly cookies recommended)
- Token rotation on sensitive operations
- Revocation mechanism for compromised tokens

### Rate Limiting

- Login attempt limits
- IP-based throttling
- Account lockout after failed attempts

## API Endpoints

### Authentication Endpoints

```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
```

### Protected Endpoints

All protected endpoints require authentication:

```
GET    /api/admin/*
POST   /api/admin/*
PATCH  /api/admin/*
DELETE /api/admin/*
```

## Implementation Details

### Frontend Integration

```typescript
// Example: Authentication hook
const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check authentication status
    checkAuthStatus();
  }, []);

  return { user, loading };
};
```

### Backend Guards

```typescript
// Example: Role guard
@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>(
      'roles',
      context.getHandler()
    );
    // Validate user has required role
  }
}
```

### Database RLS

```sql
-- Example: Row Level Security policy
CREATE POLICY "users_can_view_own_data"
ON users
FOR SELECT
USING (auth.uid() = id);
```

## Troubleshooting

### Common Issues

**Issue**: Token expiration
- **Solution**: Implement automatic token refresh mechanism

**Issue**: Permission denied
- **Solution**: Verify user role and RLS policies

**Issue**: Login fails
- **Solution**: Check credentials, account status, and rate limits

## Best Practices

1. Always validate tokens on every request
2. Implement proper error handling
3. Log authentication events for audit
4. Use HTTPS in production
5. Never expose sensitive tokens in client-side code
6. Implement proper logout functionality
7. Regular security audits of authentication system

## References

- [Backend Documentation](../backend/SPRINT2_API.md)
- [Security Requirements](../README.md#security-requirements)
- [RBAC Matrix](../backend/docs/admin-rbac.md)
