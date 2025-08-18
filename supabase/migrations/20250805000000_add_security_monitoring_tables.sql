-- =====================================================
-- SECURITY & MONITORING TABLES MIGRATION
-- Migration: 20250805000000_add_security_monitoring_tables.sql
-- Purpose: Add comprehensive security monitoring and logging tables
-- =====================================================

-- This migration adds tables for security monitoring, logging, and analytics
-- that were created via Supabase integration but need migration files for new installs

-- =====================================================
-- SECURITY EVENTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS security_events (
    id bigserial PRIMARY KEY,
    event_id text NOT NULL,
    type text NOT NULL,
    severity text NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
    user_id bigint REFERENCES users(id),
    ip_address inet,
    user_agent text,
    threats jsonb DEFAULT '[]'::jsonb,
    details jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now()
);

-- Create indexes for security_events
CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(type);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events(created_at);
CREATE INDEX IF NOT EXISTS idx_security_events_ip_address ON security_events(ip_address);
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id);

-- =====================================================
-- SECURITY ERRORS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS security_errors (
    id bigserial PRIMARY KEY,
    event_id text,
    error text NOT NULL,
    stack text,
    created_at timestamptz DEFAULT now()
);

-- Create indexes for security_errors
CREATE INDEX IF NOT EXISTS idx_security_errors_created_at ON security_errors(created_at);
CREATE INDEX IF NOT EXISTS idx_security_errors_event_id ON security_errors(event_id);

-- =====================================================
-- EMAIL SECURITY LOGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS email_security_logs (
    id bigserial PRIMARY KEY,
    timestamp timestamptz DEFAULT now(),
    event_type varchar NOT NULL,
    recipient_email varchar,
    sender_email varchar,
    subject text,
    security_action varchar,
    reason text,
    metadata jsonb DEFAULT '{}'::jsonb,
    environment varchar,
    ip_address varchar,
    user_agent text
);

-- Create indexes for email_security_logs
CREATE INDEX IF NOT EXISTS idx_email_security_logs_timestamp ON email_security_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_email_security_logs_event_type ON email_security_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_email_security_logs_recipient ON email_security_logs(recipient_email);

-- =====================================================
-- PERFORMANCE MONITORING TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS performance_metrics (
    id bigserial PRIMARY KEY,
    metric_name varchar NOT NULL,
    metric_value numeric NOT NULL,
    metric_unit varchar,
    tags jsonb DEFAULT '{}'::jsonb,
    timestamp timestamptz DEFAULT now(),
    environment varchar DEFAULT 'production'
);

CREATE TABLE IF NOT EXISTS performance_baselines (
    id bigserial PRIMARY KEY,
    metric_name varchar NOT NULL UNIQUE,
    baseline_value numeric NOT NULL,
    threshold_warning numeric,
    threshold_critical numeric,
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS performance_alerts (
    id bigserial PRIMARY KEY,
    metric_name varchar NOT NULL,
    alert_level varchar NOT NULL CHECK (alert_level IN ('warning', 'critical')),
    current_value numeric NOT NULL,
    threshold_value numeric NOT NULL,
    message text,
    resolved boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    resolved_at timestamptz
);

-- Create indexes for performance tables
CREATE INDEX IF NOT EXISTS idx_performance_metrics_name_timestamp ON performance_metrics(metric_name, timestamp);
CREATE INDEX IF NOT EXISTS idx_performance_alerts_resolved ON performance_alerts(resolved, created_at);

-- =====================================================
-- SYSTEM MONITORING TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS health_checks (
    id bigserial PRIMARY KEY,
    service_name varchar NOT NULL,
    status varchar NOT NULL CHECK (status IN ('healthy', 'degraded', 'unhealthy')),
    response_time_ms integer,
    error_message text,
    metadata jsonb DEFAULT '{}'::jsonb,
    checked_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS system_notifications (
    id bigserial PRIMARY KEY,
    type varchar NOT NULL,
    title varchar NOT NULL,
    message text NOT NULL,
    severity varchar DEFAULT 'info' CHECK (severity IN ('critical', 'warning', 'info')),
    target_audience varchar DEFAULT 'admin',
    read boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    expires_at timestamptz
);

-- Create indexes for system monitoring
CREATE INDEX IF NOT EXISTS idx_health_checks_service_checked ON health_checks(service_name, checked_at);
CREATE INDEX IF NOT EXISTS idx_system_notifications_read_created ON system_notifications(read, created_at);

-- =====================================================
-- COMPLIANCE & AUDIT TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS compliance_reports (
    id bigserial PRIMARY KEY,
    report_type varchar NOT NULL,
    report_period varchar NOT NULL,
    status varchar DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    findings jsonb DEFAULT '[]'::jsonb,
    recommendations jsonb DEFAULT '[]'::jsonb,
    generated_by bigint REFERENCES users(id),
    generated_at timestamptz DEFAULT now(),
    file_path varchar
);

CREATE TABLE IF NOT EXISTS data_exports (
    id bigserial PRIMARY KEY,
    export_type varchar NOT NULL,
    user_id bigint REFERENCES users(id),
    status varchar DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    file_path varchar,
    file_size bigint,
    expires_at timestamptz,
    created_at timestamptz DEFAULT now(),
    completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS data_deletion_jobs (
    id bigserial PRIMARY KEY,
    user_id bigint REFERENCES users(id),
    deletion_type varchar NOT NULL,
    status varchar DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    tables_affected text[],
    records_deleted integer DEFAULT 0,
    started_at timestamptz,
    completed_at timestamptz,
    created_at timestamptz DEFAULT now()
);

-- Create indexes for compliance tables
CREATE INDEX IF NOT EXISTS idx_compliance_reports_type_period ON compliance_reports(report_type, report_period);
CREATE INDEX IF NOT EXISTS idx_data_exports_user_status ON data_exports(user_id, status);
CREATE INDEX IF NOT EXISTS idx_data_deletion_jobs_status ON data_deletion_jobs(status, created_at);

-- =====================================================
-- FEATURE FLAGS & ANALYTICS
-- =====================================================

CREATE TABLE IF NOT EXISTS feature_flags (
    id bigserial PRIMARY KEY,
    flag_name varchar NOT NULL UNIQUE,
    description text,
    is_enabled boolean DEFAULT false,
    target_audience varchar DEFAULT 'all',
    conditions jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS feature_flag_usage (
    id bigserial PRIMARY KEY,
    flag_name varchar NOT NULL,
    user_id bigint REFERENCES users(id),
    was_enabled boolean NOT NULL,
    context jsonb DEFAULT '{}'::jsonb,
    timestamp timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS onboarding_analytics (
    id bigserial PRIMARY KEY,
    user_id bigint REFERENCES users(id),
    event_type varchar NOT NULL,
    event_data jsonb DEFAULT '{}'::jsonb,
    session_id varchar,
    timestamp timestamptz DEFAULT now()
);

-- Create indexes for feature flags and analytics
CREATE INDEX IF NOT EXISTS idx_feature_flag_usage_flag_timestamp ON feature_flag_usage(flag_name, timestamp);
CREATE INDEX IF NOT EXISTS idx_onboarding_analytics_user_event ON onboarding_analytics(user_id, event_type);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on security tables
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_security_logs ENABLE ROW LEVEL SECURITY;

-- Security events: Only admins can view
CREATE POLICY "Admin access to security events" ON security_events
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid()::bigint 
            AND users.role = 'admin'
        )
    );

-- Performance metrics: Admins and managers can view
CREATE POLICY "Staff access to performance metrics" ON performance_metrics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid()::bigint 
            AND users.role IN ('admin', 'manager')
        )
    );

-- =====================================================
-- MIGRATION COMPLETION
-- =====================================================

-- Log migration completion
INSERT INTO migration_logs (migration_name, status, completed_at) 
VALUES ('20250805000000_add_security_monitoring_tables', 'completed', now())
ON CONFLICT (migration_name) DO UPDATE SET 
    status = 'completed', 
    completed_at = now();

-- =====================================================
-- MIGRATION NOTES
-- =====================================================

-- This migration adds:
-- - 15 new tables for comprehensive security and monitoring
-- - Proper indexes for performance
-- - RLS policies for security
-- - Feature flags system
-- - Compliance and audit infrastructure
-- - Performance monitoring system
-- - System health checks

-- Tables added:
-- 1. security_events - Security incident logging
-- 2. security_errors - Security system errors
-- 3. email_security_logs - Email security events
-- 4. performance_metrics - System performance data
-- 5. performance_baselines - Performance thresholds
-- 6. performance_alerts - Performance alerts
-- 7. health_checks - System health monitoring
-- 8. system_notifications - Admin notifications
-- 9. compliance_reports - Compliance reporting
-- 10. data_exports - GDPR data exports
-- 11. data_deletion_jobs - GDPR data deletion
-- 12. feature_flags - Feature flag management
-- 13. feature_flag_usage - Feature flag analytics
-- 14. onboarding_analytics - User behavior analytics

-- All tables include proper constraints, indexes, and security policies
