# Error Handling Guide

## Overview

This guide provides comprehensive error handling strategies for TAL.GOV, ensuring robust and user-friendly error management.

## Error Handling Philosophy

- **Graceful degradation**: System continues working even with errors
- **User-friendly**: Clear, helpful error messages
- **Security**: Don't expose sensitive information
- **Logging**: Log all errors for debugging
- **Recovery**: Provide recovery options when possible

## Error Types

### Client-Side Errors

#### Network Errors

```typescript
// Handle network errors
const fetchWithRetry = async (url: string, retries = 3) => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return fetchWithRetry(url, retries - 1);
    }
    throw error;
  }
};
```

#### Validation Errors

```typescript
// Form validation
const validateForm = (data: FormData) => {
  const errors: Record<string, string> = {};

  if (!data.email) {
    errors.email = 'Email is required';
  } else if (!isValidEmail(data.email)) {
    errors.email = 'Invalid email format';
  }

  if (!data.password) {
    errors.password = 'Password is required';
  } else if (data.password.length < 8) {
    errors.password = 'Password must be at least 8 characters';
  }

  return Object.keys(errors).length > 0 ? errors : null;
};
```

#### Runtime Errors

```typescript
// Error boundary for React
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    logError(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}
```

### Server-Side Errors

#### API Errors

```typescript
// Standard error response format
export class APIError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

// Usage in controllers
@Get('/services/:id')
async getService(@Param('id') id: string) {
  try {
    const service = await this.servicesService.findOne(id);
    if (!service) {
      throw new APIError(404, 'SERVICE_NOT_FOUND', 'Service not found');
    }
    return service;
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    throw new APIError(500, 'INTERNAL_ERROR', 'An error occurred');
  }
}
```

#### Database Errors

```typescript
// Handle database errors
async createService(data: CreateServiceDto) {
  try {
    return await this.serviceRepository.save(data);
  } catch (error) {
    if (error.code === '23505') { // Unique violation
      throw new APIError(409, 'DUPLICATE_ENTRY', 'Service already exists');
    }
    if (error.code === '23503') { // Foreign key violation
      throw new APIError(400, 'INVALID_REFERENCE', 'Invalid department reference');
    }
    throw new APIError(500, 'DATABASE_ERROR', 'Database error occurred');
  }
}
```

#### Authentication Errors

```typescript
// Handle authentication errors
export class AuthError extends Error {
  constructor(
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

// Usage
async login(credentials: LoginDto) {
  const user = await this.userRepository.findOne({
    where: { email: credentials.email }
  });

  if (!user) {
    throw new AuthError('INVALID_CREDENTIALS', 'Invalid email or password');
  }

  const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
  if (!isValid) {
    throw new AuthError('INVALID_CREDENTIALS', 'Invalid email or password');
  }

  if (!user.isActive) {
    throw new AuthError('ACCOUNT_DISABLED', 'Account has been disabled');
  }

  return this.generateToken(user);
}
```

## Error Logging

### Client-Side Logging

```typescript
// Log errors to monitoring service
const logError = (error: Error, context?: any) => {
  // Send to Sentry or similar
  Sentry.captureException(error, {
    extra: context
  });

  // Also log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', error, context);
  }
};

// Usage
try {
  // Operation
} catch (error) {
  logError(error, { component: 'ServiceList', action: 'fetchServices' });
  throw error;
}
```

### Server-Side Logging

```typescript
// Structured logging
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Log errors with context
logger.error('Database connection failed', {
  error: error.message,
  stack: error.stack,
  endpoint: req.url,
  userId: req.user?.id,
  timestamp: new Date()
});
```

## User-Facing Error Messages

### Principles

- **Clear**: Users understand what went wrong
- **Actionable**: Users know what to do next
- **Polite**: Professional, non-blaming language
- **Secure**: Don't expose technical details

### Error Message Examples

```typescript
// Good error messages
const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Unable to connect. Please check your internet connection and try again.',
  INVALID_INPUT: 'Please check your input and try again.',
  NOT_FOUND: 'The requested information was not found.',
  UNAUTHORIZED: 'Please log in to access this feature.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  SERVER_ERROR: 'Something went wrong. Please try again later.',
  TIMEOUT: 'Request timed out. Please try again.',
  FILE_TOO_LARGE: 'File is too large. Maximum size is 5MB.',
  INVALID_FILE_TYPE: 'Invalid file type. Please upload a valid file.',
  RATE_LIMIT: 'Too many requests. Please wait and try again.'
};
```

### Error Display Components

```typescript
// Error alert component
const ErrorAlert = ({ error, onRetry }: { error: Error; onRetry?: () => void }) => {
  const getMessage = (error: Error) => {
    if (error instanceof APIError) {
      return ERROR_MESSAGES[error.code] || error.message;
    }
    return ERROR_MESSAGES.SERVER_ERROR;
  };

  return (
    <div className="error-alert" role="alert">
      <div className="error-icon">⚠️</div>
      <div className="error-message">
        {getMessage(error)}
      </div>
      {onRetry && (
        <button onClick={onRetry} className="retry-button">
          Try Again
        </button>
      )}
    </div>
  );
};
```

## Error Recovery

### Retry Mechanisms

```typescript
// Exponential backoff retry
const retryWithBackoff = async (
  operation: () => Promise<any>,
  maxRetries = 3,
  baseDelay = 1000
) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === maxRetries - 1) throw error;

      const delay = baseDelay * Math.pow(2, i);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};
```

### Fallback Content

```typescript
// Fallback for failed data loading
const ServiceList = () => {
  const { data, error, isLoading } = useServices();

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorFallback error={error} />;

  return (
    <div className="service-list">
      {data?.map(service => <ServiceCard key={service.id} service={service} />)}
    </div>
  );
};

// Fallback with offline data
const ServiceListWithFallback = () => {
  const { data, error } = useServices();
  const cachedData = useCachedServices();

  if (error && cachedData) {
    return (
      <div>
        <WarningBanner message="Showing cached data. Connection unavailable." />
        <ServiceList services={cachedData} />
      </div>
    );
  }

  return <ServiceList services={data} />;
};
```

## Global Error Handling

### Frontend Global Handler

```typescript
// Global error handler
window.addEventListener('error', (event) => {
  logError(event.error, {
    type: 'global',
    message: event.message,
    filename: event.filename,
    lineno: event.lineno
  });
});

window.addEventListener('unhandledrejection', (event) => {
  logError(event.reason, {
    type: 'unhandled-promise-rejection'
  });
});
```

### Backend Global Handler

```typescript
// NestJS global exception filter
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = 500;
    let message = 'Internal server error';
    let code = 'INTERNAL_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.message;
    }

    logger.error('Unhandled exception', {
      exception,
      url: request.url,
      method: request.method,
      status
    });

    response.status(status).json({
      success: false,
      error: {
        code,
        message: process.env.NODE_ENV === 'production'
          ? ERROR_MESSAGES.SERVER_ERROR
          : message
      }
    });
  }
}
```

## HTTP Status Codes

### Common Status Codes

| Code | Meaning | Use Case |
|------|---------|----------|
| 200 | OK | Successful request |
| 201 | Created | Resource created |
| 204 | No Content | Successful delete |
| 400 | Bad Request | Invalid input |
| 401 | Unauthorized | Not authenticated |
| 403 | Forbidden | No permission |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Duplicate entry |
| 422 | Unprocessable Entity | Validation error |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |
| 503 | Service Unavailable | Maintenance |

## Error Monitoring

### Real-Time Monitoring

```typescript
// Track error rates
const trackErrorRate = (error: Error) => {
  metrics.increment('errors.total', {
    type: error.name,
    code: error instanceof APIError ? error.code : 'unknown'
  });
};

// Track error trends
const trackErrorTrend = () => {
  const errorCount = getRecentErrorCount();
  if (errorCount > THRESHOLD) {
    alert('High error rate detected');
  }
};
```

### Alert Thresholds

Configure alerts for:

- Error rate > 1%
- 500 errors > 10 per minute
- Authentication failures > 5 per minute
- Database errors > 5 per minute

## Error Prevention

### Input Validation

```typescript
// Validate all inputs
export class CreateServiceDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @IsUUID()
  departmentId: string;
}
```

### Type Safety

```typescript
// Use TypeScript for type safety
interface Service {
  id: string;
  name: string;
  description?: string;
  departmentId: string;
}

// Type guards
function isService(obj: any): obj is Service {
  return typeof obj.id === 'string' &&
         typeof obj.name === 'string' &&
         typeof obj.departmentId === 'string';
}
```

### Defensive Programming

```typescript
// Null checks
const getDepartmentName = (service?: Service) => {
  return service?.department?.name || 'Unknown department';
};

// Default values
const timeout = config.timeout || 30000;
const retries = config.retries || 3;
```

## Error Testing

### Unit Testing Errors

```typescript
describe('Error handling', () => {
  it('should handle network errors', async () => {
    // Mock failed request
    mockFetch.mockRejectedValue(new Error('Network error'));

    await expect(fetchServices()).rejects.toThrow('Network error');
  });

  it('should handle validation errors', () => {
    const result = validateForm({ email: 'invalid' });
    expect(result).toHaveProperty('email');
  });
});
```

### Integration Testing Errors

```typescript
describe('API error handling', () => {
  it('should return 404 for non-existent service', async () => {
    const response = await request(app)
      .get('/api/services/non-existent')
      .expect(404);

    expect(response.body.error.code).toBe('SERVICE_NOT_FOUND');
  });
});
```

## Error Handling Checklist

### Implementation

- [ ] All errors caught and handled
- [ ] User-friendly error messages
- [ ] Error logging implemented
- [ ] Error monitoring configured
- [ ] Retry mechanisms for transient errors
- [ ] Fallback content where appropriate
- [ ] Input validation on all inputs
- [ ] Type safety enforced

### Security

- [ ] No sensitive data in error messages
- [ ] Error details hidden in production
- [ ] Error logs secured
- [ ] Stack traces not exposed to users

### Testing

- [ ] Error cases tested
- [ ] Error messages tested
- [ ] Recovery mechanisms tested
- [ ] Error boundary tested

## Best Practices

### Do's

- Catch all errors
- Provide helpful error messages
- Log errors for debugging
- Implement retry for transient errors
- Test error cases
- Use type safety
- Monitor error rates

### Don'ts

- Ignore errors
- Expose sensitive information
- Show technical details to users
- Forget to log errors
- Assume everything works
- Skip error testing
- Hide errors silently

## References

- [Error Handling Best Practices](https://docs.microsoft.com/en-us/azure/architecture/best-practices/resiliency/handling-transient-failures)
- [NestJS Exception Filters](https://docs.nestjs.com/exception-filters)
- [React Error Boundaries](https://reactjs.org/docs/error-boundaries.html)
