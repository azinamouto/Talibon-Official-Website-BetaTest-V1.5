# Database Schema Documentation

## Overview

This document describes the database schema for TAL.GOV, the digital platform for the Municipality of Talibon.

## Database Architecture

### Design Principles

- Normalized relational design
- Foreign key integrity
- UUID primary keys
- Timestamp tracking
- Soft deletion where appropriate
- Row Level Security (RLS)

### Technology Stack

- PostgreSQL
- Supabase
- Migration-based schema changes

## Core Tables

### users

Stores user account information and authentication data.

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'citizen',
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);
```

### departments

Represents municipal departments and offices.

```sql
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  head_of_office VARCHAR(255),
  location VARCHAR(255),
  phone VARCHAR(20),
  email VARCHAR(255),
  office_hours VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);
```

### services

Stores government service information.

```sql
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID REFERENCES departments(id),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  eligibility TEXT,
  requirements TEXT,
  steps TEXT,
  fees TEXT,
  processing_time VARCHAR(100),
  office_location VARCHAR(255),
  contact_info TEXT,
  availability VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);
```

### news

Stores news articles and announcements.

```sql
CREATE TABLE news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  author_id UUID REFERENCES users(id),
  category VARCHAR(100),
  tags TEXT[],
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);
```

### announcements

Stores official municipal announcements.

```sql
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  priority VARCHAR(50) DEFAULT 'normal',
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);
```

### documents

Stores downloadable documents and resources.

```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  file_url VARCHAR(500) NOT NULL,
  file_type VARCHAR(50),
  file_size INTEGER,
  category VARCHAR(100),
  is_public BOOLEAN DEFAULT true,
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);
```

### officials

Stores information about municipal officials.

```sql
CREATE TABLE officials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  position VARCHAR(255) NOT NULL,
  department_id UUID REFERENCES departments(id),
  photo_url VARCHAR(500),
  bio TEXT,
  term_start DATE,
  term_end DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);
```

### concerns

Stores citizen concerns and reports.

```sql
CREATE TABLE concerns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  citizen_id UUID REFERENCES users(id),
  category VARCHAR(100) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  location VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending',
  priority VARCHAR(50) DEFAULT 'normal',
  assigned_to UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);
```

### audit_logs

Stores system activity logs for auditing.

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100),
  entity_id UUID,
  details JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Indexes

### Performance Indexes

```sql
-- Users email index
CREATE INDEX idx_users_email ON users(email);

-- Services slug index
CREATE INDEX idx_services_slug ON services(slug);

-- News slug index
CREATE INDEX idx_news_slug ON news(slug);

-- Department services index
CREATE INDEX idx_services_department ON services(department_id);

-- News published index
CREATE INDEX idx_news_published ON news(is_published, published_at);

-- Announcements active index
CREATE INDEX idx_announcements_active ON announcements(is_active, start_date, end_date);

-- Concerns status index
CREATE INDEX idx_concerns_status ON concerns(status);
```

## Row Level Security Policies

### Users Table

```sql
-- Users can view their own data
CREATE POLICY "users_view_own"
ON users FOR SELECT
USING (auth.uid() = id);

-- Admins can view all users
CREATE POLICY "admins_view_all"
ON users FOR SELECT
USING (role IN ('admin', 'super_admin'));
```

### Services Table

```sql
-- Public can view active services
CREATE POLICY "public_view_active_services"
ON services FOR SELECT
USING (is_active = true);

-- Editors can manage services
CREATE POLICY "editors_manage_services"
ON services FOR ALL
USING (role IN ('editor', 'admin', 'super_admin'));
```

## Migration Process

### Creating Migrations

1. Create migration file in `database/migrations/`
2. Write SQL for schema changes
3. Test migration in development
4. Document breaking changes
5. Review with team
6. Apply to staging
7. Apply to production

### Rollback Process

Always maintain rollback scripts for production migrations.

## Best Practices

1. Always use UUIDs for primary keys
2. Include created_at and updated_at timestamps
3. Use soft deletion with deleted_at column
4. Implement proper foreign key constraints
5. Create appropriate indexes for query performance
6. Use transactions for multi-table operations
7. Document all schema changes
8. Test migrations thoroughly before production

## References

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Backend API Documentation](../backend/SPRINT2_API.md)
