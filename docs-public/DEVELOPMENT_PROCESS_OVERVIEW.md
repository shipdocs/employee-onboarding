<!-- This documentation has been sanitized for public viewing. Sensitive data has been replaced with placeholders. -->

# Maritime Onboarding Development Process Overview

## 🚀 **Current Architecture**

### **Technology Stack**
- **Frontend**: React (client/src) with Vercel deployment
- **Backend**: Vercel API routes (api/) with Supabase database
- **Database**: Supabase PostgreSQL with Row Level Security (RLS)
- **Authentication**: Magic link system via email
- **Storage**: Supabase Storage for file uploads and PDF backgrounds

### **Environment Structure**
```
localhost (vercel dev) → testing → preview → main/production
```

**Environment URLs:**
- **Testing**: https://new-onboarding-2025-env-testing-shipdocs-projects.vercel.app
- **Preview**: https://your-project.vercel.app  
- **Production**: https://your-domain.com

## 📊 **Database Migration System**

### **Current Migration Files**
```
supabase/migrations/
├── 20250130000000_create_complete_schema.sql    # Base schema (ALL tables)
├── 20250528160800_ensure_admin_user.sql         # Admin user creation
├── 20250528161500_fix_admin_password.sql        # Password hash fix
└── 20250529064500_fix_pdf_templates_rls.sql     # RLS policies
```

### **Migration Workflow**
1. **Schema Changes**: Add new migration file with timestamp
2. **Testing**: Deploy to testing branch triggers auto-migration
3. **Verification**: Check migration logs in Supabase dashboard
4. **Promotion**: Merge to preview → main for production

### **Key Tables Structure**
```sql
users (BIGSERIAL id)           # Admin, Manager, Crew users
pdf_templates (BIGSERIAL id)   # Template definitions with JSONB fields
training_sessions              # User training progress
quiz_results                   # Quiz scores and answers
magic_links                    # Authentication tokens
audit_log                      # System activity tracking
```

## 🔄 **Development Workflow**

### **Daily Development**
```bash
# Setup (first time)
project install    # npm install && npm build

# Daily development
project run         # vercel dev (localhost:3000)

# After React changes
project update      # npm run build
```

### **Feature Development Process**
1. **Create Feature Branch**: `git checkout -b feature/feature-name`
2. **Local Development**: Use `vercel dev` with Supabase database
3. **Testing**: Push to testing branch for team review
4. **Preview**: Merge to preview for final approval
5. **Production**: Merge to main for live deployment

### **Authentication Testing**
- **Admin**: `user@example.com` / `YOUR_ADMIN_PASSWORD`
- **Manager**: Use magic link system via `/manager/login`
- **Crew**: Use magic link system via `/login`

## 🚨 **Migration Hell: Lessons Learned**

### **What Went Wrong**
1. **Missing Base Schema**: The main schema migration was accidentally lost during branch merges
2. **Invalid Config**: Supabase config had unsupported `[branches]` configuration
3. **Branch Divergence**: Feature branches weren't properly merged to main
4. **Function Dependencies**: Seed files had complex functions that failed

### **Root Cause Analysis**
```
Timeline of Issues:
├── 36a3ed6: Base schema created on feature branch ✅
├── 722b199: Documentation refactor on main (schema never merged) ❌
├── 27f3f16: "Hybrid sync" system added (config issues) ❌
└── Today: Schema restored and config fixed ✅
```

### **Solutions Applied**
1. **Schema Recovery**: Restored `20250130000000_create_complete_schema.sql` from feature branch
2. **Config Fix**: Removed unsupported `[branches]` configuration
3. **Seed Simplification**: Replaced complex functions with direct SQL
4. **Database Reset**: Clean slate approach for testing environment

## 🛠️ **Current Development Guidelines**

### **Migration Best Practices**
- ✅ **Always use timestamps**: `YYYYMMDDHHMMSS_description.sql`
- ✅ **Test locally first**: Verify migrations work before pushing
- ✅ **Use IF NOT EXISTS**: Make migrations idempotent
- ✅ **Keep it simple**: Avoid complex functions in migrations
- ✅ **Document changes**: Clear commit messages explaining what and why

### **Branch Management**
- ✅ **Feature branches**: Always branch from main
- ✅ **Merge properly**: Don't leave important changes on feature branches
- ✅ **Test thoroughly**: Use testing environment before preview/production
- ✅ **Clean history**: Squash commits when merging features

### **Database Schema Rules**
- ✅ **Use BIGSERIAL**: For primary keys (not UUID for templates)
- ✅ **Enable RLS**: Row Level Security for all user tables
- ✅ **Index properly**: Add indexes for performance
- ✅ **JSONB for flexibility**: Use JSONB for dynamic data (template fields, metadata)

## 🔧 **Troubleshooting Guide**

### **Common Issues**

**Migration Failures**
```bash
# Check migration status
supabase db pull --debug

# Reset local database
supabase db reset

# Apply specific migration
supabase migration up --include-all
```

**Authentication Issues**
```bash
# Check user exists
SELECT * FROM users WHERE email = 'user@example.com';

# Reset password hash
UPDATE users SET password_hash = '$2a$10$...' WHERE email = 'admin@example.com';
```

**API Debugging**
```bash
# Check Vercel logs
vercel logs --follow

# Local API testing
curl http://localhost:3000/api/templates
```

### **Environment Variables**
```env
# Required for all environments
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
JWT_SECRET=your-secret-key

# Email configuration
MAILERSEND_API_TOKEN=mlsn...
ENABLE_REAL_EMAILS=true/false
```

## 📋 **Current Status & Next Steps**

### **✅ What's Working**
- Complete database schema with all tables
- Admin authentication system
- PDF template editor with real-time name editing
- Magic link authentication for managers/crew
- Proper migration system with clean workflow

### **🔄 In Progress**
- PDF template name editing feature testing
- Certificate generation system
- Training progress tracking

### **📝 Technical Debt**
- Remove unused migration files from early development
- Standardize error handling across API routes
- Improve TypeScript coverage
- Add comprehensive test suite

## 🎯 **Key Takeaways for New Developers**

1. **Always test migrations locally** before pushing to testing
2. **Use the testing environment** extensively - it's there for a reason
3. **Keep migrations simple** - complex logic belongs in application code
4. **Document everything** - especially when dealing with database changes
5. **Follow the branch workflow** - testing → preview → main
6. **Check Supabase logs** when things go wrong
7. **Use the debug tools** we've built (console logs, API debugging)

## 📞 **Getting Help**

- **Migration Issues**: Check `supabase/migrations/` and Supabase dashboard
- **API Problems**: Use browser dev tools and Vercel logs
- **Authentication**: Verify user exists in database and check JWT tokens
- **Frontend Issues**: Check React console and network tab

---

*This document reflects the current state as of May 30, 2025, after resolving the migration hell and establishing a stable development workflow.*
