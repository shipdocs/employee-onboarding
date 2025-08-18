# Project Structure & Organization

## Root Directory Layout

```
├── api/                    # Vercel serverless API routes
├── client/                 # React frontend application
├── lib/                    # Shared backend libraries and utilities
├── services/               # Business logic services
├── docs/                   # Comprehensive documentation
├── scripts/                # Utility and maintenance scripts
├── tests/                  # Test suites (unit, integration)
├── e2e-tests/             # End-to-end testing with Playwright
├── config/                # Configuration files
├── types/                 # TypeScript type definitions
├── supabase/              # Database migrations and schema
└── public/                # Static assets
```

## Key Directories

### `/api/` - Backend API Routes
Vercel serverless functions organized by feature:
- `auth/` - Authentication endpoints
- `admin/` - Admin-only functionality
- `crew/` - Crew member operations
- `manager/` - Manager operations
- `training/` - Training workflow logic
- `email/` - Email service endpoints
- `upload/` - File upload handling

### `/client/` - Frontend React App
Standard Create React App structure:
- `src/components/` - Reusable UI components
- `src/pages/` - Page-level components
- `src/hooks/` - Custom React hooks
- `src/services/` - API client services
- `src/utils/` - Frontend utilities
- `public/` - Static assets

### `/lib/` - Shared Backend Libraries
Core backend functionality:
- `auth.js` - Authentication utilities
- `supabase.js` - Database client
- `email.js` - Email service abstraction
- `validation.js` - Input validation
- `errorHandler.js` - Error handling
- `security/` - Security utilities

### `/services/` - Business Logic
High-level business services:
- `database.js` - Database operations
- `email.js` - Email service
- `workflow-engine.js` - Training workflow
- `progress-tracking.js` - Progress management

### `/docs/` - Documentation
Organized by audience and topic:
- `for-developers/` - Developer guides
- `for-administrators/` - Admin documentation
- `for-users/` - End-user guides
- `features/` - Feature documentation
- `api/` - API reference
- `reports/` - Test and audit reports

### `/scripts/` - Utility Scripts
Maintenance and setup scripts:
- `setup-*.js` - Environment setup
- `test-*.js` - Testing utilities
- `migration-*.js` - Data migration
- `database/` - Database utilities

## File Naming Conventions

### Backend Files
- API routes: `kebab-case.js` (e.g., `crew-progress.js`)
- Libraries: `camelCase.js` (e.g., `emailService.js`)
- Services: `kebab-case.js` (e.g., `workflow-engine.js`)

### Frontend Files
- Components: `PascalCase.jsx` (e.g., `TrainingCard.jsx`)
- Hooks: `camelCase.js` starting with `use` (e.g., `useAuth.js`)
- Utilities: `camelCase.js` (e.g., `apiClient.js`)

### Configuration Files
- Environment: `.env`, `.env.example`, `.env.local`
- Build: `next.config.js`, `vercel.json`, `package.json`
- Testing: `jest.config.js`, `playwright.config.ts`

## Import Path Aliases
Configured in `tsconfig.json`:
- `@/*` → `./lib/*` (backend utilities)
- `@/services/*` → `./services/*` (business services)
- `@/api/*` → `./api/*` (API routes)
- `@/client/*` → `./client/src/*` (frontend)
- `@/types/*` → `./types/*` (TypeScript types)

## Database Organization
- Schema: Defined in `supabase/migrations/`
- Row Level Security (RLS): Enforced for all tables
- Policies: Role-based access control
- Functions: Stored procedures for complex operations

## Testing Structure
- Unit tests: `tests/unit/` - Individual function testing
- Integration tests: `tests/integration/` - API endpoint testing
- E2E tests: `e2e-tests/` - Full user workflow testing
- Performance tests: `tests/performance/` - Load and stress testing

## Security Considerations
- All user inputs validated in `lib/validation.js`
- XSS protection via `dompurify` and `xss` libraries
- CSRF protection through Supabase RLS
- Content Security Policy defined in `next.config.js`
- File uploads sanitized and stored securely