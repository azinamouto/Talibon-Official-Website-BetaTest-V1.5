# Database Operations Skill

Specialized skill for TAL.GOV database operations using Supabase and PostgreSQL.

## When to Use This Skill

Use this skill when:
- Creating or modifying database schemas
- Writing database migrations
- Implementing Row Level Security (RLS) policies
- Optimizing database queries
- Setting up database indexes
- Managing database relationships

## Efficient Workflow

### 1. Understand Current Schema
```bash
# Check existing database structure
read supabase/migrations/*.sql
find DATABASE -name "*.sql"
```

### 2. Analyze Relationships
```bash
# Search for foreign key relationships
grep "FOREIGN KEY" DATABASE/
grep "REFERENCES" DATABASE/
```

### 3. Follow Migration Patterns
```bash
# Check existing migration patterns
read supabase/migrations/[latest-migration].sql
```

### 4. Implementation Steps
1. Understand existing schema
2. Plan changes with ERD consideration
3. Create migration following naming convention
4. Implement proper constraints
5. Add RLS policies
6. Test in development environment
7. Document changes

## Cost-Effective Operations

### Targeted Schema Analysis
```sql
-- Read only relevant table definitions
-- Focus on affected tables
-- Check related foreign keys
-- Review existing indexes
```

### Incremental Changes
```sql
-- Make small, focused changes
-- Test each change independently
-- Roll back if issues occur
-- Document each migration
```

### Pattern-Based Design
```sql
-- Follow existing naming conventions
-- Use established data types
-- Maintain consistency with current schema
-- Implement proper constraints
```

## Database Schema Patterns

### Table Creation Pattern
```sql
CREATE TABLE resources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT true
);
```

### Index Creation Pattern
```sql
-- Create indexes for frequently queried columns
CREATE INDEX idx_resources_name ON resources(name);
CREATE INDEX idx_resources_created_at ON resources(created_at);
CREATE INDEX idx_resources_active ON resources(is_active) WHERE is_active = true;
```

### Foreign Key Pattern
```sql
-- Establish relationships with proper constraints
ALTER TABLE resources
ADD CONSTRAINT fk_resources_department
FOREIGN KEY (department_id) 
REFERENCES departments(id)
ON DELETE RESTRICT
ON UPDATE CASCADE;
```

## Migration Best Practices

### Migration Naming
```sql
-- Use timestamp and descriptive name
-- Format: YYYYMMDDHHMMSS_description.sql
-- Example: 20240920150000_add_user_preferences.sql
```

### Migration Structure
```sql
-- Migration header
-- Author: [Your Name]
-- Date: [YYYY-MM-DD]
-- Description: [Brief description]

-- BEGIN

-- Up migration (changes to apply)
CREATE TABLE new_table (...);

-- Down migration (rollback changes)
-- DROP TABLE new_table;

-- COMMIT
```

### Rollback Planning
```sql
-- Always include down migration
-- Test rollback process
-- Document rollback steps
-- Consider data preservation
```

## Row Level Security (RLS)

### Enable RLS
```sql
-- Enable RLS on table
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
```

### Policy Patterns
```sql
-- Read policy for authenticated users
CREATE POLICY "Users can view resources"
ON resources FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Write policy for creators
CREATE POLICY "Users can create resources"
ON resources FOR INSERT
WITH CHECK (auth.uid() = created_by);

-- Update policy for owners
CREATE POLICY "Users can update own resources"
ON resources FOR UPDATE
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

-- Admin policy
CREATE POLICY "Admins can manage all resources"
ON resources FOR ALL
USING (
  auth.uid() IN (
    SELECT id FROM auth.users 
    WHERE raw_user_meta_data->>'role' = 'admin'
  )
);
```

## Query Optimization

### Efficient Query Patterns
```sql
-- Use specific columns instead of SELECT *
SELECT id, name, email FROM users WHERE active = true;

-- Use indexes effectively
SELECT * FROM resources 
WHERE name LIKE 'term%' 
AND created_at > '2024-01-01';

-- Use JOINs properly
SELECT r.*, d.name as department_name
FROM resources r
JOIN departments d ON r.department_id = d.id;
```

### Performance Considerations
```sql
-- Avoid N+1 queries
-- Use proper JOINs
-- Implement pagination
-- Cache frequently accessed data
-- Use appropriate indexes
```

## Data Validation

### Check Constraints
```sql
-- Add data validation
ALTER TABLE resources
ADD CONSTRAINT chk_resources_name_length
CHECK (LENGTH(name) >= 3 AND LENGTH(name) <= 255);

ALTER TABLE resources
ADD CONSTRAINT chk_resources_email_format
CHECK (email ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+[.][A-Za-z]+$');
```

### Default Values
```sql
-- Set sensible defaults
ALTER TABLE resources
ALTER COLUMN is_active SET DEFAULT true;

ALTER TABLE resources
ALTER COLUMN created_at SET DEFAULT NOW();
```

## Database Relationships

### One-to-Many
```sql
-- Parent table
CREATE TABLE departments (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL
);

-- Child table
CREATE TABLE employees (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  department_id UUID REFERENCES departments(id)
);
```

### Many-to-Many
```sql
-- Junction table
CREATE TABLE employee_projects (
  employee_id UUID REFERENCES employees(id),
  project_id UUID REFERENCES projects(id),
  role VARCHAR(50),
  PRIMARY KEY (employee_id, project_id)
);
```

### Self-Referencing
```sql
-- Hierarchical relationships
CREATE TABLE organizational_units (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  parent_id UUID REFERENCES organizational_units(id)
);
```

## Common Operations

### CRUD Operations via Supabase
```typescript
// Create
const { data, error } = await supabase
  .from('resources')
  .insert([{ name: 'New Resource', description: 'Description' }]);

// Read
const { data, error } = await supabase
  .from('resources')
  .select('*')
  .eq('id', resourceId);

// Update
const { data, error } = await supabase
  .from('resources')
  .update({ name: 'Updated Name' })
  .eq('id', resourceId);

// Delete
const { data, error } = await supabase
  .from('resources')
  .delete()
  .eq('id', resourceId);
```

### Advanced Queries
```typescript
// Joins
const { data, error } = await supabase
  .from('resources')
  .select(`
    *,
    departments (
      id,
      name
    )
  `);

// Filtering
const { data, error } = await supabase
  .from('resources')
  .select('*')
  .gte('created_at', '2024-01-01')
  .lt('created_at', '2024-12-31');

// Pagination
const { data, error } = await supabase
  .from('resources')
  .select('*')
  .range(0, 9); // First 10 records
```

## Backup and Recovery

### Backup Strategy
```sql
-- Regular backups
-- Point-in-time recovery
-- Export critical data
-- Document restore procedures
```

### Data Export
```typescript
// Export data for backup
const { data, error } = await supabase
  .from('resources')
  .select('*')
  .csv(); // Export as CSV
```

## Security Considerations

### Sensitive Data
```sql
-- Encrypt sensitive columns
-- Use proper data types
-- Implement access controls
-- Audit data access
-- Regular security reviews
```

### Audit Logging
```sql
-- Create audit tables
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  table_name VARCHAR(255),
  record_id UUID,
  action VARCHAR(50),
  old_data JSONB,
  new_data JSONB,
  changed_by UUID,
  changed_at TIMESTAMP DEFAULT NOW()
);
```

## Performance Monitoring

### Query Analysis
```sql
-- Analyze slow queries
-- Review query plans
-- Monitor index usage
-- Check table statistics
-- Optimize bottlenecks
```

### Index Maintenance
```sql
-- Regular index analysis
ANALYZE resources;

-- Rebuild indexes if needed
REINDEX TABLE resources;
```

## Testing Database Changes

### Development Testing
```sql
-- Test migrations in development
-- Verify data integrity
-- Check performance impact
-- Test rollback procedures
-- Validate RLS policies
```

### Data Validation
```sql
-- Verify foreign key constraints
-- Check data consistency
-- Validate business rules
-- Test edge cases
-- Review data types
```

## Quick Reference

### Common Data Types
- `UUID` - Unique identifiers
- `VARCHAR(n)` - Variable-length strings
- `TEXT` - Long text content
- `INTEGER` - Whole numbers
- `DECIMAL(p,s)` - Precise numbers
- `BOOLEAN` - True/false values
- `TIMESTAMP WITH TIME ZONE` - Dates with timezones
- `JSONB` - JSON data (binary format)

### Common Constraints
- `PRIMARY KEY` - Unique identifier
- `FOREIGN KEY` - Relationship references
- `UNIQUE` - No duplicate values
- `NOT NULL` - Required fields
- `CHECK` - Custom validation rules
- `DEFAULT` - Default values

### Common Indexes
- `B-tree` - Default index type
- `GIN` - For JSONB/array columns
- `Partial` - Indexes with conditions
- `Composite` - Multiple column indexes

## Checklist Before Completion

- [ ] Follow existing schema conventions
- [ ] Implement proper constraints
- [ ] Add appropriate indexes
- [ ] Create RLS policies
- [ ] Test in development
- [ ] Document changes
- [ ] Plan rollback procedure
- [ ] Verify data integrity
- [ ] Check performance impact
- [ ] Update related code if needed