# API Documentation

## Overview

This document provides comprehensive API documentation for TAL.GOV backend services.

## Base URL

```
Development: http://localhost:3000/api
Production:  https://api.talibon.gov.ph/api
```

## Authentication

All API requests (except public endpoints) require authentication via Bearer token.

```http
Authorization: Bearer <token>
```

## Response Format

All API responses follow this standard format:

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description",
    "details": { ... }
  }
}
```

## Public Endpoints

### Services

#### Get All Services

```http
GET /api/services
```

**Query Parameters:**
- `category` (optional): Filter by category
- `department` (optional): Filter by department
- `search` (optional): Search term
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response:**
```json
{
  "success": true,
  "data": {
    "services": [
      {
        "id": "uuid",
        "name": "Business Permit",
        "slug": "business-permit",
        "description": "...",
        "department": { ... },
        "fees": "...",
        "processing_time": "3-5 days"
      }
    ],
    "pagination": {
      "total": 100,
      "page": 1,
      "limit": 20,
      "totalPages": 5
    }
  }
}
```

#### Get Service by Slug

```http
GET /api/services/:slug
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Business Permit",
    "slug": "business-permit",
    "description": "...",
    "eligibility": "...",
    "requirements": "...",
    "steps": "...",
    "fees": "...",
    "processing_time": "3-5 days",
    "office_location": "...",
    "contact_info": "...",
    "department": { ... }
  }
}
```

### Departments

#### Get All Departments

```http
GET /api/departments
```

**Response:**
```json
{
  "success": true,
  "data": {
    "departments": [
      {
        "id": "uuid",
        "name": "Municipal Health Office",
        "description": "...",
        "head_of_office": "...",
        "location": "...",
        "phone": "...",
        "email": "...",
        "office_hours": "8:00 AM - 5:00 PM"
      }
    ]
  }
}
```

### News

#### Get Published News

```http
GET /api/news
```

**Query Parameters:**
- `category` (optional): Filter by category
- `limit` (optional): Number of items (default: 10)

**Response:**
```json
{
  "success": true,
  "data": {
    "news": [
      {
        "id": "uuid",
        "title": "...",
        "slug": "...",
        "excerpt": "...",
        "content": "...",
        "category": "...",
        "tags": ["tag1", "tag2"],
        "published_at": "2024-01-01T00:00:00Z",
        "author": { ... }
      }
    ]
  }
}
```

#### Get News by Slug

```http
GET /api/news/:slug
```

### Announcements

#### Get Active Announcements

```http
GET /api/announcements
```

**Response:**
```json
{
  "success": true,
  "data": {
    "announcements": [
      {
        "id": "uuid",
        "title": "...",
        "content": "...",
        "priority": "normal|high|urgent",
        "start_date": "2024-01-01T00:00:00Z",
        "end_date": "2024-01-31T23:59:59Z"
      }
    ]
  }
}
```

### Officials

#### Get All Officials

```http
GET /api/officials
```

**Response:**
```json
{
  "success": true,
  "data": {
    "officials": [
      {
        "id": "uuid",
        "first_name": "...",
        "last_name": "...",
        "position": "...",
        "department": { ... },
        "photo_url": "...",
        "bio": "...",
        "term_start": "2024-01-01",
        "term_end": "2027-12-31"
      }
    ]
  }
}
```

## Admin Endpoints

### Authentication

#### Login

```http
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "jwt_token",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "role": "admin",
      "first_name": "...",
      "last_name": "..."
    }
  }
}
```

#### Logout

```http
POST /api/auth/logout
```

**Headers:**
```
Authorization: Bearer <token>
```

### Service Management

#### Create Service

```http
POST /api/admin/services
```

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "New Service",
  "slug": "new-service",
  "description": "...",
  "department_id": "uuid",
  "eligibility": "...",
  "requirements": "...",
  "steps": "...",
  "fees": "...",
  "processing_time": "...",
  "office_location": "...",
  "contact_info": "..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "New Service",
    "slug": "new-service",
    ...
  }
}
```

#### Update Service

```http
PATCH /api/admin/services/:id
```

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "Updated Service Name",
  "description": "Updated description"
}
```

#### Delete Service

```http
DELETE /api/admin/services/:id
```

**Headers:**
```
Authorization: Bearer <token>
```

### News Management

#### Create News

```http
POST /api/admin/news
```

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "title": "News Title",
  "slug": "news-slug",
  "content": "Full content...",
  "excerpt": "Brief excerpt...",
  "category": "category",
  "tags": ["tag1", "tag2"],
  "is_published": true
}
```

#### Update News

```http
PATCH /api/admin/news/:id
```

#### Delete News

```http
DELETE /api/admin/news/:id
```

### User Management

#### Get All Users

```http
GET /api/admin/users
```

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `role` (optional): Filter by role
- `search` (optional): Search term

#### Update User Role

```http
PATCH /api/admin/users/:id/role
```

**Request Body:**
```json
{
  "role": "admin"
}
```

#### Deactivate User

```http
PATCH /api/admin/users/:id/deactivate
```

### Document Management

#### Upload Document

```http
POST /api/admin/documents
```

**Request Body (multipart/form-data):**
```
file: <file>
title: "Document Title"
description: "Document description"
category: "category"
is_public: true
```

#### Delete Document

```http
DELETE /api/admin/documents/:id
```

## Error Codes

| Code | Description |
|------|-------------|
| `UNAUTHORIZED` | Authentication required or invalid |
| `FORBIDDEN` | Insufficient permissions |
| `NOT_FOUND` | Resource not found |
| `VALIDATION_ERROR` | Invalid request data |
| `SERVER_ERROR` | Internal server error |
| `RATE_LIMIT_EXCEEDED` | Too many requests |

## Rate Limiting

- Public endpoints: 100 requests per minute
- Authenticated endpoints: 1000 requests per minute
- Admin endpoints: 500 requests per minute

## Pagination

List endpoints support pagination:

```json
{
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

## Filtering and Sorting

### Filtering

```
GET /api/services?category=permit&department=finance
```

### Sorting

```
GET /api/news?sort=published_at&order=desc
```

## References

- [Backend API Guide](../backend/SPRINT2_API.md)
- [Admin API Documentation](../backend/docs/admin-api.md)
- [Authentication Guide](AUTHENTICATION_GUIDE.md)
