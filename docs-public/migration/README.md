# Migration Overview

This section covers all aspects of migration for the Maritime Onboarding System, including database migrations, data migration procedures, and migration from legacy systems.

## 🎯 **Migration Strategy**

### **Migration Philosophy**
The Maritime Onboarding System uses a comprehensive migration strategy designed for:
- **Zero-Downtime Deployments**: Migrations run without service interruption
- **Rollback Capability**: All migrations can be safely reversed
- **Environment Consistency**: Same migrations across all environments
- **Data Integrity**: Comprehensive validation and verification

### **Migration Types**
1. **Database Schema Migrations**: Structural database changes
2. **Data Migrations**: Data transformation and cleanup
3. **System Migrations**: Moving from legacy systems
4. **Environment Migrations**: Moving between environments

## 🗄️ **Database Migration System**

### **Migration Architecture**
The system uses Supabase's migration system with custom enhancements:

```
Migration Flow:
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Local Dev       │ ─→ │ Testing DB      │ ─→ │ Preview DB      │ ─→ Production DB
│ Create & Test   │    │ Team Validation │    │ Final Review    │    │ Live Deployment
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### **Migration File Structure**
```
supabase/migrations/
├── 20250528070308_remote_schema.sql          # Initial schema
├── 20250528071902_remote_schema.sql          # Schema updates
├── 20250528100001_add_migration_tracking.sql # Migration tracking
├── 20250528125150_test_migration_system.sql  # System testing
├── 20250528160800_ensure_admin_user.sql      # Admin user setup
└── 20250528161500_fix_admin_password.sql     # Password fixes
```

### **Migration Naming Convention**
- **Format**: `YYYYMMDDHHMMSS_description.sql`
- **Timestamp**: UTC timestamp for ordering
- **Description**: Clear, descriptive name in snake_case
- **Examples**:
  - `20250601120000_add_user_preferences.sql`
  - `20250601130000_update_training_phases.sql`
  - `20250601140000_create_audit_log_table.sql`

## 🔄 **Migration Workflow**

### **Development Workflow**

#### **1. Create Migration**
```bash
# Create new migration file
supabase migration new add_user_preferences

# Edit the generated file
# File: supabase/migrations/TIMESTAMP_add_user_preferences.sql
```

#### **2. Write Migration SQL**
```sql
-- Migration: Add user preferences table
-- Created: 2025-06-01
-- Description: Add user preferences for language and notifications

-- Create user_preferences table
CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    language VARCHAR(5) DEFAULT 'en',
    email_notifications BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);

-- Add RLS policies
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences" ON user_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" ON user_preferences
    FOR UPDATE USING (auth.uid() = user_id);

-- Insert default preferences for existing users
INSERT INTO user_preferences (user_id, language, email_notifications)
SELECT id, 'en', true FROM users
WHERE id NOT IN (SELECT user_id FROM user_preferences);
```

#### **3. Test Migration Locally**
```bash
# Apply migration locally
supabase db push

# Verify migration applied correctly
supabase db diff

# Test rollback (if rollback script exists)
supabase db reset
supabase db push
```

#### **4. Commit and Deploy**
```bash
# Commit migration file
git add supabase/migrations/
git commit -m "feat: add user preferences table"

# Deploy to testing environment
git push origin testing
```

### **Deployment Workflow**

#### **Automatic Migration Application**
Migrations are automatically applied during deployment:

1. **Testing Environment**: Migrations applied when code is pushed to `testing` branch
2. **Preview Environment**: Migrations applied when code is pushed to `preview` branch
3. **Production Environment**: Migrations applied when code is pushed to `main` branch

#### **Migration Verification**
```bash
# Check migration status
supabase migration list

# Verify specific migration
supabase db diff --schema public

# Check for migration errors
# Review Supabase dashboard logs
```

## 📊 **Data Migration Procedures**

### **Data Migration Types**

#### **1. Schema Changes with Data Transformation**
```sql
-- Example: Rename column with data preservation
-- Migration: 20250601150000_rename_user_name_columns.sql

-- Add new columns
ALTER TABLE users ADD COLUMN first_name VARCHAR(100);
ALTER TABLE users ADD COLUMN last_name VARCHAR(100);

-- Migrate existing data
UPDATE users 
SET 
    first_name = SPLIT_PART(full_name, ' ', 1),
    last_name = SPLIT_PART(full_name, ' ', 2)
WHERE full_name IS NOT NULL;

-- Add constraints
ALTER TABLE users ALTER COLUMN first_name SET NOT NULL;
ALTER TABLE users ALTER COLUMN last_name SET NOT NULL;

-- Remove old column (in separate migration for safety)
-- ALTER TABLE users DROP COLUMN full_name;
```

#### **2. Data Cleanup and Optimization**
```sql
-- Example: Clean up orphaned records
-- Migration: 20250601160000_cleanup_orphaned_records.sql

-- Remove orphaned training sessions
DELETE FROM training_sessions 
WHERE user_id NOT IN (SELECT id FROM users);

-- Remove expired magic links
DELETE FROM magic_links 
WHERE expires_at < NOW() - INTERVAL '24 hours';

-- Update statistics
ANALYZE training_sessions;
ANALYZE magic_links;
```

#### **3. Data Seeding**
```sql
-- Example: Add default training phases
-- Migration: 20250601170000_seed_training_phases.sql

-- Insert default training phases
INSERT INTO training_phases (name, duration_hours, description) VALUES
('Phase 1: Basic Training', 24, 'Basic safety and orientation training'),
('Phase 2: Advanced Training', 72, 'Advanced safety and equipment training'),
('Phase 3: Final Assessment', 168, 'Comprehensive assessment and certification')
ON CONFLICT (name) DO NOTHING;
```

### **Large Data Migration Strategy**

#### **Batch Processing**
```sql
-- Example: Migrate large dataset in batches
-- Migration: 20250601180000_migrate_large_dataset.sql

-- Create temporary tracking table
CREATE TEMP TABLE migration_progress (
    batch_number INTEGER,
    processed_count INTEGER,
    completed_at TIMESTAMP
);

-- Process in batches of 1000 records
DO $$
DECLARE
    batch_size INTEGER := 1000;
    offset_val INTEGER := 0;
    processed INTEGER;
BEGIN
    LOOP
        -- Process batch
        UPDATE large_table 
        SET new_column = transform_function(old_column)
        WHERE id IN (
            SELECT id FROM large_table 
            WHERE new_column IS NULL 
            ORDER BY id 
            LIMIT batch_size
        );
        
        GET DIAGNOSTICS processed = ROW_COUNT;
        
        -- Log progress
        INSERT INTO migration_progress VALUES (
            offset_val / batch_size + 1, 
            processed, 
            NOW()
        );
        
        -- Exit if no more records
        EXIT WHEN processed = 0;
        
        offset_val := offset_val + batch_size;
        
        -- Pause between batches to avoid overwhelming system
        PERFORM pg_sleep(0.1);
    END LOOP;
END $$;
```

## 🔄 **Legacy System Migration**

### **Migration from Previous Systems**

#### **Assessment Phase**
1. **Data Inventory**: Catalog all existing data and systems
2. **Dependency Analysis**: Identify system dependencies and integrations
3. **Risk Assessment**: Evaluate migration risks and mitigation strategies
4. **Timeline Planning**: Develop detailed migration timeline

#### **Preparation Phase**
1. **Data Mapping**: Map legacy data to new system schema
2. **Transformation Scripts**: Develop data transformation procedures
3. **Testing Environment**: Set up migration testing environment
4. **Rollback Planning**: Develop comprehensive rollback procedures

#### **Execution Phase**
1. **Data Export**: Extract data from legacy systems
2. **Data Transformation**: Transform data to new format
3. **Data Import**: Import transformed data to new system
4. **Validation**: Verify data integrity and completeness

#### **Validation Phase**
1. **Data Verification**: Compare legacy and new system data
2. **Functionality Testing**: Test all system functionality
3. **User Acceptance**: User testing and approval
4. **Performance Testing**: Verify system performance

### **Legacy Data Migration Scripts**

#### **User Data Migration**
```sql
-- Example: Migrate users from legacy system
-- File: scripts/migrate-legacy-users.sql

-- Create temporary import table
CREATE TEMP TABLE legacy_users_import (
    old_id INTEGER,
    email VARCHAR(255),
    full_name VARCHAR(255),
    role VARCHAR(50),
    created_date DATE
);

-- Import legacy data (from CSV or other source)
COPY legacy_users_import FROM '/path/to/legacy_users.csv' 
WITH (FORMAT csv, HEADER true);

-- Transform and insert into new system
INSERT INTO users (
    email, 
    first_name, 
    last_name, 
    role, 
    created_at,
    is_active
)
SELECT 
    email,
    SPLIT_PART(full_name, ' ', 1) as first_name,
    SPLIT_PART(full_name, ' ', 2) as last_name,
    CASE 
        WHEN role = 'administrator' THEN 'admin'
        WHEN role = 'supervisor' THEN 'manager'
        ELSE 'crew'
    END as role,
    created_date::timestamp as created_at,
    true as is_active
FROM legacy_users_import
WHERE email IS NOT NULL
ON CONFLICT (email) DO NOTHING;

-- Create mapping table for reference
CREATE TABLE legacy_user_mapping (
    legacy_id INTEGER,
    new_id UUID,
    migrated_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO legacy_user_mapping (legacy_id, new_id)
SELECT 
    lui.old_id,
    u.id
FROM legacy_users_import lui
JOIN users u ON u.email = lui.email;
```

## 🧪 **Migration Testing**

### **Testing Strategy**

#### **Pre-Migration Testing**
1. **Schema Validation**: Verify migration SQL syntax and logic
2. **Data Integrity**: Test data transformation accuracy
3. **Performance Testing**: Verify migration performance impact
4. **Rollback Testing**: Test rollback procedures

#### **Post-Migration Testing**
1. **Data Verification**: Compare before and after data
2. **Functionality Testing**: Verify all features work correctly
3. **Performance Testing**: Verify system performance
4. **User Acceptance**: User testing and approval

### **Testing Scripts**

#### **Data Integrity Verification**
```bash
#!/bin/bash
# Script: verify-migration-integrity.sh

echo "🔍 Verifying migration data integrity..."

# Check user count
echo "Checking user counts..."
node -e "
const { getDatabase } = require('./config/database');
const db = getDatabase();
db.from('users').select('count').then(({count}) => 
  console.log('Total users:', count)
);
"

# Check for orphaned records
echo "Checking for orphaned records..."
node scripts/check-orphaned-records.js

# Verify data relationships
echo "Verifying data relationships..."
node scripts/verify-data-relationships.js

echo "✅ Migration integrity verification complete"
```

#### **Performance Impact Testing**
```bash
#!/bin/bash
# Script: test-migration-performance.sh

echo "📊 Testing migration performance impact..."

# Measure query performance before migration
echo "Measuring baseline performance..."
node scripts/measure-query-performance.js > before-migration.log

# Run migration
echo "Applying migration..."
supabase db push

# Measure query performance after migration
echo "Measuring post-migration performance..."
node scripts/measure-query-performance.js > after-migration.log

# Compare results
echo "Comparing performance results..."
node scripts/compare-performance.js before-migration.log after-migration.log

echo "✅ Performance testing complete"
```

## 🚨 **Migration Troubleshooting**

### **Common Migration Issues**

#### **Migration Conflicts**
```bash
# Issue: Migration conflicts between branches
# Solution: Resolve conflicts and reorder migrations

# Check migration status
supabase migration list

# Reset to clean state
supabase db reset

# Reapply migrations in correct order
supabase db push
```

#### **Data Type Conflicts**
```sql
-- Issue: Data type conversion errors
-- Solution: Add explicit type casting

-- Instead of:
-- ALTER TABLE users ALTER COLUMN age TYPE INTEGER;

-- Use:
ALTER TABLE users ALTER COLUMN age TYPE INTEGER 
USING age::INTEGER;
```

#### **Constraint Violations**
```sql
-- Issue: Foreign key constraint violations
-- Solution: Clean up data before adding constraints

-- Clean up orphaned records first
DELETE FROM child_table 
WHERE parent_id NOT IN (SELECT id FROM parent_table);

-- Then add constraint
ALTER TABLE child_table 
ADD CONSTRAINT fk_parent 
FOREIGN KEY (parent_id) REFERENCES parent_table(id);
```

### **Migration Recovery Procedures**

#### **Rollback Migration**
```bash
# For schema-only migrations
supabase db reset
supabase migration list
# Remove problematic migration file
supabase db push

# For data migrations
# Restore from backup
supabase db restore --backup-id backup-id
```

#### **Partial Migration Recovery**
```sql
-- Create recovery script for partial rollback
-- File: recovery/rollback_user_preferences.sql

-- Remove added columns
ALTER TABLE users DROP COLUMN IF EXISTS preference_language;
ALTER TABLE users DROP COLUMN IF EXISTS preference_notifications;

-- Drop created tables
DROP TABLE IF EXISTS user_preferences;

-- Remove policies
DROP POLICY IF EXISTS "Users can view own preferences" ON user_preferences;
```

## 📚 **Migration Documentation**

### **Detailed Migration Guides**
- **[Database Migration](for-developers/architecture/database-design.md)** - Comprehensive database migration procedures
- **[Data Migration](reports/security/frontend-auth-migration.md)** - Data migration and transformation procedures
- **[Legacy Systems](legacy-systems.md)** - Migration from legacy systems

### **Related Documentation**
- **[Database Design](../for-developers/architecture/database-design.md)** - Database schema and design
- **[Development Workflow](../development/workflow.md)** - Development process including migrations
- **[Deployment Guide](../for-administrators/deployment/overview.md)** - Deployment procedures and environments

## 🎯 **Migration Best Practices**

### **Planning and Design**
1. **Thorough Planning**: Plan migrations carefully with clear objectives
2. **Incremental Changes**: Make small, incremental changes rather than large ones
3. **Backward Compatibility**: Maintain backward compatibility when possible
4. **Documentation**: Document all migration procedures and decisions

### **Testing and Validation**
1. **Test Thoroughly**: Test migrations in all environments before production
2. **Validate Data**: Verify data integrity after every migration
3. **Performance Testing**: Test migration impact on system performance
4. **Rollback Testing**: Always test rollback procedures

### **Execution and Monitoring**
1. **Monitor Closely**: Monitor migrations during execution
2. **Have Rollback Plan**: Always have a tested rollback plan ready
3. **Communicate**: Keep stakeholders informed of migration progress
4. **Learn and Improve**: Learn from each migration to improve processes

The Maritime Onboarding System migration strategy ensures safe, reliable, and efficient database and system migrations while maintaining data integrity and system availability.
