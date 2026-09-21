# TAL.GOV AI Agent Workflow Guidelines

## Agent Optimization Strategy

This document defines the efficient, cost-effective workflow for AI agents working on the TAL.GOV project to minimize token consumption while maintaining precision and quality.

## Core Principles

### 1. Targeted Context Loading
- **Load only relevant files** for each task
- Use file pattern matching instead of broad directory reads
- Prioritize recently modified files
- Load related files in parallel when possible

### 2. Precise Tool Selection
- Use `grep` for code searches instead of `find` when searching content
- Use `find_file_by_name` for file pattern matching
- Prefer `code_search` for complex exploration tasks
- Use `read` with specific line ranges for large files

### 3. Efficient Planning
- Break complex tasks into smaller, focused subtasks
- Use `todo_write` to track progress and provide visibility
- Plan before executing to avoid rework
- Ask clarifying questions early to avoid misdirection

### 4. Cost-Effective Operations
- Batch related operations in single tool calls when possible
- Use context efficiently - avoid redundant information
- Leverage caching mechanisms in the codebase
- Minimize unnecessary file reads

## Workflow Patterns

### Pattern 1: Bug Investigation
```
1. Use grep to locate error-related code
2. Read specific files with line ranges
3. Check related configuration files
4. Implement targeted fix
5. Verify with focused testing
```

### Pattern 2: Feature Implementation
```
1. Read existing similar features for patterns
2. Check database schema/API contracts
3. Implement following established conventions
4. Test integration points
5. Update documentation if needed
```

### Pattern 3: Code Refactoring
```
1. Identify refactoring scope with grep
2. Read affected files
3. Plan refactoring approach
4. Implement changes systematically
5. Run existing tests to verify
```

### Pattern 4: Database Changes
```
1. Read current schema/migrations
2. Check related models/services
3. Create migration following conventions
4. Update affected code
5. Test in development environment
```

## Project-Specific Guidelines

### Backend Development (NestJS)

#### Efficient Controller Updates
- Read existing controllers to understand patterns
- Use DTOs for validation (check existing DTOs)
- Follow RESTful conventions established in project
- Implement proper error handling patterns
- Add appropriate guards and decorators

#### Service Layer Optimization
- Check existing services for business logic patterns
- Use Supabase service for database operations
- Implement proper error handling and logging
- Follow transaction patterns for complex operations
- Cache frequently accessed data

#### Database Operations
- Always check existing migrations before creating new ones
- Use established naming conventions
- Implement proper RLS policies
- Add indexes for performance-critical queries
- Test migrations in development first

### Frontend Development (React/TypeScript)

#### Component Development
- Check existing components for design patterns
- Use established component library
- Follow TypeScript interfaces from types directory
- Implement proper error boundaries
- Add loading states for async operations

#### State Management
- Use existing Context providers
- Check established patterns for API calls
- Implement proper error handling in services
- Use React Query patterns if available
- Follow established authentication flow

#### Routing & Navigation
- Check existing route structure
- Use established protected route patterns
- Implement proper breadcrumb navigation
- Add 404 handling for new routes
- Update navigation components

## Cost Optimization Techniques

### 1. Intelligent File Loading
```typescript
// BAD: Loading entire directory
const allFiles = readDirectory('src/components')

// GOOD: Loading specific files
const specificFiles = [
  read('src/components/Button.tsx'),
  read('src/components/Input.tsx')
]
```

### 2. Focused Code Search
```typescript
// BAD: Broad search
grep('function', 'src/')

// GOOD: Targeted search
grep('async function getUser', 'src/services/user.service.ts')
```

### 3. Parallel Operations
```typescript
// Load related files in parallel
const [component, service, type] = await Promise.all([
  read('src/components/UserCard.tsx'),
  read('src/services/user.service.ts'),
  read('src/types/user.ts')
])
```

### 4. Line-Specific Reading
```typescript
// BAD: Reading entire large file
read('src/services/api.ts')

// GOOD: Reading specific section
read('src/services/api.ts', { offset: 100, limit: 50 })
```

## Task Prioritization Matrix

### High Impact, Low Cost (Do First)
- Fixing critical bugs
- Implementing security fixes
- Adding missing error handling
- Performance optimizations

### High Impact, High Cost (Plan Carefully)
- Major feature additions
- Database schema changes
- Architecture refactoring
- Third-party integrations

### Low Impact, Low Cost (Batch)
- Code style improvements
- Documentation updates
- Minor UI enhancements
- Test additions

### Low Impact, High Cost (Defer)
- Nice-to-have features
- Experimental functionality
- Major refactoring without clear benefit
- Complex optimizations

## Error Handling Strategy

### 1. Graceful Degradation
- Implement fallbacks for API failures
- Show user-friendly error messages
- Log errors for debugging
- Provide retry mechanisms

### 2. Input Validation
- Validate all user inputs
- Sanitize data before processing
- Use TypeScript for type safety
- Implement proper DTOs

### 3. Error Recovery
- Implement retry logic for transient failures
- Provide clear error messages
- Log sufficient context for debugging
- Implement proper error boundaries

## Testing Strategy

### Unit Testing
- Test individual functions and components
- Mock external dependencies
- Test edge cases and error conditions
- Keep tests focused and fast

### Integration Testing
- Test component interactions
- Test API endpoints
- Test database operations
- Test authentication flows

### E2E Testing
- Test critical user flows
- Test cross-page functionality
- Test payment flows
- Test form submissions

## Code Quality Standards

### TypeScript Best Practices
- Use strict mode
- Avoid `any` types
- Use proper interfaces
- Implement proper generics
- Use enum for constants

### React Best Practices
- Use functional components
- Implement proper hooks
- Avoid prop drilling
- Use proper key props
- Implement memoization where appropriate

### NestJS Best Practices
- Use dependency injection
- Implement proper guards
- Use interceptors for cross-cutting concerns
- Follow module structure
- Implement proper exception filters

## Security Guidelines

### Authentication
- Always validate JWT tokens
- Implement proper session management
- Use secure cookie practices
- Implement proper logout functionality
- Handle token refresh properly

### Authorization
- Implement proper RBAC
- Use guards for protected routes
- Validate permissions on backend
- Implement proper RLS policies
- Audit sensitive operations

### Data Protection
- Never log sensitive information
- Validate all inputs
- Sanitize outputs
- Use parameterized queries
- Implement proper encryption

## Performance Optimization

### Backend Performance
- Implement proper database indexing
- Use database connection pooling
- Cache frequently accessed data
- Implement proper pagination
- Use lazy loading for relationships

### Frontend Performance
- Implement code splitting
- Use lazy loading for components
- Optimize images and assets
- Implement proper caching
- Use virtual scrolling for long lists

### API Performance
- Implement proper pagination
- Use compression for responses
- Cache API responses where appropriate
- Implement rate limiting
- Use efficient data structures

## Documentation Standards

### Code Documentation
- Document complex functions
- Explain non-obvious logic
- Document API contracts
- Provide usage examples
- Keep documentation up to date

### API Documentation
- Document all endpoints
- Provide request/response examples
- Document error responses
- Include authentication requirements
- Document rate limits

### User Documentation
- Provide clear instructions
- Include screenshots where helpful
- Document common issues
- Provide troubleshooting steps
- Keep documentation accessible

## Communication Guidelines

### Status Updates
- Provide regular progress updates
- Highlight blockers immediately
- Suggest alternatives when stuck
- Ask clarifying questions early
- Summarize completed work

### Issue Reporting
- Provide clear error messages
- Include relevant context
- Suggest potential solutions
- Document reproduction steps
- Include environment information

### Code Review
- Explain the "why" not just "what"
- Highlight potential issues
- Suggest improvements
- Acknowledge good practices
- Be constructive and respectful

## Continuous Improvement

### Learning from Mistakes
- Document lessons learned
- Update guidelines based on experience
- Share knowledge with team
- Improve processes over time
- Stay updated with best practices

### Process Optimization
- Identify bottlenecks
- Automate repetitive tasks
- Improve tool usage
- Optimize workflows
- Reduce waste

### Knowledge Sharing
- Document new patterns
- Share useful techniques
- Mentor others
- Create reusable components
- Build internal tools

## Emergency Procedures

### Critical Bugs
- Assess impact immediately
- Implement temporary fix if needed
- Communicate with stakeholders
- Plan permanent fix
- Document the incident

### Security Issues
- Assess severity immediately
- Implement temporary mitigation
- Escalate if necessary
- Plan permanent fix
- Conduct security review

### Performance Issues
- Identify bottleneck
- Implement quick wins
- Plan long-term solution
- Monitor improvements
- Document learnings

## Success Metrics

### Efficiency Metrics
- Task completion time
- Token usage per task
- Number of iterations needed
- Error rate
- Rework required

### Quality Metrics
- Bug rate
- Test coverage
- Code review scores
- User satisfaction
- System uptime

### Cost Metrics
- API call costs
- Token consumption
- Development time
- Maintenance overhead
- Infrastructure costs

## Agent Self-Improvement

### After Each Task
- Evaluate what worked well
- Identify areas for improvement
- Update personal knowledge base
- Share learnings with team
- Plan for next time

### Regular Review
- Review workflow efficiency
- Update based on project changes
- Learn from other agents
- Stay current with tools
- Adapt to new requirements