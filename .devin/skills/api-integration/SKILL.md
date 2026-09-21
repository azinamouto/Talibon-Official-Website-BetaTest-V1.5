# API Integration Skill

Specialized skill for TAL.GOV API integration, including backend API development and frontend API consumption.

## When to Use This Skill

Use this skill when:
- Creating new API endpoints
- Integrating with third-party APIs
- Implementing API clients
- Setting up API authentication
- Handling API errors and retries
- Optimizing API performance

## Efficient Workflow

### 1. Understand API Structure
```bash
# Check existing API patterns
read backend/src/api/[module]/[module].controller.ts
read backend/src/api/[module]/[module].service.ts
```

### 2. Follow REST Conventions
```bash
# Check existing endpoint patterns
grep "@Get" backend/src/api/
grep "@Post" backend/src/api/
grep "axios" frontend/src/services/
```

### 3. Implementation Steps
1. Define API contract (request/response)
2. Create/update DTOs
3. Implement controller endpoint
4. Implement service logic
5. Add error handling
6. Add authentication/authorization
7. Test endpoints
8. Update frontend integration

## Cost-Effective Operations

### Targeted API Development
```typescript
// Focus on specific endpoints
// Read only relevant controller/service files
// Check similar existing endpoints
// Follow established patterns
```

### Efficient Testing
```typescript
// Test specific endpoints
// Use existing test patterns
// Focus on critical paths
// Mock external dependencies
```

## Backend API Development

### Controller Pattern
```typescript
@Controller('api/resources')
export class ResourceController {
  constructor(private readonly resourceService: ResourceService) {}

  @Get()
  @UseGuards(AuthGuard)
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10
  ) {
    return this.resourceService.findAll(page, limit);
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  async findOne(@Param('id') id: string) {
    return this.resourceService.findOne(id);
  }

  @Post()
  @UseGuards(AuthGuard)
  async create(@Body() createDto: CreateResourceDto) {
    return this.resourceService.create(createDto);
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateResourceDto
  ) {
    return this.resourceService.update(id, updateDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  @Roles('admin')
  async remove(@Param('id') id: string) {
    return this.resourceService.remove(id);
  }
}
```

### Service Pattern
```typescript
@Injectable()
export class ResourceService {
  constructor(
    private readonly supabaseService: SupabaseService
  ) {}

  async findAll(page: number, limit: number) {
    const offset = (page - 1) * limit;
    
    const { data, error, count } = await this.supabaseService
      .getClient()
      .from('resources')
      .select('*', { count: 'exact' })
      .range(offset, offset + limit - 1);

    if (error) throw new BadRequestException(error.message);

    return {
      data,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    };
  }

  async findOne(id: string) {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('resources')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw new NotFoundException('Resource not found');
    return data;
  }

  async create(createDto: CreateResourceDto) {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('resources')
      .insert(createDto)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async update(id: string, updateDto: UpdateResourceDto) {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('resources')
      .update(updateDto)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async remove(id: string) {
    const { error } = await this.supabaseService
      .getClient()
      .from('resources')
      .delete()
      .eq('id', id);

    if (error) throw new BadRequestException(error.message);
    return { message: 'Resource deleted successfully' };
  }
}
```

## Frontend API Integration

### API Service Pattern
```typescript
// frontend/src/services/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

### Resource-Specific Service
```typescript
// frontend/src/services/resource.service.ts
import api from './api';
import { Resource, CreateResourceDto, UpdateResourceDto } from '../types';

export const resourceService = {
  async getAll(page: number = 1, limit: number = 10) {
    const response = await api.get('/api/resources', {
      params: { page, limit }
    });
    return response.data;
  },

  async getById(id: string) {
    const response = await api.get(`/api/resources/${id}`);
    return response.data;
  },

  async create(data: CreateResourceDto) {
    const response = await api.post('/api/resources', data);
    return response.data;
  },

  async update(id: string, data: UpdateResourceDto) {
    const response = await api.patch(`/api/resources/${id}`, data);
    return response.data;
  },

  async delete(id: string) {
    const response = await api.delete(`/api/resources/${id}`);
    return response.data;
  }
};
```

### Custom Hook for API Calls
```typescript
// frontend/src/hooks/useApiCall.ts
import { useState, useEffect, useCallback } from 'react';

interface UseApiCallResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useApiCall<T>(
  apiFunction: () => Promise<T>,
  dependencies: any[] = []
): UseApiCallResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFunction();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [apiFunction]);

  useEffect(() => {
    fetchData();
  }, dependencies);

  return { data, loading, error, refetch: fetchData };
}
```

## Third-Party API Integration

### Payment Gateway Integration
```typescript
// Stripe integration example
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export class PaymentService {
  async createCheckoutSession(amount: number, metadata: any) {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'php',
          product_data: {
            name: 'Government Service Fee',
          },
          unit_amount: amount * 100, // in cents
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/payment/success`,
      cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`,
      metadata,
    });

    return session;
  }

  async handleWebhook(event: Stripe.Event) {
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
        await this.processPayment(session);
        break;
      // Handle other event types
    }
  }
}
```

### Email Service Integration
```typescript
// Email service integration
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export class EmailService {
  async sendEmail(to: string, subject: string, html: string) {
    try {
      const { data, error } = await resend.emails.send({
        from: 'TAL.GOV <noreply@talgov.gov>',
        to,
        subject,
        html,
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Email send error:', error);
      throw error;
    }
  }
}
```

## Error Handling

### Standardized Error Responses
```typescript
// Backend error handling
@Get()
async findAll() {
  try {
    const data = await this.resourceService.findAll();
    return {
      success: true,
      data,
      message: 'Resources retrieved successfully'
    };
  } catch (error) {
    throw new BadRequestException({
      success: false,
      message: error.message,
      error: 'RESOURCE_FETCH_ERROR'
    });
  }
}
```

### Frontend Error Handling
```typescript
// Frontend error handling
const { data, loading, error } = useApiCall(() => 
  resourceService.getAll()
);

if (error) {
  return (
    <ErrorMessage 
      message={error}
      onRetry={() => refetch()}
    />
  );
}
```

## API Documentation

### OpenAPI/Swagger Integration
```typescript
// Add Swagger decorators
@ApiTags('resources')
@Controller('api/resources')
export class ResourceController {
  @Get()
  @ApiOperation({ summary: 'Get all resources' })
  @ApiResponse({ status: 200, description: 'Resources retrieved successfully' })
  async findAll() {
    return this.resourceService.findAll();
  }
}
```

## API Performance Optimization

### Caching Strategy
```typescript
// Implement caching
@Injectable()
export class ResourceService {
  private cache = new Map();

  async findAll() {
    const cacheKey = 'resources:all';
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const data = await this.fetchFromDatabase();
    this.cache.set(cacheKey, data, { ttl: 300 }); // 5 minutes
    return data;
  }
}
```

### Rate Limiting
```typescript
// Implement rate limiting
@UseGuards(RateLimiterGuard)
@Post()
async create(@Body() createDto: CreateResourceDto) {
  return this.resourceService.create(createDto);
}
```

## API Security

### Input Validation
```typescript
// Use DTOs for validation
export class CreateResourceDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(255)
  name: string;

  @IsEmail()
  email: string;
}
```

### Authentication
```typescript
// Protect endpoints
@UseGuards(AuthGuard)
@Get()
async findAll(@Request() req) {
  // req.user contains authenticated user info
  return this.resourceService.findAll();
}
```

### Authorization
```typescript
// Role-based access
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin')
@Delete(':id')
async remove(@Param('id') id: string) {
  return this.resourceService.remove(id);
}
```

## Testing APIs

### Backend API Testing
```typescript
// Test API endpoints
describe('ResourceController', () => {
  let controller: ResourceController;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [ResourceController],
      providers: [ResourceService],
    }).compile();

    controller = module.get<ResourceController>(ResourceController);
  });

  it('should return an array of resources', async () => {
    const result = await controller.findAll();
    expect(result).toBeInstanceOf(Array);
  });
});
```

### Frontend API Testing
```typescript
// Test API integration
describe('resourceService', () => {
  it('should fetch all resources', async () => {
    const data = await resourceService.getAll();
    expect(data).toBeDefined();
    expect(data.data).toBeInstanceOf(Array);
  });
});
```

## Quick Reference

### HTTP Methods
- `GET` - Retrieve resources
- `POST` - Create resources
- `PATCH` - Update resources (partial)
- `PUT` - Update resources (complete)
- `DELETE` - Remove resources

### Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Server Error

### Common Headers
- `Content-Type: application/json`
- `Authorization: Bearer <token>`
- `Accept: application/json`

## Checklist Before Completion

- [ ] Follow REST conventions
- [ ] Implement proper validation
- [ ] Add error handling
- [ ] Secure endpoints appropriately
- [ ] Add authentication/authorization
- [ ] Document API endpoints
- [ ] Test all endpoints
- [ ] Implement rate limiting
- [ ] Add caching where appropriate
- [ ] Update frontend integration