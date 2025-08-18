# Production Deployment Guide

This guide provides comprehensive instructions for deploying and maintaining the Maritime Onboarding System in a production environment, including pre-deployment checklist, deployment procedures, monitoring, and incident response.

## Production Environment Overview

### Infrastructure
- **Hosting**: Vercel (serverless functions + static hosting)
- **Database**: Supabase PostgreSQL (managed)
- **File Storage**: Supabase Storage
- **CDN**: Vercel Edge Network
- **Email**: MailerSend
- **Domain**: onboarding.burando.online

### Production URLs
- **Application**: https://onboarding.burando.online
- **API**: https://onboarding.burando.online/api
- **Database**: Production Supabase instance
- **Monitoring**: Vercel Analytics + Custom dashboards

## Pre-Deployment Checklist

### Code Quality
- [ ] All tests passing (`npm test`)
- [ ] No ESLint errors (`npm run lint`)
- [ ] Build succeeds (`npm run build`)
- [ ] No console.log statements in production code
- [ ] Error handling implemented for all edge cases
- [ ] Performance benchmarks met

### Security Review
- [ ] Security audit completed
- [ ] Dependencies updated (no vulnerabilities)
- [ ] Environment variables secured
- [ ] API endpoints protected with authentication
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] Security headers implemented

### Database
- [ ] Migrations tested in preview environment
- [ ] Database backup completed
- [ ] Rollback plan documented
- [ ] Indexes optimized
- [ ] RLS policies verified
- [ ] Connection pooling configured

### Infrastructure
- [ ] SSL certificate active
- [ ] Custom domain configured
- [ ] CDN caching rules set
- [ ] Error tracking enabled
- [ ] Monitoring alerts configured
- [ ] Backup automation verified

### Documentation
- [ ] Deployment notes prepared
- [ ] Change log updated
- [ ] API documentation current
- [ ] Runbook updated
- [ ] Team notified of deployment

## Deployment Process

### 1. Pre-Deployment Steps

#### Create Deployment Branch
```bash
# Create release branch
git checkout -b release/v1.2.3
git merge preview

# Update version
npm version patch # or minor/major

# Commit version bump
git add package.json package-lock.json
git commit -m "chore: bump version to v1.2.3"
```

#### Final Testing
```bash
# Run full test suite
npm run test:all

# Build production bundle
npm run build

# Test production build locally
npm run preview
```

#### Database Backup
```bash
# Create pre-deployment backup
pg_dump $PRODUCTION_DATABASE_URL > backups/pre-deploy-$(date +%Y%m%d-%H%M%S).sql

# Verify backup
pg_restore --list backups/pre-deploy-*.sql | head -20
```

### 2. Deployment Execution

#### Deploy to Production
```bash
# Option 1: Via Vercel CLI
vercel --prod

# Option 2: Via Git (recommended)
git checkout main
git merge release/v1.2.3 --no-ff
git push origin main

# Deployment automatically triggered
```

#### Monitor Deployment
1. Watch deployment progress in Vercel dashboard
2. Check build logs for any warnings
3. Verify deployment URL before promotion
4. Test critical paths on preview URL

#### Promote to Production
In Vercel Dashboard:
1. Go to Deployments
2. Find the successful deployment
3. Click "Promote to Production"
4. Confirm promotion

### 3. Post-Deployment Verification

#### Health Checks
```bash
# API health check
curl https://onboarding.burando.online/api/health

# Application load test
curl -I https://onboarding.burando.online

# Database connectivity
curl https://onboarding.burando.online/api/auth/verify
```

#### Smoke Tests
Run critical user flows:
1. Admin login
2. Manager creates crew member
3. Crew member receives magic link
4. Training workflow completion
5. Certificate generation
6. File upload functionality

#### Monitoring Verification
- Check error tracking dashboard
- Verify analytics are recording
- Confirm alerts are working
- Review initial performance metrics

### 4. Rollback Procedures

#### Immediate Rollback
If critical issues detected:

```bash
# Via Vercel Dashboard
1. Go to Deployments
2. Find previous stable deployment
3. Click "..." → "Promote to Production"

# Via CLI
vercel rollback [previous-deployment-url]
```

#### Database Rollback
```bash
# If database migration failed
psql $PRODUCTION_DATABASE_URL < backups/pre-deploy-[timestamp].sql

# Verify rollback
psql $PRODUCTION_DATABASE_URL -c "SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1"
```

## Production Configuration

### Environment Variables
```env
# Core Configuration
NODE_ENV=production
VITE_API_URL=https://onboarding.burando.online/api
VITE_APP_URL=https://onboarding.burando.online

# Database
SUPABASE_URL=https://prod-xxx.supabase.co
SUPABASE_ANON_KEY=prod-anon-key
SUPABASE_SERVICE_ROLE_KEY=prod-service-key

# Security
JWT_SECRET=production-jwt-secret
RATE_LIMIT_ENABLED=true
CORS_ORIGIN=https://onboarding.burando.online

# Services
MAILERSEND_API_KEY=prod-mailersend-key
SENTRY_DSN=https://xxx@sentry.io/xxx

# Features
ENABLE_ERROR_TRACKING=true
ENABLE_ANALYTICS=true
ENABLE_PERFORMANCE_MONITORING=true
```

### Security Headers
```javascript
// vercel.json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=63072000; includeSubDomains; preload"
        },
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline' https://vercel.live; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://*.supabase.co https://api.mailersend.com"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "camera=(), microphone=(), geolocation=(), payment=()"
        }
      ]
    }
  ]
}
```

### Rate Limiting
```javascript
// Rate limit configuration
const rateLimits = {
  // Authentication endpoints - strict limits
  '/api/auth/*': {
    windowMs: 60 * 1000, // 1 minute
    max: 5,
    skipSuccessfulRequests: false
  },
  
  // API endpoints - standard limits
  '/api/*': {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    skipSuccessfulRequests: true
  },
  
  // Upload endpoints - relaxed limits
  '/api/upload/*': {
    windowMs: 60 * 1000, // 1 minute
    max: 10,
    skipSuccessfulRequests: true
  }
};
```

## Monitoring and Observability

### Real-time Monitoring

#### Application Metrics
Monitor via Vercel Analytics:
- Page load times
- API response times
- Error rates
- Traffic patterns
- Core Web Vitals

#### Custom Metrics
```javascript
// Track business metrics
async function trackBusinessMetric(metric, value, tags = {}) {
  if (process.env.NODE_ENV === 'production') {
    await fetch('/api/metrics', {
      method: 'POST',
      body: JSON.stringify({
        metric,
        value,
        tags,
        timestamp: new Date().toISOString()
      })
    });
  }
}

// Usage
trackBusinessMetric('certificate.generated', 1, {
  type: 'standard',
  userId: user.id
});
```

### Error Tracking

#### Sentry Configuration
```javascript
// lib/errorTracking.js
import * as Sentry from '@sentry/node';

if (process.env.NODE_ENV === 'production') {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: 'production',
    tracesSampleRate: 0.1,
    beforeSend(event) {
      // Sanitize sensitive data
      if (event.request) {
        delete event.request.cookies;
        delete event.request.headers?.authorization;
      }
      return event;
    }
  });
}

export function captureError(error, context = {}) {
  console.error('Error:', error);
  
  if (process.env.NODE_ENV === 'production') {
    Sentry.captureException(error, {
      extra: context
    });
  }
}
```

### Health Checks

#### Automated Health Monitoring
```javascript
// api/health/detailed.js
export default async function handler(req, res) {
  const checks = {
    api: 'healthy',
    database: 'unknown',
    storage: 'unknown',
    email: 'unknown'
  };
  
  // Database check
  try {
    const { error } = await supabase.from('users').select('count').limit(1);
    checks.database = error ? 'unhealthy' : 'healthy';
  } catch (e) {
    checks.database = 'unhealthy';
  }
  
  // Storage check
  try {
    const { error } = await supabase.storage.from('certificates').list('', { limit: 1 });
    checks.storage = error ? 'unhealthy' : 'healthy';
  } catch (e) {
    checks.storage = 'unhealthy';
  }
  
  // Email service check
  try {
    // Implement email service health check
    checks.email = 'healthy';
  } catch (e) {
    checks.email = 'unhealthy';
  }
  
  const overall = Object.values(checks).every(status => status === 'healthy') 
    ? 'healthy' 
    : 'degraded';
  
  res.status(overall === 'healthy' ? 200 : 503).json({
    status: overall,
    checks,
    timestamp: new Date().toISOString()
  });
}
```

### Alerting

#### Alert Configuration
Set up alerts for:
- API error rate > 1%
- Response time > 3 seconds
- Database connection failures
- Storage quota > 80%
- Failed deployments
- Security violations

#### Alert Channels
1. **Email**: Critical alerts to ops team
2. **Slack**: All alerts to #ops channel
3. **PagerDuty**: Critical production issues
4. **Dashboard**: Real-time status page

## Performance Optimization

### Frontend Optimization
```javascript
// vite.config.js production optimizations
export default {
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@heroicons/react', 'react-hot-toast'],
          'chart-vendor': ['recharts'],
          'utils': ['date-fns', 'zod']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
};
```

### API Optimization
```javascript
// Implement caching for expensive operations
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getCachedData(key, fetcher) {
  const cached = cache.get(key);
  
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }
  
  const data = await fetcher();
  cache.set(key, {
    data,
    expires: Date.now() + CACHE_TTL
  });
  
  return data;
}
```

### Database Optimization
```sql
-- Regular maintenance tasks
-- Run during low-traffic periods

-- Update statistics
ANALYZE;

-- Vacuum tables
VACUUM ANALYZE users;
VACUUM ANALYZE training_sessions;
VACUUM ANALYZE certificates;

-- Reindex if needed
REINDEX INDEX CONCURRENTLY idx_users_email;
REINDEX INDEX CONCURRENTLY idx_training_sessions_user;
```

## Security Measures

### Access Control
1. **Production access limited** to operations team
2. **MFA required** for all production access
3. **Audit logging** for all administrative actions
4. **Regular access reviews** (quarterly)

### Secret Management
```bash
# Rotate secrets quarterly
# 1. Generate new secret
openssl rand -base64 32

# 2. Update in Vercel
vercel env add JWT_SECRET_NEW production

# 3. Deploy with both secrets
# 4. Update code to use new secret
# 5. Remove old secret after verification
```

### Security Monitoring
- Failed login attempts tracking
- Unusual activity detection
- API abuse monitoring
- File upload scanning
- Regular security scans

## Backup and Disaster Recovery

### Backup Schedule
- **Database**: Daily automated, 30-day retention
- **Files**: Daily incremental, weekly full
- **Configuration**: Version controlled in Git
- **Secrets**: Encrypted backup in secure vault

### Recovery Procedures

#### Database Recovery
```bash
# List available backups
supabase db backups list

# Restore specific backup
supabase db backups restore [backup-id]

# Manual restore
psql $DATABASE_URL < backups/daily-backup.sql
```

#### Application Recovery
```bash
# Redeploy last known good version
vercel deploy [last-good-deployment-url] --prod

# Or rebuild from Git
git checkout [last-good-commit]
vercel --prod
```

### RTO/RPO Targets
- **RTO** (Recovery Time Objective): 1 hour
- **RPO** (Recovery Point Objective): 24 hours
- **Uptime SLA**: 99.9% (allows 8.76 hours downtime/year)

## Maintenance Procedures

### Scheduled Maintenance

#### Weekly Tasks
- Review error logs
- Check disk usage
- Monitor performance trends
- Update dependencies (security patches)

#### Monthly Tasks
- Full system backup verification
- Security audit
- Performance optimization review
- Update documentation

#### Quarterly Tasks
- Disaster recovery drill
- Security assessment
- Capacity planning
- Secret rotation

### Emergency Maintenance

#### Communication Plan
1. Update status page immediately
2. Notify users via email/in-app banner
3. Post updates every 30 minutes
4. Full post-mortem within 48 hours

#### Maintenance Mode
```javascript
// Enable maintenance mode
vercel env add MAINTENANCE_MODE true production

// Maintenance page middleware
export function maintenanceMode(req, res, next) {
  if (process.env.MAINTENANCE_MODE === 'true') {
    return res.status(503).json({
      error: 'System maintenance in progress',
      message: 'We\'ll be back shortly. Thank you for your patience.'
    });
  }
  next();
}
```

## Incident Response

### Severity Levels
- **SEV1**: Complete outage, data loss risk
- **SEV2**: Major functionality broken
- **SEV3**: Minor feature issues
- **SEV4**: Cosmetic issues

### Response Times
- **SEV1**: Immediate (page oncall)
- **SEV2**: Within 1 hour
- **SEV3**: Within 4 hours
- **SEV4**: Next business day

### Incident Procedure
1. **Detect**: Monitoring alert or user report
2. **Assess**: Determine severity and impact
3. **Communicate**: Update status page and stakeholders
4. **Mitigate**: Apply temporary fix if possible
5. **Resolve**: Implement permanent solution
6. **Review**: Post-mortem and prevention measures

### Post-Mortem Template
```markdown
# Incident Post-Mortem: [Date]

## Summary
Brief description of what happened

## Timeline
- HH:MM - Event started
- HH:MM - Event detected
- HH:MM - Response began
- HH:MM - Resolution applied
- HH:MM - Full recovery

## Root Cause
Technical explanation of the root cause

## Impact
- Users affected: X
- Duration: Y minutes
- Data loss: None/Description

## Resolution
Steps taken to resolve

## Lessons Learned
What we learned from this incident

## Action Items
- [ ] Preventive measure 1
- [ ] Preventive measure 2
- [ ] Process improvement
```

## Production Readiness Checklist

### Launch Checklist
- [ ] Load testing completed
- [ ] Security audit passed
- [ ] Backup procedures tested
- [ ] Monitoring configured
- [ ] Documentation complete
- [ ] Team trained
- [ ] Support procedures defined
- [ ] Legal/compliance reviewed

### Go-Live Plan
1. **Soft launch**: Limited user group
2. **Gradual rollout**: Increase user base
3. **Full launch**: All users
4. **Post-launch review**: After 1 week

## Related Documentation
- [Environment Setup](./environments.md) - Environment configurations
- [Vercel Deployment](./vercel.md) - Platform-specific details
- [Monitoring Guide](../maintenance/monitoring.md) - Detailed monitoring setup
- [Incident Response](../INCIDENT_RESPONSE_PROCEDURES.md) - Full incident procedures