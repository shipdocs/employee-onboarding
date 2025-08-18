# TypeScript Migration Guide

## Overview

This guide documents our approach to migrating the Maritime Onboarding System from JavaScript to TypeScript while maintaining Vercel serverless compatibility.

## Migration Strategy

### 1. Hybrid Module System

Due to Vercel serverless constraints, we maintain a hybrid approach:

```typescript
// ❌ Don't use ES modules for runtime imports in API routes
import { supabase } from '../../lib/supabase';

// ✅ Use CommonJS requires for runtime modules
const { supabase } = require('../../lib/supabase');

// ✅ Use ES imports for types only
import type { NextApiRequest, NextApiResponse } from 'next';
import type { User } from '../../types/database';
```

### 2. Type Declaration Files

For existing JavaScript libraries, create `.d.ts` files instead of converting to TypeScript:

```typescript
// lib/auth.d.ts
export interface JWTPayload {
  userId: string;
  email: string;
  role: 'crew' | 'manager' | 'admin';
}

export function verifyJWT(token: string): JWTPayload | null;
```

### 3. API Response Standardization

Use the generic `ApiResponse<T>` type for consistent responses:

```typescript
// Define data structure
interface UserData {
  id: string;
  email: string;
}

// Use generic ApiResponse
type UserResponse = ApiResponse<UserData>;

// In handler
res.json({
  success: true,
  data: userData  // Type-safe data
});
```

## Step-by-Step Migration Process

### 1. Create Type Definitions

First, establish core type definitions:

- `/types/database.ts` - Database entity types
- `/types/api.ts` - API request/response types
- `/types/index.ts` - Shared types

### 2. Migrate API Route

```typescript
// 1. Change extension from .js to .ts
// 2. Add type imports
import type { NextApiRequest, NextApiResponse } from 'next';
import type { AuthenticatedRequest, ApiResponse } from '../../types/api';

// 3. Use require for runtime modules
const { supabase } = require('../../lib/supabase');
const { requireAuth } = require('../../lib/auth');

// 4. Define interfaces for data structures
interface ResponseData {
  users: User[];
  total: number;
}

// 5. Type the handler function
async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse<ResponseData>>
) {
  // Implementation
}

// 6. Export with middleware
export default requireAuth(handler);
```

### 3. Handle Supabase Queries

Type Supabase query results explicitly:

```typescript
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('role', 'crew') as { 
    data: User[] | null; 
    error: any 
  };

if (error || !data) {
  // Handle error
}
```

### 4. Type Guards

Use type guards for runtime type checking:

```typescript
function isUser(obj: any): obj is User {
  return obj && 
    typeof obj.id === 'string' &&
    typeof obj.email === 'string' &&
    ['crew', 'manager', 'admin'].includes(obj.role);
}
```

## Common Patterns

### Authenticated Endpoints

```typescript
import type { AuthenticatedRequest, ApiResponse } from '../../types/api';

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse<YourData>>
) {
  const userId = req.user!.userId; // Safe after requireAuth
}

export default requireAuth(handler);
```

### Query Parameters

```typescript
const {
  page = '1',
  limit = '10',
  search
} = req.query as {
  page?: string;
  limit?: string;
  search?: string;
};

const pageNum = parseInt(page);
const limitNum = parseInt(limit);
```

### Error Responses

```typescript
res.status(400).json({
  success: false,
  error: 'Validation failed',
  message: 'Email is required'
});
```

## TypeScript Configuration

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "strict": true,
    "noImplicitAny": false, // Allow gradual migration
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "node",
    "paths": {
      "@/*": ["./lib/*"],
      "@/types/*": ["./types/*"]
    }
  }
}
```

## Best Practices

1. **Start with type declarations** - Don't convert JS files immediately
2. **Migrate incrementally** - One API route at a time
3. **Test after each migration** - Ensure functionality is preserved
4. **Use strict types** - Avoid `any` where possible
5. **Document complex types** - Add JSDoc comments for clarity

## Common Issues and Solutions

### Issue: "Cannot use import statement outside a module"

**Solution**: Use `require()` for runtime modules in API routes.

### Issue: Type errors with Supabase queries

**Solution**: Explicitly type the query result:
```typescript
as { data: YourType[] | null; error: any }
```

### Issue: Missing types for libraries

**Solution**: Create declaration files or install @types packages:
```bash
npm install --save-dev @types/library-name
```

## Migration Checklist

- [ ] Create type definitions for entities
- [ ] Create API type definitions
- [ ] Configure tsconfig.json
- [ ] Migrate API routes (maintain require() pattern)
- [ ] Create .d.ts files for JS libraries
- [ ] Run type checking: `npx tsc --noEmit`
- [ ] Update documentation
- [ ] Test in Vercel deployment

## Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Next.js TypeScript Guide](https://nextjs.org/docs/basic-features/typescript)
- [Vercel Serverless Functions](https://vercel.com/docs/functions/serverless-functions)