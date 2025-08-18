# Token Blacklist System

This document describes the JWT token blacklisting system implemented for secure logout functionality.

## Overview

The token blacklisting system allows for immediate invalidation of JWT tokens when users log out, providing an additional layer of security beyond just removing tokens from the client.

## Components

### 1. Database Schema

**Table: `token_blacklist`**
- Stores blacklisted JWT tokens with their metadata
- Automatically cleaned up 24 hours after token expiration
- Indexed for fast lookup performance

**Key fields:**
- `token_jti`: Unique JWT ID for efficient lookup
- `user_id`: User who owned the token
- `token_hash`: SHA256 hash for additional verification
- `expires_at`: Original token expiration time
- `reason`: Why the token was blacklisted (logout, security, etc.)

### 2. Authentication Updates

**Modified `lib/auth.js`:**
- `generateJWT()`: Now includes a unique JWT ID (jti) in each token
- `isTokenBlacklisted()`: Checks if a token is in the blacklist
- `blacklistToken()`: Adds a token to the blacklist
- `authenticateRequest()` and `verifyAuth()`: Now check blacklist before accepting tokens

### 3. API Endpoints

**`/api/auth/logout`**
- Blacklists the current token when user logs out
- Returns success even if blacklisting fails (graceful degradation)

**`/api/admin/cleanup-tokens`** (Admin only)
- Manually trigger cleanup of expired tokens
- Returns statistics about cleanup operation

**`/api/cron/cleanup-tokens`**
- Designed for automated cleanup via cron jobs
- Protected by optional CRON_SECRET environment variable

### 4. Client Integration

**Updated `AuthContext`:**
- `logout()` now calls the logout API endpoint before clearing local state
- Ensures token is blacklisted on the server

## Usage

### Normal Logout Flow

1. User clicks logout
2. Client calls `/api/auth/logout` with current token
3. Server blacklists the token
4. Client clears local storage and redirects

### Token Verification Flow

1. Client sends request with JWT token
2. Server verifies JWT signature and expiration
3. Server checks if token is blacklisted
4. If blacklisted, returns 401 Unauthorized

### Cleanup Process

Expired tokens are cleaned up in three ways:

1. **Automatic (if pg_cron enabled)**: Daily at 3 AM UTC
2. **Manual**: Admin can trigger via `/api/admin/cleanup-tokens`
3. **Scheduled**: External cron service calls `/api/cron/cleanup-tokens`

## Security Considerations

1. **Graceful Degradation**: Logout succeeds even if blacklisting fails
2. **Performance**: Indexed lookups ensure minimal impact on auth performance
3. **Privacy**: Only stores necessary token metadata, not full tokens
4. **Cleanup**: Automatic removal prevents indefinite data growth

## Environment Variables

Add to `.env` if using scheduled cleanup:
```bash
CRON_SECRET=your-secret-key  # Optional: Protects cron endpoints
```

## Monitoring

Use these utilities to monitor the system:

```javascript
const { getTokenBlacklistStats, getActiveBlacklistedTokenCount } = require('./lib/tokenCleanup');

// Get statistics
const stats = await getTokenBlacklistStats();

// Get active token count
const count = await getActiveBlacklistedTokenCount();
```

## Migration

Run the migration to create the necessary database structures:
```bash
npm run db:push
```

Or apply manually:
```bash
psql $DATABASE_URL < supabase/migrations/20250702000000_create_token_blacklist.sql
```