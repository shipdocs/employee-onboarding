# API Documentation

The Maritime Onboarding System provides a comprehensive RESTful API that powers all system functionality. This documentation covers API architecture, conventions, and usage patterns.

## 🎯 **API Overview**

### **Architecture**
- **RESTful Design**: Standard HTTP methods and status codes
- **JSON Communication**: All requests and responses use JSON
- **JWT Authentication**: Token-based authentication for all endpoints
- **Role-Based Authorization**: Endpoints protected by user roles
- **Rate Limiting**: API abuse prevention with configurable limits
- **Comprehensive Error Handling**: Consistent error responses

### **Base URLs**
| Environment | Base URL |
|-------------|----------|
| **Local** | `http://localhost:3000/api` |
| **Testing** | `https://new-onboarding-2025-git-testing-shipdocs-projects.vercel.app/api` |
| **Preview** | `https://new-onboarding-2025-git-preview-shipdocs-projects.vercel.app/api` |
| **Production** | `https://onboarding.burando.online/api` |

## 🔐 **Authentication**

### **Authentication Methods**

#### **JWT Token Authentication**
All API endpoints (except magic link authentication) require a valid JWT token:

```http
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

#### **Token Acquisition**
```bash
# Admin login
curl -X POST /api/auth/admin-login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}'

# Manager login
curl -X POST /api/auth/manager-login \
  -H "Content-Type: application/json" \
  -d '{"email":"manager@example.com","password":"password123"}'

# Crew magic link login
curl -X POST /api/auth/magic-login \
  -H "Content-Type: application/json" \
  -d '{"token":"magic-link-token"}'
```

### **Token Structure**
```javascript
{
  "userId": "uuid",
  "email": "user@example.com",
  "role": "admin|manager|crew",
  "firstName": "John",
  "lastName": "Doe",
  "iat": 1234567890,
  "exp": 1234567890
}
```

## 🏗️ **API Structure**

### **Endpoint Organization**
```
/api/
├── auth/                   # Authentication endpoints
├── admin/                  # Admin-only endpoints
├── manager/                # Manager-only endpoints
├── crew/                   # Crew-only endpoints
├── training/               # Training system endpoints
├── upload/                 # File upload endpoints
├── pdf/                    # PDF generation endpoints
├── cron/                   # Scheduled task endpoints
└── health                  # Health check endpoint
```

### **HTTP Methods**
- **GET**: Retrieve data (read operations)
- **POST**: Create new resources
- **PUT**: Update entire resources
- **PATCH**: Partial resource updates
- **DELETE**: Remove resources

### **Status Codes**
| Code | Meaning | Usage |
|------|---------|-------|
| **200** | OK | Successful GET, PUT, PATCH |
| **201** | Created | Successful POST |
| **204** | No Content | Successful DELETE |
| **400** | Bad Request | Invalid request data |
| **401** | Unauthorized | Authentication required |
| **403** | Forbidden | Insufficient permissions |
| **404** | Not Found | Resource not found |
| **409** | Conflict | Resource already exists |
| **422** | Unprocessable Entity | Validation errors |
| **429** | Too Many Requests | Rate limit exceeded |
| **500** | Internal Server Error | Server error |

## 📊 **Response Formats**

### **Success Response**
```json
{
  "success": true,
  "data": {
    "id": "123",
    "name": "Example Resource"
  },
  "message": "Operation completed successfully"
}
```

### **Error Response**
```json
{
  "success": false,
  "error": "Detailed error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "validation error details"
  }
}
```

### **Paginated Response**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "pages": 10,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## 🔧 **API Endpoints by Role**

### **Public Endpoints**
- `GET /api/health` - System health check
- `POST /api/auth/magic-login` - Magic link authentication

### **Admin-Only Endpoints**
- `POST /api/auth/admin-login` - Admin authentication
- `GET /api/admin/stats` - System statistics
- `GET /api/admin/managers` - Manager management
- `POST /api/admin/managers` - Create manager
- `GET /api/admin/audit-log` - Audit log access
- `GET /api/templates` - PDF template management
- `POST /api/templates` - Create PDF template

### **Manager-Only Endpoints**
- `POST /api/auth/manager-login` - Manager authentication
- `GET /api/manager/crew` - Crew management
- `POST /api/manager/crew` - Create crew member
- `GET /api/manager/quiz-reviews` - Quiz review system
- `GET /api/manager/certificates` - Certificate management
- `POST /api/manager/certificates/regenerate` - Regenerate certificates

### **Crew-Only Endpoints**
- `GET /api/crew/profile` - Personal profile
- `PUT /api/crew/profile` - Update profile
- `GET /api/crew/training/progress` - Training progress
- `POST /api/crew/training/phase/:phase/start` - Start training phase
- `GET /api/crew/certificates` - Personal certificates

### **Shared Endpoints** (Role-based access)
- `GET /api/auth/verify` - Token verification
- `POST /api/auth/logout` - Logout
- `POST /api/upload/training-proof/:itemId` - File uploads
- `GET /api/upload/files` - File listing

## 🚀 **Quick Start Examples**

### **Authentication Flow**
```javascript
// 1. Login as admin
const loginResponse = await fetch('/api/auth/admin-login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'admin@example.com',
    password: 'password123'
  })
});

const { token } = await loginResponse.json();

// 2. Use token for authenticated requests
const userResponse = await fetch('/api/admin/stats', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

const stats = await userResponse.json();
```

### **Creating a Crew Member**
```javascript
// Manager creates crew member
const crewResponse = await fetch('/api/manager/crew', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${managerToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'crew@example.com',
    firstName: 'John',
    lastName: 'Doe',
    position: 'Deck Officer',
    vesselAssignment: 'MV Example',
    expectedBoardingDate: '2025-06-01'
  })
});

const newCrew = await crewResponse.json();
```

### **File Upload**
```javascript
// Upload training proof photo
const formData = new FormData();
formData.append('photo', fileInput.files[0]);

const uploadResponse = await fetch(`/api/upload/training-proof/${itemId}`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${crewToken}`
  },
  body: formData
});

const uploadResult = await uploadResponse.json();
```

## 🔒 **Security Features**

### **Rate Limiting**
| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| **Authentication** | 5 requests | 1 minute |
| **File Upload** | 10 requests | 1 minute |
| **General API** | 100 requests | 15 minutes |
| **Admin Operations** | 50 requests | 15 minutes |

### **Input Validation**
- **Server-side validation** for all inputs
- **SQL injection protection** through parameterized queries
- **XSS prevention** through input sanitization
- **File type validation** for uploads
- **Size limits** for requests and uploads

### **CORS Configuration**
```javascript
// Allowed origins based on environment
const allowedOrigins = [
  'http://localhost:3000',
  'https://new-onboarding-2025-git-testing-shipdocs-projects.vercel.app',
  'https://new-onboarding-2025-git-preview-shipdocs-projects.vercel.app',
  'https://onboarding.burando.online'
];
```

## 📈 **Performance Considerations**

### **Optimization Features**
- **Connection pooling** for database connections
- **Response caching** for static data
- **Compression** for large responses
- **Pagination** for large datasets
- **Lazy loading** for related data

### **Monitoring**
- **Response time tracking** for all endpoints
- **Error rate monitoring** with alerting
- **Database query performance** monitoring
- **Rate limit monitoring** and adjustment

## 🧪 **Testing the API**

### **Health Check**
```bash
curl -X GET /api/health
# Expected response: {"status":"ok","timestamp":"2025-01-XX..."}
```

### **Authentication Test**
```bash
# Test admin login
curl -X POST /api/auth/admin-login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}'

# Test token verification
curl -X GET /api/auth/verify \
  -H "Authorization: Bearer your-jwt-token"
```

### **API Testing Tools**
- **Postman Collection**: Available for comprehensive API testing
- **curl Examples**: Provided for each endpoint
- **JavaScript Examples**: Frontend integration examples
- **Test Scripts**: Automated testing scripts

## 📚 **Detailed Documentation**

### **Endpoint References**
- **[Complete API Reference](reference.md)** - All endpoints with examples
- **[Authentication Endpoints](authentication.md)** - Auth-specific documentation
- **[Admin Endpoints](admin.md)** - Admin-specific API documentation
- **[Manager Endpoints](manager.md)** - Manager-specific API documentation
- **[Crew Endpoints](crew.md)** - Crew-specific API documentation

### **Integration Guides**
- **[Frontend Integration](../architecture/frontend.md)** - React integration patterns
- **[Database Integration](../for-developers/architecture/database-design.md)** - Database interaction patterns
- **[Security Implementation](../architecture/security.md)** - Security best practices

## 🛠️ **Development Tools**

### **API Development**
```bash
# Start development server
vercel dev

# Test API endpoints
npm run test:api

# Generate API documentation
npm run docs:api

# Validate API responses
npm run validate:api
```

### **Debugging**
```bash
# Enable API debugging
echo "DEBUG_API=true" >> .env

# View API logs
vercel logs --follow

# Test specific endpoints
node scripts/test-api-endpoint.js /api/health
```

## 🚨 **Error Handling**

### **Common Error Codes**
| Code | Description | Resolution |
|------|-------------|------------|
| `AUTH_REQUIRED` | Authentication required | Provide valid JWT token |
| `INVALID_TOKEN` | Invalid or expired token | Refresh or re-authenticate |
| `INSUFFICIENT_PERMISSIONS` | User lacks required permissions | Check user role and permissions |
| `VALIDATION_ERROR` | Request validation failed | Check request format and data |
| `NOT_FOUND` | Resource not found | Verify resource ID and permissions |
| `RATE_LIMIT_EXCEEDED` | Too many requests | Wait and retry with backoff |

### **Error Response Examples**
```json
// Validation error
{
  "success": false,
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "email": "Invalid email format",
    "password": "Password must be at least 8 characters"
  }
}

// Authentication error
{
  "success": false,
  "error": "Authentication required",
  "code": "AUTH_REQUIRED"
}

// Permission error
{
  "success": false,
  "error": "Insufficient permissions",
  "code": "INSUFFICIENT_PERMISSIONS"
}
```

The Maritime Onboarding System API provides a robust, secure, and well-documented interface for all system functionality, designed to support both internal applications and potential third-party integrations.
