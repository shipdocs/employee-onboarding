# Authentication API

The Maritime Onboarding System uses JWT-based authentication with role-specific endpoints for different user types.

## 🔐 Authentication Overview

- **Admin & Manager**: Email/password authentication
- **Crew Members**: Magic link authentication via email
- **Token Format**: JWT with 7-day expiry
- **Token Storage**: localStorage (client-side)

## 🚀 Authentication Endpoints

### Admin Login

Admin users authenticate with email and password.

```http
POST /api/auth/admin-login
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "admin@example.com",
  "password": "secure-password"
}
```

**Success Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "email": "admin@example.com",
    "firstName": "Admin",
    "lastName": "User",
    "role": "admin",
    "position": "System Administrator",
    "status": "active",
    "preferredLanguage": "en"
  }
}
```

**Error Responses:**
- `401` - Invalid credentials
- `423` - Account locked (too many failed attempts)
- `403` - Account not active
- `500` - Server error

### Manager Login

Managers authenticate with email and password.

```http
POST /api/auth/manager-login
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "manager@example.com",
  "password": "secure-password"
}
```

**Success Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 2,
    "email": "manager@example.com",
    "firstName": "John",
    "lastName": "Manager",
    "role": "manager",
    "position": "Training Manager",
    "status": "active",
    "preferredLanguage": "en"
  }
}
```

### Request Magic Link

Crew members request a magic link for authentication.

```http
POST /api/auth/request-magic-link
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "crew@example.com"
}
```

**Success Response (200):**
```json
{
  "message": "Magic link sent successfully",
  "email": "crew@example.com"
}
```

**Error Responses:**
- `404` - Email not found
- `429` - Rate limit exceeded
- `503` - Email service unavailable

### Magic Link Login

Authenticate using a magic link token.

```http
POST /api/auth/magic-login
Content-Type: application/json
```

**Request Body:**
```json
{
  "token": "magic-link-token-from-email"
}
```

**Success Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 3,
    "email": "crew@example.com",
    "firstName": "Jane",
    "lastName": "Crew",
    "role": "crew",
    "position": "Deck Officer",
    "vesselAssignment": "MV Example",
    "status": "in_progress",
    "preferredLanguage": "en"
  }
}
```

**Error Responses:**
- `401` - Invalid or expired token
- `404` - Token not found
- `403` - Account not active

### Verify Token

Verify the validity of a JWT token.

```http
GET /api/auth/verify
Authorization: Bearer <jwt-token>
```

**Success Response (200):**
```json
{
  "valid": true,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "role": "admin",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

**Error Responses:**
- `401` - Invalid or expired token
- `403` - Token blacklisted

### Change Password

Change user password (requires current password).

```http
POST /api/auth/change-password
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "currentPassword": "old-password",
  "newPassword": "new-secure-password"
}
```

**Success Response (200):**
```json
{
  "message": "Password changed successfully"
}
```

**Error Responses:**
- `401` - Current password incorrect
- `400` - Password validation failed
- `403` - Not allowed for crew members

### Logout

Logout and blacklist the current token.

```http
POST /api/auth/logout
Authorization: Bearer <jwt-token>
```

**Success Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

## 🔒 Security Features

### Account Lockout

- **Max Attempts**: 5 failed login attempts
- **Lockout Duration**: 30 minutes
- **Reset**: Successful login clears failed attempts

### Rate Limiting

- **Login Endpoints**: 5 requests per minute per IP
- **Magic Link Request**: 3 requests per hour per email
- **Token Verification**: 100 requests per minute

### Password Requirements

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

### Token Security

- **Algorithm**: HS256
- **Expiry**: 7 days
- **Blacklist**: Tokens can be revoked
- **Payload**: Contains user ID, email, role

## 📝 Implementation Examples

### JavaScript/Fetch

```javascript
// Admin Login
async function adminLogin(email, password) {
  const response = await fetch('/api/auth/admin-login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Login failed');
  }
  
  const { token, user } = await response.json();
  localStorage.setItem('token', token);
  return user;
}

// Authenticated Request
async function makeAuthRequest(url) {
  const token = localStorage.getItem('token');
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (response.status === 401) {
    // Token expired or invalid
    localStorage.removeItem('token');
    window.location.href = '/login';
  }
  
  return response;
}
```

### cURL Examples

```bash
# Admin Login
curl -X POST https://api.example.com/api/auth/admin-login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}'

# Verify Token
curl -X GET https://api.example.com/api/auth/verify \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."

# Request Magic Link
curl -X POST https://api.example.com/api/auth/request-magic-link \
  -H "Content-Type: application/json" \
  -d '{"email":"crew@example.com"}'
```

## 🚨 Error Handling

All authentication errors follow the standard error format:

```json
{
  "error": {
    "code": "AUTH_INVALID_CREDENTIALS",
    "message": "Invalid email or password",
    "details": {
      "attemptsRemaining": 3
    }
  }
}
```

Common error codes:
- `AUTH_INVALID_CREDENTIALS` - Wrong email/password
- `AUTH_ACCOUNT_LOCKED` - Too many failed attempts
- `AUTH_TOKEN_EXPIRED` - JWT token expired
- `AUTH_TOKEN_INVALID` - Malformed or invalid token
- `AUTH_ACCOUNT_NOT_ACTIVE` - User account disabled

## 📚 Related Documentation

- [Error Handling Guide](/docs/for-developers/api-reference/error-handling.md)
- [Rate Limiting](/docs/for-developers/api-reference/endpoints/overview.md#-rate-limiting)
- [JWT Implementation](TOKEN_BLACKLIST_SYSTEM.md)