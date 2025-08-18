<!-- This documentation has been sanitized for public viewing. Sensitive data has been replaced with placeholders. -->

# API Reference

Complete API documentation for the Maritime Onboarding System.

## 🔐 **Authentication**

All API endpoints require authentication via JWT tokens, except for magic link authentication.

### **Headers**

```http
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

### **Authentication Endpoints**

#### **Admin Login**
```http
POST /api/auth/admin-login
```

**Request:**
```json
{
  "email": "admin@example.com",
  "password": "your-password"
}
```

**Response:**
```json
{
  "token": "jwt-token",
  "user": {
    "id": 1,
    "email": "admin@example.com",
    "firstName": "Admin",
    "lastName": "User",
    "role": "admin"
  }
}
```

#### **Manager Login**
```http
POST /api/auth/manager-login
```

**Request:**
```json
{
  "email": "manager@example.com",
  "password": "your-password"
}
```

#### **Magic Link Login (Crew)**
```http
POST /api/auth/magic-login
```

**Request:**
```json
{
  "token": "magic-link-token"
}
```

#### **Token Verification**
```http
GET /api/auth/verify
```

## 👑 **Admin Endpoints**

### **System Statistics**
```http
GET /api/admin/stats
```

**Response:**
```json
{
  "totalManagers": 5,
  "totalCrewMembers": 25,
  "totalCertificates": 18,
  "totalTemplates": 3,
  "recentActivity": [...]
}
```

### **Manager Management**

#### **List Managers**
```http
GET /api/admin/managers
```

#### **Create Manager**
```http
POST /api/admin/managers
```

**Request:**
```json
{
  "email": "manager@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "position": "Training Manager",
  "password": "secure-password"
}
```

#### **Update Manager**
```http
PATCH /api/admin/managers/:id
```

#### **Delete Manager**
```http
DELETE /api/admin/managers/:id
```

### **System Settings**

#### **Get Settings**
```http
GET /api/admin/settings
```

#### **Update Settings**
```http
PUT /api/admin/settings
```

**Request:**
```json
{
  "system_name": "Maritime Onboarding System",
  "max_file_size": "10",
  "email_notifications": "true"
}
```

### **Audit Log**
```http
GET /api/admin/audit-log
```

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 50)
- `action`: Filter by action type
- `user_id`: Filter by user ID
- `from_date`: Start date filter
- `to_date`: End date filter

## 👔 **Manager Endpoints**

### **Crew Management**

#### **List Crew Members**
```http
GET /api/manager/crew
```

**Query Parameters:**
- `page`: Page number
- `limit`: Items per page
- `status`: Filter by status
- `search`: Search by name or email

#### **Create Crew Member**
```http
POST /api/manager/crew
```

**Request:**
```json
{
  "email": "crew@example.com",
  "firstName": "Jane",
  "lastName": "Smith",
  "position": "Deck Officer",
  "vesselAssignment": "MV Example",
  "expectedBoardingDate": "2025-06-01",
  "contactPhone": "+1234567890"
}
```

#### **Update Crew Member**
```http
PUT /api/manager/crew/:id
```

#### **Delete Crew Member**
```http
DELETE /api/manager/crew/:id
```

#### **Send Magic Link**
```http
POST /api/manager/crew/:id/send-magic-link
```

### **Quiz Review**

#### **List Quiz Results**
```http
GET /api/manager/quiz-reviews
```

#### **Update Quiz Review**
```http
PATCH /api/manager/quiz-reviews/:id
```

**Request:**
```json
{
  "reviewStatus": "approved",
  "reviewComments": "Good performance"
}
```

### **Certificate Management**

#### **List Certificates**
```http
GET /api/manager/certificates
```

**Query Parameters:**
- `page`: Page number
- `limit`: Items per page
- `user_id`: Filter by user
- `certificate_type`: Filter by type
- `from_date`: Start date filter
- `to_date`: End date filter

#### **Get Certificate Details**
```http
GET /api/manager/certificates/:id
```

#### **Regenerate Certificate**
```http
POST /api/manager/certificates/regenerate
```

**Request:**
```json
{
  "userId": 123,
  "certificateType": "standard",
  "certificateId": 456
}
```

### **Dashboard Statistics**
```http
GET /api/manager/dashboard/stats
```

## 👷 **Crew Endpoints**

### **Profile Management**

#### **Get Profile**
```http
GET /api/crew/profile
```

#### **Update Profile**
```http
PUT /api/crew/profile
```

**Request:**
```json
{
  "firstName": "Updated Name",
  "contactPhone": "+1234567890",
  "emergencyContactName": "Emergency Contact",
  "emergencyContactPhone": "+0987654321"
}
```

### **Training Progress**

#### **Get Training Progress**
```http
GET /api/crew/training/progress
```

#### **Start Training Phase**
```http
POST /api/crew/training/phase/:phase/start
```

#### **Get Phase Details**
```http
GET /api/crew/training/phase/:phase
```

#### **Complete Training Item**
```http
POST /api/crew/training/item/:itemId/complete
```

**Request:**
```json
{
  "instructorInitials": "JD",
  "comments": "Completed successfully",
  "proofPhotoPath": "path/to/photo.jpg"
}
```

### **Quiz System**

#### **Get Quiz Questions**
```http
GET /api/crew/quiz/:phase
```

#### **Submit Quiz Answers**
```http
POST /api/crew/quiz/:phase/submit
```

**Request:**
```json
{
  "answers": {
    "question1": "answer1",
    "question2": "answer2"
  },
  "timeSpent": 1800
}
```

### **Certificates**

#### **Get Personal Certificates**
```http
GET /api/crew/certificates
```

## 📄 **PDF Template Endpoints**

### **Template Management**

#### **List Templates**
```http
GET /api/templates
```

#### **Create Template**
```http
POST /api/templates
```

**Request (multipart/form-data):**
```
name: "Certificate Template"
description: "Training completion certificate"
pageSize: "A4"
orientation: "portrait"
backgroundImage: <file>
fields: [JSON array of field definitions]
```

#### **Get Template**
```http
GET /api/templates/:id
```

#### **Update Template**
```http
PUT /api/templates/:id
```

#### **Delete Template**
```http
DELETE /api/templates/:id
```

#### **Preview Template**
```http
POST /api/templates/:id/preview
```

**Request:**
```json
{
  "sampleData": {
    "name": "John Doe",
    "date": "2025-05-28",
    "score": "95%"
  }
}
```

#### **Duplicate Template**
```http
POST /api/templates/:id/duplicate
```

### **PDF Generation**

#### **Generate Certificate**
```http
POST /api/pdf/generate-certificate
```

#### **Generate Intro Kapitein Certificate**
```http
POST /api/pdf/generate-intro-kapitein
```

**Request:**
```json
{
  "targetUserId": 123
}
```

## 📁 **File Upload Endpoints**

### **Training Proof Upload**
```http
POST /api/upload/training-proof/:itemId
```

**Request (multipart/form-data):**
```
file: <image file>
```

### **Certificate Upload**
```http
POST /api/upload/certificate
```

### **List Files**
```http
GET /api/upload/files
```

**Query Parameters:**
- `userId`: Filter by user
- `uploadPurpose`: Filter by purpose
- `page`: Page number
- `limit`: Items per page

## 🔧 **System Endpoints**

### **Health Check**
```http
GET /api/health
```

### **System Status**
```http
GET /api/status
```

## 📊 **Response Formats**

### **Success Response**
```json
{
  "success": true,
  "data": {...},
  "message": "Operation completed successfully"
}
```

### **Error Response**
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {...}
}
```

### **Paginated Response**
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "pages": 10
  }
}
```

## 🚨 **Error Codes**

| Code | Description |
|------|-------------|
| `AUTH_REQUIRED` | Authentication required |
| `INVALID_TOKEN` | Invalid or expired token |
| `INSUFFICIENT_PERMISSIONS` | User lacks required permissions |
| `VALIDATION_ERROR` | Request validation failed |
| `NOT_FOUND` | Resource not found |
| `DUPLICATE_ENTRY` | Resource already exists |
| `FILE_TOO_LARGE` | Uploaded file exceeds size limit |
| `INVALID_FILE_TYPE` | Unsupported file type |
| `DATABASE_ERROR` | Database operation failed |
| `EMAIL_ERROR` | Email sending failed |

## 🔒 **Rate Limiting**

API endpoints are rate limited to prevent abuse:

- **Authentication**: 5 requests per minute
- **File Upload**: 10 requests per minute
- **General API**: 100 requests per minute
- **Admin Operations**: 50 requests per minute

## 📝 **Request Examples**

### **cURL Examples**

```bash
# Admin login
curl -X POST http://localhost:3000/api/auth/admin-login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"your-password"}'

# Get crew members (with auth token)
curl -X GET http://localhost:3000/api/manager/crew \
  -H "Authorization: Bearer your-jwt-token"

# Upload training proof
curl -X POST http://localhost:3000/api/upload/training-proof/123 \
  -H "Authorization: Bearer your-jwt-token" \
  -F "file=@proof.jpg"
```

### **JavaScript Examples**

```javascript
// Admin login
const response = await fetch('/api/auth/admin-login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'admin@example.com',
    password: 'your-password'
  })
});

// Authenticated request
const crewResponse = await fetch('/api/manager/crew', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```
