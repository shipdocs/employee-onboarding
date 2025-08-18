# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## CRITICAL: Required Tools and Methodology

**ALWAYS use these tools for EVERY task in this project:**

1. **Serena MCP** - MANDATORY for all semantic code retrieval and editing operations
   - Use for finding relevant code across the codebase
   - Use for making intelligent code modifications
   - Use for understanding code relationships and dependencies

2. **Context7 MCP** - MANDATORY for up-to-date documentation on third-party code
   - Use for checking latest API documentation
   - Use for understanding library updates and changes
   - Use for finding best practices and examples

3. **Sequential Thinking** - MANDATORY for all decision-making processes
   - Use before making any architectural decisions
   - Use when planning complex implementations
   - Use when debugging difficult issues

**Never skip using these tools. They are required for maintaining code quality and consistency.**

## Project Overview

This is the Maritime Onboarding System 2025 - a comprehensive crew onboarding and training management platform for the maritime industry. The system follows a three-phase training workflow: Basic Training → Advanced Training → Quiz → Certificate Generation.

## Common Development Commands

### Development
```bash
# Start local development (uses production DB in read-only mode)
vercel dev

# Start with cloud Supabase
npm run start:cloud

# Run specific component tests
npm test -- ComponentName
```

### Database Management
```bash
# Apply migrations to database
npm run db:push

# Pull schema from remote database
npm run db:pull

# Create new migration
npm run db:create-migration -- "migration_name"

# Create admin user (required for initial setup)
npm run setup:admin
```

### Testing
```bash
# Run unit tests in watch mode
npm run test:watch

# Run all tests with coverage
npm run test:coverage

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:security:all

# Run E2E tests with Playwright
npm run test:e2e:playwright
npm run test:e2e:playwright:ui  # With UI mode
npm run test:e2e:playwright:debug  # Debug mode

# Run security tests
npm run test:security:comprehensive
npm run dependency:scan  # Scan for vulnerabilities
```

### Building & Deployment
```bash
# Build for production
npm run build

# Deploy to specific environments
vercel --env preview  # Deploy to preview
vercel --prod  # Deploy to production (requires approval)

# Verify deployment
npm run verify:deployment
```

## Architecture Overview

### Three-Tier Development Pipeline
1. **Local Development**: Uses production database in read-only mode (localhost:3000)
2. **Testing Environment**: For team review and integration testing
3. **Preview Environment**: Final approval before production
4. **Production**: Live system at onboarding.burando.online

### Technology Stack
- **Frontend**: React 19 with Material-UI, Tailwind CSS, react-hot-toast
- **Backend**: Vercel serverless functions (Node.js 18+)
- **Database**: Supabase PostgreSQL with Row Level Security
- **Storage**: Supabase Storage for files and certificates
- **Email**: MailerSend for transactional emails
- **PDF Generation**: pdf-lib for certificate generation
- **Authentication**: JWT with role-based access control

### API Structure
All API routes are serverless functions in `/api/`:
- `/api/auth/*` - Authentication endpoints (login, magic links, JWT validation)
- `/api/admin/*` - Admin management endpoints (requires admin role)
- `/api/manager/*` - Manager endpoints (requires manager role)
- `/api/crew/*` - Crew member endpoints (public/authenticated)
- `/api/email/*` - Email service integration with MailerSend
- `/api/pdf/*` - Certificate generation endpoints

### Frontend Architecture
- **Context Providers**: AuthContext, LanguageContext wrap the entire app
- **Role-based Routing**: Routes in `client/src/App.js` enforce role permissions
- **Service Layer**: All API calls go through `client/src/services/`
- **Component Structure**: 
  - Pages in `client/src/pages/` handle routing
  - Shared components in `client/src/components/`
  - Role-specific components organized by user type

### Database Schema
Uses Supabase PostgreSQL with Row Level Security:
- **profiles**: User accounts with role-based access
- **workflows**: Training workflow definitions
- **crew_members**: Crew member records
- **training_progress**: Progress tracking for each phase
- **quiz_attempts**: Quiz attempt history
- **certificates**: Generated certificate records
- **audit_logs**: Comprehensive activity logging

### Authentication Flow
1. **Admin/Manager**: Email/password authentication with JWT
2. **Crew Members**: Magic link authentication via email
3. **JWT Storage**: Tokens stored in localStorage with 7-day expiry
4. **Role Verification**: Every API call verifies role permissions

## Key Development Patterns

### API Error Handling
All API routes follow this pattern:
```javascript
export default async function handler(req, res) {
  try {
    // Verify authentication
    const user = await verifyAuth(req);
    
    // Check role permissions
    if (!hasPermission(user, requiredRole)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    // Business logic here
    
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
```

### Frontend Service Pattern
Services use consistent error handling:
```javascript
async function apiCall() {
  try {
    const response = await fetch('/api/endpoint', {
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(await response.text());
    }
    
    return await response.json();
  } catch (error) {
    console.error('Service Error:', error);
    throw error;
  }
}
```

### Database Queries
Always use parameterized queries and check RLS policies:
```javascript
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('company_id', user.company_id) // Respect company boundaries
  .order('created_at', { ascending: false });
```

## Security Considerations

1. **JWT Validation**: All protected endpoints must validate JWT tokens using `lib/auth.js`
2. **Role Checking**: Always verify user roles match endpoint requirements
3. **Company Isolation**: Multi-tenant system - always filter by company_id
4. **File Access**: Use Supabase Storage with proper bucket policies
5. **Input Validation**: Validate all user inputs before database operations

## Environment Configuration

Required environment variables:
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_ANON_KEY`: Public anon key
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key (server-side only)
- `JWT_SECRET`: Secret for JWT signing (min 128 characters)
- `MAILERSEND_API_KEY`: MailerSend API key
- `NEXT_PUBLIC_APP_URL`: Application URL for links

See `.env.example` for a complete template. Copy it to `.env` for local development.

## Testing Strategy

1. **Unit Tests**: Test individual components and functions
2. **Integration Tests**: Test API endpoints with mocked services
3. **E2E Tests**: Full user flows with Playwright
4. **Manual Testing**: Follow three-tier deployment for thorough testing

## Internationalization

The system supports English and Dutch:
- Translation files in `client/src/locales/`
- Use `useTranslation()` hook in components
- API responses should include translated error messages

## Certificate Generation

Certificates are generated server-side using pdf-lib:
- Template in `api/pdf/generate-certificate.js`
- Includes QR code for verification
- Stored in Supabase Storage with unique IDs

## Code Quality and Linting

```bash
# Lint all JavaScript/TypeScript files
npm run lint
npm run lint:fix  # Auto-fix issues

# Find unused dependencies and exports
npm run knip
npm run knip:fix  # Auto-remove unused dependencies
```

## Important File Locations

- **API Routes**: `/api/**/*.js` - All serverless functions
- **Authentication**: `/lib/auth.js` - JWT and role verification
- **Database Client**: `/lib/supabase.js` - Supabase client configuration
- **Email Service**: `/lib/emailService.js` - MailerSend integration
- **Frontend App**: `/client/src/App.js` - Main React application
- **Services**: `/client/src/services/` - API client services
- **Components**: `/client/src/components/` - Reusable React components
- **Pages**: `/client/src/pages/` - Route components

## Common Troubleshooting

### Vercel Build Errors
- Ensure all environment variables are configured in Vercel dashboard
- Check `vercel.json` for build configuration
- Build command uses `--legacy-peer-deps` for compatibility

### Database Connection Issues
- Verify Supabase service role key is correct
- Check if Supabase project is linked: `supabase link --project-ref <project-ref>`
- Ensure RLS policies are correctly configured

### JWT Authentication Errors
- JWT_SECRET must be at least 128 characters
- Tokens expire after 7 days by default
- Check token blacklist if authentication fails unexpectedly

### Test Failures
- Jest configuration is in `tests/jest.config.js`
- Playwright configuration is in `playwright.config.ts`
- Environment variables for tests should be in `.env.test`

## Performance Monitoring

- API endpoints have 60-second maximum duration
- Database queries should use indexes for large tables
- Frontend uses React.lazy for code splitting
- Images stored in Supabase Storage with CDN caching

## Deployment Checklist

Before deploying to production:
1. Run all tests: `npm run test:all:comprehensive`
2. Check for security vulnerabilities: `npm run dependency:scan`
3. Verify environment variables are set in Vercel
4. Test in preview environment first
5. Monitor error logs after deployment