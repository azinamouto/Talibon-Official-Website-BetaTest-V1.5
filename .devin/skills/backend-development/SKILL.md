# Backend Development Skill

Specialized skill for TAL.GOV backend development using NestJS, TypeScript, and Supabase.

## When to Use This Skill

Use this skill when:
- Creating or modifying NestJS controllers, services, or modules
- Implementing API endpoints
- Working with database operations
- Setting up authentication/authorization
- Implementing business logic
- Creating DTOs or validation schemas

## Efficient Workflow

### 1. Understand the Context
```bash
# First, understand the existing structure
read backend/src/app.module.ts
read backend/src/main.ts
```

### 2. Follow Established Patterns
```bash
# Check similar existing implementations
find backend/src/api -name "*.controller.ts"
find backend/src/api -name "*.service.ts"
```

### 3. Use Code Search for Understanding
```bash
# Search for specific patterns
grep "class-validator" backend/src/
grep "@UseGuards" backend/src/
grep "SupabaseService" backend/src/
```

### 4. Implementation Steps
1. Read existing similar controllers/services
2. Check DTO patterns in the api directory
3. Follow NestJS module structure
4. Implement proper error handling
5. Add appropriate guards and decorators
6. Test the implementation

## Cost-Effective Operations

### Targeted File Reading
```typescript
// Read only relevant files
read backend/src/api/[module]/[module].controller.ts
read backend/src/api/[module]/[module].service.ts
read backend/src/api/[module]/dto/[name].dto.ts
```

### Pattern-Based Development
```typescript
// Follow existing patterns for consistency
// Check existing controller structure
// Use similar service patterns
// Follow established DTO validation
```

### Efficient Testing
```typescript
// Test specific endpoints
// Use existing test patterns
// Focus on critical paths
```

## Common Patterns

### Controller Pattern
```typescript
@Controller('api/resource')
export class ResourceController {
  constructor(private readonly resourceService: ResourceService) {}

  @Get()
  @UseGuards(AuthGuard)
  async findAll() {
    return this.resourceService.findAll();
  }

  @Post()
  @UseGuards(AuthGuard)
  async create(@Body() createDto: CreateResourceDto) {
    return this.resourceService.create(createDto);
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

  async findAll() {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('resources')
      .select('*');
    
    if (error) throw new BadRequestException(error.message);
    return data;
  }
}
```

### DTO Pattern
```typescript
export class CreateResourceDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  description?: string;
}
```

## Security Considerations

- Always use guards for protected endpoints
- Validate all input with class-validator
- Implement proper error handling
- Never expose sensitive data
- Use parameterized queries via Supabase
- Implement proper RLS policies

## Database Operations

### Using Supabase Service
```typescript
// Read pattern
const { data, error } = await this.supabaseService
  .getClient()
  .from('table')
  .select('*')
  .eq('id', id);

// Write pattern
const { data, error } = await this.supabaseService
  .getClient()
  .from('table')
  .insert(insertData);

// Update pattern
const { data, error } = await this.supabaseService
  .getClient()
  .from('table')
  .update(updateData)
  .eq('id', id);
```

## Error Handling

### Standard Error Responses
```typescript
if (error) {
  throw new BadRequestException(error.message);
}

if (!data) {
  throw new NotFoundException('Resource not found');
}
```

## Module Structure

```
backend/src/api/[module]/
├── [module].controller.ts
├── [module].service.ts
├── [module].module.ts
└── dto/
    ├── create-[module].dto.ts
    └── update-[module].dto.ts
```

## Quick Reference

### Common Decorators
- `@Controller('path')` - Define controller route
- `@Get()`, `@Post()`, `@Patch()`, `@Delete()` - HTTP methods
- `@Param()`, `@Body()`, `@Query()` - Parameter extraction
- `@UseGuards()` - Apply authentication/authorization
- `@HttpCode()` - Custom HTTP status codes

### Common Validators
- `@IsString()`, `@IsNumber()`, `@IsBoolean()` - Type validation
- `@IsEmail()`, `@IsUrl()` - Format validation
- `@IsNotEmpty()`, `@IsOptional()` - Presence validation
- `@Min()`, `@Max()` - Range validation

## Checklist Before Completion

- [ ] Follow existing code patterns
- [ ] Implement proper validation
- [ ] Add error handling
- [ ] Use appropriate guards
- [ ] Test the endpoints
- [ ] Check database permissions
- [ ] Verify RLS policies
- [ ] Update API documentation if needed