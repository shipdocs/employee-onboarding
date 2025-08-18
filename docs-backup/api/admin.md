# Admin API Endpoints

Admin endpoints provide system-wide management capabilities including user management, system configuration, and monitoring.

## 🔐 Authentication

All admin endpoints require:
- JWT token with `admin` role
- Bearer token in Authorization header

```http
Authorization: Bearer <admin-jwt-token>
```

## 📊 Dashboard & Statistics

### Get System Statistics

Retrieve comprehensive system statistics and metrics.

```http
GET /api/admin/stats
```

**Success Response (200):**
```json
{
  "totalManagers": 5,
  "totalCrewMembers": 125,
  "totalCertificates": 89,
  "totalTemplates": 3,
  "activeUsers": 45,
  "completionRate": 71.2,
  "recentActivity": [
    {
      "id": 1,
      "action": "crew_login",
      "user": "Jane Doe",
      "timestamp": "2025-01-14T10:30:00Z"
    }
  ],
  "systemHealth": {
    "database": "healthy",
    "email": "healthy",
    "storage": "healthy"
  }
}
```

### Get Performance Metrics

Retrieve detailed performance metrics.

```http
GET /api/admin/performance/metrics
```

**Query Parameters:**
- `period` - Time period (day, week, month, year)
- `from` - Start date (ISO 8601)
- `to` - End date (ISO 8601)

**Success Response (200):**
```json
{
  "apiMetrics": {
    "totalRequests": 15420,
    "averageResponseTime": 145,
    "errorRate": 0.02,
    "requestsByEndpoint": {...}
  },
  "userMetrics": {
    "activeUsers": 45,
    "newRegistrations": 12,
    "completionRate": 71.2
  },
  "systemMetrics": {
    "cpuUsage": 45.2,
    "memoryUsage": 62.8,
    "storageUsage": 38.5
  }
}
```

## 👥 Manager Management

### List All Managers

Retrieve all manager accounts in the system.

```http
GET /api/admin/managers
```

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)
- `search` - Search by name or email
- `status` - Filter by status (active, inactive)

**Success Response (200):**
```json
{
  "managers": [
    {
      "id": 1,
      "email": "manager@example.com",
      "firstName": "John",
      "lastName": "Manager",
      "position": "Training Manager",
      "status": "active",
      "createdAt": "2025-01-01T00:00:00Z",
      "lastLogin": "2025-01-14T09:00:00Z",
      "assignedCrewCount": 25
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "pages": 1
  }
}
```

### Create Manager

Create a new manager account.

```http
POST /api/admin/managers
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "newmanager@example.com",
  "firstName": "Jane",
  "lastName": "Manager",
  "position": "Senior Training Manager",
  "password": "secure-password-123",
  "sendWelcomeEmail": true
}
```

**Success Response (201):**
```json
{
  "id": 6,
  "email": "newmanager@example.com",
  "firstName": "Jane",
  "lastName": "Manager",
  "position": "Senior Training Manager",
  "status": "active",
  "createdAt": "2025-01-14T12:00:00Z"
}
```

### Update Manager

Update manager account details.

```http
PATCH /api/admin/managers/:id
Content-Type: application/json
```

**Request Body:**
```json
{
  "firstName": "Updated Name",
  "position": "New Position",
  "status": "active"
}
```

### Delete Manager

Delete a manager account (soft delete).

```http
DELETE /api/admin/managers/:id
```

**Success Response (200):**
```json
{
  "message": "Manager deleted successfully",
  "reassignedCrewCount": 25
}
```

### Send Manager Welcome Email

Resend welcome email to a manager.

```http
POST /api/admin/managers/:id/resend-welcome-email
```

## ⚙️ System Configuration

### Get System Settings

Retrieve current system configuration.

```http
GET /api/admin/system-settings
```

**Success Response (200):**
```json
{
  "general": {
    "systemName": "Maritime Onboarding System",
    "companyName": "Shipping Company",
    "supportEmail": "support@example.com"
  },
  "features": {
    "emailNotifications": true,
    "autoApproval": false,
    "multiLanguageSupport": true
  },
  "limits": {
    "maxFileSize": 10485760,
    "sessionTimeout": 3600,
    "passwordExpiry": 90
  },
  "maintenance": {
    "enabled": false,
    "message": null
  }
}
```

### Update System Settings

Update system configuration.

```http
PUT /api/admin/system-settings
Content-Type: application/json
```

**Request Body:**
```json
{
  "general": {
    "systemName": "Updated System Name"
  },
  "features": {
    "emailNotifications": true
  }
}
```

### Manage Feature Flags

Get and update feature flags.

```http
GET /api/admin/feature-flags
```

```http
PUT /api/admin/feature-flags
Content-Type: application/json
```

**Request Body:**
```json
{
  "newDashboard": true,
  "advancedReporting": false,
  "betaFeatures": true
}
```

## 📝 Audit & Monitoring

### Get Audit Logs

Retrieve system audit logs.

```http
GET /api/admin/audit-log
```

**Query Parameters:**
- `page` - Page number
- `limit` - Items per page
- `userId` - Filter by user ID
- `action` - Filter by action type
- `resourceType` - Filter by resource type
- `fromDate` - Start date filter
- `toDate` - End date filter

**Success Response (200):**
```json
{
  "logs": [
    {
      "id": 1234,
      "userId": 1,
      "userName": "Admin User",
      "action": "create_manager",
      "resourceType": "user",
      "resourceId": 6,
      "details": {
        "managerEmail": "newmanager@example.com"
      },
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0...",
      "timestamp": "2025-01-14T12:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1523,
    "pages": 31
  }
}
```

### Get Feedback Summary

Retrieve user feedback summary.

```http
GET /api/admin/feedback/summary
```

**Query Parameters:**
- `period` - Time period (week, month, year)
- `type` - Feedback type filter

**Success Response (200):**
```json
{
  "summary": {
    "totalFeedback": 156,
    "averageRating": 4.2,
    "byType": {
      "bug": 23,
      "feature": 45,
      "improvement": 88
    }
  },
  "recentFeedback": [...]
}
```

## 🧹 Maintenance Operations

### Run Token Cleanup

Manually trigger token cleanup.

```http
POST /api/admin/cleanup-tokens
```

**Success Response (200):**
```json
{
  "message": "Token cleanup completed",
  "cleaned": {
    "expiredTokens": 45,
    "blacklistedTokens": 12,
    "magicLinks": 23
  }
}
```

### Test Notifications

Test notification system with various scenarios.

```http
POST /api/admin/test-notifications
Content-Type: application/json
```

**Request Body:**
```json
{
  "type": "email",
  "scenario": "welcome",
  "recipient": "test@example.com"
}
```

## 📊 Detailed Reports

### Get Quiz Results Report

Retrieve detailed quiz results analytics.

```http
GET /api/admin/quiz-results-detailed
```

**Query Parameters:**
- `fromDate` - Start date
- `toDate` - End date
- `phase` - Filter by phase
- `status` - Filter by status

**Success Response (200):**
```json
{
  "summary": {
    "totalAttempts": 523,
    "passRate": 87.4,
    "averageScore": 82.5,
    "averageAttempts": 1.3
  },
  "byPhase": {
    "1": {
      "attempts": 180,
      "passRate": 92.3,
      "averageScore": 85.2
    }
  },
  "trends": [...]
}
```

### Get Refactoring Metrics

Monitor codebase health and refactoring progress.

```http
GET /api/admin/refactoring-metrics
```

**Success Response (200):**
```json
{
  "codeQuality": {
    "score": 8.2,
    "issues": 23,
    "coverage": 78.5
  },
  "refactoringProgress": {
    "completed": 45,
    "inProgress": 12,
    "planned": 23
  }
}
```

## 🚨 Error Responses

All admin endpoints return standardized error responses:

```json
{
  "error": {
    "code": "AUTH_INSUFFICIENT_PERMISSIONS",
    "message": "Admin access required",
    "statusCode": 403
  }
}
```

Common error codes:
- `AUTH_INSUFFICIENT_PERMISSIONS` - Not an admin
- `VALIDATION_DUPLICATE_ENTRY` - Email already exists
- `DB_RECORD_NOT_FOUND` - Resource not found
- `SYSTEM_CONFIGURATION_ERROR` - Configuration issue

## 🔒 Security Considerations

1. **Admin Authentication**: All endpoints verify admin role
2. **Audit Logging**: All admin actions are logged
3. **Rate Limiting**: 50 requests per minute
4. **IP Whitelisting**: Optional IP restrictions
5. **Two-Factor Authentication**: Recommended for admin accounts

## 📚 Related Documentation

- [Authentication Guide](api/authentication.md)
- [Error Handling](/docs/for-developers/api-reference/error-handling.md)
- [System Architecture](/docs/for-developers/architecture/overview.md)