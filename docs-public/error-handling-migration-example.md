# Error Handling Migration Example

This document shows how to migrate existing API endpoints to use the enhanced error handling system.

## Before Migration

```javascript
// api/auth/request-magic-link.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Please provide a valid email address' });
    }

    // ... rest of the code
    
  } catch (error) {
    console.error('Request magic link error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
}
```

## After Migration

```javascript
// api/auth/request-magic-link.js
import { withErrorHandler, createError } from '../../lib/enhancedErrorMiddleware';
import { success, error } from '../../lib/apiResponse';
import { 
  VALIDATION_INVALID_EMAIL, 
  RESOURCE_NOT_FOUND,
  PERMISSION_DENIED,
  SYSTEM_ERROR 
} from '../../lib/apiErrorCodes';

export default withErrorHandler(async (req, res) => {
  if (req.method !== 'POST') {
    throw createError('METHOD_NOT_ALLOWED', 'Method not allowed');
  }

  const { email } = req.body;

  if (!email || !email.includes('@')) {
    throw createError(VALIDATION_INVALID_EMAIL, 'Please provide a valid email address');
  }

  // Check if user exists
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('email', email.toLowerCase())
    .in('role', ['crew', 'manager'])
    .single();

  if (userError || !user) {
    throw createError(
      RESOURCE_NOT_FOUND, 
      'No account found with this email address. Please contact your administrator if you believe this is an error.'
    );
  }

  // Check user status
  const allowedCrewStatuses = ['in_progress', 'forms_completed', 'training_completed', 'fully_completed'];
  if (user.role === 'crew' && !allowedCrewStatuses.includes(user.status)) {
    throw createError(
      PERMISSION_DENIED,
      `Your account is not active (status: ${user.status}). Please contact your manager.`,
      { status: user.status }
    );
  }

  // ... rest of the code

  // Return success
  res.json(success({
    message: 'A new magic link has been sent to your email address. Please check your inbox.'
  }));
});
```

## Key Changes

1. **Import Enhanced Middleware**: Use `withErrorHandler` to wrap the handler
2. **Use Standard Error Codes**: Import from `apiErrorCodes.js`
3. **Throw Errors Instead of Returning**: Use `throw createError()` instead of `res.status().json()`
4. **Use Standard Response Helpers**: Use `success()` and `error()` from `apiResponse.js`
5. **No Try-Catch Needed**: The middleware handles all errors automatically

## Benefits

- ✅ Automatic correlation IDs for request tracking
- ✅ Error logging to database
- ✅ Consistent error response format
- ✅ Proper HTTP status codes
- ✅ Better error context and debugging
- ✅ Cleaner code without try-catch blocks

## Migration Steps

1. Import the enhanced middleware and error codes
2. Wrap your handler with `withErrorHandler`
3. Replace `res.status().json()` calls with `throw createError()`
4. Remove try-catch blocks (the middleware handles errors)
5. Use standard response helpers for success responses
6. Test the endpoint thoroughly

## Error Code Reference

Common error codes from `apiErrorCodes.js`:

- `AUTH_REQUIRED` - 401
- `VALIDATION_INVALID_EMAIL` - 400
- `RESOURCE_NOT_FOUND` - 404
- `PERMISSION_DENIED` - 403
- `SYSTEM_ERROR` - 500

See `/lib/apiErrorCodes.js` for the complete list.