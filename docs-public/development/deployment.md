<!-- This documentation has been sanitized for public viewing. Sensitive data has been replaced with placeholders. -->

# Deployment Guide

This guide covers deployment procedures for the Maritime Onboarding System across all environments, from local testing to production deployment.

## 🎯 **Deployment Overview**

The Maritime Onboarding System uses a unified Vercel architecture with a three-tier deployment pipeline:

```
Local Development → Testing Environment → Preview Environment → Production
```

### **Architecture Benefits**
- **Unified Codebase**: Same serverless functions run everywhere
- **Consistent Database**: Supabase PostgreSQL across all environments
- **Automated Deployments**: Git-based deployment triggers
- **Environment Isolation**: Separate databases and configurations

## 🌍 **Environment Configuration**

### **Environment Details**

| Environment | Branch | URL | Database | Purpose |
|-------------|--------|-----|----------|---------|
| **Testing** | `testing` | `your-project.vercel.app` | `YOUR_DEV_PROJECT_ID` | Team review |
| **Preview** | `preview` | `your-project.vercel.app` | `YOUR_TEST_PROJECT_ID` | Final approval |
| **Production** | `main` | `your-domain.com` | `[REMOVED - WRONG PROJECT]` | Live system |

### **Environment Variables**

#### **Common Variables (All Environments)**
```bash
NODE_ENV=production
JWT_SECRET=your-super-secret-jwt-key-change-in-production
MAGIC_LINK_EXPIRY=24h
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
MAILERSEND_API_KEY=mlsn.YOUR_MAILERSEND_API_KEY
EMAIL_FROM=user@example.com
EMAIL_FROM_NAME=Burando Maritime Services
CRON_SECRET=your-cron-secret-key
```

#### **Environment-Specific Variables**

**Testing Environment:**
```bash
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-testing-service-role-key
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-testing-anon-key
BASE_URL=https://your-project.vercel.app
HR_EMAIL=user@example.com
```

**Preview Environment:**
```bash
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-preview-service-role-key
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-preview-anon-key
BASE_URL=https://your-project.vercel.app
HR_EMAIL=user@example.com
```

**Production Environment:**
```bash
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-production-service-role-key
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key
BASE_URL=https://your-domain.com
HR_EMAIL=user@example.com
```

## 🚀 **Deployment Process**

### **Step 1: Local Testing**

```bash
# Ensure local environment works
vercel dev

# Run tests
npm run test:permissions
npm run verify:deployment

# Build production version locally
npm run build
vercel dev --prod
```

### **Step 2: Deploy to Testing**

```bash
# Switch to testing branch
git checkout testing

# Merge your changes (or push directly for small changes)
git merge feature/your-feature
# OR
git push origin testing

# Verify deployment
curl -X GET "https://your-project.vercel.app/api/health"
```

**Testing Environment Verification:**
- [ ] Application loads correctly
- [ ] Admin login works (`user@example.com`)
- [ ] Manager can create crew members
- [ ] Magic links are sent and work
- [ ] Training workflow functions
- [ ] File uploads work
- [ ] Email notifications send
- [ ] Certificate generation works

### **Step 3: Deploy to Preview**

```bash
# After testing approval
git checkout preview
git merge testing
git push origin preview

# Verify deployment
curl -X GET "https://your-project.vercel.app/api/health"
```

**Preview Environment Verification:**
- [ ] Stakeholder review completed
- [ ] All functionality tested
- [ ] Performance acceptable
- [ ] No critical issues found

### **Step 4: Deploy to Production**

```bash
# After preview approval
git checkout main
git merge preview
git push origin main

# Verify deployment
curl -X GET "https://your-domain.com/api/health"
```

**Production Deployment Verification:**
- [ ] All API endpoints responding
- [ ] Database connectivity confirmed
- [ ] Email system functional
- [ ] File upload/download working
- [ ] Cron jobs executing
- [ ] SSL certificate valid
- [ ] Custom domain working

## 🔧 **Vercel Configuration**

### **Project Settings**

The project uses `vercel.json` for configuration:

```json
{
  "version": 2,
  "framework": null,
  "buildCommand": "cd client && npm install --legacy-peer-deps && DISABLE_ESLINT_PLUGIN=true npm run build",
  "outputDirectory": "client/build",
  "installCommand": "npm install",
  "functions": {
    "api/**/*.js": {
      "maxDuration": 60
    }
  },
  "crons": [
    {
      "path": "/api/cron/send-reminders",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/cron/cleanup-expired",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/cron/progress-monitoring",
      "schedule": "0 8 * * *"
    }
  ]
}
```

### **Environment Variables Setup**

#### **Via Vercel Dashboard**
1. Go to Vercel Dashboard → Project → Settings → Environment Variables
2. Add variables for each environment (Production, Preview, Development)
3. Use different values for each environment

#### **Via Vercel CLI**
```bash
# Add environment variable
vercel env add VARIABLE_NAME

# List environment variables
vercel env ls

# Remove environment variable
vercel env rm VARIABLE_NAME

# Pull environment variables to local file
vercel env pull .env.local
```

## 🕐 **Automated Tasks (Cron Jobs)**

### **Scheduled Tasks**
- **Daily Reminders**: 9:00 AM UTC (`0 9 * * *`)
- **Cleanup**: 2:00 AM UTC (`0 2 * * *`)
- **Progress Monitoring**: 8:00 AM UTC (`0 8 * * *`)

### **Cron Job Functions**

1. **Send Reminders** (`/api/cron/send-reminders`)
   - Overdue training notifications
   - Due soon reminders (3 days)
   - Inactive user reminders (7 days)
   - Weekly upcoming deadlines

2. **Cleanup Expired** (`/api/cron/cleanup-expired`)
   - Remove expired magic links
   - Clean old email notifications (30+ days)
   - Delete orphaned files
   - Remove expired quiz sessions

3. **Progress Monitoring** (`/api/cron/progress-monitoring`)
   - Generate weekly reports (Mondays)
   - Send critical alerts
   - Monitor system health
   - Track completion rates

### **Cron Job Security**
```bash
# Set CRON_SECRET in environment variables
CRON_SECRET=your-secure-cron-secret

# Cron jobs verify this secret before executing
```

## 🗄️ **Database Deployment**

### **Migration Strategy**
- **Automatic Migrations**: Applied on deployment
- **Environment Isolation**: Each environment has separate database
- **Migration Files**: Stored in `supabase/migrations/`

### **Migration Process**
1. **Local Development**: Create and test migrations locally
2. **Testing Deployment**: Migrations applied automatically
3. **Preview Deployment**: Migrations applied to preview database
4. **Production Deployment**: Migrations applied to production database

### **Manual Migration (if needed)**
```bash
# Connect to specific environment
supabase link --project-ref environment-project-id

# Apply migrations manually
supabase db push

# Check migration status
supabase migration list
```

## 📧 **Email System Deployment**

### **MailerSend Configuration**
- **API Key**: Same across all environments
- **From Address**: `user@example.com`
- **Domain Verification**: Required for production

### **Email Templates**
- **Templates**: Stored in `services/email-templates/`
- **Deployment**: Templates deployed with application code
- **Testing**: Use different HR emails per environment

## 🔒 **Security Configuration**

### **Environment Security**
- **JWT Secrets**: Different for each environment
- **API Keys**: Secure storage in Vercel environment variables
- **Database Access**: Row Level Security (RLS) enabled
- **CORS**: Configured per environment

### **SSL and Domain Security**
- **SSL Certificates**: Automatically managed by Vercel
- **Custom Domain**: `your-domain.com` for production
- **Security Headers**: Configured in `vercel.json`

## 🧪 **Testing Deployment**

### **Automated Testing**
```bash
# Run deployment tests
npm run test:deployment

# Test API endpoints
npm run test:api

# Test database connectivity
npm run test:database

# Test email functionality
npm run test:email
```

### **Manual Testing Checklist**

#### **Functional Testing**
- [ ] Admin login and dashboard access
- [ ] Manager creation and login
- [ ] Crew member creation and magic link login
- [ ] Training phase progression
- [ ] Quiz taking and review system
- [ ] File upload/download functionality
- [ ] Email notifications delivery
- [ ] PDF certificate generation
- [ ] Cron job execution

#### **Performance Testing**
- [ ] API response times < 2 seconds
- [ ] Page load times < 3 seconds
- [ ] File upload/download speed acceptable
- [ ] Database query performance optimal

#### **Security Testing**
- [ ] Authentication and authorization working
- [ ] File access permissions correct
- [ ] SQL injection protection active
- [ ] XSS protection enabled
- [ ] Rate limiting functional

## 🚨 **Troubleshooting Deployment**

### **Common Issues**

#### **Build Failures**
```bash
# Check build logs
vercel logs

# Test build locally
npm run build

# Clear cache and rebuild
vercel --force
```

#### **Environment Variable Issues**
```bash
# Verify environment variables
vercel env ls

# Check variable values (be careful with secrets)
vercel env pull .env.check
```

#### **Database Connection Issues**
```bash
# Test database connection
node -e "
const { getDatabase } = require('./config/database');
const db = getDatabase();
db.from('users').select('count').limit(1)
  .then(() => console.log('✅ Database connected'))
  .catch(err => console.error('❌ Database error:', err));
"
```

#### **Cron Job Issues**
- Verify `CRON_SECRET` is set correctly
- Check Vercel Pro plan requirement for cron jobs
- Review cron job logs in Vercel dashboard

### **Rollback Procedures**

#### **Quick Rollback**
```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Or rollback to specific commit
git reset --hard previous-commit-hash
git push --force origin main
```

#### **Database Rollback**
```bash
# If migration issues occur
supabase db reset
# Then reapply previous migrations
```

## 📊 **Monitoring and Maintenance**

### **Post-Deployment Monitoring**

#### **Immediate Checks (First 24 Hours)**
- [ ] All API endpoints responding correctly
- [ ] Email system functional
- [ ] File upload/download working
- [ ] Database connectivity stable
- [ ] Cron jobs executing on schedule
- [ ] Error rates within normal limits

#### **Weekly Monitoring**
- [ ] Review weekly progress reports
- [ ] Check system performance metrics
- [ ] Monitor email delivery rates
- [ ] Verify backup procedures
- [ ] Review security logs

#### **Monthly Reviews**
- [ ] Performance optimization analysis
- [ ] Security updates and patches
- [ ] Feature usage analytics
- [ ] User feedback integration
- [ ] Capacity planning review

### **Monitoring Tools**
- **Vercel Dashboard**: Function logs and performance metrics
- **Supabase Dashboard**: Database queries and storage usage
- **MailerSend Dashboard**: Email delivery status and analytics
- **Application Logs**: Custom logging in email notifications table

## 🎯 **Deployment Best Practices**

1. **Always test locally first**: Verify changes work before deploying
2. **Use staging environments**: Test in testing/preview before production
3. **Monitor after deployment**: Watch for errors and performance issues
4. **Have rollback plan**: Know how to quickly revert if needed
5. **Communicate changes**: Inform stakeholders of new features
6. **Update documentation**: Keep deployment docs current
7. **Backup before major changes**: Ensure data safety
8. **Test email functionality**: Verify email delivery in each environment

## 📚 **Related Documentation**

- **[Environment Configuration](../deployment/environments.md)** - Detailed environment setup
- **[Production Deployment](../deployment/production.md)** - Production-specific procedures
- **[Monitoring Guide](../maintenance/monitoring.md)** - System monitoring and alerts
- **[Database Design](../for-developers/architecture/database-design.md)** - Database schema and migrations
