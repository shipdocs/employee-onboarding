# Error Handling Guide

This guide outlines the standardized error handling patterns for all API endpoints in the Maritime Onboarding System.

## Overview

All API endpoints must use the centralized ErrorHandler class to ensure consistent error responses, proper error codes, and request ID tracking.

## Standard Pattern

### 1. Import Required Modules

```javascript
const { createAPIHandler, createError, createValidationError, createDatabaseError, createNotFoundError } = require('../../lib/apiHandler');
```

### 2. Structure Your Handler

```javascript
async function handler(req, res) {
  // Remove try-catch blocks - errors are handled by createAPIHandler
  
  // Your logic here
  
  // Throw errors using the helper functions
  if (!requiredField) {
    throw createValidationError('Required field missing', {
      missingFields: ['fieldName']
    });
  }
  
  // Database operations
  const { data, error } = await supabase.from('table').select();
  
  if (error) {
    throw createDatabaseError('Failed to fetch data', {
      originalError: error.message
    });
  }
  
  if (!data) {
    throw createNotFoundError('Resource');
  }
  
  // Success response
  res.json({ data });
}

// Create the standardized handler
const apiHandler = createAPIHandler(handler, {
  allowedMethods: ['GET', 'POST'] // Specify allowed methods
});

// Export with authentication if needed
module.exports = requireAuth(apiHandler);
```

## Error Types and Codes

### Authentication Errors
- `AUTH_INVALID_CREDENTIALS` - Invalid login credentials
- `AUTH_TOKEN_EXPIRED` - Authentication token has expired
- `AUTH_TOKEN_INVALID` - Invalid authentication token
- `AUTH_INSUFFICIENT_PERMISSIONS` - User lacks required permissions
- `AUTH_ACCOUNT_LOCKED` - Account is temporarily locked
- `AUTH_SESSION_EXPIRED` - Session has expired

### Validation Errors
- `VALIDATION_REQUIRED_FIELD` - Required field is missing
- `VALIDATION_INVALID_FORMAT` - Invalid data format
- `VALIDATION_INVALID_EMAIL` - Invalid email format
- `VALIDATION_DUPLICATE_ENTRY` - Entry already exists
- `VALIDATION_INVALID_METHOD` - HTTP method not allowed

### Database Errors
- `DB_RECORD_NOT_FOUND` - Record not found (404)
- `DB_QUERY_ERROR` - Database query failed
- `DB_CONNECTION_ERROR` - Database connection failed

### Training-Specific Errors
- `TRAINING_PHASE_NOT_FOUND` - Training phase not found
- `TRAINING_ITEM_NOT_FOUND` - Training item not found
- `TRAINING_ALREADY_COMPLETED` - Training already completed
- `TRAINING_PREREQUISITES_NOT_MET` - Prerequisites not met

## Helper Functions

### createError(code, message, details)
Use for specific error codes:
```javascript
throw createError('AUTH_INSUFFICIENT_PERMISSIONS', 'Custom message', { userId });
```

### createValidationError(message, details)
Use for validation failures:
```javascript
throw createValidationError('Email and password are required', {
  missingFields: ['email', 'password']
});
```

### createDatabaseError(message, details)
Use for database operation failures:
```javascript
throw createDatabaseError('Failed to update user', {
  originalError: error.message
});
```

### createNotFoundError(resource, details)
Use when a resource is not found:
```javascript
throw createNotFoundError('User', { userId });
```

## Error Response Format

All errors follow this standardized format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      // Additional context (only in development)
    },
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "req_abc123def456",
    "path": "/api/endpoint",
    "method": "POST",
    "statusCode": 400
  },
  "meta": {
    "environment": "production",
    "version": "2.0.0",
    "documentation": "https://docs.shipdocs.app/errors/ERROR_CODE"
  }
}
```

## Request ID Tracking

All requests automatically receive a unique request ID for tracking:
- Generated if not provided in `X-Request-ID` header
- Returned in response header `X-Request-ID`
- Included in all error responses

## Security Considerations

1. **Production vs Development**: Error details are limited in production to prevent information leakage
2. **Sensitive Data**: Never include passwords, tokens, or other sensitive data in error details
3. **Database Errors**: Generic messages are shown to users; specific errors are logged internally

## Migration Checklist

When updating an endpoint to use standardized error handling:

1. [ ] Remove all try-catch blocks from the main handler
2. [ ] Replace `res.status().json()` with appropriate `throw` statements
3. [ ] Import error handling utilities from `apiHandler`
4. [ ] Wrap handler with `createAPIHandler`
5. [ ] Specify allowed HTTP methods
6. [ ] Test error scenarios to ensure proper error codes
7. [ ] Verify sensitive information is not exposed
8. [ ] Update any frontend error handling to match new format

## Examples

### Before (Old Pattern)
```javascript
async function handler(req, res) {
  try {
    if (!req.body.email) {
      return res.status(400).json({ error: 'Email required' });
    }
    // ... logic
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
```

### After (Standardized Pattern)
```javascript
async function handler(req, res) {
  if (!req.body.email) {
    throw createValidationError('Email required', {
      missingFields: ['email']
    });
  }
  // ... logic
}

const apiHandler = createAPIHandler(handler, {
  allowedMethods: ['POST']
});
```

## Testing Error Handling

Use these curl commands to test error scenarios:

```bash
# Test authentication error
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"invalid","password":"wrong"}'

# Test validation error
curl -X POST http://localhost:3000/api/crew/profile \
  -H "Authorization: Bearer invalid_token"

# Test method not allowed
curl -X DELETE http://localhost:3000/api/crew/profile \
  -H "Authorization: Bearer valid_token"
```

Check for:
- Correct HTTP status codes
- Consistent error format
- Request ID in headers
- No sensitive data exposure