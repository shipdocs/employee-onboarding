<!-- This documentation has been sanitized for public viewing. Sensitive data has been replaced with placeholders. -->

# API Documentation

## Overview

The Maritime Onboarding System API provides secure endpoints for managing crew onboarding, training, and certification processes. All endpoints require authentication unless specified otherwise.

## Documentation Files

### 📄 API Reference Files
- **[Error Handling Guide](./error-handling.md)** - Comprehensive error codes and handling patterns
- **[Response Standards](./response-standards.md)** - API response format specifications
- **[Endpoints Overview](./endpoints/overview.md)** - Complete endpoint documentation
- **[Generated API Reference](./endpoints/generated-reference.md)** - Auto-generated endpoint reference

## Table of Contents

1. [Authentication](#authentication)
2. [Rate Limiting](#rate-limiting)
3. [Error Handling](#error-handling)
4. [API Endpoints](#api-endpoints)
   - [Auth Endpoints](#auth-endpoints)
   - [Admin Endpoints](#admin-endpoints)
   - [Manager Endpoints](#manager-endpoints)
   - [Crew Endpoints](#crew-endpoints)
   - [Workflow Endpoints](#workflow-endpoints)
5. [Request/Response Examples](#requestresponse-examples)

## Authentication

All API requests (except login endpoints) require a JWT token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

### Token Structure

```json
{
  "sub": "550e8400-e29b-41d4-a716-446655440000",
  "role": "crew|manager|admin",
  "company_id": "660e8400-e29b-41d4-a716-446655440000",
  "permissions": ["read", "write", "delete"],
  "iat": 1234567890,
  "exp": 1234654290
}
```

## Rate Limiting

| Endpoint Type | Rate Limit | Window |
|--------------|------------|---------|
| Authentication | 5 requests | 15 minutes |
| General API | 100 requests | 1 minute |
| File Upload | 10 requests | 1 hour |
| Magic Link | 3 requests | 1 hour |

Rate limit headers:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Unix timestamp when limit resets

## Error Handling

### Error Response Format

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "Additional context"
    }
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `RATE_LIMITED` | 429 | Too many requests |
| `SERVER_ERROR` | 500 | Internal server error |

## API Endpoints

### Auth Endpoints

#### POST /api/auth/login
**Public endpoint** - Authenticate user with email and password

**Request:**
```json
{
  "email": "user@example.com",
  "password": "secureyour-password"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "role": "crew",
    "name": "John Doe"
  }
}
```

**Security Requirements:**
- Password must be 8+ characters
- Account lockout after 5 failed attempts
- Rate limited to 5 attempts per 15 minutes

---

#### POST /api/auth/magic-link
**Public endpoint** - Request magic link for passwordless login

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "message": "Magic link sent to email"
}
```

**Security Requirements:**
- Valid email format required
- Rate limited to 3 requests per hour
- Links expire after 15 minutes

---

#### POST /api/auth/verify-magic-link
**Public endpoint** - Verify magic link token

**Request:**
```json
{
  "token": "32-character-secure-token"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "role": "crew"
  }
}
```

**Security Requirements:**
- Token must be exactly 32 characters
- Single use only
- Expires after 15 minutes

---

#### POST /api/auth/logout
Invalidate current session

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "message": "Successfully logged out"
}
```

### Admin Endpoints

#### GET /api/admin/dashboard
Get admin dashboard statistics

**Headers:**
```
Authorization: Bearer <admin_jwt_token>
```

**Response:**
```json
{
  "statistics": {
    "totalCompanies": 25,
    "totalCrewMembers": 450,
    "activeOnboardings": 38,
    "completionRate": 87.5
  },
  "recentActivity": [
    {
      "type": "onboarding_completed",
      "crew_member": "John Doe",
      "company": "Maritime Corp",
      "timestamp": "2025-01-02T10:30:00Z"
    }
  ]
}
```

**Security Requirements:**
- Admin role required
- Returns aggregated data only

---

#### GET /api/admin/companies
List all companies with pagination

**Headers:**
```
Authorization: Bearer <admin_jwt_token>
```

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 20, max: 100)
- `search` (optional)

**Response:**
```json
{
  "companies": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440000",
      "name": "Maritime Corp",
      "created_at": "2025-01-01T00:00:00Z",
      "crew_count": 45,
      "manager_count": 3
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 25,
    "totalPages": 2
  }
}
```

---

#### POST /api/admin/companies
Create new company

**Headers:**
```
Authorization: Bearer <admin_jwt_token>
```

**Request:**
```json
{
  "name": "New Maritime Company",
  "contact_email": "contact@company.com",
  "contact_phone": "+31201234567",
  "address": "Amsterdam, Netherlands"
}
```

**Response:**
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440000",
  "name": "New Maritime Company",
  "created_at": "2025-01-02T12:00:00Z"
}
```

**Security Requirements:**
- Admin role required
- Input validation on all fields
- Duplicate company names prevented

---

#### PUT /api/admin/companies/[id]
Update company information

**Headers:**
```
Authorization: Bearer <admin_jwt_token>
```

**Request:**
```json
{
  "name": "Updated Company Name",
  "contact_email": "new@company.com"
}
```

**Response:**
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440000",
  "name": "Updated Company Name",
  "updated_at": "2025-01-02T12:00:00Z"
}
```

---

#### DELETE /api/admin/companies/[id]
Delete company (soft delete)

**Headers:**
```
Authorization: Bearer <admin_jwt_token>
```

**Response:**
```json
{
  "message": "Company deleted successfully"
}
```

**Security Requirements:**
- Admin role required
- Cascading soft delete for related data
- Audit log entry created

### Manager Endpoints

#### GET /api/manager/dashboard
Get manager dashboard for their company

**Headers:**
```
Authorization: Bearer <manager_jwt_token>
```

**Response:**
```json
{
  "company": {
    "id": "660e8400-e29b-41d4-a716-446655440000",
    "name": "Maritime Corp"
  },
  "statistics": {
    "totalCrew": 45,
    "activeOnboardings": 8,
    "pendingReviews": 3,
    "completionRate": 85.0
  },
  "recentActivity": [
    {
      "type": "phase_completed",
      "crew_member": "Jane Smith",
      "phase": "Safety Training",
      "timestamp": "2025-01-02T09:00:00Z"
    }
  ]
}
```

**Security Requirements:**
- Manager role required
- Data filtered to manager's company only

---

#### GET /api/manager/crew
List crew members in manager's company

**Headers:**
```
Authorization: Bearer <manager_jwt_token>
```

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 20)
- `status` (active|onboarding|completed)
- `search` (optional)

**Response:**
```json
{
  "crew": [
    {
      "id": "880e8400-e29b-41d4-a716-446655440000",
      "name": "John Doe",
      "email": "john@example.com",
      "status": "onboarding",
      "progress": 65,
      "current_phase": "Safety Training",
      "joined_date": "2025-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45
  }
}
```

---

#### POST /api/manager/crew
Add new crew member

**Headers:**
```
Authorization: Bearer <manager_jwt_token>
```

**Request:**
```json
{
  "email": "newcrew@example.com",
  "name": "New Crew Member",
  "position": "Deck Officer",
  "start_date": "2025-01-15"
}
```

**Response:**
```json
{
  "id": "990e8400-e29b-41d4-a716-446655440000",
  "email": "newcrew@example.com",
  "magic_link_sent": true
}
```

**Security Requirements:**
- Manager role required
- Email uniqueness validated
- Automatic onboarding workflow assignment

---

#### GET /api/manager/crew/[id]/progress
Get detailed progress for specific crew member

**Headers:**
```
Authorization: Bearer <manager_jwt_token>
```

**Response:**
```json
{
  "crew_member": {
    "id": "880e8400-e29b-41d4-a716-446655440000",
    "name": "John Doe"
  },
  "overall_progress": 65,
  "phases": [
    {
      "id": "phase1",
      "name": "Documentation",
      "status": "completed",
      "completed_at": "2025-01-01T10:00:00Z",
      "items": [
        {
          "name": "Passport Upload",
          "status": "completed"
        }
      ]
    },
    {
      "id": "phase2",
      "name": "Safety Training",
      "status": "in_progress",
      "progress": 50,
      "items": [
        {
          "name": "Fire Safety",
          "status": "completed"
        },
        {
          "name": "First Aid",
          "status": "pending"
        }
      ]
    }
  ]
}
```

---

#### POST /api/manager/crew/[id]/approve-phase
Approve crew member's phase completion

**Headers:**
```
Authorization: Bearer <manager_jwt_token>
```

**Request:**
```json
{
  "phase_id": "phase2",
  "comments": "Excellent performance in safety training"
}
```

**Response:**
```json
{
  "message": "Phase approved successfully",
  "next_phase": {
    "id": "phase3",
    "name": "Technical Training"
  }
}
```

### Crew Endpoints

#### GET /api/crew/[id]/dashboard
Get crew member's personal dashboard

**Headers:**
```
Authorization: Bearer <crew_jwt_token>
```

**Response:**
```json
{
  "profile": {
    "id": "880e8400-e29b-41d4-a716-446655440000",
    "name": "John Doe",
    "email": "john@example.com",
    "position": "Deck Officer",
    "company": "Maritime Corp"
  },
  "onboarding": {
    "status": "in_progress",
    "overall_progress": 65,
    "current_phase": {
      "id": "phase2",
      "name": "Safety Training",
      "progress": 50
    },
    "estimated_completion": "2025-01-20"
  }
}
```

**Security Requirements:**
- Crew can only access own data
- ID in URL must match token subject

---

#### GET /api/crew/[id]/training
Get current training materials

**Headers:**
```
Authorization: Bearer <crew_jwt_token>
```

**Response:**
```json
{
  "current_phase": {
    "id": "phase2",
    "name": "Safety Training"
  },
  "materials": [
    {
      "id": "mat1",
      "type": "video",
      "title": "Fire Safety Procedures",
      "url": "https://storage.example.com/videos/fire-safety.mp4",
      "duration": "15:30",
      "completed": false
    },
    {
      "id": "mat2",
      "type": "document",
      "title": "Safety Manual",
      "url": "https://storage.example.com/docs/safety-manual.pdf",
      "pages": 45,
      "completed": true
    }
  ]
}
```

---

#### POST /api/crew/[id]/training/complete
Mark training item as completed

**Headers:**
```
Authorization: Bearer <crew_jwt_token>
```

**Request:**
```json
{
  "material_id": "mat1",
  "completion_data": {
    "time_spent": 930,
    "quiz_score": 85
  }
}
```

**Response:**
```json
{
  "message": "Training item completed",
  "phase_progress": 75,
  "next_item": {
    "id": "mat3",
    "title": "Emergency Procedures"
  }
}
```

---

#### POST /api/crew/[id]/documents/upload
Upload required documents

**Headers:**
```
Authorization: Bearer <crew_jwt_token>
Content-Type: multipart/form-data
```

**Request:**
```
POST /api/crew/[id]/documents/upload
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary

------WebKitFormBoundary
Content-Disposition: form-data; name="document_type"

passport
------WebKitFormBoundary
Content-Disposition: form-data; name="file"; filename="passport.pdf"
Content-Type: application/pdf

[Binary PDF data]
------WebKitFormBoundary--
```

**Response:**
```json
{
  "document_id": "doc123",
  "type": "passport",
  "filename": "passport.pdf",
  "upload_date": "2025-01-02T10:00:00Z",
  "status": "pending_review"
}
```

**Security Requirements:**
- File type validation (PDF, JPG, PNG only)
- Maximum file size: 10MB
- Virus scanning on upload
- Encrypted storage

### Workflow Endpoints

#### GET /api/workflows
List available workflow templates

**Headers:**
```
Authorization: Bearer <admin_jwt_token>
```

**Response:**
```json
{
  "workflows": [
    {
      "id": "default-maritime",
      "name": "Standard Maritime Onboarding",
      "description": "Default onboarding process for maritime crew",
      "phases": 5,
      "average_duration": "14 days",
      "industry": "maritime"
    },
    {
      "id": "fast-track",
      "name": "Fast Track Onboarding",
      "description": "Expedited process for experienced crew",
      "phases": 3,
      "average_duration": "7 days",
      "industry": "maritime"
    }
  ]
}
```

---

#### GET /api/workflows/[id]
Get detailed workflow configuration

**Headers:**
```
Authorization: Bearer <admin_jwt_token>
```

**Response:**
```json
{
  "id": "default-maritime",
  "name": "Standard Maritime Onboarding",
  "phases": [
    {
      "id": "phase1",
      "name": "Documentation",
      "order": 1,
      "required_items": [
        {
          "type": "document",
          "name": "Passport",
          "required": true
        },
        {
          "type": "document",
          "name": "Medical Certificate",
          "required": true
        }
      ]
    },
    {
      "id": "phase2",
      "name": "Safety Training",
      "order": 2,
      "required_items": [
        {
          "type": "training",
          "name": "Fire Safety",
          "duration": "2 hours"
        }
      ]
    }
  ]
}
```

---

#### POST /api/workflows
Create custom workflow template

**Headers:**
```
Authorization: Bearer <admin_jwt_token>
```

**Request:**
```json
{
  "name": "Custom Engineering Workflow",
  "description": "Specialized workflow for engineering staff",
  "industry": "maritime",
  "phases": [
    {
      "name": "Technical Documentation",
      "order": 1,
      "items": [
        {
          "type": "document",
          "name": "Engineering Certificate",
          "required": true
        }
      ]
    }
  ]
}
```

**Response:**
```json
{
  "id": "custom-eng-001",
  "name": "Custom Engineering Workflow",
  "created_at": "2025-01-02T12:00:00Z"
}
```

## Request/Response Examples

### Complete Authentication Flow

1. **Request Magic Link**
```bash
curl -X POST https://your-domain.com/api/auth/magic-link \
  -H "Content-Type: application/json" \
  -d '{"email": "crew@example.com"}'
```

2. **Verify Magic Link**
```bash
curl -X POST https://your-domain.com/api/auth/verify-magic-link \
  -H "Content-Type: application/json" \
  -d '{"token": "abcdef1234567890abcdef1234567890"}'
```

3. **Use JWT for Authenticated Request**
```bash
curl -X GET https://your-domain.com/api/crew/550e8400/dashboard \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

### File Upload Example

```bash
curl -X POST https://your-domain.com/api/crew/550e8400/documents/upload \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -F "document_type=passport" \
  -F "file=@/path/to/passport.pdf"
```

### Error Response Example

```bash
# Request with invalid token
curl -X GET https://your-domain.com/api/admin/dashboard \
  -H "Authorization: Bearer invalid_token"

# Response
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired token",
    "details": {
      "expired": true,
      "valid": false
    }
  }
}
```

### Pagination Example

```bash
curl -X GET "https://your-domain.com/api/manager/crew?page=2&limit=10&status=active" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

## SDK Examples

### JavaScript/TypeScript

```typescript
// Initialize API client
import { OnboardingAPI } from '@maritime/onboarding-sdk';

const api = new OnboardingAPI({
  baseURL: 'https://your-domain.com',
  token: localStorage.getItem('auth_token')
});

// Get crew dashboard
try {
  const dashboard = await api.crew.getDashboard('550e8400');
  console.log('Progress:', dashboard.onboarding.overall_progress);
} catch (error) {
  if (error.code === 'UNAUTHORIZED') {
    // Redirect to login
  }
}

// Upload document
const formData = new FormData();
formData.append('document_type', 'passport');
formData.append('file', fileInput.files[0]);

const result = await api.crew.uploadDocument('550e8400', formData);
```

### Python

```python
import requests

class OnboardingAPI:
    def __init__(self, base_url, token):
        self.base_url = base_url
        self.headers = {'Authorization': f'Bearer {token}'}
    
    def get_crew_dashboard(self, crew_id):
        response = requests.get(
            f'{self.base_url}/api/crew/{crew_id}/dashboard',
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()

# Usage
api = OnboardingAPI('https://your-domain.com', token)
dashboard = api.get_crew_dashboard('550e8400')
```

## API Versioning

The API uses URL versioning. Current version: v1 (implicit, no version in URL).

Future versions will use: `/api/v2/endpoint`

## Webhook Events

The system can send webhooks for the following events:

| Event | Description | Payload |
|-------|-------------|---------|
| `crew.onboarding.started` | New crew member begins onboarding | Crew details, workflow |
| `crew.phase.completed` | Crew completes a phase | Crew ID, phase details |
| `crew.onboarding.completed` | Full onboarding completed | Crew details, completion data |
| `document.uploaded` | Document uploaded | Document metadata |
| `document.approved` | Document approved by manager | Document ID, approver |

## API Health Check

**GET /api/health**

Public endpoint to check API status:

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2025-01-02T12:00:00Z"
}
```

---

**Last Updated**: January 2, 2025  
**API Version**: 1.0  
**Contact**: api-support@burando.online