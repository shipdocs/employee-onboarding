# Crew API Endpoints

Crew endpoints provide access to training materials, progress tracking, quiz submission, and certificate retrieval.

## 🔐 Authentication

Crew members authenticate via magic links:
- Magic link sent to registered email
- Token valid for 7 days
- JWT token returned after successful authentication

```http
Authorization: Bearer <crew-jwt-token>
```

## 👤 Profile Management

### Get Profile

Retrieve crew member's profile information.

```http
GET /api/crew/profile
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
  "preferredLanguage": "en",
  "contactPhone": "+1234567890",
  "emergencyContact": {
    "name": "John Doe",
    "phone": "+0987654321"
  },
  "createdAt": "2025-01-01T00:00:00Z",
  "lastLogin": "2025-01-14T09:00:00Z"
}
```

### Update Profile

Update crew member's profile information.

```http
PUT /api/crew/profile
Content-Type: application/json
```

**Request Body:**
```json
{
  "contactPhone": "+1234567890",
  "emergencyContactName": "John Doe",
  "emergencyContactPhone": "+0987654321",
  "preferredLanguage": "nl"
}
```

**Success Response (200):**
```json
{
  "message": "Profile updated successfully",
  "profile": {
    "id": 123,
    "contactPhone": "+1234567890",
    "emergencyContact": {
      "name": "John Doe",
      "phone": "+0987654321"
    },
    "preferredLanguage": "nl"
  }
}
```

## 📚 Training System

### Get Training Progress

Get comprehensive training progress overview.

```http
GET /api/crew/training/progress
```

**Success Response (200):**
```json
{
  "phases": [
    {
      "phase_number": 1,
      "title": "Basic Safety Training",
      "description": "Introduction to maritime safety",
      "status": "completed",
      "startedAt": "2025-01-02T08:00:00Z",
      "completedAt": "2025-01-05T10:00:00Z",
      "progressPercentage": 100
    },
    {
      "phase_number": 2,
      "title": "Advanced Safety Procedures",
      "description": "Advanced safety protocols",
      "status": "in_progress",
      "startedAt": "2025-01-08T08:00:00Z",
      "progressPercentage": 60
    },
    {
      "phase_number": 3,
      "title": "Emergency Response",
      "description": "Emergency procedures training",
      "status": "not_started",
      "progressPercentage": 0
    }
  ],
  "quizResults": [
    {
      "phase": 1,
      "score": 85,
      "passed": true,
      "reviewStatus": "approved",
      "completedAt": "2025-01-05T11:00:00Z"
    }
  ],
  "certificates": [
    {
      "id": 789,
      "type": "phase_completion",
      "phase": 1,
      "issuedAt": "2025-01-05T12:00:00Z"
    }
  ],
  "summary": {
    "totalPhases": 3,
    "completedPhases": 1,
    "currentPhase": 2,
    "completedQuizzes": 1,
    "totalQuizzes": 3,
    "certificatesEarned": 1,
    "overallProgress": 33
  }
}
```

### Get Phase Details

Get detailed information about a specific training phase.

```http
GET /api/crew/training/phase/:phase
```

**Path Parameters:**
- `phase` - Phase number (1-3)

**Success Response (200):**
```json
{
  "phase": 1,
  "title": "Basic Safety Training",
  "description": "Introduction to maritime safety procedures",
  "content": {
    "introduction": "Welcome to basic safety training...",
    "sections": [
      {
        "id": "safety-equipment",
        "title": "Safety Equipment",
        "content": "...",
        "videoUrl": "https://..."
      }
    ],
    "requirements": [
      "Complete all sections",
      "Pass the quiz with 70% or higher"
    ]
  },
  "status": "completed",
  "progress": {
    "completedSections": 5,
    "totalSections": 5,
    "quizStatus": "passed"
  }
}
```

### Start Training Phase

Begin a new training phase.

```http
POST /api/crew/training/phase/:phase/start
```

**Path Parameters:**
- `phase` - Phase number to start

**Success Response (200):**
```json
{
  "message": "Training phase started successfully",
  "phase": 2,
  "startedAt": "2025-01-14T10:00:00Z"
}
```

**Error Responses:**
- `412` - Prerequisites not met (previous phase not completed)
- `409` - Phase already started or completed

### Complete Training Item

Mark a training section as completed.

```http
POST /api/crew/training/item/:itemId/complete
Content-Type: application/json
```

**Request Body:**
```json
{
  "instructorInitials": "JD",
  "comments": "Completed with supervision",
  "proofPhotoPath": "/uploads/proof/item-123.jpg"
}
```

**Success Response (200):**
```json
{
  "message": "Training item completed",
  "progress": {
    "phaseProgress": 80,
    "overallProgress": 45
  }
}
```

## 📝 Quiz System

### Get Quiz Questions

Retrieve quiz questions for a specific phase.

```http
GET /api/crew/quiz/:phase
```

**Path Parameters:**
- `phase` - Phase number (1-3)

**Success Response (200):**
```json
{
  "phase": 1,
  "title": "Basic Safety Quiz",
  "instructions": "Answer all questions. You need 70% to pass.",
  "timeLimit": 3600,
  "questions": [
    {
      "id": "q1",
      "question": "What is the primary purpose of a life jacket?",
      "type": "multiple_choice",
      "options": [
        "A. Fashion statement",
        "B. Keep you afloat in water",
        "C. Storage pocket",
        "D. Identification"
      ]
    },
    {
      "id": "q2",
      "question": "List three types of fire extinguishers",
      "type": "text"
    }
  ],
  "previousAttempts": 0,
  "canRetake": true
}
```

### Submit Quiz Answers

Submit quiz answers for grading.

```http
POST /api/crew/quiz/:phase/submit
Content-Type: application/json
```

**Request Body:**
```json
{
  "answers": {
    "q1": "B",
    "q2": "Water, Foam, CO2"
  },
  "timeSpent": 1245
}
```

**Success Response (200):**
```json
{
  "submitted": true,
  "score": 85,
  "passed": true,
  "correctAnswers": 17,
  "totalQuestions": 20,
  "reviewStatus": "pending",
  "feedback": {
    "q1": "Correct!",
    "q2": "Good answer"
  },
  "certificateGenerated": false,
  "nextSteps": "Your quiz has been submitted for review"
}
```

**Error Responses:**
- `412` - Training phase not completed
- `429` - Too many attempts

## 🏆 Certificates

### Get Personal Certificates

Retrieve all earned certificates.

```http
GET /api/crew/certificates
```

**Success Response (200):**
```json
{
  "certificates": [
    {
      "id": 789,
      "type": "phase_completion",
      "phase": 1,
      "certificateNumber": "CERT-2025-0089",
      "issuedAt": "2025-01-05T12:00:00Z",
      "expiresAt": "2026-01-05T12:00:00Z",
      "status": "active",
      "downloadUrl": "/api/certificates/789/download",
      "verificationUrl": "https://verify.example.com/CERT-2025-0089"
    }
  ],
  "total": 1
}
```

### Download Certificate

Download a certificate PDF.

```http
GET /api/certificates/:id/download
```

**Success Response (200):**
- Content-Type: `application/pdf`
- Content-Disposition: `attachment; filename="certificate-CERT-2025-0089.pdf"`
- Binary PDF data

## 📊 Onboarding Progress

### Get Onboarding Progress

Get overall onboarding progress and analytics.

```http
GET /api/crew/onboarding/progress
```

**Success Response (200):**
```json
{
  "status": "in_progress",
  "startDate": "2025-01-01T00:00:00Z",
  "progress": {
    "overall": 45,
    "byPhase": {
      "1": 100,
      "2": 60,
      "3": 0
    }
  },
  "milestones": [
    {
      "name": "Registration Complete",
      "completed": true,
      "date": "2025-01-01T00:00:00Z"
    },
    {
      "name": "Phase 1 Complete",
      "completed": true,
      "date": "2025-01-05T10:00:00Z"
    },
    {
      "name": "All Training Complete",
      "completed": false,
      "estimatedDate": "2025-01-25T00:00:00Z"
    }
  ],
  "timeline": {
    "estimated": "2025-01-25T00:00:00Z",
    "daysRemaining": 11
  }
}
```

### Get Onboarding Analytics

Get detailed analytics about onboarding performance.

```http
GET /api/crew/onboarding/analytics
```

## 🔄 Process Management

### Complete Onboarding Process

Mark entire onboarding process as complete (when all requirements met).

```http
POST /api/crew/process/complete
```

**Success Response (200):**
```json
{
  "message": "Onboarding process completed successfully",
  "completedAt": "2025-01-14T15:00:00Z",
  "finalCertificate": {
    "id": 890,
    "type": "full_completion",
    "downloadUrl": "/api/certificates/890/download"
  }
}
```

**Error Responses:**
- `412` - Not all requirements completed
- `409` - Already completed

## 🚨 Error Responses

All crew endpoints return standardized error responses:

```json
{
  "error": {
    "code": "AUTH_TOKEN_EXPIRED",
    "message": "Your session has expired. Please login again.",
    "statusCode": 401
  }
}
```

Common error codes:
- `AUTH_TOKEN_EXPIRED` - Session expired
- `AUTH_TOKEN_INVALID` - Invalid authentication
- `TRAINING_PREREQUISITES_NOT_MET` - Cannot access phase
- `VALIDATION_INVALID_FORMAT` - Invalid input data
- `DB_RECORD_NOT_FOUND` - Resource not found

## 🔒 Security Considerations

1. **Magic Link Authentication**: Secure, time-limited tokens
2. **Session Management**: 7-day token expiry
3. **Data Access**: Crew can only access own data
4. **File Uploads**: Validated and scanned
5. **Rate Limiting**: 100 requests per minute

## 📚 Related Documentation

- [Authentication Guide](api/authentication.md)
- [Training System](/docs/features/training-system/)
- [Certificate System](CERTIFICATE_SYSTEM.md)
- [Error Handling](/docs/for-developers/api-reference/error-handling.md)