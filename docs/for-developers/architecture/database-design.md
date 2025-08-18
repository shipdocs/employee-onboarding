# Row Level Security (RLS) Implementation

## Overview

This document describes the comprehensive Row Level Security (RLS) implementation for the Maritime Onboarding System. RLS ensures that users can only access data they are authorized to see based on their role and relationships.

## Implementation Status

As of the latest migration (20250702152000), RLS has been implemented for all core tables in the system. The implementation follows a consistent pattern across all tables.

## Core Principles

1. **Service Role Bypass**: All tables have a policy allowing the `service_role` to bypass RLS for API operations
2. **Role-Based Access**: Access is controlled based on user roles (admin, manager, crew)
3. **Least Privilege**: Users only have access to data they need for their role
4. **Relationship-Based Access**: Managers can only access data for crew members they supervise

## Role Permissions

### Admin Role
- **Full Access**: Can read, write, update, and delete all data in all tables
- **Audit Trail**: All admin actions are logged in the audit_log table
- **System Configuration**: Can manage all system settings and configurations

### Manager Role
- **Crew Management**: Can view and manage crew members assigned to them via `manager_permissions`
- **Training Oversight**: Can view training progress for their assigned crew
- **Workflow Management**: Can create and manage workflows
- **Reporting**: Can view analytics for their assigned crew

### Crew Role
- **Own Data Only**: Can only view and update their own records
- **Training Access**: Can view published training content and complete training
- **Quiz Submission**: Can submit quiz results and view their own scores
- **Certificate Access**: Can view their own certificates

## Table-Specific Policies

### Core User Tables

#### users
- Admin: Full access
- Manager: View/update crew they have permissions for
- Crew: View/update own record only

#### manager_permissions
- Admin: Full access
- Manager: View own permissions only
- Crew: No access

### Training Tables

#### training_sessions
- Admin: Full access
- Manager: View/manage sessions for their crew
- Crew: View/update own sessions

#### training_items
- Admin: Full access
- Manager: View all (read-only)
- Crew: View all (read-only)

#### quiz_results
- Admin: Full access
- Manager: View results for their crew
- Crew: View own results, insert new results

### Certificate Tables

#### certificates
- Admin: Full access
- Manager: View/manage certificates for their crew
- Crew: View own certificates only

### Workflow Tables

#### workflows
- Admin: Full access
- Manager: View all, create/update workflows
- Crew: View active workflows only

#### workflow_instances
- Admin: Full access
- Manager: View/manage instances for their crew
- Crew: View own instances

#### workflow_progress
- Admin: View all
- Manager: View progress for their crew
- Crew: View/update own progress

### Security Tables

#### audit_log
- Admin: View only (no modifications allowed)
- Manager/Crew: No access

#### magic_links
- Service role only (no user access)

#### token_blacklist
- Service role only (no user access)

#### account_lockout
- Service role only (no user access)

### System Tables

#### admin_settings
- Admin: Full access
- Manager/Crew: No access

#### system_settings
- Admin: Full access
- All users: View public settings only

## Testing RLS Policies

The system includes comprehensive RLS testing functions in the `rls_tests` schema:

### Test Functions

1. **test_table_access**: Test access to a specific table as different roles
2. **generate_rls_report**: Generate a comprehensive report of RLS coverage
3. **check_rls_vulnerabilities**: Identify potential security issues
4. **test_manager_crew_access**: Test manager-crew access patterns

### Running Tests

```sql
-- Check for RLS vulnerabilities
SELECT * FROM rls_tests.check_rls_vulnerabilities();

-- Generate RLS coverage report
SELECT * FROM rls_tests.generate_rls_report();

-- View table security summary
SELECT * FROM rls_tests.table_security_summary;

-- Test specific table access
SELECT * FROM rls_tests.test_table_access('users', 'manager', 1);
```

## Monitoring RLS Coverage

A view `rls_coverage_report` provides real-time statistics on RLS implementation:

```sql
SELECT * FROM rls_coverage_report;
```

This shows:
- Total tables in the system
- Tables with RLS enabled
- Tables without RLS
- Total number of policies

## Best Practices

1. **Always Enable RLS**: Every new table should have RLS enabled
2. **Service Role Policy First**: Always create the service role bypass policy first
3. **Test Policies**: Use the test functions to verify policies work as expected
4. **Document Exceptions**: If a table doesn't need RLS, document why
5. **Regular Audits**: Run vulnerability checks regularly

## Migration History

1. **20250702150000**: Initial comprehensive RLS implementation for core tables
2. **20250702151000**: Additional RLS policies for workflow system
3. **20250702152000**: Complete RLS coverage for remaining tables
4. **20250702153000**: RLS testing framework implementation

## Troubleshooting

### Common Issues

1. **"permission denied" errors**: Check if RLS is enabled without policies
2. **Data not visible**: Verify JWT claims are set correctly
3. **Too much access**: Review policies for overly permissive rules

### Debugging Commands

```sql
-- Check if table has RLS enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'your_table';

-- View all policies for a table
SELECT * FROM pg_policies 
WHERE tablename = 'your_table';

-- Test current user context
SELECT auth.role(), auth.user_id(), auth.email();
```

## Future Considerations

1. **Row-Level Audit**: Consider adding row-level audit policies
2. **Dynamic Policies**: Implement time-based or context-aware policies
3. **Performance**: Monitor query performance with RLS enabled
4. **Policy Versioning**: Track policy changes over time

---

## Merged Content

# Row Level Security (RLS) Implementation Guide

## 🎯 **Overview**

This document describes the comprehensive Row Level Security implementation for the maritime onboarding system. The implementation provides **defense-in-depth security** while maintaining **100% backward compatibility** with existing functionality.

## 🔒 **Security Architecture**

### **Multi-Layer Security Model**

1. **API Layer Authentication** (Primary) - JWT-based auth in Vercel functions
2. **Database RLS Policies** (Secondary) - PostgreSQL row-level security
3. **Service Role Bypass** (Operational) - Maintains current functionality

### **Key Principles**

- **Zero Breaking Changes**: Existing API routes continue to work unchanged
- **Service Role Bypass**: All current database operations remain functional
- **Future-Ready**: Enables direct client database access if needed
- **Defense in Depth**: Multiple security layers protect data

## 📋 **Implementation Details**

### **Phase 1: Helper Functions**

Four PostgreSQL functions enable JWT-based authentication in RLS policies:

```sql
auth.jwt_user_id()        -- Extracts user ID from JWT
auth.jwt_user_role()      -- Extracts user role from JWT  
auth.has_role_access()    -- Checks role hierarchy access
auth.is_resource_owner()  -- Verifies resource ownership
```

### **Phase 2: RLS Enablement**

RLS enabled on all 14 public tables:
- `users`, `magic_links`
- `training_sessions`, `training_items`, `quiz_results`, `quiz_randomization_sessions`
- `file_uploads`, `certificates`, `pdf_templates`
- `admin_settings`, `manager_permissions`, `audit_log`, `system_settings`, `email_notifications`

### **Phase 3: Policy Structure**

Each table has **3-tier policy structure**:

1. **Service Role Bypass** - Maintains API functionality
2. **Admin/Manager Access** - Role-based permissions
3. **User Data Access** - Own data access only

## 🛡️ **Security Policies by Table**

### **Users Table**
- **Service Role**: Full access (API operations)
- **Admin**: Full access to all users
- **Manager**: View/update crew members + own data
- **Crew**: Own data only

### **Training System Tables**
- **Service Role**: Full access
- **Admin/Manager**: Full access (training oversight)
- **Crew**: Own training data only

### **Admin Tables** (`admin_settings`, `system_settings`, `pdf_templates`)
- **Service Role**: Full access
- **Admin**: Full access
- **Others**: No access

### **File & Certificate Tables**
- **Service Role**: Full access
- **Admin/Manager**: Full access (compliance oversight)
- **Crew**: Own files/certificates only

## 🔧 **Implementation Files**

### **Migration Scripts**
- `migration/07-comprehensive-rls-implementation.sql` - Main implementation
- `migration/test-rls-implementation.sql` - Verification tests
- `migration/rollback-rls-implementation.sql` - Emergency rollback

### **Testing & Verification**
```sql
-- Test RLS implementation
SELECT * FROM test_rls_implementation();

-- Verify all tables have RLS
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- Check policy coverage
SELECT tablename, COUNT(*) FROM pg_policies GROUP BY tablename;
```

## 🚀 **Deployment Process**

### **Step 1: Apply Migration**
```bash
# Apply the RLS implementation
supabase db push
```

### **Step 2: Run Tests**
```sql
-- Execute test script
\i migration/test-rls-implementation.sql
```

### **Step 3: Verify Functionality**
- Test all API endpoints
- Verify admin/manager/crew access
- Check service role operations

### **Step 4: Monitor**
- Watch for any access errors
- Monitor performance impact
- Verify audit logs

## 🔄 **Rollback Procedure**

If issues arise, use the rollback script:

```sql
-- EMERGENCY ONLY: Restore pre-RLS state
\i migration/rollback-rls-implementation.sql
```

**Rollback Effects:**
- Disables RLS on all tables
- Removes all policies
- Drops helper functions
- Restores original functionality

## 📊 **Performance Considerations**

### **Minimal Impact Expected**
- Service role bypasses RLS (no policy evaluation)
- Existing indexes support RLS queries
- Helper functions are lightweight

### **Monitoring Points**
- Query execution times
- Database connection usage
- API response times

## 🔮 **Future Enhancements**

### **Hybrid Architecture Option**
The implementation enables future migration to:
1. **Admin operations**: Continue using service role
2. **User operations**: Switch to anon key + RLS
3. **Direct client access**: Enable for specific use cases

### **Benefits of Future Migration**
- Reduced API layer complexity
- Better performance for simple queries
- Enhanced security granularity
- Real-time subscriptions support

## 🛠️ **Troubleshooting**

### **Common Issues**

**Issue**: API returns access denied errors
**Solution**: Check service role configuration in environment variables

**Issue**: RLS policies too restrictive
**Solution**: Verify JWT token format and helper function logic

**Issue**: Performance degradation
**Solution**: Check query plans and consider index optimization

### **Debug Queries**

```sql
-- Check current user and role
SELECT current_user, current_setting('request.jwt.claims', true);

-- Test helper functions
SELECT auth.jwt_user_id(), auth.jwt_user_role();

-- Verify policy evaluation
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM users;
```

## ✅ **Verification Checklist**

- [ ] All 14 tables have RLS enabled
- [ ] Service role bypass policies exist for all tables
- [ ] Helper functions created successfully
- [ ] API endpoints still functional
- [ ] Admin/manager/crew access working
- [ ] Test script passes all checks
- [ ] No data loss occurred
- [ ] Performance remains acceptable

## 📞 **Support**

For issues with this implementation:
1. Check the troubleshooting section
2. Run the test script for diagnostics
3. Use rollback script if critical issues arise
4. Review Supabase logs for detailed error messages

## 🔐 **Security Benefits**

### **Immediate Benefits**
- ✅ Eliminates Supabase security warnings
- ✅ Provides defense-in-depth protection
- ✅ Enables security auditing and compliance
- ✅ Prepares for future architecture evolution

### **Long-term Benefits**
- 🚀 Enables direct client database access
- 🚀 Supports real-time subscriptions
- 🚀 Reduces API layer complexity
- 🚀 Improves performance for simple queries

---

**Implementation Status**: Ready for deployment
**Risk Level**: Minimal (maintains full backward compatibility)
**Rollback Available**: Yes (comprehensive rollback script provided)
