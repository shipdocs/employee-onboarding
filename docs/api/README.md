# API Reference - Maritime Onboarding System

Complete REST API documentation for the Maritime Onboarding System Docker-based architecture.

## 🔗 **Base URLs**

- **Production**: `https://your-domain.com/api`
- **Development**: `http://localhost:3000/api`

## 🔐 **Authentication**

All API requests require authentication via JWT token in the Authorization header:

```http
Authorization: Bearer YOUR_JWT_TOKEN
```

### **Getting a Token**

#### Admin/Manager Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@company.com",
  "password": "your-password"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_123",
    "email": "admin@company.com",
    "role": "admin",
    "name": "Admin User"
  }
}
```

#### Magic Link for Crew
```http
POST /api/auth/magic-link
Content-Type: application/json

{
  "email": "crew@company.com"
}
```

## 📚 **API Endpoints**

### **Authentication**

#### `POST /api/auth/login`
Authenticate admin or manager users with email and password.

**Request Body:**
```json
{
  "email": "string",
  "password": "string",
  "mfaToken": "string (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "token": "string",
  "user": {
    "id": "string",
    "email": "string",
    "role": "admin|manager",
    "name": "string"
  }
}
```

#### `POST /api/auth/magic-link`
Request a magic link for crew member authentication.

**Request Body:**
```json
{
  "email": "string"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Magic link sent to email"
}
```

#### `POST /api/auth/logout`
Logout and invalidate the current JWT token.

**Headers:**
```http
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### **User Management**

#### `GET /api/users`
Get all users in the system (admin/manager only).

**Headers:**
```http
Authorization: Bearer YOUR_JWT_TOKEN
```

**Query Parameters:**
- `role` (optional): Filter by user role (admin, manager, crew)
- `limit` (optional): Number of results to return (default: 50)
- `offset` (optional): Number of results to skip (default: 0)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "email": "string",
      "name": "string",
      "role": "string",
      "created_at": "ISO 8601 date",
      "last_login": "ISO 8601 date"
    }
  ],
  "total": 123,
  "limit": 50,
  "offset": 0
}
```

#### `POST /api/users`
Create a new user account.

**Headers:**
```http
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "string",
  "name": "string",
  "role": "crew|manager",
  "company_id": "string (optional)",
  "vessel_id": "string (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "string",
    "email": "string",
    "name": "string",
    "role": "string",
    "created_at": "ISO 8601 date"
  }
}
```

#### `GET /api/crew/{id}`
Get crew member profile and training progress.

**Headers:**
```http
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "string",
    "email": "string",
    "name": "string",
    "role": "crew",
    "company_id": "string",
    "vessel_id": "string",
    "training_progress": {
      "completed_phases": 5,
      "total_phases": 10,
      "completion_percentage": 50,
      "certificates": [
        {
          "id": "string",
          "name": "string",
          "issued_date": "ISO 8601 date",
          "download_url": "string"
        }
      ]
    }
  }
}
```

### **Training System**

#### `GET /api/training-phases`
Get all training phases.

**Headers:**
```http
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "name": "string",
      "description": "string",
      "order": 1,
      "required": true,
      "content": {
        "videos": ["url1", "url2"],
        "documents": ["url1", "url2"],
        "quiz_id": "string"
      }
    }
  ]
}
```

#### `POST /api/training-phases`
Create a new training phase (admin only).

**Headers:**
```http
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "string",
  "description": "string",
  "order": 1,
  "required": true,
  "content": {
    "videos": ["url1", "url2"],
    "documents": ["url1", "url2"]
  }
}
```

### **Assessment System**

#### `GET /api/quiz/{phaseId}`
Get quiz questions for a training phase.

**Headers:**
```http
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "string",
    "phase_id": "string",
    "questions": [
      {
        "id": "string",
        "question": "string",
        "type": "multiple_choice|true_false",
        "options": ["option1", "option2", "option3"],
        "correct_answer": "hidden from response"
      }
    ]
  }
}
```

#### `POST /api/quiz/submit`
Submit quiz answers for evaluation.

**Headers:**
```http
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Request Body:**
```json
{
  "quiz_id": "string",
  "answers": [
    {
      "question_id": "string",
      "answer": "string"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "score": 85,
    "passed": true,
    "total_questions": 10,
    "correct_answers": 8,
    "feedback": "Excellent work!"
  }
}
```

### **File Management**

#### `POST /api/upload/image`
Upload training content images.

**Headers:**
```http
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: multipart/form-data
```

**Request Body:**
```
image: File (JPEG, PNG, GIF - max 10MB)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "url": "string",
    "filename": "string",
    "size": 1024000,
    "type": "image/jpeg"
  }
}
```

#### `POST /api/upload/video`
Upload training content videos.

**Headers:**
```http
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: multipart/form-data
```

**Request Body:**
```
video: File (MP4, WebM - max 100MB)
```

## ⚠️ **Error Handling**

### **Error Response Format**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {}
  }
}
```

### **HTTP Status Codes**
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `422` - Validation Error
- `429` - Rate Limit Exceeded
- `500` - Internal Server Error

### **Common Error Codes**
- `AUTH_INVALID_TOKEN` - Invalid or expired JWT token
- `AUTH_INSUFFICIENT_PERMISSIONS` - User lacks required permissions
- `VALIDATION_ERROR` - Request validation failed
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `RESOURCE_NOT_FOUND` - Requested resource not found

## 🔒 **Rate Limiting**

- **100 requests per minute** per IP address
- **1000 requests per hour** per authenticated user
- **Special limits** for file uploads and authentication endpoints

Rate limit headers are included in responses:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## 📝 **Request/Response Examples**

### **Complete User Creation Flow**
```bash
# 1. Login as admin
curl -X POST https://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@company.com","password":"password"}'

# 2. Create new crew member
curl -X POST https://your-domain.com/api/users \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"crew@company.com","name":"John Doe","role":"crew"}'

# 3. Send magic link to crew member
curl -X POST https://your-domain.com/api/auth/magic-link \
  -H "Content-Type: application/json" \
  -d '{"email":"crew@company.com"}'
```

---

**For more detailed examples and advanced usage, see the [Developer Guides](../developer-guides/).**
