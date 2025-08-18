# TypeScript Migration Strategy

## Overview

This document outlines the TypeScript migration strategy for the Maritime Onboarding System, taking into account Vercel deployment constraints and the current hybrid module system.

## Current State

- **API Routes**: 21 TypeScript files, 101 JavaScript files
- **Library Files**: Mostly JavaScript with CommonJS (require/exports)
- **Client**: React components in JavaScript
- **TypeScript Config**: Loose (`strict: false`) to allow gradual migration

## Module System Constraints

### Vercel Serverless Functions
- API routes can use TypeScript with ES modules
- Library files must use CommonJS for serverless runtime compatibility
- The hybrid approach is intentional and working

### Current Pattern
```typescript
// API Route (TypeScript with ES modules)
import { getUserById } from '../../lib/queries/userQueries';

// Library File (JavaScript with CommonJS)
const { supabase } = require('../supabase');
module.exports = { getUserById };
```

## Migration Strategy

### Phase 1: Type Definitions (Day 4)
1. Create `.d.ts` files for critical JavaScript libraries
2. Define interfaces for common data structures
3. Enable stricter TypeScript checks incrementally
4. Migrate high-value API routes to TypeScript

### Phase 2: API Routes (Week 3)
1. Migrate remaining API routes to TypeScript
2. Use type guards for request/response validation
3. Leverage existing types from `/types/api.ts`

### Phase 3: Library Types (Week 4)
1. Add JSDoc types to JavaScript library files
2. Create type declaration files for exports
3. Maintain CommonJS for runtime compatibility

## Implementation Plan for Day 4

### 1. Create Type Declaration Files

Create `.d.ts` files for key JavaScript libraries:

```typescript
// lib/auth.d.ts
export interface JWTPayload {
  userId: string;
  email: string;
  role: 'crew' | 'manager' | 'admin';
}

export function generateMagicToken(email?: string): string;
export function verifyToken(token: string): JWTPayload | null;
export function requireAuth(handler: Function): Function;
```

### 2. Enhance tsconfig.json

```json
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noImplicitAny": false, // Allow gradual migration
    "allowJs": true,
    "checkJs": false, // Don't check JS files yet
    "declaration": true,
    "declarationMap": true
  }
}
```

### 3. Priority API Routes to Migrate

High-value routes to migrate first:
1. `/api/auth/change-password.js` → `.ts`
2. `/api/crew/profile.js` → `.ts` (if still JS)
3. `/api/manager/dashboard/stats.js` → `.ts`
4. `/api/admin/managers/[id].js` → `.ts`

### 4. Common Type Definitions

Create shared types in `/types/database.ts`:

```typescript
export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'crew' | 'manager' | 'admin';
  position?: string;
  vessel_assignment?: string;
  status: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TrainingSession {
  id: string;
  user_id: string;
  phase: number;
  status: 'pending' | 'in_progress' | 'completed';
  started_at: string;
  completed_at?: string;
  due_date?: string;
}

export interface QuizResult {
  id: string;
  user_id: string;
  phase: number;
  score: number;
  total_questions: number;
  passed: boolean;
  created_at: string;
}
```

## Best Practices

### For API Routes (TypeScript)
```typescript
import type { NextApiRequest, NextApiResponse } from 'next';
import type { AuthenticatedRequest, ApiResponse } from '../../types/api';

// Use type imports to avoid runtime issues
import type { User } from '../../types/database';

// Runtime imports
import { requireAuth } from '../../lib/auth';
```

### For Library Files (JavaScript with Types)
```javascript
/**
 * @typedef {import('../types/database').User} User
 * @typedef {import('../types/api').ApiResponse} ApiResponse
 */

/**
 * Get user by ID
 * @param {string} userId - User ID
 * @returns {Promise<User|null>} User object or null
 */
async function getUserById(userId) {
  // Implementation
}
```

### Type Declaration Files
```typescript
// lib/queries/userQueries.d.ts
import type { User } from '../types/database';

export function getUserById(userId: string): Promise<User | null>;
export function getUserByEmail(email: string, role?: string): Promise<User | null>;
export function getUserWithPermissions(userId: string): Promise<{
  user: User | null;
  permissions: string[];
}>;
```

## Migration Checklist

- [ ] Create `/types/database.ts` with common interfaces
- [ ] Create `.d.ts` files for critical JS libraries
- [ ] Update `tsconfig.json` for stricter checks
- [ ] Migrate 4-5 high-value API routes
- [ ] Add JSDoc types to new JS code
- [ ] Test Vercel deployment still works
- [ ] Document any issues or patterns discovered

## Success Metrics

- No runtime errors from module loading
- Improved IDE autocomplete and error detection
- Maintained Vercel deployment compatibility
- Clear separation between build-time types and runtime code