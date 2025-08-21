---
layout: page
title: API Reference
description: REST API documentation for Maritime Employee Onboarding System
permalink: /api/
---

# 🔌 API Reference

The Maritime Employee Onboarding System provides a comprehensive REST API for integration with external systems.

---

## 🔑 Authentication

All API requests require authentication using JWT tokens.

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "manager"
  }
}
```

### Using the Token
Include the token in the Authorization header:
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

---

## 👥 User Management

### Get All Users
```http
GET /api/users
Authorization: Bearer {token}
```

### Get User by ID
```http
GET /api/users/{id}
Authorization: Bearer {token}
```

### Create User
```http
POST /api/users
Authorization: Bearer {token}
Content-Type: application/json

{
  "email": "newuser@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "crew",
  "department": "Deck"
}
```

### Update User
```http
PUT /api/users/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "firstName": "Jane",
  "department": "Engineering"
}
```

### Delete User
```http
DELETE /api/users/{id}
Authorization: Bearer {token}
```

---

## 📋 Workflow Management

### List Workflows
```http
GET /api/workflows
Authorization: Bearer {token}
```

### Get Workflow Details
```http
GET /api/workflows/{id}
Authorization: Bearer {token}
```

### Create Workflow
```http
POST /api/workflows
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Deck Officer Onboarding",
  "description": "Complete onboarding for deck officers",
  "phases": [
    {
      "name": "Documentation",
      "description": "Submit required documents",
      "requiredDocuments": ["passport", "medical"]
    },
    {
      "name": "Training",
      "description": "Complete safety training",
      "trainingModules": ["safety-101", "fire-fighting"]
    }
  ]
}
```

### Assign Workflow
```http
POST /api/workflows/{workflowId}/assign
Authorization: Bearer {token}
Content-Type: application/json

{
  "userId": "user-uuid",
  "startDate": "2024-01-01",
  "dueDate": "2024-01-15"
}
```

---

## 📚 Training Modules

### List Training Modules
```http
GET /api/training
Authorization: Bearer {token}
```

### Get Module Details
```http
GET /api/training/{id}
Authorization: Bearer {token}
```

### Submit Quiz Answer
```http
POST /api/training/{moduleId}/quiz
Authorization: Bearer {token}
Content-Type: application/json

{
  "answers": [
    { "questionId": 1, "answer": "A" },
    { "questionId": 2, "answer": "B" }
  ]
}
```

### Get Training Progress
```http
GET /api/training/progress/{userId}
Authorization: Bearer {token}
```

---

## 📁 Document Management

### Upload Document
```http
POST /api/documents
Authorization: Bearer {token}
Content-Type: multipart/form-data

file: (binary)
type: "passport"
userId: "user-uuid"
```

### List User Documents
```http
GET /api/documents/user/{userId}
Authorization: Bearer {token}
```

### Verify Document
```http
PUT /api/documents/{id}/verify
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "approved",
  "comments": "Document verified"
}
```

### Download Document
```http
GET /api/documents/{id}/download
Authorization: Bearer {token}
```

---

## 🏆 Certificates

### Generate Certificate
```http
POST /api/certificates/generate
Authorization: Bearer {token}
Content-Type: application/json

{
  "userId": "user-uuid",
  "trainingModuleId": "module-uuid",
  "completionDate": "2024-01-01"
}
```

### List User Certificates
```http
GET /api/certificates/user/{userId}
Authorization: Bearer {token}
```

### Verify Certificate
```http
GET /api/certificates/verify/{certificateNumber}
```

---

## 📊 Reports & Analytics

### Get Dashboard Stats
```http
GET /api/reports/dashboard
Authorization: Bearer {token}
```

**Response:**
```json
{
  "totalUsers": 150,
  "activeOnboardings": 25,
  "completionRate": 85.5,
  "averageCompletionDays": 12,
  "upcomingExpirations": 5
}
```

### Generate Report
```http
POST /api/reports/generate
Authorization: Bearer {token}
Content-Type: application/json

{
  "type": "onboarding-status",
  "startDate": "2024-01-01",
  "endDate": "2024-12-31",
  "format": "pdf"
}
```

### Export Data
```http
GET /api/reports/export?format=csv&type=users
Authorization: Bearer {token}
```

---

## 🔔 Notifications

### Get User Notifications
```http
GET /api/notifications
Authorization: Bearer {token}
```

### Mark as Read
```http
PUT /api/notifications/{id}/read
Authorization: Bearer {token}
```

### Send Notification
```http
POST /api/notifications
Authorization: Bearer {token}
Content-Type: application/json

{
  "userId": "user-uuid",
  "type": "reminder",
  "title": "Document Expiry",
  "message": "Your medical certificate expires in 30 days"
}
```

---

## 🔍 Search

### Global Search
```http
GET /api/search?q=john&type=users
Authorization: Bearer {token}
```

### Advanced Search
```http
POST /api/search/advanced
Authorization: Bearer {token}
Content-Type: application/json

{
  "filters": {
    "role": "crew",
    "department": "Deck",
    "vessel": "MV Marina"
  },
  "sort": "lastName",
  "order": "asc",
  "limit": 20,
  "offset": 0
}
```

---

## 📝 Response Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 204 | No Content |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 422 | Unprocessable Entity |
| 429 | Too Many Requests |
| 500 | Internal Server Error |

---

## ⚠️ Error Handling

All errors follow this format:
```json
{
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "User with specified ID does not exist",
    "details": {
      "userId": "invalid-uuid"
    }
  }
}
```

---

## 🚦 Rate Limiting

API endpoints are rate-limited:
- **Authentication**: 5 requests per minute
- **General API**: 100 requests per minute
- **File Upload**: 10 requests per minute

Rate limit headers:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

---

## 🔗 Webhooks

Configure webhooks to receive real-time updates:

### Webhook Events
- `user.created`
- `user.updated`
- `onboarding.started`
- `onboarding.completed`
- `document.verified`
- `certificate.issued`
- `training.completed`

### Webhook Payload
```json
{
  "event": "onboarding.completed",
  "timestamp": "2024-01-01T12:00:00Z",
  "data": {
    "userId": "user-uuid",
    "workflowId": "workflow-uuid",
    "completionDate": "2024-01-01"
  }
}
```

---

## 🧪 Testing

### Test Environment
Base URL: `https://api-test.maritime-onboarding.com`

### Test Credentials
```
Email: test@maritime.com
Password: test123
API Key: test_key_123456789
```

### Postman Collection
[Download Postman Collection](https://github.com/shipdocs/employee-onboarding/blob/main/docs/postman-collection.json)

---

## 📚 SDKs & Libraries

### JavaScript/TypeScript
```bash
npm install @shipdocs/maritime-onboarding-sdk
```

```javascript
const MaritimeAPI = require('@shipdocs/maritime-onboarding-sdk');

const api = new MaritimeAPI({
  baseURL: 'http://localhost:3000',
  apiKey: 'your-api-key'
});

const users = await api.users.list();
```

### Python
```bash
pip install maritime-onboarding-sdk
```

```python
from maritime_onboarding import MaritimeAPI

api = MaritimeAPI(
    base_url='http://localhost:3000',
    api_key='your-api-key'
)

users = api.users.list()
```

---

## 🔒 Security

- Always use HTTPS in production
- Rotate API keys regularly
- Implement IP whitelisting
- Use webhook signatures for verification
- Follow OAuth 2.0 best practices

---

## 📖 Additional Resources

- [OpenAPI Specification](https://github.com/shipdocs/employee-onboarding/blob/main/docs/openapi.yaml)
- [GraphQL Schema](https://github.com/shipdocs/employee-onboarding/blob/main/docs/schema.graphql)
- [WebSocket Events](https://github.com/shipdocs/employee-onboarding/blob/main/docs/websocket.md)

---

*API Version: 2.0.1 | Last Updated: {{ site.time | date: '%B %d, %Y' }}*