# API Response Standardization Guide

## Overview

All API endpoints in the Maritime Onboarding System must follow this standardized response format to ensure consistency and maintainability.

## Response Formats

### Success Response

```javascript
{
  "success": true,
  "data": { /* response data */ },
  "meta": { /* optional metadata */ },
  "timestamp": "2025-06-14T13:45:00.000Z"
}
```

### Error Response

```javascript
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Email is required",
    "details": { /* optional error details */ }
  },
  "timestamp": "2025-06-14T13:45:00.000Z"
}
```

### Paginated Response

```javascript
{
  "success": true,
  "data": [ /* array of items */ ],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5,
      "hasMore": true,
      "hasPrevious": false
    }
  },
  "timestamp": "2025-06-14T13:45:00.000Z"
}
```

## Implementation

### 1. Import Response Utilities

```javascript
const { success, error, paginated } = require('../lib/apiResponse');
const { VALIDATION_FAILED, getStatusCode } = require('../lib/apiErrorCodes');
```

### 2. Success Response Examples

```javascript
// Simple success
res.json(success({ id: 123, name: 'John Doe' }));

// Success with metadata
res.json(success(
  { id: 123, name: 'John Doe' },
  { version: '1.0', cached: false }
));

// Created response (201)
res.status(201).json(created(newUser, `/api/users/${newUser.id}`));

// No content (204)
res.status(204).json(noContent());
```

### 3. Error Response Examples

```javascript
// Validation error
const statusCode = getStatusCode(VALIDATION_FAILED);
res.status(statusCode).json(
  error(VALIDATION_FAILED, 'Email is required', { field: 'email' })
);

// Not found error
res.status(404).json(
  error(RESOURCE_NOT_FOUND, 'User not found', { userId: req.params.id })
);

// System error
res.status(500).json(
  error(SYSTEM_ERROR, 'Database connection failed')
);
```

### 4. Paginated Response Example

```javascript
const page = parseInt(req.query.page) || 1;
const limit = parseInt(req.query.limit) || 20;
const offset = (page - 1) * limit;

const { data: users, count } = await supabase
  .from('users')
  .select('*', { count: 'exact' })
  .limit(limit)
  .offset(offset);

res.json(paginated(users, page, limit, count));
```

## Error Codes Reference

### Authentication (401)
- `AUTH_REQUIRED` - No authentication provided
- `AUTH_INVALID_TOKEN` - Invalid JWT token
- `AUTH_TOKEN_EXPIRED` - JWT token has expired
- `AUTH_INVALID_CREDENTIALS` - Wrong username/password

### Validation (400)
- `VALIDATION_FAILED` - General validation failure
- `VALIDATION_MISSING_FIELD` - Required field missing
- `VALIDATION_INVALID_EMAIL` - Invalid email format
- `VALIDATION_FILE_TOO_LARGE` - File exceeds size limit

### Resources (404, 409)
- `RESOURCE_NOT_FOUND` - Resource doesn't exist
- `RESOURCE_ALREADY_EXISTS` - Duplicate resource
- `RESOURCE_CONFLICT` - Resource state conflict

### Permissions (403)
- `PERMISSION_DENIED` - General permission denial
- `PERMISSION_INSUFFICIENT_ROLE` - Role doesn't have access
- `PERMISSION_COMPANY_MISMATCH` - Wrong company

### System (500)
- `SYSTEM_ERROR` - General system error
- `SYSTEM_DATABASE_ERROR` - Database operation failed
- `SYSTEM_EMAIL_SEND_ERROR` - Email sending failed

## Migration Guide

### Before (Old Style)

```javascript
// Inconsistent success responses
res.json({ data: users });
res.json({ users });
res.json({ success: true, result: users });

// Inconsistent error responses
res.status(400).json({ error: 'Bad request' });
res.status(400).json({ message: 'Invalid input' });
res.status(400).json({ success: false, error: { msg: 'Failed' } });
```

### After (New Standard)

```javascript
// Consistent success response
res.json(success(users));

// Consistent error response
res.status(400).json(
  error(VALIDATION_FAILED, 'Invalid input', { field: 'email' })
);
```

## Benefits

1. **Consistency**: All endpoints return the same format
2. **Error Handling**: Standardized error codes and messages
3. **Type Safety**: TypeScript-friendly response types
4. **Debugging**: Timestamps and detailed error information
5. **Client Integration**: Predictable response structure

## Testing

When testing endpoints, verify:

1. All responses include `success` boolean
2. All responses include `timestamp`
3. Error responses include proper error codes
4. HTTP status codes match error codes
5. Pagination metadata is complete

## Examples

### Complete Endpoint Example

```javascript
const { success, error } = require('../../lib/apiResponse');
const { 
  AUTH_REQUIRED, 
  VALIDATION_MISSING_FIELD,
  RESOURCE_NOT_FOUND,
  getStatusCode 
} = require('../../lib/apiErrorCodes');

module.exports = async (req, res) => {
  // Validate method
  if (req.method !== 'GET') {
    return res.status(405).json(
      error(VALIDATION_FAILED, 'Method not allowed')
    );
  }

  // Validate auth
  if (!req.headers.authorization) {
    return res.status(401).json(
      error(AUTH_REQUIRED, 'Authentication required')
    );
  }

  try {
    // Validate input
    const { id } = req.query;
    if (!id) {
      return res.status(400).json(
        error(VALIDATION_MISSING_FIELD, 'ID is required', { field: 'id' })
      );
    }

    // Fetch data
    const { data: user, error: dbError } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (dbError) {
      if (dbError.code === 'PGRST116') {
        return res.status(404).json(
          error(RESOURCE_NOT_FOUND, 'User not found', { userId: id })
        );
      }
      throw dbError;
    }

    // Return success
    res.json(success(user));

  } catch (err) {
    console.error('API Error:', err);
    return res.status(500).json(
      error(SYSTEM_DATABASE_ERROR, 'Failed to fetch user')
    );
  }
};
```

---

**Remember**: Consistency is key! Always use the response utilities instead of creating custom response formats.