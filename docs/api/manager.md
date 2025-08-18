# Manager API Endpoints

Manager endpoints provide crew management, training oversight, and certificate management capabilities.

## 🔐 Authentication

All manager endpoints require:
- JWT token with `manager` role
- Bearer token in Authorization header

```http
Authorization: Bearer <manager-jwt-token>
```

## 📊 Dashboard

### Get Dashboard Statistics

Retrieve manager's dashboard statistics.

```http
GET /api/manager/dashboard/stats
```

**Success Response (200):**
```json
{
  "overview": {
    "totalCrew": 25,
    "activeCrew": 18,
    "completedTraining": 12,
    "pendingReviews": 3
  },
  "trainingProgress": {
    "notStarted": 5,
    "inProgress": 8,
    "completed": 12
  },
  "recentActivity": [
    {
      "type": "training_completed",
      "crewMember": "Jane Doe",
      "phase": 2,
      "timestamp": "2025-01-14T10:30:00Z"
    }
  ],
  "upcomingDeadlines": [
    {
      "crewMember": "John Smith",
      "deadline": "2025-01-20T00:00:00Z",
      "type": "phase_due"
    }
  ]
}
```

## 👥 Crew Management

### List Assigned Crew

Get all crew members assigned to this manager.

```http
GET /api/manager/crew
```

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)
- `status` - Filter by status (registered, in_progress, completed)
- `search` - Search by name or email
- `vessel` - Filter by vessel assignment

**Success Response (200):**
```json
{
  "crew": [
    {
      "id": 123,
      "email": "crew@example.com",
      "firstName": "Jane",
      "lastName": "Doe",
      "position": "Deck Officer",
      "vesselAssignment": "MV Example",
      "status": "in_progress",
      "progress": 66,
      "totalPhases": 3,
      "completedPhases": 2,
      "assignmentInfo": {
        "assignedAt": "2025-01-01T00:00:00Z",
        "assignmentVessel": "MV Example",
        "notes": "New crew member"
      },
      "latestActivity": {
        "type": "training",
        "phase": 2,
        "date": "2025-01-14T09:00:00Z"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 25,
    "pages": 2
  }
}
```

### Create Crew Member

Create a new crew member account.

```http
POST /api/manager/crew
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "newcrew@example.com",
  "firstName": "John",
  "lastName": "Smith",
  "position": "Engineer",
  "vesselAssignment": "MV Cargo",
  "preferredLanguage": "en",
  "sendWelcomeEmail": true
}
```

**Success Response (201):**
```json
{
  "id": 124,
  "email": "newcrew@example.com",
  "firstName": "John",
  "lastName": "Smith",
  "position": "Engineer",
  "vesselAssignment": "MV Cargo",
  "status": "registered",
  "preferredLanguage": "en",
  "createdAt": "2025-01-14T12:00:00Z"
}
```

### Get Crew Member Details

Get detailed information about a specific crew member.

```http
GET /api/manager/crew/:id
```

**Success Response (200):**
```json
{
  "id": 123,
  "email": "crew@example.com",
  "firstName": "Jane",
  "lastName": "Doe",
  "position": "Deck Officer",
  "vesselAssignment": "MV Example",
  "status": "in_progress",
  "contactPhone": "+1234567890",
  "emergencyContact": {
    "name": "Emergency Contact",
    "phone": "+0987654321"
  },
  "trainingProgress": {
    "phases": [
      {
        "phase": 1,
        "status": "completed",
        "completedAt": "2025-01-05T10:00:00Z"
      },
      {
        "phase": 2,
        "status": "completed",
        "completedAt": "2025-01-10T15:00:00Z"
      },
      {
        "phase": 3,
        "status": "in_progress",
        "startedAt": "2025-01-12T08:00:00Z"
      }
    ],
    "quizResults": [
      {
        "phase": 1,
        "score": 85,
        "passed": true,
        "completedAt": "2025-01-05T11:00:00Z"
      }
    ]
  }
}
```

### Update Crew Member

Update crew member information.

```http
PUT /api/manager/crew/:id
Content-Type: application/json
```

**Request Body:**
```json
{
  "position": "Senior Deck Officer",
  "vesselAssignment": "MV NewShip",
  "notes": "Promoted to senior position"
}
```

### Delete Crew Member

Soft delete a crew member (deactivate).

```http
DELETE /api/manager/crew/:id
```

### Send Magic Link

Send authentication magic link to crew member.

```http
POST /api/manager/crew/:id/send-magic-link
```

**Success Response (200):**
```json
{
  "message": "Magic link sent successfully",
  "email": "crew@example.com"
}
```

### Send Onboarding Start Email

Send onboarding start notification to crew member.

```http
POST /api/manager/crew/:id/send-onboarding-start
```

### Send Safety PDF

Send safety documentation PDF to crew member.

```http
POST /api/manager/crew/:id/send-safety-pdf
```

### Resend Completion Email

Resend training completion email with certificate.

```http
POST /api/manager/crew/:id/resend-completion-email
```

## 📝 Quiz Review

### Get Pending Quiz Reviews

Get quiz submissions awaiting review.

```http
GET /api/manager/quiz-reviews/pending
```

**Query Parameters:**
- `page` - Page number
- `limit` - Items per page
- `phase` - Filter by phase

**Success Response (200):**
```json
{
  "reviews": [
    {
      "id": 456,
      "crewMember": {
        "id": 123,
        "name": "Jane Doe",
        "email": "crew@example.com"
      },
      "phase": 3,
      "score": 78,
      "submittedAt": "2025-01-14T10:00:00Z",
      "answers": [...],
      "timeSpent": 1800
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 3,
    "pages": 1
  }
}
```

### Approve Quiz Result

Approve a quiz submission.

```http
POST /api/manager/quiz-reviews/:id/approve
Content-Type: application/json
```

**Request Body:**
```json
{
  "comments": "Good performance, approved",
  "finalScore": 80
}
```

**Success Response (200):**
```json
{
  "message": "Quiz approved successfully",
  "certificateGenerated": true
}
```

## 🏆 Certificate Management

### List Certificates

Get certificates for crew members.

```http
GET /api/manager/certificates
```

**Query Parameters:**
- `page` - Page number
- `limit` - Items per page
- `userId` - Filter by crew member
- `certificateType` - Filter by type
- `fromDate` - Start date filter
- `toDate` - End date filter

**Success Response (200):**
```json
{
  "certificates": [
    {
      "id": 789,
      "userId": 123,
      "userName": "Jane Doe",
      "certificateType": "completion",
      "certificateNumber": "CERT-2025-0089",
      "issuedAt": "2025-01-10T15:00:00Z",
      "expiresAt": "2026-01-10T15:00:00Z",
      "status": "active",
      "downloadUrl": "/api/certificates/789/download"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  }
}
```

### Get Certificate Details

Get detailed certificate information.

```http
GET /api/manager/certificates/:id
```

### Regenerate Certificate

Regenerate a certificate (e.g., for corrections).

```http
POST /api/manager/certificates/regenerate
Content-Type: application/json
```

**Request Body:**
```json
{
  "userId": 123,
  "certificateType": "completion",
  "certificateId": 789,
  "reason": "Name correction"
}
```

**Success Response (200):**
```json
{
  "message": "Certificate regenerated successfully",
  "newCertificateId": 790,
  "downloadUrl": "/api/certificates/790/download"
}
```

## 📊 Onboarding Overview

### Get Onboarding Overview

Get comprehensive overview of all onboarding processes.

```http
GET /api/manager/onboarding/overview
```

**Query Parameters:**
- `status` - Filter by status
- `vessel` - Filter by vessel
- `dateRange` - Filter by date range

**Success Response (200):**
```json
{
  "summary": {
    "total": 25,
    "byStatus": {
      "registered": 5,
      "in_progress": 8,
      "completed": 12
    },
    "completionRate": 48
  },
  "byVessel": [
    {
      "vessel": "MV Example",
      "crew": 10,
      "completed": 6
    }
  ],
  "timeline": [
    {
      "date": "2025-01-14",
      "registrations": 2,
      "completions": 1
    }
  ]
}
```

### Get Onboarding Reviews

Get crew members requiring onboarding review.

```http
GET /api/manager/onboarding-reviews
```

### Approve Onboarding

Approve a crew member's onboarding completion.

```http
POST /api/manager/onboarding-reviews/:userId/approve
Content-Type: application/json
```

**Request Body:**
```json
{
  "comments": "All requirements met",
  "generateCertificate": true
}
```

## 🚨 Error Responses

All manager endpoints return standardized error responses:

```json
{
  "error": {
    "code": "AUTH_INSUFFICIENT_PERMISSIONS",
    "message": "Manager access required",
    "statusCode": 403
  }
}
```

Common error codes:
- `AUTH_INSUFFICIENT_PERMISSIONS` - Not a manager
- `VALIDATION_DUPLICATE_ENTRY` - Email already exists
- `DB_RECORD_NOT_FOUND` - Crew member not found
- `TRAINING_PREREQUISITES_NOT_MET` - Cannot approve without prerequisites

## 🔒 Security Considerations

1. **Role Verification**: All endpoints verify manager role
2. **Crew Assignment**: Managers can only access assigned crew
3. **Audit Trail**: All actions are logged
4. **Rate Limiting**: 100 requests per minute
5. **Data Isolation**: Cross-manager data access prevented

## 📚 Related Documentation

- [Authentication Guide](api/authentication.md)
- [Crew API](/docs/api/crew.md)
- [Certificate System](CERTIFICATE_SYSTEM.md)
- [Error Handling](/docs/for-developers/api-reference/error-handling.md)