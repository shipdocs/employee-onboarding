<!-- This documentation has been sanitized for public viewing. Sensitive data has been replaced with placeholders. -->

# Deployment Documentation

Complete deployment guide for the Maritime Onboarding System administrators.

## 📚 Deployment Guides

### 🚀 [Deployment Overview](./overview.md)
Understanding the deployment architecture:
- Multi-environment strategy
- Pipeline stages and flow
- Environment purposes
- Deployment best practices

### ⚙️ [Vercel Deployment Guide](./vercel-deployment.md)
Step-by-step Vercel deployment:
- Initial setup and configuration
- Environment variables
- Domain configuration
- Deployment commands

## 🎯 Quick Deployment Tasks

### Deploy to Testing
```bash
git checkout testing
git merge feature/your-feature
git push origin testing
# Automatic deployment to testing environment
```

### Deploy to Preview
```bash
git checkout preview
git merge testing
git push origin preview
# Automatic deployment to preview environment
```

### Deploy to Production
```bash
git checkout main
git merge preview
git tag -a v1.x.x -m "Release version 1.x.x"
git push origin main --tags
# Automatic deployment to production
```

## 🌐 Environment URLs

| Environment | URL | Purpose |
|-------------|-----|---------|
| **Testing** | `your-project.vercel.app` | Team testing |
| **Preview** | `your-project.vercel.app` | Stakeholder review |
| **Production** | `your-domain.com` | Live system |

## 🔧 Common Deployment Operations

### Environment Variables
```bash
# Set production variable
vercel env add DATABASE_URL production

# Pull environment variables
vercel env pull

# List all variables
vercel env ls
```

### Rollback
```bash
# Quick rollback via CLI
vercel rollback

# Or use dashboard: Deployments → Select previous → Promote
```

### Health Checks
```bash
# Check production health
curl https://your-domain.com/api/health

# Detailed health (requires auth)
curl -H "Authorization: Bearer $TOKEN" \
  https://your-domain.com/api/health/detailed
```

## 📋 Pre-Deployment Checklist

Before any deployment:
- [ ] All tests passing (`npm test`)
- [ ] Build successful (`npm run build`)
- [ ] Environment variables configured
- [ ] Database migrations reviewed
- [ ] Security scan completed (`npm audit`)
- [ ] Documentation updated
- [ ] Team notified

## 🚨 Emergency Procedures

### Critical Issue Response
1. **Immediate rollback** if production is affected
2. **Activate maintenance mode** if needed
3. **Notify stakeholders** via established channels
4. **Document incident** for post-mortem

### Maintenance Mode
```bash
# Enable maintenance mode
vercel env add MAINTENANCE_MODE=true production

# Disable maintenance mode
vercel env rm MAINTENANCE_MODE production
```

## 📊 Monitoring

### Key Metrics
- Response times < 500ms (warning) / < 1000ms (critical)
- Error rate < 1% (warning) / < 5% (critical)
- Uptime > 99.9%

### Alert Channels
- Email notifications for warnings
- Slack alerts for critical issues
- PagerDuty for after-hours emergencies

## 🔗 Related Documentation

- **[Security Guide](../security/)** - Security implementation
- **[Maintenance Guide](../maintenance/)** - Ongoing maintenance
- **[Developer Guide](../../for-developers/)** - Development workflow
- **[API Documentation](../../api/)** - API reference

## 📞 Support Contacts

- **DevOps Team**: devops@burando.online
- **Vercel Support**: support@vercel.com
- **Emergency Line**: +31 (0) 20 123 4567