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

## 🚀 **HYBRID DATABASE SYNC SYSTEM**

**🎯 ELIMINATES MIGRATION HELL FOREVER**

### **Revolutionary Architecture**

The project now uses a **hybrid database sync system** that combines the best of both worlds:

- **Schema**: Automatically synced from production to testing/preview
- **Data**: Controlled seed data for predictable testing
- **Security**: No production data exposure
- **Maintenance**: Zero manual migration management

```
🔄 HYBRID SYNC WORKFLOW:
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Production DB   │ ─→ │ Testing Branch  │ ─→ │ Preview Branch  │
│ Schema + Data   │    │ Schema + Seeds  │    │ Schema + Seeds  │
│ ✅ Real Schema  │    │ ✅ Auto Sync   │    │ ✅ Auto Sync   │
│ ✅ Real Data    │    │ ✅ Test Data   │    │ ✅ Test Data   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### **Benefits**

✅ **No More Migration Hell** - Schema automatically syncs
✅ **Predictable Testing** - Controlled seed data
✅ **Real-World Accuracy** - Test against actual production schema
✅ **Security Maintained** - No production data exposure
✅ **Zero Maintenance** - Automatic sync, no manual work

### **Configuration**

```toml
# supabase/config.toml
[branches.testing]
auto_sync_schema = true    # Automatic schema sync from main
auto_sync_data = false     # No production data (security)
seed_on_sync = true        # Run seed data after sync

[branches.preview]
auto_sync_schema = true    # Automatic schema sync from main
auto_sync_data = false     # No production data (security)
seed_on_sync = true        # Run seed data after sync
```

## 📊 **Database Environments**

### **Environment Details**

| Environment | Project ID | Schema Source | Data Source | Purpose |
|-------------|------------|---------------|-------------|---------|
| **Testing** | `awylsjqmqhsegvvrkiim` | Auto-sync from Production | Controlled seeds | Development testing |
| **Preview** | `atonfoxqfdfmraucwygt` | Auto-sync from Production | Controlled seeds | Pre-production validation |
| **Production** | `ocqnnyxnqaedarcohywe` | Manual migrations | Real user data | Live system |

### **New Workflow (No More Migrations!)**

1. **Make Schema Changes**: Modify production database directly or via migrations
2. **Automatic Sync**: Testing/preview environments automatically get new schema
3. **Seed Data**: Fresh test data applied automatically
4. **Test & Deploy**: Focus on features, not database management

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

### **2. Feature Branch & Preview**

```bash
# Create and push feature branch
git checkout -b feature/new-feature
git push -u origin feature/new-feature
```

**Automatic Preview Environment:**
- URL: `new-onboarding-2025-git-feature-new-feature-shipdocs-projects.vercel.app`
- Admin: `hr@shipdocs.app`
- Purpose: Test your changes before merging to main

### **3. Production Deployment**

```bash
# Create PR from feature branch to main
gh pr create --base main --title "feat: your feature description"

# After review and testing, merge to main
git checkout main
git merge feature/new-feature
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

### **Simplified Environment**
- Single production Supabase database for all environments
- Production admin account: `hr@shipdocs.app`
- Shared storage buckets
- Consistent environment variables

### **Migration Safety**
- Always test migrations locally first
- Use descriptive migration names
- Include rollback plans for complex changes
- Monitor deployment logs

### **Code Quality**
- Test changes locally with `vercel dev`
- Test on Vercel preview environment
- Get team review before merging to main
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

### **Simplified Pipeline**
- ✅ **Local testing** with production-like environment
- ✅ **Automatic preview** deployments for every branch
- ✅ **Single database** for realistic testing
- ✅ **Streamlined deployments** with Vercel integration

### **Quality Assurance**
- **Local Environment**: Catch issues early with `vercel dev`
- **Preview Environment**: Test on real infrastructure
- **Production Environment**: Stable, tested releases

### **Developer Experience**
- **Simplified Workflow**: Feature branch → Preview → Main
- **Automatic Previews**: Every branch gets a preview URL
- **Realistic Testing**: Same database as production
- **Fast Iteration**: No complex multi-environment pipeline
