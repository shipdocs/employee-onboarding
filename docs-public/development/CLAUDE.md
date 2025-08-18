<!-- This documentation has been sanitized for public viewing. Sensitive data has been replaced with placeholders. -->

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## SIMONE Natural Language Workflow

This project uses SIMONE (Systematic Improvement and Maintainability Optimization through Non-disruptive Evolution) for natural language project management. Simply describe what you want to do in plain language.

### Example Commands:
- "Clean up the authentication flow" → Analyzes and suggests auth improvements
- "Find and fix duplicate code" → Identifies code duplication
- "Improve error handling" → Reviews and enhances error management
- "Check test coverage" → Analyzes testing gaps

### SIMONE Workflow:
1. **Analyze**: Understand current state
2. **Plan**: Create improvement strategy
3. **Execute**: Implement changes incrementally
4. **Verify**: Ensure quality and stability
5. **Document**: Update relevant documentation

## Essential Commands

### Development
```bash
npm start                    # Start development server (or use: vercel dev)
npm run dev:build           # Build frontend for development
npm run build               # Production build
```

### Testing
```bash
npm test                     # Run all Jest tests
npm run test:unit           # Unit tests only
npm run test:integration    # Integration tests
npm run test:e2e:playwright # End-to-end tests
npm run test:performance:k6 # Performance tests
npm run test:smtp          # Test SMTP configuration

# Run a single test file
npm test -- path/to/test.spec.js
npm test -- --testNamePattern="specific test name"
```

### Database
```bash
npm run db:setup            # Setup local development database
npm run db:create-migration # Create new migration
npm run db:push            # Push schema changes to Supabase
npm run db:reset           # Reset database (careful!)
```

### Deployment
```bash
npm run deploy             # Deploy to Vercel production
vercel --prod             # Alternative deployment command
```

### Linting & Type Checking
```bash
npm run lint              # Run ESLint
npm run typecheck        # Run TypeScript type checking (if available)
```

## Architecture Overview

### Tech Stack
- **Frontend**: React 18.3.1, TailwindCSS 3.4.17, React Query 3.39.3
- **Backend**: Vercel serverless functions (Node.js >=18)
- **Database**: Supabase PostgreSQL with Row Level Security (RLS)
- **Authentication**: JWT with magic link authentication
- **Email**: MailerSend/SMTP via unifiedEmailService
- **File Storage**: Supabase Storage
- **PDF Generation**: pdf-lib, pdfjs-dist, react-pdf

### Project Structure
```
/
├── api/                    # Vercel serverless API endpoints
│   ├── admin/             # Admin-specific endpoints
│   ├── auth/              # Authentication (login, magic links)
│   ├── crew/              # Crew member operations
│   ├── manager/           # Manager operations
│   └── workflows/         # Dynamic workflow system
├── client/                # React frontend
│   ├── src/
│   │   ├── components/    # Reusable React components
│   │   ├── contexts/      # Auth, Language, Onboarding contexts
│   │   ├── pages/         # Page-level components
│   │   └── services/      # API service layer
├── lib/                   # Shared libraries
│   ├── auth.js           # JWT authentication utilities
│   ├── supabase.js       # Supabase client configuration
│   └── unifiedEmailService.js # Email sending service
├── services/             # Backend services
└── supabase/             # Database configuration
```

### Key Architectural Patterns

1. **API Routes Pattern**: Each API endpoint is a separate serverless function
   - Example: `api/crew/[id]/training.js` handles `/api/crew/:id/training`
   - All routes use JWT authentication via `lib/auth.js`
   - **Important**: Use hybrid import strategy in TypeScript API files:
     ```typescript
     // Runtime modules use require
     const { supabase } = require('../../lib/supabase');
     const { generateJWT } = require('../../lib/auth');
     
     // Type imports still use ES modules
     import { LoginRequest, LoginResponse } from '../../types/api';
     ```

2. **Role-Based Access Control (RBAC)**: Three-tier system
   - Admin: Full system access
   - Manager: Manage crew in their company
   - Crew: Access own training data

3. **Database Access**: Always through Supabase client with RLS
   - Never use raw SQL queries
   - RLS policies enforce data access rules
   - Use `service_role` key only for admin operations

4. **Email Service**: Centralized through `unifiedEmailService.js`
   - Supports both MailerSend API and SMTP
   - All emails use inline styles for compatibility
   - Template system for consistent formatting

5. **State Management**: 
   - React Context API for global state (Auth, Language, Onboarding)
   - React Query for server state and caching
   - Local state for component-specific data

## Current Refactoring Status (v5.0 - Simplified)

The project has a simplified 11-week refactoring plan focused on making the system multi-tenant and workflow-flexible.

### Key Refactoring Documents:
- `refactor/SIMPLIFIED-REFACTORING-PLAN.md` - Main implementation guide
- `refactor/VISUAL-ROADMAP.md` - Visual representation of the journey
- `refactor/QUICK-IMPLEMENTATION-GUIDE.md` - Week-by-week implementation details

### Three-Phase Approach:
1. **Weeks 1-4**: Foundation (Email, Config, Errors, Database)
2. **Weeks 5-8**: Workflow System (Adapter, Dynamic Content, Templates)
3. **Weeks 9-11**: Platform Features (Multi-workflow, Analytics, Performance)

---

## Recent Technical Fixes Completed

1. **Fixed missing phase completion notifications** - Added sendPhaseCompletionEmail to unifiedEmailService.js
2. **Fixed manager permissions not loading** - Updated auth endpoints to fetch permissions from manager_permissions table
3. **Fixed toast.info error** - Changed to toast() as react-hot-toast doesn't have .info method
4. **Fixed email styling** - Converted all email templates to inline styles for better client compatibility
5. **Fixed ES Module Import Issues in Vercel Serverless Functions** - Implemented hybrid import strategy:
   - TypeScript files use `import` for types but `require()` for runtime modules
   - Maintains TypeScript benefits while ensuring CommonJS compatibility
   - Updated critical auth endpoints: admin-login.ts, manager-login.ts, magic-login.ts
   - Created CommonJS versions of core modules: supabase.js, httpCacheMiddleware.js, cacheService.js
   - Resolves "Cannot use import statement outside a module" errors in production

## Deployment Pipeline

| Environment | Purpose | URL | Database |
|-------------|---------|-----|----------|
| Local | Development | localhost:3000 | Production (read-only) |
| Testing | Team review | your-project.vercel.app | Testing DB |
| Preview | Final approval | your-project.vercel.app | Preview DB |
| Production | Live system | your-domain.com | Production DB |

## Security Configuration

For test environments, create `.env.test` with:
```bash
SUPABASE_URL=your_test_supabase_url
SUPABASE_ANON_KEY=your_test_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_test_service_role_key
JWT_SECRET=your_jwt_secret
```

See `SECURITY_SETUP.md` for full security configuration details.

## Quick Reference: Where to Find Things

### API Endpoints
- Authentication: `api/auth/` (login, magic links)
- Admin operations: `api/admin/`
- Manager operations: `api/manager/`
- Crew operations: `api/crew/`
- Workflow system: `api/workflows/`

### Core Services
- Email service: `lib/unifiedEmailService.js`
- Auth utilities: `lib/auth.js`
- Database client: `lib/supabase.js`
- API services: `client/src/services/api.js`

### Frontend Components
- Auth context: `client/src/contexts/AuthContext.js`
- Language context: `client/src/contexts/LanguageContext.js`
- Onboarding context: `client/src/contexts/OnboardingContext.js`
- Pages: `client/src/pages/`
- Shared components: `client/src/components/`

### Testing
- Unit tests: `**/*.test.js`
- Integration tests: `tests/integration/`
- E2E tests: `tests/e2e/`
- Performance tests: `tests/performance/`