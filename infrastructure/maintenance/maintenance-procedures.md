# Maritime Onboarding System - Maintenance Procedures

## Table of Contents
1. [Routine Maintenance Tasks](#routine-maintenance-tasks)
2. [Database Maintenance](#database-maintenance)
3. [Application Maintenance](#application-maintenance)
4. [Security Maintenance](#security-maintenance)
5. [Performance Maintenance](#performance-maintenance)
6. [Emergency Procedures](#emergency-procedures)

## Routine Maintenance Tasks

### Daily Tasks (Automated)
- **Token Cleanup** - 3:00 AM UTC
  - Removes expired JWT tokens from blacklist
  - Cleans up expired user sessions
  - Archives old audit logs

- **Health Checks** - Every 30 seconds
  - API endpoint availability
  - Database connectivity
  - Storage service status
  - Email service availability

- **Backup Verification** - 4:00 AM UTC
  - Verify previous night's backup completed
  - Check backup integrity
  - Confirm backup size is within expected range

### Weekly Tasks
- **Security Review** - Mondays, 9:00 AM UTC
  - Review security alerts from past week
  - Check for unusual patterns
  - Update blocked IP list
  - Review failed login attempts

- **Performance Analysis** - Wednesdays, 10:00 AM UTC
  - Analyze response time trends
  - Review slow query logs
  - Check resource utilization
  - Optimize database indexes if needed

- **Storage Cleanup** - Fridays, 2:00 AM UTC
  - Remove temporary files
  - Clean up orphaned uploads
  - Archive old certificates
  - Compress log files

### Monthly Tasks
- **Full System Backup** - 1st Sunday, 2:00 AM UTC
  - Complete database export
  - Full file storage backup
  - Configuration backup
  - Test restore procedure

- **Security Audit** - 15th of each month
  - Review user permissions
  - Audit admin access logs
  - Check for dormant accounts
  - Update security policies

- **Dependency Updates** - Last Tuesday
  - Review npm audit results
  - Update non-breaking dependencies
  - Test in staging environment
  - Deploy to production if stable

## Database Maintenance

### Index Optimization
```sql
-- Check index usage
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY schemaname, tablename;

-- Rebuild fragmented indexes
REINDEX TABLE users;
REINDEX TABLE training_progress;
REINDEX TABLE quiz_attempts;
```

### Table Maintenance
```sql
-- Vacuum and analyze tables
VACUUM ANALYZE users;
VACUUM ANALYZE crews;
VACUUM ANALYZE training_progress;

-- Check table sizes
SELECT 
    schemaname AS table_schema,
    tablename AS table_name,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Backup Procedures
```bash
# Manual database backup
npm run maintenance:backup-database

# Verify backup
npm run maintenance:verify-backup

# Test restore (staging only)
npm run maintenance:test-restore
```

## Application Maintenance

### Cache Management
```javascript
// Clear application cache
npm run maintenance:clear-cache

// Rebuild cache
npm run maintenance:rebuild-cache

// View cache statistics
npm run maintenance:cache-stats
```

### Session Management
```javascript
// Clean expired sessions
npm run maintenance:clean-sessions

// View active sessions
npm run maintenance:active-sessions

// Force logout all users (emergency)
npm run maintenance:force-logout-all
```

### Email Queue Management
```javascript
// Process stuck emails
npm run maintenance:process-email-queue

// Clear failed emails
npm run maintenance:clear-failed-emails

// Test email configuration
npm run maintenance:test-email
```

## Security Maintenance

### Certificate Renewal
1. Check certificate expiration dates monthly
2. Renew SSL certificates 30 days before expiration
3. Update certificate in Vercel dashboard
4. Verify HTTPS is working correctly

### Access Review
```javascript
// Review admin users
npm run maintenance:audit-admins

// Check for inactive users
npm run maintenance:inactive-users

// Reset user passwords (bulk)
npm run maintenance:reset-passwords
```

### Security Patches
1. Monitor security advisories
2. Apply critical patches immediately
3. Test patches in staging first
4. Document all security updates

## Performance Maintenance

### Database Query Optimization
```sql
-- Find slow queries
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    min_time,
    max_time
FROM pg_stat_statements
WHERE total_time > 1000
ORDER BY total_time DESC
LIMIT 20;

-- Explain query plan
EXPLAIN ANALYZE [YOUR_QUERY_HERE];
```

### API Response Time Optimization
```javascript
// Analyze API performance
npm run maintenance:api-performance

// Clear API cache
npm run maintenance:clear-api-cache

// Optimize route handlers
npm run maintenance:optimize-routes
```

### Resource Monitoring
- CPU usage should stay below 70%
- Memory usage should stay below 80%
- Database connections should stay below 80% of max
- Storage usage should stay below 85%

## Emergency Procedures

### System Down
1. Check Vercel status page
2. Verify Supabase status
3. Check DNS resolution
4. Review recent deployments
5. Rollback if necessary

### Database Issues
```bash
# Emergency database connection test
npm run emergency:test-db

# Switch to read-only mode
npm run emergency:readonly-mode

# Restore from backup
npm run emergency:restore-db
```

### Security Breach
1. Enable emergency lockdown mode
2. Block suspicious IPs immediately
3. Force logout all users
4. Review audit logs
5. Change all service credentials
6. Notify security team

### High Load
```bash
# Enable rate limiting
npm run emergency:enable-rate-limit

# Scale up resources
npm run emergency:scale-up

# Enable maintenance mode
npm run emergency:maintenance-mode
```

## Automation Scripts

### Daily Maintenance Script
```bash
#!/bin/bash
# daily-maintenance.sh

echo "Starting daily maintenance..."

# Clean tokens
npm run cron:cleanup-tokens

# Check health
npm run health:check-all

# Verify backups
npm run backup:verify

# Update metrics
npm run metrics:update

echo "Daily maintenance completed"
```

### Weekly Maintenance Script
```bash
#!/bin/bash
# weekly-maintenance.sh

echo "Starting weekly maintenance..."

# Security review
npm run security:weekly-review

# Performance analysis
npm run performance:analyze

# Storage cleanup
npm run storage:cleanup

# Generate reports
npm run reports:weekly

echo "Weekly maintenance completed"
```

## Monitoring Dashboard Access

### Grafana Dashboard
- URL: https://monitoring.maritime-onboarding.com
- Username: Use your admin credentials
- Key metrics to monitor:
  - System uptime
  - API response times
  - Error rates
  - Active users
  - Database performance

### Alert Configuration
- Critical alerts: Immediate notification
- High alerts: Within 15 minutes
- Medium alerts: Within 1 hour
- Low alerts: Daily summary

## Contact Information

### Escalation Path
1. **Level 1**: On-call engineer
   - Response time: 15 minutes
   - Phone: +XX-XXX-XXXX

2. **Level 2**: Technical lead
   - Response time: 30 minutes
   - Phone: +XX-XXX-XXXX

3. **Level 3**: CTO
   - Response time: 1 hour
   - Phone: +XX-XXX-XXXX

### External Support
- **Vercel Support**: support@vercel.com
- **Supabase Support**: support@supabase.io
- **Security Team**: security@maritime-onboarding.com

## Maintenance Log

All maintenance activities should be logged in the system:

```javascript
// Log maintenance activity
await supabase
  .from('maintenance_logs')
  .insert({
    type: 'routine|emergency|scheduled',
    action: 'Description of action taken',
    performed_by: 'admin@example.com',
    duration: '15 minutes',
    result: 'success|failure',
    notes: 'Additional notes',
    created_at: new Date().toISOString()
  });
```

## Best Practices

1. **Always backup before major changes**
2. **Test in staging environment first**
3. **Document all changes**
4. **Communicate maintenance windows**
5. **Monitor system after changes**
6. **Keep audit trail of all actions**
7. **Review logs regularly**
8. **Update documentation**

## Maintenance Checklist Template

```markdown
## Maintenance Checklist - [DATE]

### Pre-Maintenance
- [ ] Backup completed
- [ ] Staging tested
- [ ] Team notified
- [ ] Maintenance window scheduled

### During Maintenance
- [ ] Services stopped gracefully
- [ ] Changes applied
- [ ] Tests run successfully
- [ ] Services restarted

### Post-Maintenance
- [ ] System health verified
- [ ] Performance normal
- [ ] No errors in logs
- [ ] Documentation updated
- [ ] Team notified of completion

### Notes
[Add any relevant notes here]

Performed by: [Name]
Duration: [Time]
Result: [Success/Failed]
```