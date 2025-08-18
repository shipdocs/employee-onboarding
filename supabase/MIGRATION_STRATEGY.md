# 🗄️ SUPABASE MIGRATION STRATEGY

## 📋 OVERVIEW

This document outlines the migration strategy for the Maritime Onboarding system, which has **67 tables** created via Supabase integration that need proper migration files for new installations.

## 🎯 MIGRATION GOALS

1. **Enable new environment setup** with complete database schema
2. **Maintain existing production data** without disruption
3. **Provide rollback capabilities** for future changes
4. **Document all schema changes** for compliance

## 📁 MIGRATION FILES STRUCTURE

```
supabase/migrations/
├── 20241203000000_baseline_schema.sql      # Original 53 tables (EXISTING)
├── 20250118000000_add_mfa_support.sql      # MFA additions (EXISTING)
├── 20250704000000_rollback_unified_workflows.sql # Workflow changes (EXISTING)
├── 20250805000000_add_security_monitoring_tables.sql # NEW: Security & monitoring
└── 20250805000001_add_mfa_and_additional_tables.sql  # NEW: MFA & additional features
```

## 🆕 NEW MIGRATION FILES CREATED

### **20250805000000_add_security_monitoring_tables.sql**
**Purpose**: Security monitoring and performance tracking
**Tables Added**: 14 tables
- `security_events` - Security incident logging
- `security_errors` - Security system errors  
- `email_security_logs` - Email security events
- `performance_metrics` - System performance data
- `performance_baselines` - Performance thresholds
- `performance_alerts` - Performance alerts
- `health_checks` - System health monitoring
- `system_notifications` - Admin notifications
- `compliance_reports` - Compliance reporting
- `data_exports` - GDPR data exports
- `data_deletion_jobs` - GDPR data deletion
- `feature_flags` - Feature flag management
- `feature_flag_usage` - Feature flag analytics
- `onboarding_analytics` - User behavior analytics

### **20250805000001_add_mfa_and_additional_tables.sql**
**Purpose**: MFA support and additional functionality
**Tables Added**: 13 tables
- `user_mfa_settings` - MFA configuration per user
- `mfa_failure_log` - MFA failure tracking
- `content_media` - Media file management
- `content_versions` - Content versioning
- `crew_assignments` - Crew vessel assignments
- `incidents` - Incident reporting
- `incident_external_notifications` - External incident alerts
- `sla_metrics` - SLA performance tracking
- `sla_breaches` - SLA violation logging
- `translation_activity` - Translation change log
- `file_uploads` - File upload tracking
- `user_feedback` - User feedback system
- `exit_strategy_jobs` - Data export/migration jobs

## 📊 MIGRATION COVERAGE

| Category | Tables | Status |
|----------|--------|--------|
| **Baseline Schema** | 53 | ✅ Documented |
| **Security & Monitoring** | 14 | ✅ **NEW Migration** |
| **MFA & Additional** | 13 | ✅ **NEW Migration** |
| **Total Coverage** | **80** | ✅ **Complete** |

## 🚀 USAGE INSTRUCTIONS

### **For New Installations:**
```bash
# Initialize Supabase
npx supabase init

# Start local development
npx supabase start

# Apply all migrations
npx supabase db reset

# Verify schema
npx supabase db diff
```

### **For Existing Production:**
```bash
# These migrations should NOT be run on existing production
# They are for documentation and new environment setup only

# To verify current schema matches migrations:
npx supabase db diff --schema public
```

### **For New Environment Setup:**
```bash
# Clone repository
git clone <repo-url>

# Setup Supabase
npx supabase link --project-ref <new-project-ref>

# Apply migrations
npx supabase db push

# Verify deployment
npx supabase db diff
```

## 🔒 SECURITY FEATURES INCLUDED

### **Row Level Security (RLS)**
- ✅ Security tables restricted to admins
- ✅ MFA settings restricted to users/admins
- ✅ User feedback restricted to owners
- ✅ Incident management for staff only

### **Indexes for Performance**
- ✅ All tables have optimized indexes
- ✅ Composite indexes for common queries
- ✅ Timestamp indexes for time-based queries

### **Data Integrity**
- ✅ Foreign key constraints
- ✅ Check constraints for enums
- ✅ Unique constraints where needed
- ✅ Default values for timestamps

## 📋 MIGRATION VALIDATION

### **Pre-Migration Checklist:**
- [ ] Backup existing database
- [ ] Test migrations on staging environment
- [ ] Verify all foreign key relationships
- [ ] Check RLS policies are correct
- [ ] Validate indexes are created

### **Post-Migration Verification:**
- [ ] All tables created successfully
- [ ] Indexes are present and optimized
- [ ] RLS policies are active
- [ ] Foreign keys are valid
- [ ] Default values work correctly

## 🔄 ROLLBACK STRATEGY

### **If Migration Fails:**
```sql
-- Drop tables in reverse order
DROP TABLE IF EXISTS exit_strategy_jobs CASCADE;
DROP TABLE IF EXISTS user_feedback CASCADE;
-- ... continue for all new tables

-- Restore from backup if needed
```

### **Rollback Files:**
Create rollback migrations if needed:
```
supabase/migrations/
├── 20250805000002_rollback_additional_tables.sql
└── 20250805000003_rollback_security_tables.sql
```

## 📈 MONITORING & MAINTENANCE

### **Migration Logs:**
All migrations log completion to `migration_logs` table:
```sql
SELECT * FROM migration_logs ORDER BY completed_at DESC;
```

### **Schema Validation:**
Regular schema validation recommended:
```bash
# Check for schema drift
npx supabase db diff --schema public

# Generate new migration if needed
npx supabase db diff > migrations/new_migration.sql
```

## 🎯 NEXT STEPS

1. **Test migrations** on staging environment
2. **Validate all functionality** works with new schema
3. **Document any custom functions** that need migration
4. **Create rollback procedures** for production safety
5. **Schedule regular schema validation** checks

## 📞 SUPPORT

For migration issues:
1. Check migration logs in database
2. Verify Supabase project configuration
3. Review foreign key dependencies
4. Contact development team if needed

---

**✅ Migration files are ready for new environment deployments!**

**⚠️ DO NOT run these migrations on existing production database - they are for new installations only.**
