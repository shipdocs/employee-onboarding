# Maritime Onboarding System - Developer Setup Guide

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm 8+
- Supabase account (free tier is sufficient)
- MailerSend account for email functionality
- Git

### 1. Clone the Repository
```bash
git clone https://github.com/shipdocs/new-onboarding-2025.git
cd new-onboarding-2025
```

### 2. Install Dependencies
```bash
# Install root dependencies
npm install

# Install client dependencies
cd client && npm install && cd ..
```

### 3. Environment Configuration
```bash
# Copy the example environment file
cp .env.example .env.local

# Edit .env.local with your configuration
# See "Environment Variables" section below for details
```

### 4. Database Setup

#### Option A: Use Existing Supabase Project
1. Create a new project at [supabase.com](https://supabase.com)
2. Run the migrations:
   ```bash
   npm run db:push
   ```
3. Create an admin user:
   ```bash
   npm run setup:admin
   ```

#### Option B: Local Development with Supabase CLI
```bash
# Install Supabase CLI
npm install -g supabase

# Start local Supabase
supabase start

# Apply migrations
supabase db push
```

### 5. Start Development Server
```bash
# Start with Vercel dev (recommended)
vercel dev

# Or use npm scripts
npm run dev
```

The application will be available at `http://localhost:3000`

## 📋 Environment Variables

### Required Variables

| Variable | Description | How to Get |
|----------|-------------|------------|
| `SUPABASE_URL` | Your Supabase project URL | Supabase Dashboard → Settings → API |
| `SUPABASE_ANON_KEY` | Public anon key | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (keep secret!) | Supabase Dashboard → Settings → API |
| `JWT_SECRET` | Secret for JWT signing | Generate: `openssl rand -base64 32` |
| `EMAIL_USER` | MailerSend SMTP username | MailerSend Dashboard → SMTP |
| `EMAIL_PASSWORD` | MailerSend SMTP password | MailerSend Dashboard → SMTP |

### Optional Variables

- `MFA_ENABLED`: Enable multi-factor authentication (default: true)
- `EMAIL_VERIFICATION_ENABLED`: Require email verification (default: true)
- `RATE_LIMIT_MAX_REQUESTS`: API rate limit (default: 100)

## 🏗️ Project Structure

```
new-onboarding-2025/
├── api/                    # Serverless API endpoints
│   ├── auth/              # Authentication endpoints
│   ├── admin/             # Admin management
│   ├── manager/           # Manager endpoints
│   ├── crew/              # Crew member endpoints
│   └── email/             # Email service
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Route components
│   │   ├── services/      # API client services
│   │   └── contexts/      # React contexts
├── lib/                    # Shared utilities
│   ├── auth.js            # Authentication helpers
│   ├── db.js              # Database client
│   └── email.js           # Email service
├── docs/                   # Documentation
│   └── compliance-2025-pdf/ # Compliance documents
└── supabase/              # Database migrations
    └── migrations/        # SQL migration files
```

## 🔧 Common Development Tasks

### Database Management
```bash
# Pull latest schema from remote
npm run db:pull

# Create a new migration
npm run db:create-migration -- "add_new_table"

# Reset database (warning: deletes all data!)
npm run db:reset
```

### Testing
```bash
# Run unit tests
npm test

# Run with coverage
npm run test:coverage

# Run integration tests
npm run test:integration
```

### Linting & Formatting
```bash
# Run ESLint
npm run lint

# Fix auto-fixable issues
npm run lint:fix

# Format with Prettier
npm run format
```

## 🐛 Troubleshooting

### Common Issues

#### "Cannot connect to database"
- Check your `DATABASE_URL` in `.env.local`
- Ensure Supabase project is running
- Verify network connectivity

#### "Email not sending"
- Verify MailerSend credentials
- Check email quota limits
- Ensure `EMAIL_VERIFICATION_ENABLED` is set correctly

#### "Build fails with TypeScript errors"
- Run `npm run typecheck` to see detailed errors
- Ensure all dependencies are installed
- Check Node.js version (18+ required)

### Debug Mode
Enable debug logging by setting:
```bash
DEBUG=maritime:* npm run dev
```

## 🚢 Deployment

### Vercel Deployment
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

### Environment Variables in Production
Set these in Vercel Dashboard → Settings → Environment Variables:
- All variables from `.env.local`
- Set `NODE_ENV=production`
- Use different secrets than development!

## 📚 Additional Resources

- [Architecture Overview](docs/ARCHITECTURE.md)
- [API Documentation](docs/API.md)
- [Contributing Guide](CONTRIBUTING.md)
- [Security Best Practices](docs/SECURITY.md)

## 🤝 Getting Help

- Create an issue on GitHub
- Check existing documentation in `/docs`
- Contact: info@shipdocs.app

## ⚠️ Security Notes

**NEVER commit these files:**
- `.env` or `.env.local` (contains secrets)
- Any file with real API keys or passwords
- Database dumps with real user data
- SSL certificates or private keys

**Always use:**
- `.env.example` for sharing configuration structure
- Strong, unique passwords for each environment
- Environment-specific secrets (never reuse between dev/prod)