# Testing Guide

## Overview

This guide covers testing strategies and procedures for TAL.GOV, the digital platform for the Municipality of Talibon.

## Testing Philosophy

- **Test early and often**: Shift testing left in development
- **Automate where possible**: Reduce manual testing burden
- **Test at multiple levels**: Unit, integration, E2E
- **Test for security**: Security is a requirement, not afterthought
- **Test for accessibility**: Government sites must be accessible

## Testing Types

### Unit Testing

Test individual functions and components in isolation.

**Tools**: Jest, Vitest

**When to use**:
- Pure functions
- Utility functions
- Component logic
- Service methods

**Example**:
```typescript
describe('Service formatting', () => {
  it('should format processing time correctly', () => {
    expect(formatProcessingTime('3-5 days')).toBe('3-5 days');
  });

  it('should handle null values', () => {
    expect(formatProcessingTime(null)).toBe('Not specified');
  });
});
```

### Integration Testing

Test how multiple components work together.

**Tools**: Supertest, Jest

**When to use**:
- API endpoints
- Database operations
- Service interactions
- Authentication flows

**Example**:
```typescript
describe('Services API', () => {
  it('should return all active services', async () => {
    const response = await request(app)
      .get('/api/services')
      .expect(200);

    expect(response.body.data.services).toBeInstanceOf(Array);
  });
});
```

### End-to-End (E2E) Testing

Test the complete user flow from frontend to backend.

**Tools**: Playwright, Cypress

**When to use**:
- Critical user journeys
- Multi-step workflows
- Cross-browser testing
- Mobile responsiveness

**Example**:
```typescript
test('user can search for services', async ({ page }) => {
  await page.goto('/');
  await page.fill('[data-testid="search-input"]', 'business permit');
  await page.press('[data-testid="search-input"]', 'Enter');
  await expect(page.locator('.service-card')).toBeVisible();
});
```

### Security Testing

Test for vulnerabilities and security issues.

**Tools**: OWASP ZAP, Burp Suite, npm audit

**When to use**:
- Before production deployment
- After major changes
- Regular security audits

**Checklist**:
- SQL injection
- XSS vulnerabilities
- CSRF protection
- Authentication bypass
- Authorization issues
- Rate limiting
- Input validation

### Accessibility Testing

Ensure the platform is accessible to all users.

**Tools**: axe DevTools, Lighthouse, WAVE

**Standards**: WCAG 2.1 AA

**Checklist**:
- Keyboard navigation
- Screen reader compatibility
- Color contrast (4.5:1 for text)
- Alt text for images
- Form labels
- Focus indicators
- Semantic HTML

### Performance Testing

Test application performance under load.

**Tools**: Lighthouse, WebPageTest, k6

**Metrics**:
- First Contentful Paint (FCP) < 1.8s
- Largest Contentful Paint (LCP) < 2.5s
- Time to Interactive (TTI) < 3.8s
- Cumulative Layout Shift (CLS) < 0.1

## Test Coverage

### Target Coverage

- **Unit tests**: 80%+
- **Integration tests**: 70%+
- **E2E tests**: Critical paths 100%

### Coverage Tools

```bash
# Generate coverage report
npm run test:coverage

# View coverage report
open coverage/index.html
```

## Testing Setup

### Frontend Testing

```bash
# Install dependencies
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom

# Run tests
npm run test

# Run tests in watch mode
npm run test:watch

# Generate coverage
npm run test:coverage
```

### Backend Testing

```bash
# Install dependencies
npm install --save-dev jest @types/jest supertest

# Run tests
npm run test

# Run tests with coverage
npm run test:coverage
```

### E2E Testing

```bash
# Install Playwright
npm install --save-dev @playwright/test

# Run tests
npx playwright test

# Run tests headed
npx playwright test --headed

# Run tests in specific browser
npx playwright test --project=chromium
```

## Test Organization

### Directory Structure

```
frontend/
  src/
    components/
      Button/
        Button.tsx
        Button.test.tsx
    services/
      api.ts
      api.test.ts
    utils/
      format.ts
      format.test.ts

backend/
  src/
    modules/
      services/
        services.controller.ts
        services.service.ts
        services.service.spec.ts
    __tests__/
      integration/
        services-api.test.ts
      e2e/
        user-flow.test.ts
```

## Test Data Management

### Fixtures

Use fixtures for consistent test data.

```typescript
// fixtures/services.ts
export const mockService = {
  id: 'uuid',
  name: 'Business Permit',
  slug: 'business-permit',
  description: 'Test description',
  is_active: true
};
```

### Test Database

Use separate test database for integration tests.

```typescript
// Setup test database
beforeAll(async () => {
  await setupTestDatabase();
});

afterAll(async () => {
  await cleanupTestDatabase();
});

afterEach(async () => {
  await resetTestDatabase();
});
```

## Continuous Integration

### GitHub Actions

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test
      - run: npm run test:e2e
      - run: npm run lint
```

### Pre-commit Hooks

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run test && npm run lint"
    }
  }
}
```

## Testing Checklist

### Before Commit

- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Linting passes
- [ ] No console errors
- [ ] Code reviewed

### Before Merge

- [ ] All tests pass
- [ ] Coverage meets target
- [ ] E2E tests pass
- [ ] Security tests pass
- [ ] Accessibility tests pass
- [ ] Performance tests pass

### Before Production

- [ ] Full test suite passes
- [ ] E2E tests on staging
- [ ] Security audit completed
- [ ] Performance validated
- [ ] Accessibility verified
- [ ] Cross-browser testing completed

## Common Testing Scenarios

### Authentication Flow

```typescript
describe('Authentication', () => {
  it('should login with valid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email, password })
      .expect(200);

    expect(response.body.data.token).toBeDefined();
  });

  it('should reject invalid credentials', async () => {
    await request(app)
      .post('/api/auth/login')
      .send({ email: 'wrong@email.com', password: 'wrong' })
      .expect(401);
  });
});
```

### Service CRUD

```typescript
describe('Service Management', () => {
  it('should create a service', async () => {
    const response = await request(app)
      .post('/api/admin/services')
      .set('Authorization', `Bearer ${token}`)
      .send(serviceData)
      .expect(201);

    expect(response.body.data.name).toBe(serviceData.name);
  });

  it('should update a service', async () => {
    const response = await request(app)
      .patch(`/api/admin/services/${serviceId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Updated name' })
      .expect(200);
  });

  it('should delete a service', async () => {
    await request(app)
      .delete(`/api/admin/services/${serviceId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });
});
```

### Authorization

```typescript
describe('Authorization', () => {
  it('should allow admin to access protected endpoint', async () => {
    const response = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });

  it('should deny regular user access to admin endpoint', async () => {
    await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);
  });
});
```

## Debugging Tests

### Running Specific Tests

```bash
# Run specific test file
npm test services.test.ts

# Run specific test
npm test -t "should create a service"

# Run tests matching pattern
npm test -- --grep "authentication"
```

### Debug Mode

```bash
# Run tests in debug mode
node --inspect-brk node_modules/.bin/jest --runInBand
```

## Best Practices

1. **Write tests before or with code**: TDD or test-after
2. **Keep tests independent**: Each test should run in isolation
3. **Use descriptive names**: Test names should explain what is tested
4. **Test edge cases**: Boundary conditions, null values, errors
5. **Mock external dependencies**: Don't test external services
6. **Keep tests fast**: Avoid slow operations in tests
7. **Maintain test data**: Keep fixtures up to date
8. **Review test failures**: Don't ignore failing tests

## References

- [Jest Documentation](https://jestjs.io/)
- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library](https://testing-library.com/)
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
