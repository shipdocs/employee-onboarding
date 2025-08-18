# Maritime Onboarding System API Documentation

## Overview

The Maritime Onboarding System API is a RESTful API built with Node.js and deployed as serverless functions on Vercel. It provides comprehensive endpoints for managing crew training, workflow management, and administrative operations.

## Base URL

```
Production: https://onboarding.burando.online/api
Development: http://localhost:3000/api
```

## Authentication

The API uses JWT (JSON Web Tokens) for authentication with role-based access control.

### Authentication Methods

1. **Admin/Manager Login** - Email and password authentication
2. **Crew Magic Link** - Email-based passwordless authentication
3. **JWT Bearer Token** - For API requests after authentication

### Headers

```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

### User Roles

- **admin** - Full system access
- **manager** - Company management with optional permissions
- **crew** - Crew member access to training content

---

## API Endpoints

### 🔐 Authentication

#### POST /api/auth/login
Admin/Manager login with email and password.

**Request Body:**
```json
{
  "email": "admin@example.com",
  "password": "securePassword123"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR...",
  "user": {
    "id": "user_123",
    "email": "admin@example.com",
    "role": "admin",
    "company_id": "comp_456"
  }
}
```

#### POST /api/auth/request-magic-link
Request a magic link for crew member authentication.

**Request Body:**
```json
{
  "email": "crew@example.com"
}
```

**Response (200):**
```json
{
  "message": "Magic link sent to email"
}
```

#### POST /api/auth/verify-magic-link
Verify magic link token.

**Request Body:**
```json
{
  "token": "magic_link_token_here"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR...",
  "user": {
    "id": "crew_123",
    "email": "crew@example.com",
    "role": "crew"
  }
}
```

#### POST /api/auth/logout
Logout and invalidate JWT token.

**Headers:**
```http
Authorization: Bearer <JWT_TOKEN>
```

**Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

---

### 👥 Admin Endpoints

#### GET /api/admin/users
Get all users in the company. **(Admin only)**

**Query Parameters:**
- `page` (integer): Page number for pagination
- `limit` (integer): Items per page (default: 20)
- `role` (string): Filter by role (admin/manager/crew)

**Response (200):**
```json
{
  "users": [
    {
      "id": "user_123",
      "email": "user@example.com",
      "role": "crew",
      "created_at": "2025-01-15T10:00:00Z"
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 20
}
```

#### POST /api/admin/users
Create a new user. **(Admin only)**

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "role": "crew",
  "name": "John Doe",
  "position": "Deck Officer"
}
```

#### GET /api/admin/stats
Get system statistics. **(Admin only)**

**Response (200):**
```json
{
  "totalUsers": 150,
  "activeTraining": 45,
  "completedTraining": 105,
  "certificatesIssued": 98,
  "averageCompletionTime": 72,
  "companyCount": 5
}
```

---

### 📚 Training Content Management

#### GET /api/content/training/phases
Get all training phases.

**Headers:**
```http
Authorization: Bearer <JWT_TOKEN>
```

**Response (200):**
```json
{
  "phases": [
    {
      "id": "phase_123",
      "phase_number": 1,
      "title": "Immediate Safety Training",
      "description": "Essential safety training",
      "time_limit": 24,
      "items": [],
      "status": "published"
    }
  ]
}
```

#### POST /api/content/training/phases
Create a new training phase. **(Admin/Manager with content_edit permission)**

**Request Body:**
```json
{
  "title": "Advanced Safety Training",
  "description": "Advanced safety procedures",
  "time_limit": 48,
  "passing_score": 80,
  "category": "safety",
  "content": {
    "overview": "Training content here...",
    "objectives": ["Objective 1", "Objective 2"],
    "keyPoints": ["Key point 1", "Key point 2"],
    "procedures": ["Step 1", "Step 2"]
  }
}
```

#### PUT /api/content/training/phases/{id}
Update a training phase. **(Admin/Manager with content_edit permission)**

#### DELETE /api/content/training/phases/{id}
Delete a training phase. **(Admin only)**

---

### 🎯 Workflow Management

#### GET /api/workflows
Get all training workflows.

**Response (200):**
```json
{
  "workflows": [
    {
      "id": "wf_123",
      "name": "Basic Crew Onboarding",
      "description": "Standard onboarding process",
      "type": "sequential",
      "status": "active",
      "phases": []
    }
  ]
}
```

#### POST /api/workflows
Create a new workflow. **(Admin/Manager)**

**Request Body:**
```json
{
  "name": "Officer Training Program",
  "description": "Training program for officers",
  "type": "sequential",
  "phases": [
    {
      "phase_number": 1,
      "name": "Basic Training",
      "required": true,
      "estimated_duration": 24
    }
  ]
}
```

#### GET /api/workflows/{slug}
Get workflow details by slug.

#### POST /api/workflows/instances
Create a workflow instance for a crew member.

**Request Body:**
```json
{
  "workflow_id": "wf_123",
  "crew_member_id": "crew_456",
  "start_date": "2025-01-20T00:00:00Z"
}
```

---

### 👤 Crew Member Endpoints

#### GET /api/crew/profile
Get crew member profile.

**Headers:**
```http
Authorization: Bearer <JWT_TOKEN>
```

**Response (200):**
```json
{
  "id": "crew_123",
  "email": "crew@example.com",
  "name": "John Smith",
  "position": "Able Seaman",
  "company": "Maritime Corp",
  "training_progress": {
    "completed": 2,
    "total": 5,
    "percentage": 40
  }
}
```

#### GET /api/crew/training/progress
Get training progress for authenticated crew member.

**Response (200):**
```json
{
  "phases": [
    {
      "phase_id": "phase_123",
      "title": "Safety Training",
      "status": "completed",
      "completed_at": "2025-01-15T14:30:00Z",
      "score": 95
    },
    {
      "phase_id": "phase_456",
      "title": "Navigation Training",
      "status": "in_progress",
      "progress": 60
    }
  ]
}
```

#### POST /api/crew/training/complete
Mark training item as complete.

**Request Body:**
```json
{
  "phase_id": "phase_123",
  "item_id": "item_456"
}
```

---

### 📝 Quiz Management

#### GET /api/training/quiz/{phase}
Get quiz questions for a training phase.

**Response (200):**
```json
{
  "quiz": {
    "id": "quiz_123",
    "title": "Safety Quiz",
    "questions": [
      {
        "id": "q_1",
        "question": "What is the first step in emergency procedures?",
        "type": "multiple_choice",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "points": 10
      }
    ],
    "time_limit": 30,
    "passing_score": 80
  }
}
```

#### POST /api/training/quiz/{phase}/submit
Submit quiz answers.

**Request Body:**
```json
{
  "answers": [
    {
      "question_id": "q_1",
      "answer": "Option A"
    }
  ],
  "time_taken": 1250
}
```

**Response (200):**
```json
{
  "score": 85,
  "passed": true,
  "correct_answers": 17,
  "total_questions": 20,
  "certificate_id": "cert_789"
}
```

---

### 📄 Certificate Generation

#### GET /api/pdf/certificate/{id}
Get certificate PDF by ID.

**Response:** Binary PDF file

#### POST /api/pdf/generate-certificate
Generate a new certificate. **(Admin/Manager)**

**Request Body:**
```json
{
  "crew_member_id": "crew_123",
  "training_phase": "Safety Training",
  "completion_date": "2025-01-15",
  "score": 95
}
```

---

### 📤 File Upload

#### POST /api/upload/content-image
Upload an image for training content.

**Headers:**
```http
Content-Type: multipart/form-data
Authorization: Bearer <JWT_TOKEN>
```

**Form Data:**
- `image`: Image file (JPEG, PNG, WebP, GIF)
- `type`: "content"
- `phaseId`: Training phase ID

**Response (200):**
```json
{
  "url": "https://supabase.storage.url/content-images/img_123.jpg",
  "publicUrl": "https://supabase.storage.url/content-images/img_123.jpg"
}
```

#### POST /api/upload/content-video
Upload a video for training content.

**Form Data:**
- `video`: Video file (MP4, WebM, OGG)
- `type`: "content"
- `phaseId`: Training phase ID

---

### 📧 Email Management

#### POST /api/email/send
Send an email. **(Admin/Manager)**

**Request Body:**
```json
{
  "to": "recipient@example.com",
  "subject": "Training Reminder",
  "template": "training_reminder",
  "data": {
    "name": "John Doe",
    "training": "Safety Training",
    "deadline": "2025-01-20"
  }
}
```

---

### 🏢 Manager Endpoints

#### GET /api/manager/crew
Get crew members for manager's company.

**Response (200):**
```json
{
  "crew": [
    {
      "id": "crew_123",
      "name": "John Smith",
      "position": "Able Seaman",
      "training_status": "in_progress",
      "last_active": "2025-01-15T10:00:00Z"
    }
  ]
}
```

#### POST /api/manager/crew/assign-training
Assign training to crew members. **(Manager with training_assign permission)**

**Request Body:**
```json
{
  "crew_ids": ["crew_123", "crew_456"],
  "workflow_id": "wf_789",
  "start_date": "2025-01-20T00:00:00Z"
}
```

---

## Error Responses

### Standard Error Format

```json
{
  "error": "Error message here",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional error details"
  }
}
```

### Common Error Codes

| Status Code | Error Code | Description |
|------------|------------|-------------|
| 400 | `VALIDATION_ERROR` | Invalid request data |
| 401 | `UNAUTHORIZED` | Missing or invalid authentication |
| 403 | `FORBIDDEN` | Insufficient permissions |
| 404 | `NOT_FOUND` | Resource not found |
| 409 | `CONFLICT` | Resource conflict (duplicate) |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Server error |

---

## Rate Limiting

API endpoints are rate-limited to prevent abuse:

- **Authentication endpoints**: 5 requests per minute
- **Read endpoints**: 100 requests per minute
- **Write endpoints**: 20 requests per minute
- **File uploads**: 10 requests per minute

Rate limit headers:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642339200
```

---

## Pagination

List endpoints support pagination using query parameters:

```
GET /api/admin/users?page=2&limit=20
```

Response includes pagination metadata:
```json
{
  "data": [...],
  "pagination": {
    "total": 100,
    "page": 2,
    "limit": 20,
    "pages": 5,
    "hasNext": true,
    "hasPrev": true
  }
}
```

---

## Webhooks

The system supports webhooks for key events:

### Available Events

- `training.completed` - Training phase completed
- `certificate.issued` - Certificate generated
- `crew.registered` - New crew member registered
- `workflow.started` - Workflow instance created

### Webhook Payload

```json
{
  "event": "training.completed",
  "timestamp": "2025-01-15T14:30:00Z",
  "data": {
    "crew_member_id": "crew_123",
    "phase_id": "phase_456",
    "score": 95
  }
}
```

---

## Testing

### Test Endpoints

```
GET /api/health - Health check
GET /api/test - Test endpoint (development only)
POST /api/test-email-service - Test email service (admin only)
```

### Postman Collection

Import the Postman collection from `docs/postman/maritime-onboarding-api.json` for easy testing.

---

## SDK Examples

### JavaScript/TypeScript

```javascript
// Initialize client
const api = new MaritimeOnboardingAPI({
  baseURL: 'https://onboarding.burando.online/api',
  token: 'your-jwt-token'
});

// Get training progress
const progress = await api.crew.getTrainingProgress();

// Submit quiz
const result = await api.quiz.submit('phase_123', {
  answers: [...]
});
```

### cURL Examples

```bash
# Login
curl -X POST https://onboarding.burando.online/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'

# Get profile
curl -X GET https://onboarding.burando.online/api/crew/profile \
  -H "Authorization: Bearer YOUR_TOKEN"

# Upload image
curl -X POST https://onboarding.burando.online/api/upload/content-image \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "image=@/path/to/image.jpg" \
  -F "type=content" \
  -F "phaseId=phase_123"
```

---

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for API version history and changes.

## Support

For API support, contact the development team or create an issue in the GitHub repository.