# Database Architecture

The Maritime Onboarding System uses Supabase (PostgreSQL) as its primary database, implementing a comprehensive schema with Row Level Security (RLS) for multi-tenant data isolation and security.

## Database Overview

### Technology Stack
- **Database**: PostgreSQL 15.x (via Supabase)
- **ORM/Client**: Supabase JavaScript Client
- **Security**: Row Level Security (RLS) policies
- **Authentication**: Supabase Auth with JWT tokens
- **Storage**: Supabase Storage for file uploads

### Key Features
- **Multi-tenant Architecture**: Company-based data isolation
- **Row Level Security**: Database-level access control
- **Audit Logging**: Comprehensive activity tracking
- **Real-time Capabilities**: Live updates via Supabase subscriptions
- **Automated Backups**: Daily backups with point-in-time recovery

## Schema Design

### Core Tables

#### users
Primary user table for all system users (admin, manager, crew).

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'crew')),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  company_id UUID,
  position TEXT,
  vessel_assignment TEXT,
  password_hash TEXT, -- For admin/manager only
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### training_sessions
Tracks training progress for each crew member.

```sql
CREATE TABLE training_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  phase INTEGER NOT NULL CHECK (phase IN (1, 2, 3)),
  status TEXT NOT NULL DEFAULT 'not_started',
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  completion_percentage INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### training_items
Individual training tasks within each phase.

```sql
CREATE TABLE training_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES training_sessions(id) ON DELETE CASCADE,
  item_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  phase INTEGER NOT NULL,
  completed BOOLEAN DEFAULT false,
  instructor_initials TEXT,
  comments TEXT,
  proof_photo_path TEXT,
  completed_at TIMESTAMP WITH TIME ZONE
);
```

#### workflows
Defines training workflow templates.

```sql
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft',
  phases JSONB NOT NULL,
  created_by UUID REFERENCES users(id),
  company_id UUID,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### quiz_results
Stores quiz attempts and scores.

```sql
CREATE TABLE quiz_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  phase INTEGER NOT NULL,
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  answers JSONB NOT NULL,
  passed BOOLEAN NOT NULL,
  attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### certificates
Certificate generation and tracking.

```sql
CREATE TABLE certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  certificate_type TEXT NOT NULL,
  certificate_number TEXT UNIQUE NOT NULL,
  issue_date DATE NOT NULL,
  expiry_date DATE,
  file_path TEXT NOT NULL,
  verified BOOLEAN DEFAULT true,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Security Tables

#### magic_links
Secure passwordless authentication for crew members.

```sql
CREATE TABLE magic_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### audit_log
Comprehensive activity logging for compliance.

```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Supporting Tables

#### manager_permissions
Defines which crew members a manager can access.

```sql
CREATE TABLE manager_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id UUID REFERENCES users(id) ON DELETE CASCADE,
  crew_member_id UUID REFERENCES users(id) ON DELETE CASCADE,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  granted_by UUID REFERENCES users(id),
  UNIQUE(manager_id, crew_member_id)
);
```

#### system_settings
System-wide configuration storage.

```sql
CREATE TABLE system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  is_public BOOLEAN DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Row Level Security (RLS)

### Overview
RLS provides database-level security, ensuring users can only access data they're authorized to see. This is implemented as a secondary security layer behind the API authentication.

### Policy Structure
Each table has three types of policies:

1. **Service Role Bypass**: Allows API operations with service role
2. **Role-Based Access**: Enforces permissions based on user roles
3. **Owner Access**: Allows users to access their own data

### Example Policies

#### Users Table
```sql
-- Service role bypass
CREATE POLICY "Service role has full access to users" ON users
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Admin access
CREATE POLICY "Admins can manage all users" ON users
  FOR ALL USING (auth.jwt_user_role() = 'admin');

-- Manager access to crew
CREATE POLICY "Managers can view their crew" ON users
  FOR SELECT USING (
    auth.jwt_user_role() = 'manager' AND
    id IN (
      SELECT crew_member_id FROM manager_permissions
      WHERE manager_id = auth.jwt_user_id()
    )
  );

-- Own data access
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (id = auth.jwt_user_id());
```

### RLS Helper Functions
```sql
-- Extract user ID from JWT
CREATE FUNCTION auth.jwt_user_id() RETURNS UUID AS $$
BEGIN
  RETURN (current_setting('request.jwt.claims', true)::json->>'userId')::uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Extract user role from JWT
CREATE FUNCTION auth.jwt_user_role() RETURNS TEXT AS $$
BEGIN
  RETURN current_setting('request.jwt.claims', true)::json->>'role';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Indexes and Performance

### Critical Indexes
```sql
-- User lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_company ON users(company_id);

-- Training progress
CREATE INDEX idx_training_sessions_user ON training_sessions(user_id);
CREATE INDEX idx_training_items_session ON training_items(session_id);

-- Quiz results
CREATE INDEX idx_quiz_results_user ON quiz_results(user_id, phase);

-- Audit logging
CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_created ON audit_log(created_at DESC);
```

### Query Optimization
- Use compound indexes for frequently joined queries
- Implement partial indexes for filtered queries
- Regular VACUUM and ANALYZE operations
- Monitor slow queries via Supabase dashboard

## Data Integrity

### Constraints
- Foreign key constraints with appropriate CASCADE options
- CHECK constraints for enum-like fields
- UNIQUE constraints for business rules
- NOT NULL constraints for required fields

### Triggers
```sql
-- Auto-update timestamps
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Audit log trigger
CREATE TRIGGER audit_user_changes
  AFTER INSERT OR UPDATE OR DELETE ON users
  FOR EACH ROW
  EXECUTE FUNCTION log_audit_event();
```

## Backup and Recovery

### Automatic Backups
- **Daily Backups**: Automated daily backups retained for 30 days
- **Point-in-Time Recovery**: Available for Pro plan
- **Geographic Redundancy**: Backups stored in multiple regions

### Manual Backup Commands
```bash
# Export schema
pg_dump --schema-only $DATABASE_URL > schema.sql

# Export data
pg_dump --data-only $DATABASE_URL > data.sql

# Full backup
pg_dump $DATABASE_URL > full_backup.sql
```

### Recovery Procedures
1. **Minor Issues**: Use point-in-time recovery in Supabase dashboard
2. **Major Issues**: Restore from daily backup
3. **Disaster Recovery**: Contact Supabase support for geographic failover

## Migration Management

### Migration Strategy
- Version-controlled migration files in `/supabase/migrations/`
- Sequential numeric prefixes for ordering
- Rollback scripts for each migration
- Testing in development before production

### Migration Commands
```bash
# Create new migration
supabase migration new migration_name

# Apply migrations
supabase db push

# Reset database (development only)
supabase db reset
```

## Monitoring and Maintenance

### Performance Monitoring
- **Query Performance**: Monitor via Supabase dashboard
- **Connection Pool**: Track active connections
- **Storage Usage**: Monitor table and index sizes
- **Slow Query Log**: Identify optimization opportunities

### Maintenance Tasks
- **Weekly**: VACUUM ANALYZE on high-traffic tables
- **Monthly**: Review and optimize indexes
- **Quarterly**: Audit security policies
- **Annually**: Review data retention policies

## Security Best Practices

### Access Control
1. **Principle of Least Privilege**: Users only get necessary permissions
2. **Defense in Depth**: Multiple security layers (API + RLS)
3. **Audit Everything**: Comprehensive logging of all changes
4. **Regular Reviews**: Periodic security audits

### Data Protection
- **Encryption at Rest**: Enabled by default in Supabase
- **Encryption in Transit**: TLS for all connections
- **Sensitive Data**: Consider field-level encryption for PII
- **Compliance**: GDPR-compliant data handling

## Troubleshooting

### Common Issues

#### RLS Permission Denied
```sql
-- Check RLS status
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- View policies
SELECT * FROM pg_policies WHERE tablename = 'users';
```

#### Performance Issues
```sql
-- Find slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Check table sizes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## Related Documentation
- [API Architecture](./api.md) - API layer integration
- [Security Architecture](./security.md) - Security implementation details
- [RLS Implementation Guide](../for-developers/architecture/database-design.md) - Detailed RLS documentation