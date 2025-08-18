<!-- This documentation has been sanitized for public viewing. Sensitive data has been replaced with placeholders. -->

# Deployment Environments

The Maritime Onboarding System uses a four-tier deployment pipeline to ensure code quality, thorough testing, and safe production deployments.

## Environment Overview

### Environment Tiers

1. **Local Development** - Developer workstations
2. **Testing Environment** - Team review and integration testing
3. **Preview Environment** - Final approval before production
4. **Production Environment** - Live system

Each environment serves a specific purpose in the development and deployment workflow.

## Environment Details

### Local Development

**Purpose**: Individual developer workstations for active development

**Characteristics**:
- Uses production database in read-only mode (for safety)
- Hot module reloading for rapid development
- Full debugging capabilities
- Mock external services available

**Configuration**:
```bash
# .env.local
NODE_ENV=development
VITE_API_URL=http://localhost:3000/api
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
DATABASE_READ_ONLY=true
```

**Access**:
- URL: `http://localhost:3000`
- Database: Production (read-only)
- External Services: Mocked or sandboxed

**Usage**:
```bash
# Start local development
vercel dev

# Or with npm
npm run dev
```

### Testing Environment

**Purpose**: Integration testing and team review

**Characteristics**:
- Automated deployment from `testing` branch
- Separate test database with sample data
- Full functionality testing
- Performance monitoring enabled

**Configuration**:
```bash
# Vercel environment variables
NODE_ENV=testing
VITE_API_URL=https://your-project.vercel.app/api
SUPABASE_URL=https://test-xxx.supabase.co
ENABLE_DEBUG_LOGGING=true
```

**Access**:
- URL: `https://your-project.vercel.app`
- Database: Testing database
- External Services: Sandbox versions

**Deployment**:
```bash
# Deploy to testing
git checkout testing
git merge feature/your-feature
git push origin testing
# Automatic deployment triggered
```

### Preview Environment

**Purpose**: Final validation before production deployment

**Characteristics**:
- Mirrors production configuration
- Uses production-like database
- Full security enabled
- Performance optimizations active

**Configuration**:
```bash
# Vercel environment variables
NODE_ENV=preview
VITE_API_URL=https://your-project.vercel.app/api
SUPABASE_URL=https://preview-xxx.supabase.co
ENABLE_ANALYTICS=true
```

**Access**:
- URL: `https://your-project.vercel.app`
- Database: Preview database (production clone)
- External Services: Production-ready configurations

**Deployment**:
```bash
# Deploy to preview
git checkout preview
git merge testing
git push origin preview
# Automatic deployment triggered
```

### Production Environment

**Purpose**: Live system serving end users

**Characteristics**:
- Fully optimized and minified code
- Production database with live data
- All security measures active
- Monitoring and alerting enabled
- Automated backups running

**Configuration**:
```bash
# Vercel environment variables
NODE_ENV=production
VITE_API_URL=https://api.your-domain.com
SUPABASE_URL=https://prod-xxx.supabase.co
ENABLE_ERROR_TRACKING=true
ENABLE_PERFORMANCE_MONITORING=true
```

**Access**:
- URL: `https://your-domain.com`
- Database: Production database
- External Services: Production services

**Deployment**:
```bash
# Deploy to production (requires approval)
vercel --prod

# Or via Git
git checkout main
git merge preview
git push origin main
# Manual approval required in Vercel dashboard
```

## Environment Variables

### Common Variables

All environments share these core variables:
```env
# Supabase Configuration
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Authentication
JWT_SECRET=

# Email Service
MAILERSEND_API_KEY=
EMAIL_FROM=noreply@your-domain.com
EMAIL_FROM_NAME=Maritime Onboarding

# Storage
STORAGE_BUCKET=certificates
```

### Environment-Specific Variables

#### Development Only
```env
# Development tools
VITE_ENABLE_DEVTOOLS=true
VITE_API_MOCK=true
DATABASE_READ_ONLY=true
```

#### Testing Only
```env
# Testing features
ENABLE_TEST_ENDPOINTS=true
ENABLE_DEBUG_LOGGING=true
TEST_USER_BYPASS=true
```

#### Preview Only
```env
# Preview features
ENABLE_PREVIEW_FEATURES=true
ENABLE_PERFORMANCE_PROFILING=true
```

#### Production Only
```env
# Production features
ENABLE_ERROR_TRACKING=true
SENTRY_DSN=
ENABLE_ANALYTICS=true
GA_TRACKING_ID=
ENABLE_RATE_LIMITING=true
ENABLE_WAF=true
```

## Database Configuration

### Database Tiers

| Environment | Database | Purpose | Data |
|------------|----------|---------|------|
| Local | Production (RO) | Development | Live (read-only) |
| Testing | Separate Test DB | Integration Testing | Test data |
| Preview | Preview DB | Final Validation | Production snapshot |
| Production | Production DB | Live System | Live data |

### Database URLs
```env
# Local (read-only connection string)
DATABASE_URL=postgresql://readonly_user@db.supabase.co:5432/postgres

# Testing
DATABASE_URL=postgresql://test_user@test-db.supabase.co:5432/postgres

# Preview
DATABASE_URL=postgresql://preview_user@preview-db.supabase.co:5432/postgres

# Production
DATABASE_URL=postgresql://prod_user@prod-db.supabase.co:5432/postgres
```

## Deployment Pipeline

### Continuous Integration

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [testing, preview, main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Build
        run: npm run build
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

### Deployment Flow

1. **Feature Development**
   ```
   feature/branch → local development → PR to testing
   ```

2. **Testing Deployment**
   ```
   PR approved → merge to testing → auto-deploy → QA testing
   ```

3. **Preview Deployment**
   ```
   Testing passed → merge to preview → auto-deploy → UAT
   ```

4. **Production Deployment**
   ```
   Preview approved → merge to main → manual approval → deploy
   ```

## Environment Promotion

### Promotion Checklist

#### Testing → Preview
- [ ] All tests passing
- [ ] No critical bugs
- [ ] Performance benchmarks met
- [ ] Security scan passed
- [ ] Code review completed

#### Preview → Production
- [ ] UAT sign-off received
- [ ] Database migrations tested
- [ ] Rollback plan prepared
- [ ] Monitoring alerts configured
- [ ] Team notified of deployment

### Promotion Commands
```bash
# Promote testing to preview
git checkout preview
git merge testing --no-ff
git push origin preview

# Promote preview to production
git checkout main
git merge preview --no-ff
git push origin main
# Then approve in Vercel dashboard
```

## Rollback Procedures

### Quick Rollback
```bash
# In Vercel dashboard
# 1. Go to Deployments
# 2. Find previous stable deployment
# 3. Click "..." menu
# 4. Select "Promote to Production"

# Or via CLI
vercel rollback [deployment-url]
```

### Database Rollback
```bash
# Revert migration
supabase db reset --db-url $PRODUCTION_DATABASE_URL

# Restore from backup
supabase db restore --backup-id [backup-id]
```

## Monitoring

### Environment Health Checks

All environments expose health endpoints:
```bash
# Check environment health
curl https://[environment-url]/api/health

# Response
{
  "status": "healthy",
  "environment": "production",
  "version": "1.2.3",
  "timestamp": "2025-01-15T10:00:00Z"
}
```

### Environment-Specific Monitoring

#### Local Development
- Console logging
- React Developer Tools
- Network tab monitoring

#### Testing Environment
- Basic error tracking
- Performance timing logs
- API response monitoring

#### Preview Environment
- Full error tracking
- Performance profiling
- User session recording

#### Production Environment
- Real-time error tracking (Sentry)
- Performance monitoring (Web Vitals)
- Uptime monitoring (Pingdom)
- Custom business metrics

## Security Considerations

### Environment Isolation
- Separate databases for each environment
- Environment-specific API keys
- Isolated storage buckets
- Separate authentication secrets

### Access Control
| Environment | Who Has Access | Authentication |
|------------|---------------|----------------|
| Local | Developers | Local machine |
| Testing | Dev team | GitHub + Vercel |
| Preview | Dev + QA teams | GitHub + Vercel |
| Production | Ops team only | MFA required |

### Secret Management
```bash
# Add secret to Vercel
vercel secrets add my-secret-name secret-value

# Use in environment
vercel env add MY_ENV_VAR --secret my-secret-name

# Environment-specific secrets
vercel env add API_KEY --secret api-key-testing --environment testing
vercel env add API_KEY --secret api-key-production --environment production
```

## Troubleshooting

### Common Issues

#### Environment Variables Not Loading
```bash
# Verify environment variables
vercel env pull
cat .env.local

# Force reload
vercel dev --force
```

#### Database Connection Issues
```bash
# Test database connection
node -e "require('./lib/supabase').supabase.from('users').select('count').then(console.log)"

# Check connection string
echo $DATABASE_URL | sed 's/:[^:]*@/:***@/'
```

#### Deployment Failures
```bash
# Check deployment logs
vercel logs [deployment-url]

# Verify build locally
npm run build
npm run start
```

## Best Practices

### Environment Management
1. **Never** commit environment files (`.env*`)
2. **Always** use environment-specific configurations
3. **Regularly** sync environment variables
4. **Document** all environment changes
5. **Test** in lower environments first

### Deployment Guidelines
1. Deploy during low-traffic periods
2. Monitor deployments in real-time
3. Have rollback plan ready
4. Communicate deployment schedules
5. Document deployment outcomes

### Security Guidelines
1. Rotate secrets regularly
2. Use different secrets per environment
3. Limit production access
4. Audit environment access
5. Monitor for unauthorized changes

## Related Documentation
- [Vercel Deployment](./vercel.md) - Detailed Vercel configuration
- [Supabase Setup](./supabase.md) - Database environment setup
- [Production Deployment](./production.md) - Production-specific procedures
- [Development Workflow](../development/workflow.md) - Development process