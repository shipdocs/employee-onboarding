<!-- This documentation has been sanitized for public viewing. Sensitive data has been replaced with placeholders. -->

# Supabase Deployment Guide

This guide covers the complete setup, configuration, and management of Supabase for the Maritime Onboarding System, including database setup, security configuration, and maintenance procedures.

## Overview

Supabase provides:
- **PostgreSQL Database**: Full-featured relational database
- **Authentication**: Built-in auth with JWT tokens
- **Real-time Subscriptions**: Live data updates
- **Storage**: S3-compatible file storage
- **Edge Functions**: Serverless compute (optional)

## Initial Setup

### 1. Create Supabase Project

#### Via Dashboard
1. Go to [app.supabase.com](https://app.supabase.com)
2. Click "New Project"
3. Fill in project details:
   - Organization: Your organization
   - Project name: `maritime-onboarding-prod`
   - Database password: Generate strong password
   - Region: Choose closest to users (e.g., Frankfurt for EU)
   - Pricing plan: Free tier for testing, Pro for production

#### Via CLI
```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Create project
supabase projects create maritime-onboarding-prod --org-id your-org-id --region eu-central-1
```

### 2. Get Connection Details
After project creation, retrieve:
- **Project URL**: `https://[project-id].supabase.co`
- **Anon Key**: Public key for client-side access
- **Service Role Key**: Server-side key with full access
- **Database URL**: PostgreSQL connection string

## Database Configuration

### Schema Setup

#### 1. Initialize Database
```bash
# Clone the repository
git clone https://github.com/your-org/new-onboarding-2025.git
cd new-onboarding-2025

# Link to Supabase project
supabase link --project-ref [project-id]

# Apply migrations
supabase db push
```

#### 2. Core Tables
The system uses these main tables:
```sql
-- Users table with role-based access
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'crew')),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  company_id UUID,
  position TEXT,
  vessel_assignment TEXT,
  password_hash TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Add indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_company ON users(company_id);
```

### Row Level Security (RLS)

#### Enable RLS on All Tables
```sql
-- Enable RLS on all tables
DO $$ 
DECLARE 
  r RECORD;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE 'ALTER TABLE ' || quote_ident(r.tablename) || ' ENABLE ROW LEVEL SECURITY;';
  END LOOP;
END $$;
```

#### Create RLS Policies
```sql
-- Service role bypass (for API access)
CREATE POLICY "Service role bypass" ON users
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Users can view their own data
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (id = auth.jwt() ->> 'userId'::uuid);

-- Managers can view their crew
CREATE POLICY "Managers can view crew" ON users
  FOR SELECT USING (
    auth.jwt() ->> 'role' = 'manager' AND
    id IN (
      SELECT crew_member_id FROM manager_permissions
      WHERE manager_id = (auth.jwt() ->> 'userId')::uuid
    )
  );

-- Admins can view all
CREATE POLICY "Admins can view all" ON users
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
```

### Database Functions

#### Authentication Helpers
```sql
-- Get current user ID from JWT
CREATE OR REPLACE FUNCTION auth.jwt_user_id()
RETURNS UUID AS $$
BEGIN
  RETURN COALESCE(
    current_setting('request.jwt.claims', true)::json->>'userId',
    (SELECT id FROM auth.users WHERE id = auth.uid())
  )::uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get current user role from JWT
CREATE OR REPLACE FUNCTION auth.jwt_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN COALESCE(
    current_setting('request.jwt.claims', true)::json->>'role',
    'crew'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### Audit Functions
```sql
-- Automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## Storage Configuration

### 1. Create Storage Buckets
```sql
-- Create buckets via SQL
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('certificates', 'certificates', false, 10485760, ARRAY['application/pdf']),
  ('training-photos', 'training-photos', false, 10485760, ARRAY['image/jpeg', 'image/png']),
  ('profile-photos', 'profile-photos', false, 5242880, ARRAY['image/jpeg', 'image/png']);
```

### 2. Storage Policies
```sql
-- Certificate access policies
CREATE POLICY "Users can view own certificates" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'certificates' AND
    auth.jwt() ->> 'userId' = (storage.foldername(name))[1]
  );

CREATE POLICY "Managers can view crew certificates" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'certificates' AND
    auth.jwt() ->> 'role' = 'manager' AND
    (storage.foldername(name))[1]::uuid IN (
      SELECT crew_member_id FROM manager_permissions
      WHERE manager_id = (auth.jwt() ->> 'userId')::uuid
    )
  );

-- Service role can manage all files
CREATE POLICY "Service role full access" ON storage.objects
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
```

### 3. CORS Configuration
In Supabase Dashboard → Storage → Configuration:
```json
[
  {
    "origin": ["https://your-domain.com"],
    "allowed_headers": ["*"],
    "exposed_headers": ["*"],
    "max_age": 86400,
    "methods": ["GET", "POST", "PUT", "DELETE"]
  }
]
```

## Authentication Setup

### 1. Configure Auth Settings
In Supabase Dashboard → Authentication → Settings:

#### General Settings
- **Site URL**: `https://your-domain.com`
- **Redirect URLs**: 
  - `https://your-domain.com/magic-login`
  - `https://your-domain.com/auth/callback`

#### Email Templates
Customize email templates for magic links:

```html
<!-- Magic Link Email Template -->
<h2>Welcome to Maritime Onboarding</h2>
<p>Click the link below to access your training dashboard:</p>
<p>
  <a href="{{ .ConfirmationURL }}" 
     style="background: #2563eb; color: white; padding: 12px 24px; 
            text-decoration: none; border-radius: 6px; display: inline-block;">
    Access Training Portal
  </a>
</p>
<p>This link will expire in 30 minutes.</p>
<p>If you didn't request this, please ignore this email.</p>
```

### 2. JWT Configuration
Configure JWT secret for custom tokens:

```bash
# Generate secure JWT secret
openssl rand -base64 32

# Add to environment variables
JWT_SECRET=your-generated-secret
```

## Security Configuration

### 1. API Security
In Supabase Dashboard → Settings → API:

- **Anon Key**: Used for public/client-side access
- **Service Role Key**: Server-side only, full database access
- **JWT Secret**: For signing custom JWT tokens

### 2. Network Security
Configure allowed IP addresses for database access:

```sql
-- Restrict database access (if needed)
-- In Supabase Dashboard → Database → Settings → Network Restrictions
-- Add allowed IP ranges
```

### 3. SSL/TLS Configuration
All connections use SSL by default. For direct database connections:

```bash
# Connection string with SSL
postgresql://postgres:[password]@[host]:5432/postgres?sslmode=require
```

## Environment-Specific Setup

### Development Environment
```env
# .env.development
SUPABASE_URL=https://dev-xxx.supabase.co
SUPABASE_ANON_KEY=dev-anon-key
SUPABASE_SERVICE_ROLE_KEY=dev-service-key
```

### Testing Environment
```env
# .env.testing
SUPABASE_URL=https://test-xxx.supabase.co
SUPABASE_ANON_KEY=test-anon-key
SUPABASE_SERVICE_ROLE_KEY=test-service-key
```

### Production Environment
```env
# .env.production
SUPABASE_URL=https://prod-xxx.supabase.co
SUPABASE_ANON_KEY=prod-anon-key
SUPABASE_SERVICE_ROLE_KEY=prod-service-key
```

## Database Migrations

### Creating Migrations
```bash
# Create new migration
supabase migration new add_new_feature

# Edit the migration file
vim supabase/migrations/[timestamp]_add_new_feature.sql

# Apply migration locally
supabase db reset

# Push to remote
supabase db push
```

### Migration Best Practices
1. **Always test locally first**: Use `supabase db reset`
2. **Make migrations reversible**: Include rollback statements
3. **Keep migrations small**: One feature per migration
4. **Document changes**: Add comments in migration files
5. **Version control**: Commit migrations to Git

### Example Migration
```sql
-- supabase/migrations/20250115000000_add_training_notes.sql

-- Up Migration
ALTER TABLE training_items 
ADD COLUMN IF NOT EXISTS notes TEXT;

COMMENT ON COLUMN training_items.notes IS 'Additional notes from instructor';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_training_items_notes 
ON training_items(notes) 
WHERE notes IS NOT NULL;

-- Down Migration (in separate file or comments)
-- ALTER TABLE training_items DROP COLUMN IF EXISTS notes;
-- DROP INDEX IF EXISTS idx_training_items_notes;
```

## Backup and Recovery

### Automatic Backups
Supabase provides automatic backups:
- **Free tier**: Daily backups, 7-day retention
- **Pro tier**: Daily backups, 30-day retention
- **Team/Enterprise**: Point-in-time recovery

### Manual Backup
```bash
# Backup schema
pg_dump --schema-only $DATABASE_URL > backup/schema_$(date +%Y%m%d).sql

# Backup data
pg_dump --data-only --column-inserts $DATABASE_URL > backup/data_$(date +%Y%m%d).sql

# Full backup
pg_dump $DATABASE_URL > backup/full_$(date +%Y%m%d).sql

# Backup specific tables
pg_dump -t users -t training_sessions $DATABASE_URL > backup/training_$(date +%Y%m%d).sql
```

### Restore Procedures
```bash
# Restore from Supabase backup
# Go to Dashboard → Database → Backups → Restore

# Restore from manual backup
psql $DATABASE_URL < backup/full_20250115.sql

# Restore specific tables
psql $DATABASE_URL < backup/training_20250115.sql
```

## Performance Optimization

### 1. Database Indexes
```sql
-- Check missing indexes
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE schemaname = 'public'
AND n_distinct > 100
AND correlation < 0.1
ORDER BY n_distinct DESC;

-- Create performance indexes
CREATE INDEX CONCURRENTLY idx_training_sessions_user_phase 
ON training_sessions(user_id, phase);

CREATE INDEX CONCURRENTLY idx_quiz_results_user_phase 
ON quiz_results(user_id, phase);

CREATE INDEX CONCURRENTLY idx_audit_log_created 
ON audit_log(created_at DESC);
```

### 2. Query Optimization
```sql
-- Analyze query performance
EXPLAIN ANALYZE
SELECT u.*, 
       ts.phase, 
       ts.status
FROM users u
JOIN training_sessions ts ON u.id = ts.user_id
WHERE u.company_id = 'xxx'
AND ts.status = 'in_progress';

-- Update table statistics
ANALYZE users;
ANALYZE training_sessions;
```

### 3. Connection Pooling
Configure in Supabase Dashboard → Database → Settings:
- **Pool Size**: 15 (for Pro plan)
- **Pool Mode**: Transaction
- **Statement Timeout**: 60s

## Monitoring

### 1. Database Metrics
Monitor in Supabase Dashboard → Reports:
- Database size
- Connection count
- Query performance
- Slow queries
- Cache hit ratio

### 2. Set Up Alerts
```sql
-- Create monitoring views
CREATE VIEW active_training_sessions AS
SELECT 
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
  COUNT(*) FILTER (WHERE status = 'completed') as completed
FROM training_sessions
WHERE created_at > NOW() - INTERVAL '30 days';

-- Monitor table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### 3. Health Checks
```javascript
// Health check endpoint
async function checkDatabaseHealth() {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    return {
      healthy: !error,
      latency: Date.now() - start,
      error: error?.message
    };
  } catch (err) {
    return {
      healthy: false,
      error: err.message
    };
  }
}
```

## Troubleshooting

### Common Issues

#### Connection Timeout
```bash
# Check connection pool
SELECT count(*) FROM pg_stat_activity;

# Kill idle connections
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE state = 'idle' 
AND state_change < NOW() - INTERVAL '10 minutes';
```

#### RLS Policy Issues
```sql
-- Debug RLS policies
SET ROLE postgres;
SET "request.jwt.claims" = '{"userId": "xxx", "role": "manager"}';

-- Test query as user
SELECT * FROM users WHERE id = 'xxx';

-- Check active policies
SELECT * FROM pg_policies WHERE tablename = 'users';
```

#### Storage Access Issues
```javascript
// Debug storage access
const { data, error } = await supabase.storage
  .from('certificates')
  .list('user-id/', {
    limit: 10,
    offset: 0
  });

console.log('Storage debug:', { data, error });
```

### Performance Issues
```sql
-- Find slow queries
SELECT 
  query,
  calls,
  mean_exec_time,
  total_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 1000
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Check table bloat
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as size,
  n_dead_tup,
  n_live_tup,
  round(n_dead_tup::numeric / NULLIF(n_live_tup, 0), 2) as ratio
FROM pg_stat_user_tables
WHERE n_dead_tup > 1000
ORDER BY ratio DESC;
```

## Best Practices

### Security
1. **Never expose service role key** to client-side code
2. **Always use RLS** for data access control
3. **Rotate keys regularly** (every 90 days)
4. **Monitor failed auth attempts**
5. **Use SSL for all connections**

### Performance
1. **Index foreign keys** and frequently queried columns
2. **Use connection pooling** for better resource usage
3. **Implement pagination** for large datasets
4. **Regular VACUUM and ANALYZE**
5. **Monitor slow queries** and optimize

### Maintenance
1. **Regular backups** with tested restore procedures
2. **Keep migrations versioned** in source control
3. **Monitor disk usage** and plan for growth
4. **Update Supabase CLI** regularly
5. **Review security policies** quarterly

## Cost Optimization

### Free Tier Limits
- 500 MB database
- 1 GB storage
- 2 GB bandwidth
- 50,000 monthly active users

### Pro Tier Benefits
- 8 GB database
- 100 GB storage
- 200 GB bandwidth
- Point-in-time recovery
- Daily backups (30 days)

### Cost Monitoring
```sql
-- Monitor storage usage
SELECT 
  pg_database_size(current_database()) as db_size,
  pg_size_pretty(pg_database_size(current_database())) as db_size_pretty;

-- Monitor table sizes
SELECT 
  tablename,
  pg_size_pretty(pg_total_relation_size(tablename::regclass)) as total_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(tablename::regclass) DESC;
```

## Related Documentation
- [Database Architecture](../architecture/database.md) - Database design details
- [Environment Setup](./environments.md) - Multi-environment configuration
- [Security Architecture](../architecture/security.md) - Security implementation
- [Backup Procedures](../maintenance/backup-recovery.md) - Detailed backup guide