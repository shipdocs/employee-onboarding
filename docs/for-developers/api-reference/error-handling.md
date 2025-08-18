# API Error Handling Documentation

## Overview

This document describes the standardized error handling system implemented across all API endpoints in the Maritime Onboarding System.

## Error Response Format

All API errors now follow a consistent format:

```json
{
  "error": {
    "code": "AUTH_INVALID_CREDENTIALS",
    "message": "Invalid email or password",
    "details": {
      "field": "email",
      "reason": "User not found"
    },
    "timestamp": "2025-06-10T13:30:00Z",
    "requestId": "req_abc123def456",
    "path": "/api/auth/manager-login",
    "method": "POST",
    "statusCode": 401
  },
  "meta": {
    "environment": "production",
    "version": "2.0.0",
    "documentation": "https://docs.shipdocs.app/errors/AUTH_INVALID_CREDENTIALS"
  }
}
```

## Error Code Categories

### Authentication & Authorization (AUTH_*)

| Code | Status | Description |
|------|--------|-------------|
| `AUTH_INVALID_CREDENTIALS` | 401 | Invalid email or password |
| `AUTH_ACCOUNT_LOCKED` | 423 | Account temporarily locked |
| `AUTH_TOKEN_EXPIRED` | 401 | Authentication token expired |
| `AUTH_TOKEN_INVALID` | 401 | Invalid authentication token |
| `AUTH_INSUFFICIENT_PERMISSIONS` | 403 | Insufficient permissions |
| `AUTH_ACCOUNT_NOT_ACTIVE` | 403 | Account is not active |
| `AUTH_ACCOUNT_NOT_CONFIGURED` | 401 | Account not properly configured |
| `AUTH_SESSION_EXPIRED` | 401 | Session has expired |

### Validation (VALIDATION_*)

| Code | Status | Description |
|------|--------|-------------|
| `VALIDATION_REQUIRED_FIELD` | 400 | Required field missing |
| `VALIDATION_INVALID_FORMAT` | 400 | Invalid data format |
| `VALIDATION_OUT_OF_RANGE` | 400 | Value out of allowed range |
| `VALIDATION_INVALID_EMAIL` | 400 | Invalid email format |
| `VALIDATION_INVALID_METHOD` | 405 | HTTP method not allowed |
| `VALIDATION_INVALID_CONTENT_TYPE` | 415 | Invalid content type |
| `VALIDATION_REQUEST_TOO_LARGE` | 413 | Request size too large |
| `VALIDATION_UNSUPPORTED_LANGUAGE` | 400 | Unsupported language |
| `VALIDATION_INVALID_LANGUAGE_PAIR` | 400 | Invalid language pair |
| `VALIDATION_PASSWORD_TOO_WEAK` | 400 | Password does not meet requirements |
| `VALIDATION_DUPLICATE_ENTRY` | 409 | Entry already exists |

### Database (DB_*)

| Code | Status | Description |
|------|--------|-------------|
| `DB_CONNECTION_ERROR` | 500 | Database connection failed |
| `DB_QUERY_ERROR` | 500 | Database query failed |
| `DB_CONSTRAINT_VIOLATION` | 500 | Database constraint violation |
| `DB_RECORD_NOT_FOUND` | 404 | Record not found |
| `DB_TRANSACTION_FAILED` | 500 | Database transaction failed |

### External Services (SERVICE_*)

| Code | Status | Description |
|------|--------|-------------|
| `SERVICE_TRANSLATION_UNAVAILABLE` | 503 | Translation service unavailable |
| `SERVICE_TRANSLATION_ERROR` | 500 | Translation service error |
| `SERVICE_EMAIL_FAILED` | 503 | Email delivery failed |
| `SERVICE_STORAGE_ERROR` | 503 | File storage error |
| `SERVICE_TIMEOUT` | 504 | External service timeout |
| `SERVICE_QUOTA_EXCEEDED` | 503 | Service quota exceeded |

### Rate Limiting (RATE_*)

| Code | Status | Description |
|------|--------|-------------|
| `RATE_LIMIT_EXCEEDED` | 429 | Rate limit exceeded |
| `RATE_LIMIT_QUOTA_EXCEEDED` | 429 | API quota exceeded |
| `RATE_LIMIT_TOO_MANY_REQUESTS` | 429 | Too many requests |

### System (SYSTEM_*)

| Code | Status | Description |
|------|--------|-------------|
| `SYSTEM_INTERNAL_ERROR` | 500 | Internal server error |
| `SYSTEM_CONFIGURATION_ERROR` | 500 | System configuration error |
| `SYSTEM_MAINTENANCE` | 503 | System under maintenance |
| `SYSTEM_TIMEOUT` | 504 | Request timeout |
| `SYSTEM_UNAVAILABLE` | 503 | System temporarily unavailable |

### File Operations (FILE_*)

| Code | Status | Description |
|------|--------|-------------|
| `FILE_NOT_FOUND` | 404 | File not found |
| `FILE_TOO_LARGE` | 413 | File size exceeds limit |
| `FILE_INVALID_TYPE` | 415 | Invalid file type |
| `FILE_UPLOAD_FAILED` | 500 | File upload failed |

### Training & Content (TRAINING_*)

| Code | Status | Description |
|------|--------|-------------|
| `TRAINING_PHASE_NOT_FOUND` | 404 | Training phase not found |
| `TRAINING_ITEM_NOT_FOUND` | 404 | Training item not found |
| `TRAINING_ALREADY_COMPLETED` | 409 | Training already completed |
| `TRAINING_PREREQUISITES_NOT_MET` | 412 | Prerequisites not met |

## Implementation Guide

### For API Route Developers

1. **Import Error Handler**:
```javascript
import { ErrorHandler, createAuthError, createValidationError } from '../../lib/errorHandler.js';
import { asyncHandler, requestIdMiddleware } from '../../lib/middleware/errorMiddleware.js';
```

2. **Use Async Handler**:
```javascript
const handler = asyncHandler(async (req, res) => {
  // Your route logic here
});
```

3. **Throw Standardized Errors**:
```javascript
// Instead of: res.status(400).json({ error: 'Email required' });
throw createValidationError('VALIDATION_REQUIRED_FIELD', 'Email is required', { missingFields: ['email'] });

// Instead of: res.status(401).json({ error: 'Invalid credentials' });
throw createAuthError('AUTH_INVALID_CREDENTIALS', 'Invalid email or password');
```

4. **Export with Error Handling**:
```javascript
const wrappedHandler = (req, res) => {
  requestIdMiddleware(req, res, () => {
    handler(req, res).catch(error => {
      ErrorHandler.handle(error, req, res);
    });
  });
};

export default wrappedHandler;
```

### For Client-Side Developers

1. **Check Error Format**:
```javascript
if (error.response?.data?.error) {
  const { code, message, details } = error.response.data.error;
  
  switch (code) {
    case 'AUTH_INVALID_CREDENTIALS':
      // Handle invalid login
      break;
    case 'VALIDATION_REQUIRED_FIELD':
      // Handle missing fields
      break;
    default:
      // Handle generic error
  }
}
```

2. **Use Request ID for Support**:
```javascript
const requestId = error.response?.data?.error?.requestId;
console.log(`Error occurred. Request ID: ${requestId}`);
```

## Error Monitoring

### Request Correlation

Every error response includes a unique `requestId` that can be used to trace the request through logs and monitoring systems.

### Logging Format

Errors are logged in structured JSON format:

```json
{
  "timestamp": "2025-06-10T13:30:00Z",
  "requestId": "req_abc123def456",
  "error": {
    "code": "AUTH_INVALID_CREDENTIALS",
    "message": "Invalid email or password",
    "statusCode": 401,
    "stack": "Error: Invalid email or password\n    at ..."
  },
  "request": {
    "method": "POST",
    "path": "/api/auth/manager-login",
    "userAgent": "Mozilla/5.0...",
    "ip": "192.168.1.1",
    "userId": null
  }
}
```

### Environment Differences

- **Development**: Full error details including stack traces
- **Production**: Sanitized error details for security

## Migration Guide

### Updating Existing Routes

1. Replace manual error responses with standardized error throwing
2. Add async handler wrapper
3. Update export to include error middleware
4. Test error responses match new format

### Backward Compatibility

The new error format is designed to be backward compatible. Existing clients can still access error messages via `error.message`, but should migrate to use the new structured format.

## Testing

Use the provided test script to verify error handling:

```bash
node scripts/test-error-handling.js
```

This will test various error scenarios and validate the response format.

## Support

For questions about error handling implementation, contact the development team or refer to the error documentation URLs provided in each error response.
