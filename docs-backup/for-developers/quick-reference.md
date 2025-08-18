# Developer Quick Reference Guide

## 🚀 **Daily Development Commands**

### **Setup (First Time)**
```bash
# Clone and setup
git clone https://github.com/shipdocs/new-onboarding-2025.git
cd new-onboarding-2025

# Install dependencies and build
project install    # alias for: npm install && npm run build

# Link to Vercel and Supabase
vercel link
supabase link --project-ref ocqnnyxnqaedarcohywe
```

### **Daily Workflow**
```bash
# Start development server
project run         # alias for: vercel dev

# After React changes
project update      # alias for: npm run build

# Database operations
supabase db pull    # sync schema from remote
supabase db reset   # reset local database
```

## 🌐 **Environment URLs**

| Environment | URL | Purpose |
|-------------|-----|---------|
| **Local** | http://localhost:3000 | Development |
| **Testing** | https://new-onboarding-2025-env-testing-shipdocs-projects.vercel.app | Team testing |
| **Preview** | https://new-onboarding-2025-git-preview-shipdocs-projects.vercel.app | Final approval |
| **Production** | https://onboarding.burando.online | Live system |

## 🔐 **Authentication Credentials**

### **Admin Access**
- **Email**: `adminmartexx@shipdocs.app`
- **Password**: `Yumminova21!@#`
- **Role**: Full system access

### **Test Users**
- **Manager**: `manager@shipdocs.app` (magic link)
- **Crew**: `crew.test@shipdocs.app` (magic link)
- **Demo**: `demo.crew@shipdocs.app` (magic link)

## 📊 **Database Quick Reference**

### **Key Tables**
```sql
-- Users (BIGSERIAL id)
SELECT * FROM users WHERE role = 'admin';

-- PDF Templates (BIGSERIAL id - NOT UUID!)
SELECT id, name FROM pdf_templates;

-- Training Sessions
SELECT * FROM training_sessions WHERE user_id = 1;

-- Magic Links (for debugging auth)
SELECT token, email, expires_at FROM magic_links WHERE used_at IS NULL;
```

### **Common Queries**
```sql
-- Check admin user
SELECT id, email, role, is_active FROM users WHERE email = 'adminmartexx@shipdocs.app';

-- List all templates
SELECT id, name, created_by FROM pdf_templates ORDER BY id;

-- Check training progress
SELECT u.email, ts.phase, ts.status FROM users u 
JOIN training_sessions ts ON u.id = ts.user_id;

-- Clear test data
TRUNCATE TABLE magic_links, training_sessions CASCADE;
```

## 🔧 **API Endpoints**

### **Templates**
```bash
# List templates
GET /api/templates

# Get specific template
GET /api/templates/1

# Update template
PUT /api/templates/1
{
  "name": "New Template Name",
  "fields": [...],
  "metadata": {...}
}

# Create template
POST /api/templates
{
  "name": "Template Name",
  "description": "Description"
}
```

### **Authentication**
```bash
# Admin login
POST /api/auth/admin/login
{
  "email": "admin@yourdomain.com",
  "password": "your-secure-password"
}

# Magic link request
POST /api/auth/magic-link
{
  "email": "manager@shipdocs.app"
}
```

## 🐛 **Debugging Guide**

### **Common Issues & Solutions**

**Migration Failures**
```bash
# Check migration status
supabase db pull --debug

# View migration logs
# Go to Supabase Dashboard → Settings → Database → Migrations

# Reset and retry
supabase db reset
git pull origin testing
```

**API 500 Errors**
```bash
# Check Vercel logs
vercel logs --follow

# Local debugging
# Add console.log statements to API routes
# Check browser Network tab for request details
```

**Authentication Issues**
```sql
-- Verify user exists
SELECT * FROM users WHERE email = 'your-email@example.com';

-- Check magic link
SELECT * FROM magic_links WHERE email = 'your-email@example.com' 
ORDER BY created_at DESC LIMIT 1;

-- Reset admin password
UPDATE users SET password_hash = '$2a$10$tDXZvzVF95Xib/.X9rlV1.Hjgi8NS5yNc3J4KhHKqMtyNVs/KUg4.' 
WHERE email = 'adminmartexx@shipdocs.app';
```

**Template Issues**
```sql
-- Check template structure
SELECT id, name, fields, metadata FROM pdf_templates WHERE id = 1;

-- Verify ownership
SELECT pt.id, pt.name, u.email FROM pdf_templates pt 
JOIN users u ON pt.created_by = u.id;
```

### **Debug Tools**
```javascript
// API route debugging
console.log('🔧 API called:', { method: req.method, url: req.url });
console.log('📝 Request body:', req.body);
console.log('👤 User:', req.user);

// Frontend debugging
console.log('📊 Template data:', templateData);
console.log('🔄 API response:', response);
```

## 📁 **File Structure**

```
new-onboarding-2025/
├── api/                    # Vercel API routes
│   ├── auth/              # Authentication endpoints
│   ├── templates/         # PDF template CRUD
│   └── training/          # Training system
├── client/                # React frontend
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Page components
│   │   └── services/      # API service layer
│   └── build/             # Built React app
├── docs/                  # Documentation
├── lib/                   # Shared utilities
├── supabase/
│   ├── migrations/        # Database migrations
│   ├── seed.sql          # Test data
│   └── config.toml       # Supabase configuration
└── scripts/              # Utility scripts
```

## 🔄 **Git Workflow**

### **Feature Development**
```bash
# Create feature branch
git checkout main
git pull origin main
git checkout -b feature/your-feature-name

# Development cycle
# ... make changes ...
git add .
git commit -m "feat: descriptive commit message"

# Push to testing for review
git push origin feature/your-feature-name:testing

# After approval, merge to main
git checkout main
git merge feature/your-feature-name
git push origin main
```

### **Hotfixes**
```bash
# Quick fixes can go directly to testing
git checkout testing
git pull origin testing
# ... make fix ...
git add .
git commit -m "fix: urgent issue description"
git push origin testing
```

## 📋 **Environment Variables**

### **Required Variables**
```env
# Supabase
SUPABASE_URL=https://ocqnnyxnqaedarcohywe.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Authentication
JWT_SECRET=your-secret-key

# Email
MAILERSEND_API_TOKEN=mlsn...
ENABLE_REAL_EMAILS=true

# Environment
NODE_ENV=development|testing|preview|production
```

### **Setting Variables**
```bash
# Vercel CLI
vercel env add VARIABLE_NAME

# Or via Vercel Dashboard
# Project Settings → Environment Variables
```

## 🎯 **Testing Checklist**

### **Before Pushing to Testing**
- [ ] Local development server works (`project run`)
- [ ] No console errors in browser
- [ ] API endpoints respond correctly
- [ ] Database queries work as expected
- [ ] Authentication flows work

### **After Deployment to Testing**
- [ ] Check deployment logs in Vercel
- [ ] Verify migration logs in Supabase
- [ ] Test critical user flows
- [ ] Check for any 500 errors
- [ ] Verify new features work as expected

## 📞 **Getting Help**

### **Resources**
- **Documentation**: `/docs` folder
- **Supabase Dashboard**: https://supabase.com/dashboard
- **Vercel Dashboard**: https://vercel.com/dashboard
- **GitHub Issues**: For bug reports and feature requests

### **Emergency Contacts**
- **Database Issues**: Check Supabase dashboard first
- **Deployment Issues**: Check Vercel logs
- **Authentication Issues**: Verify user exists in database

---

*Keep this guide handy for quick reference during development. Updated as of May 30, 2025.*
