<!-- This documentation has been sanitized for public viewing. Sensitive data has been replaced with placeholders. -->

# API Architecture

The Maritime Onboarding System API is built as a collection of serverless functions deployed on Vercel, providing a secure, scalable, and maintainable backend for the application.

## Architecture Overview

### Technology Stack
- **Runtime**: Node.js 18.x serverless functions
- **Deployment**: Vercel serverless platform
- **Database**: Supabase (PostgreSQL)
- **Authentication**: JWT-based with role verification
- **Email Service**: MailerSend
- **File Storage**: Supabase Storage

### Design Principles
- **RESTful Design**: Standard HTTP methods and status codes
- **Stateless**: No server-side session storage
- **Idempotent**: Safe retry mechanisms
- **Consistent**: Standardized response formats
- **Secure**: Multiple layers of authentication and authorization

## API Structure

### Directory Organization
```
/api/
├── auth/                    # Authentication endpoints
│   ├── admin-login.js      # Admin authentication
│   ├── manager-login.js    # Manager authentication
│   ├── magic-login.js      # Crew magic link auth
│   ├── verify.js           # Token verification
│   └── logout.js           # Session termination
├── admin/                   # Admin-only endpoints
│   ├── stats.js            # System statistics
│   ├── managers/           # Manager management
│   ├── audit-log.js        # Audit log access
│   └── settings.js         # System configuration
├── manager/                 # Manager-only endpoints
│   ├── crew/               # Crew management
│   ├── certificates/       # Certificate management
│   ├── quiz-reviews.js     # Quiz review system
│   └── dashboard.js        # Manager analytics
├── crew/                    # Crew member endpoints
│   ├── profile.js          # Profile management
│   ├── training/           # Training progress
│   ├── quiz/               # Quiz submission
│   └── certificates.js     # Certificate access
├── upload/                  # File upload endpoints
│   ├── training-proof.js   # Training evidence
│   └── profile-photo.js    # Profile pictures
├── pdf/                     # PDF generation
│   ├── generate-certificate.js
│   └── generate-intro-kapitein.js
├── email/                   # Email notifications
│   └── send-magic-link.js
├── translation/             # Translation services
│   ├── translate-text.js
│   └── batch-translate.js
├── cron/                    # Scheduled tasks
│   └── cleanup-expired.js
└── health.js               # Health check endpoint
```

## Core Components

### Request Processing Pipeline

```javascript
// Standard API handler pattern
export default async function handler(req, res) {
  // 1. CORS handling
  setCorsHeaders(res);
  
  // 2. Method validation
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // 3. Authentication
  const authResult = await verifyAuth(req);
  if (!authResult.valid) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // 4. Authorization
  if (!hasRequiredRole(authResult.user, 'manager')) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  // 5. Input validation
  const validation = validateInput(req.body);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }
  
  // 6. Business logic
  try {
    const result = await processRequest(req.body);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
```

### Authentication Middleware

```javascript
// lib/auth.js
import jwt from 'jsonwebtoken';

export async function verifyAuth(req) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return { valid: false, error: 'No token provided' };
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check token expiration
    if (decoded.exp < Date.now() / 1000) {
      return { valid: false, error: 'Token expired' };
    }
    
    // Check blacklist
    const isBlacklisted = await checkTokenBlacklist(token);
    if (isBlacklisted) {
      return { valid: false, error: 'Token revoked' };
    }
    
    return { valid: true, user: decoded };
  } catch (error) {
    return { valid: false, error: 'Invalid token' };
  }
}
```

### Database Connection

```javascript
// lib/supabase.js
import { createClient } from '@supabase/supabase-js';

// Service role client for API operations
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Helper for setting JWT context
export async function supabaseWithAuth(token) {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      db: {
        schema: 'public'
      }
    }
  );
}
```

## API Standards

### Request Format
All API requests should include:
- `Content-Type: application/json` header
- `Authorization: Bearer <token>` header (for authenticated endpoints)
- Valid JSON body (for POST/PUT/PATCH requests)

### Response Format

#### Success Response
```json
{
  "success": true,
  "data": {
    // Response data
  },
  "message": "Operation completed successfully"
}
```

#### Error Response
```json
{
  "success": false,
  "error": "Detailed error message",
  "code": "ERROR_CODE",
  "details": {
    // Additional error context
  }
}
```

#### Paginated Response
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

### Status Codes
- `200 OK` - Successful GET, PUT, PATCH
- `201 Created` - Successful POST
- `204 No Content` - Successful DELETE
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource already exists
- `422 Unprocessable Entity` - Validation errors
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

## Security Implementation

### Authentication Flow

1. **Admin/Manager Login**
   ```
   POST /api/auth/admin-login
   {
     "email": "admin@example.com",
     "password": "your-secure-password"
   }
   ```

2. **Token Generation**
   ```javascript
   const token = jwt.sign({
     userId: user.id,
     email: user.email,
     role: user.role,
     firstName: user.first_name,
     lastName: user.last_name
   }, process.env.JWT_SECRET, {
     expiresIn: '7d'
   });
   ```

3. **Token Usage**
   ```
   Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
   ```

### Authorization Patterns

```javascript
// Role-based access control
export function hasRequiredRole(user, requiredRole) {
  const roleHierarchy = {
    admin: 3,
    manager: 2,
    crew: 1
  };
  
  return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
}

// Resource ownership check
export async function canAccessResource(user, resourceType, resourceId) {
  if (user.role === 'admin') return true;
  
  if (user.role === 'manager') {
    // Check manager permissions
    const { data } = await supabase
      .from('manager_permissions')
      .select('crew_member_id')
      .eq('manager_id', user.userId);
    
    return data.some(p => p.crew_member_id === resourceId);
  }
  
  // Crew can only access own resources
  return user.userId === resourceId;
}
```

### Input Validation

```javascript
// lib/validation.js
import { z } from 'zod';

export const schemas = {
  createCrew: z.object({
    email: z.string().email(),
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100),
    position: z.string().min(1).max(100),
    vesselAssignment: z.string().optional(),
    expectedBoardingDate: z.string().datetime().optional()
  }),
  
  updateProfile: z.object({
    firstName: z.string().min(1).max(100).optional(),
    lastName: z.string().min(1).max(100).optional(),
    phoneNumber: z.string().optional(),
    emergencyContact: z.object({
      name: z.string(),
      phone: z.string(),
      relationship: z.string()
    }).optional()
  })
};

export function validateInput(data, schema) {
  try {
    const validated = schema.parse(data);
    return { valid: true, data: validated };
  } catch (error) {
    return { 
      valid: false, 
      error: error.errors.map(e => `${e.path}: ${e.message}`).join(', ')
    };
  }
}
```

## Error Handling

### Error Types
```javascript
// lib/errors.js
export class ApiError extends Error {
  constructor(message, code, statusCode, details = {}) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR: 'INTERNAL_ERROR'
};
```

### Global Error Handler
```javascript
export function handleApiError(error, res) {
  console.error('API Error:', error);
  
  if (error instanceof ApiError) {
    return res.status(error.statusCode).json({
      success: false,
      error: error.message,
      code: error.code,
      details: error.details
    });
  }
  
  // Database errors
  if (error.code === '23505') {
    return res.status(409).json({
      success: false,
      error: 'Resource already exists',
      code: 'ALREADY_EXISTS'
    });
  }
  
  // Default error
  return res.status(500).json({
    success: false,
    error: 'Internal server error',
    code: 'INTERNAL_ERROR'
  });
}
```

## Rate Limiting

### Implementation
```javascript
// lib/rateLimiter.js
const limits = {
  auth: { window: 60, max: 5 },
  api: { window: 900, max: 100 },
  upload: { window: 60, max: 10 }
};

export async function checkRateLimit(req, type = 'api') {
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const key = `rate_limit:${type}:${ip}`;
  const limit = limits[type];
  
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, limit.window);
  }
  
  if (count > limit.max) {
    throw new ApiError(
      'Too many requests',
      'RATE_LIMIT_EXCEEDED',
      429,
      { retryAfter: limit.window }
    );
  }
}
```

## Performance Optimization

### Caching Strategy
```javascript
// Response caching for static data
const cache = new Map();

export async function getCachedOrFetch(key, fetcher, ttl = 300) {
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }
  
  const data = await fetcher();
  cache.set(key, {
    data,
    expires: Date.now() + (ttl * 1000)
  });
  
  return data;
}
```

### Database Query Optimization
- Use selective field queries instead of `SELECT *`
- Implement pagination for large datasets
- Use database indexes effectively
- Batch operations when possible

## Monitoring and Logging

### Structured Logging
```javascript
// lib/logger.js
export function logApiRequest(req, res, duration) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.url,
    status: res.statusCode,
    duration: duration,
    ip: req.headers['x-forwarded-for'],
    userAgent: req.headers['user-agent'],
    userId: req.user?.userId
  }));
}
```

### Metrics Collection
- Request duration
- Error rates by endpoint
- Authentication failures
- Database query times
- External API response times

## Testing

### Unit Testing
```javascript
// Example test for auth endpoint
describe('POST /api/auth/admin-login', () => {
  it('should return token for valid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/admin-login')
      .send({
        email: 'admin@test.com',
        password: 'testpassword'
      });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.token).toBeDefined();
  });
});
```

### Integration Testing
- Test complete request flows
- Verify database state changes
- Check email notifications
- Validate file uploads

## Deployment

### Environment Configuration
```env
# Required environment variables
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx
JWT_SECRET=xxx
MAILERSEND_API_KEY=xxx
BASE_URL=https://your-domain.com
```

### Vercel Configuration
```json
{
  "functions": {
    "api/**/*.js": {
      "maxDuration": 30
    }
  },
  "regions": ["ams1"],
  "env": {
    "NODE_ENV": "production"
  }
}
```

## API Documentation

### OpenAPI Specification
The API is documented using OpenAPI 3.0 specification. See `/docs/api/openapi.yaml` for the complete specification.

### API Testing Tools
- Postman collection available at `/docs/api/postman-collection.json`
- curl examples in each endpoint documentation
- Interactive API explorer (when deployed)

## Related Documentation
- [Database Architecture](./database.md) - Database design and schema
- [Frontend Architecture](./frontend.md) - Frontend integration patterns
- [Security Architecture](./security.md) - Security implementation details
- [API Reference](../api/README.md) - Complete endpoint documentation