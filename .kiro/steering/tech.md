# Technology Stack & Build System

## Architecture
- **Frontend**: React.js (v19+) with modern hooks and responsive design
- **Backend**: Vercel API routes (serverless architecture)
- **Database**: Supabase PostgreSQL with Row Level Security (RLS)
- **Storage**: Supabase Storage for secure file management
- **Email**: MailerSend for reliable transactional emails
- **Authentication**: JWT with role-based access control
- **Deployment**: Vercel with three-tier pipeline (Testing → Preview → Production)

## Key Dependencies
- **Core**: Next.js 15+, React 19+, Supabase client
- **UI**: Material-UI, Tailwind CSS, Lucide React icons
- **Forms**: React Hook Form, React Dropzone
- **PDF**: pdf-lib for certificate generation, pdfjs-dist for viewing
- **Security**: bcrypt, jsonwebtoken, validator, xss, dompurify
- **Email**: nodemailer, mailersend
- **Testing**: Jest, Playwright, Testing Library
- **Development**: ESLint, TypeScript, Husky

## Build System
The project uses a dual-build system:
1. **Client Build**: React app built with Create React App
2. **API Build**: Vercel serverless functions

### Common Commands

```bash
# Development
npm start                    # Start Vercel dev server
vercel dev                   # Alternative dev start
npm run start:cloud          # Start with cloud Supabase

# Building
npm run build               # Full production build
npm run dev:build           # Development build
npm run dev:fresh           # Clean build

# Testing
npm test                    # Run all tests
npm run test:unit           # Unit tests only
npm run test:integration    # Integration tests
npm run test:e2e           # End-to-end tests
npm run test:e2e:playwright # Playwright E2E tests
npm run test:security      # Security audit

# Database
npm run db:push            # Apply migrations to Supabase
npm run db:pull            # Sync schema from remote
npm run setup:admin        # Create admin user

# Deployment
npm run deploy             # Deploy to production
npm run verify:deployment  # Verify deployment status

# Code Quality
npm run lint               # ESLint check
npm run lint:fix           # Auto-fix ESLint issues
npm run knip               # Dead code detection
```

## Environment Configuration
- **Local**: `.env` - Development with production DB (read-only)
- **Testing**: Vercel environment variables
- **Preview**: Vercel environment variables  
- **Production**: Vercel environment variables

Required environment variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `MAILERSEND_API_TOKEN`

## Development Workflow
1. Use `vercel dev` for local development
2. Database changes via Supabase CLI (`supabase db push`)
3. Three-tier deployment: Testing → Preview → Production
4. Automated testing with Jest and Playwright
5. Pre-commit hooks with Husky for code quality