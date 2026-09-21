# Testing & QA Skill

Specialized skill for TAL.GOV testing and quality assurance across backend, frontend, and integration testing.

## When to Use This Skill

Use this skill when:
- Writing unit tests for components or services
- Creating integration tests for APIs
- Implementing end-to-end tests
- Setting up testing infrastructure
- Debugging test failures
- Ensuring code quality and coverage

## Efficient Workflow

### 1. Understand Testing Requirements
```bash
# Check existing test patterns
find backend -name "*.spec.ts"
find frontend -name "*.test.tsx"
read package.json (look for test scripts)
```

### 2. Follow Testing Patterns
```bash
# Examine existing test structure
grep "describe" backend/src/
grep "it" frontend/src/
grep "expect" frontend/src/
```

### 3. Implementation Steps
1. Identify what needs testing
2. Choose appropriate test type (unit/integration/e2e)
3. Write test following existing patterns
4. Mock external dependencies
5. Run tests and verify
6. Check coverage metrics

## Cost-Effective Operations

### Targeted Test Development
```typescript
// Focus on critical paths
// Test high-risk areas first
// Use existing test utilities
// Follow established patterns
```

### Efficient Test Execution
```typescript
// Run specific test files
// Use watch mode during development
// Parallelize test execution
// Focus on failing tests
```

## Backend Testing

### Unit Testing Services
```typescript
// backend/src/api/resources/resources.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ResourceService } from './resources.service';
import { SupabaseService } from '../supabase.service';

describe('ResourceService', () => {
  let service: ResourceService;
  let supabaseService: jest.Mocked<SupabaseService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResourceService,
        {
          provide: SupabaseService,
          useValue: {
            getClient: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ResourceService>(ResourceService);
    supabaseService = module.get(SupabaseService);
  });

  describe('findAll', () => {
    it('should return an array of resources', async () => {
      const mockData = [
        { id: '1', name: 'Resource 1' },
        { id: '2', name: 'Resource 2' },
      ];

      const mockClient = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: mockData,
          error: null,
          count: 2,
        }),
      };

      supabaseService.getClient.mockReturnValue(mockClient as any);

      const result = await service.findAll(1, 10);

      expect(result.data).toEqual(mockData);
      expect(result.pagination.total).toBe(2);
    });

    it('should throw error when database fails', async () => {
      const mockClient = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
          count: null,
        }),
      };

      supabaseService.getClient.mockReturnValue(mockClient as any);

      await expect(service.findAll(1, 10)).rejects.toThrow();
    });
  });
});
```

### Controller Testing
```typescript
// backend/src/api/resources/resources.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ResourceController } from './resources.controller';
import { ResourceService } from './resources.service';

describe('ResourceController', () => {
  let controller: ResourceController;
  let service: jest.Mocked<ResourceService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResourceController],
      providers: [
        {
          provide: ResourceService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ResourceController>(ResourceController);
    service = module.get(ResourceService);
  });

  describe('findAll', () => {
    it('should return an array of resources', async () => {
      const mockData = {
        data: [{ id: '1', name: 'Resource 1' }],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      };

      service.findAll.mockResolvedValue(mockData);

      const result = await controller.findAll();

      expect(result).toEqual(mockData);
      expect(service.findAll).toHaveBeenCalledWith(1, 10);
    });
  });
});
```

## Frontend Testing

### Component Testing
```typescript
// frontend/src/components/Button/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders button with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick handler when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies disabled state', () => {
    render(<Button disabled>Click me</Button>);
    expect(screen.getByText('Click me')).toBeDisabled();
  });
});
```

### Hook Testing
```typescript
// frontend/src/hooks/useApiCall.test.ts
import { renderHook, act } from '@testing-library/react';
import { useApiCall } from './useApiCall';

describe('useApiCall', () => {
  it('should return data on successful call', async () => {
    const mockApiFunction = jest.fn().mockResolvedValue({ data: 'test' });
    
    const { result } = renderHook(() => useApiCall(mockApiFunction));

    expect(result.current.loading).toBe(true);
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.data).toEqual({ data: 'test' });
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should handle errors', async () => {
    const mockApiFunction = jest.fn().mockRejectedValue(new Error('API Error'));
    
    const { result } = renderHook(() => useApiCall(mockApiFunction));

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.error).toBe('API Error');
    expect(result.current.data).toBeNull();
  });
});
```

### Page Testing
```typescript
// frontend/src/pages/Home/Home.test.tsx
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Home from './Home';

describe('Home Page', () => {
  it('renders home page with welcome message', () => {
    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    );

    expect(screen.getByText('Welcome to TAL.GOV')).toBeInTheDocument();
  });

  it('displays navigation links', () => {
    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    );

    expect(screen.getByText('Services')).toBeInTheDocument();
    expect(screen.getByText('About')).toBeInTheDocument();
  });
});
```

## Integration Testing

### API Integration Testing
```typescript
// Integration test for API endpoints
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('API Integration Tests', () => {
  let app;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/api/resources (GET)', () => {
    it('should return resources array', () => {
      return request(app.getHttpServer())
        .get('/api/resources')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });
  });
});
```

## End-to-End Testing

### E2E Test Setup
```typescript
// e2e/app.e2e-spec.ts
import { test, expect } from '@playwright/test';

test.describe('TAL.GOV E2E Tests', () => {
  test('user can navigate to services page', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    await page.click('text=Services');
    await expect(page).toHaveURL(/.*services/);
    await expect(page.locator('h1')).toContainText('Government Services');
  });

  test('user can submit a form', async ({ page }) => {
    await page.goto('http://localhost:5173/eservices/barangay-clearance');
    
    await page.fill('input[name="fullName"]', 'John Doe');
    await page.fill('input[name="address"]', 'Test Address');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('.success-message')).toBeVisible();
  });
});
```

## Testing Best Practices

### Test Organization
```typescript
// Group related tests
describe('ResourceService', () => {
  describe('findAll', () => {
    it('should return resources');
    it('should handle errors');
  });

  describe('create', () => {
    it('should create resource');
    it('should validate input');
  });
});
```

### Mocking External Dependencies
```typescript
// Mock Supabase client
const mockSupabaseClient = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data: {}, error: null }),
};
```

### Test Data Management
```typescript
// Use test data factories
const createMockResource = (overrides = {}) => ({
  id: 'test-id',
  name: 'Test Resource',
  description: 'Test Description',
  ...overrides,
});
```

## Coverage Goals

### Target Coverage Metrics
- Backend: 80%+ coverage
- Frontend: 70%+ coverage
- Critical paths: 90%+ coverage
- Integration points: 85%+ coverage

### Coverage Configuration
```json
{
  "collectCoverageFrom": [
    "src/**/*.{js,jsx,ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/*.stories.{js,jsx,ts,tsx}",
    "!src/**/__tests__/**"
  ],
  "coverageThreshold": {
    "global": {
      "branches": 70,
      "functions": 70,
      "lines": 70,
      "statements": 70
    }
  }
}
```

## Debugging Tests

### Common Issues and Solutions

#### Test Failing Intermittently
```typescript
// Add proper cleanup
afterEach(() => {
  jest.clearAllMocks();
});
```

#### Async Test Issues
```typescript
// Use proper async/await
it('should handle async operations', async () => {
  await act(async () => {
    // async operations
  });
});
```

#### Mock Not Working
```typescript
// Ensure mocks are properly configured
beforeEach(() => {
  mockFn.mockClear();
  mockFn.mockResolvedValue(expectedValue);
});
```

## Performance Testing

### Load Testing
```typescript
// Simple load test
import { loadTest } from 'loadtest';

const options = {
  url: 'http://localhost:3000/api/resources',
  concurrency: 10,
  maxSeconds: 30,
};

loadTest(options, (error, results) => {
  if (error) {
    console.error(error);
  } else {
    console.log('Results:', results);
  }
});
```

## Security Testing

### Input Validation Testing
```typescript
it('should reject invalid input', async () => {
  const invalidData = { name: '' }; // empty name
  
  await expect(
    service.create(invalidData)
  ).rejects.toThrow();
});
```

### Authentication Testing
```typescript
it('should require authentication', async () => {
  const response = await request(app.getHttpServer())
    .get('/api/protected')
    .expect(401);
});
```

## Test Automation

### CI/CD Integration
```yaml
# .github/workflows/test.yml
name: Run Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run test:backend
      - run: npm run test:frontend
      - run: npm run test:e2e
```

## Quick Reference

### Test Commands
```bash
# Backend tests
npm run test:backend
npm run test:backend -- --watch
npm run test:backend -- --coverage

# Frontend tests
npm run test:frontend
npm run test:frontend -- --watch
npm run test:frontend -- --coverage

# E2E tests
npm run test:e2e
```

### Common Matchers
```typescript
expect(value).toBe(expected);
expect(value).toEqual(expected);
expect(value).toContain(expected);
expect(value).toHaveLength(length);
expect(fn).toHaveBeenCalled();
expect(fn).toHaveBeenCalledWith(arg1, arg2);
```

## Checklist Before Completion

- [ ] Tests follow existing patterns
- [ ] External dependencies are mocked
- [ ] Tests are deterministic
- [ ] Edge cases are covered
- [ ] Error scenarios are tested
- [ ] Tests run independently
- [ ] Coverage meets requirements
- [ ] Tests are properly documented
- [ ] Performance is acceptable
- [ ] CI/CD integration is working