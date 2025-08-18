# Development Workflow

This document describes the complete development workflow for the Maritime Onboarding System, including the three-tier deployment pipeline and Supabase branching strategy.

## 🔄 **Three-Tier Development Pipeline**

The project uses a comprehensive three-environment workflow that has been fully tested and validated:

```
🔄 DEVELOPMENT WORKFLOW:
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Local Dev       │ ─→ │ Testing Branch  │ ─→ │ Preview Branch  │ ─→ │ Production      │
│ ✅ Working      │    │ ✅ Validated    │    │ ✅ Tested       │    │ ✅ LIVE!        │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
```

### **Environment Details**

| Environment | Branch | URL | Database | Purpose |
|-------------|--------|-----|----------|---------|
| **Local** | `main` | `localhost:3000` | Production (read-only) | Development |
| **Testing** | `testing` | `new-onboarding-2025-git-testing-shipdocs-projects.vercel.app` | Testing DB | Team review |
| **Preview** | `preview` | `new-onboarding-2025-git-preview-shipdocs-projects.vercel.app` | Preview DB | Final approval |
| **Production** | `main` | `onboarding.burando.online` | Production DB | Live system |

## 🚀 **Local Development**

### **Unified Architecture**
The system uses a **single, consistent Vercel architecture** across all environments:

- **Local Development**: `vercel dev` - Runs identical serverless functions as production
- **Database**: Supabase PostgreSQL for all environments (no SQLite)
- **API Routes**: Vercel API routes (`/api/*`) for all functionality

### **Development Commands**

```bash
# Start unified development environment (RECOMMENDED)
vercel dev

# Build React app (if needed)
cd client && npm run build && cd .. && cp -r client/build ./build

# Database operations
npm run db:pull          # Sync schema from production
npm run db:push          # Apply local migrations
npm run db:reset         # Reset local database
```

### **Environment Configuration**

```bash
# Copy environment template
cp .env.example .env

# Required environment variables:
SUPABASE_URL=your-supabase-project-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
JWT_SECRET=your-jwt-secret
MAILERSEND_API_KEY=your-mailersend-key
```

## 📊 **Supabase Configuration**

### **Database Environment**

| Environment | Project ID | Purpose |
|-------------|------------|---------|
| **Development** | `ocqnnyxnqaedarcohywe` | Fresh development project |

### **Migration Workflow**

1. **Schema Sync**: `supabase db pull` before development
2. **Create Migration**: `npm run db:create-migration feature_name`
3. **Test Locally**: `supabase db push`
4. **Commit Changes**: Include migration files in commits
5. **Deploy**: Automatic migration on branch deployment

### **Migration Files**

All migrations follow timestamp naming: `YYYYMMDDHHMMSS_description.sql`

```
supabase/migrations/
├── 20250528070308_remote_schema.sql
├── 20250528071902_remote_schema.sql
├── 20250528100001_add_migration_tracking.sql
├── 20250528125150_test_migration_system.sql
├── 20250528160800_ensure_admin_user.sql
└── 20250528161500_fix_admin_password.sql
```

## 🔄 **Development Workflow Steps**

### **1. Feature Development**

```bash
# Start from main branch
git checkout main
git pull origin main

# Create feature branch (optional for small changes)
git checkout -b feature/new-feature

# Start development environment
vercel dev

# Make changes and test locally
# Commit changes
git add .
git commit -m "feat: add new feature"
```

### **2. Testing Environment**

```bash
# Push to testing branch for team review
git push origin testing

# Or merge to testing branch
git checkout testing
git merge feature/new-feature
git push origin testing
```

**Testing Environment:**
- URL: `new-onboarding-2025-git-testing-shipdocs-projects.vercel.app`
- Admin: `burando_onboarding_development@shipdocs.app`
- Purpose: Team review and validation

### **3. Preview Environment**

```bash
# After testing approval, push to preview
git checkout preview
git merge testing
git push origin preview
```

**Preview Environment:**
- URL: `new-onboarding-2025-git-preview-shipdocs-projects.vercel.app`
- Admin: `burando_onboarding_preview@shipdocs.app`
- Purpose: Final approval and stakeholder review

### **4. Production Deployment**

```bash
# After preview approval, merge to main
git checkout main
git merge preview
git push origin main
```

**Production Environment:**
- URL: `onboarding.burando.online`
- Admin: `hr@shipdocs.app`
- Purpose: Live system for actual use

## 🛠 **Development Tools**

### **Database Management**

```bash
# Migration operations
npm run db:create-migration name    # Create new migration
npm run db:push                     # Apply migrations locally
npm run db:pull                     # Sync schema from remote
npm run db:reset                    # Reset local database

# Seed data
npm run db:apply-seed              # Apply seed data
npm run setup:admin                # Create admin user
```

### **Testing & Verification**

```bash
# Test permissions
npm run test:permissions

# Verify deployment
npm run verify:deployment

# Test file operations
npm run test:files
```

## 🔒 **Security & Best Practices**

### **Environment Isolation**
- Each environment has separate Supabase database
- Environment-specific admin accounts
- Isolated storage buckets
- Branch-specific environment variables

### **Migration Safety**
- Always test migrations locally first
- Use descriptive migration names
- Include rollback plans for complex changes
- Monitor deployment logs

### **Code Quality**
- Test changes in testing environment
- Get team review before preview
- Stakeholder approval before production
- Monitor production after deployment

## 🚨 **Troubleshooting**

### **Common Issues**

1. **Migration Conflicts**
   ```bash
   # Pull latest schema and resolve conflicts
   supabase db pull
   # Fix conflicts in migration files
   # Test locally before pushing
   ```

2. **Environment Variables**
   ```bash
   # Verify environment variables are set
   vercel env ls
   # Add missing variables
   vercel env add VARIABLE_NAME
   ```

3. **Database Connection Issues**
   ```bash
   # Check Supabase connection
   supabase status
   # Verify project linking
   supabase projects list
   ```

## 📈 **Workflow Benefits**

### **Validated Pipeline**
- ✅ **Complete testing** from local to production
- ✅ **Database migration** sync across environments
- ✅ **Admin authentication** working in all environments
- ✅ **Automated deployments** with Vercel integration

### **Quality Assurance**
- **Testing Environment**: Catch issues early
- **Preview Environment**: Stakeholder validation
- **Production Environment**: Stable, tested releases

### **Developer Experience**
- **Consistent Architecture**: Same code runs everywhere
- **Easy Environment Switching**: Simple branch-based deployment
- **Automated Migrations**: Database changes deploy automatically
- **Clear Workflow**: Defined steps for all changes

## 🎯 **Best Practices**

### **Development**
1. **Always start from main**: `git checkout main && git pull origin main`
2. **Use descriptive commit messages**: Follow conventional commits
3. **Test locally first**: Verify changes work before pushing
4. **Keep migrations small**: One logical change per migration
5. **Document breaking changes**: Update relevant documentation

### **Code Review**
1. **Review in testing environment**: Don't just review code
2. **Test user workflows**: Verify end-to-end functionality
3. **Check performance impact**: Monitor response times
4. **Verify security**: Ensure proper authentication/authorization

### **Deployment**
1. **Monitor after deployment**: Watch for errors and performance issues
2. **Have rollback plan**: Know how to quickly revert if needed
3. **Communicate changes**: Inform stakeholders of new features
4. **Update documentation**: Keep docs current with changes

## 🔄 **Hotfix Workflow**

For urgent production fixes:

```bash
# Create hotfix branch from main
git checkout main
git checkout -b hotfix/urgent-fix

# Make minimal fix
# Test locally
git add .
git commit -m "hotfix: fix urgent issue"

# Deploy directly to production
git checkout main
git merge hotfix/urgent-fix
git push origin main

# Backport to other branches
git checkout preview
git merge main
git push origin preview

git checkout testing
git merge preview
git push origin testing
```

## 📊 **Monitoring & Metrics**

### **Development Metrics**
- **Deployment frequency**: How often we deploy
- **Lead time**: Time from commit to production
- **Mean time to recovery**: How quickly we fix issues
- **Change failure rate**: Percentage of deployments causing issues

### **Quality Metrics**
- **Test coverage**: Percentage of code covered by tests
- **Code review coverage**: Percentage of changes reviewed
- **Documentation coverage**: How well features are documented

### **Performance Metrics**
- **API response times**: Monitor endpoint performance
- **Database query performance**: Track slow queries
- **User experience metrics**: Page load times, error rates

## 📚 **Related Documentation**

- **[Environment Setup](for-developers/development-workflow/environment-setup.md)** - Detailed local development setup
- **[Testing Guide](testing.md)** - Comprehensive testing procedures
- **[Deployment Guide](deployment.md)** - Deployment procedures and best practices
- **[Environment Configuration](../deployment/environments.md)** - Multi-environment setup
- **[Database Design](../for-developers/architecture/database-design.md)** - Database schema and migrations
