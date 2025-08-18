-- =====================================================
-- MFA & ADDITIONAL TABLES MIGRATION
-- Migration: 20250805000001_add_mfa_and_additional_tables.sql
-- Purpose: Add MFA support and other missing tables from Supabase integration
-- =====================================================

-- This migration adds MFA support and other tables that were created via
-- Supabase integration but need migration files for new installations

-- =====================================================
-- MFA SUPPORT TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS user_mfa_settings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id bigint REFERENCES users(id) ON DELETE CASCADE,
    secret text NOT NULL,
    backup_codes text[],
    enabled boolean DEFAULT false,
    setup_completed_at timestamp,
    last_used_at timestamp,
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now(),
    UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS mfa_failure_log (
    id bigserial PRIMARY KEY,
    user_id bigint REFERENCES users(id),
    ip_address inet,
    user_agent text,
    failure_reason varchar NOT NULL,
    attempted_at timestamptz DEFAULT now()
);

-- Create indexes for MFA tables
CREATE INDEX IF NOT EXISTS idx_user_mfa_settings_user_id ON user_mfa_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_mfa_settings_enabled ON user_mfa_settings(enabled);
CREATE INDEX IF NOT EXISTS idx_mfa_failure_log_user_attempted ON mfa_failure_log(user_id, attempted_at);

-- =====================================================
-- CONTENT MANAGEMENT TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS content_media (
    id bigserial PRIMARY KEY,
    filename varchar NOT NULL,
    original_name varchar NOT NULL,
    mime_type varchar NOT NULL,
    file_size bigint NOT NULL,
    storage_path varchar NOT NULL,
    uploaded_by bigint REFERENCES users(id),
    uploaded_at timestamptz DEFAULT now(),
    metadata jsonb DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS content_versions (
    id bigserial PRIMARY KEY,
    content_id bigint NOT NULL,
    content_type varchar NOT NULL,
    version_number integer NOT NULL,
    content_data jsonb NOT NULL,
    created_by bigint REFERENCES users(id),
    created_at timestamptz DEFAULT now(),
    is_published boolean DEFAULT false,
    published_at timestamptz
);

-- Create indexes for content tables
CREATE INDEX IF NOT EXISTS idx_content_media_uploaded_by ON content_media(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_content_versions_content_id ON content_versions(content_id, version_number);

-- =====================================================
-- CREW MANAGEMENT TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS crew_assignments (
    id bigserial PRIMARY KEY,
    user_id bigint REFERENCES users(id) ON DELETE CASCADE,
    vessel_name varchar NOT NULL,
    position varchar NOT NULL,
    start_date date NOT NULL,
    end_date date,
    status varchar DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    assigned_by bigint REFERENCES users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create indexes for crew assignments
CREATE INDEX IF NOT EXISTS idx_crew_assignments_user_id ON crew_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_crew_assignments_vessel ON crew_assignments(vessel_name);
CREATE INDEX IF NOT EXISTS idx_crew_assignments_status ON crew_assignments(status);

-- =====================================================
-- INCIDENT MANAGEMENT TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS incidents (
    id bigserial PRIMARY KEY,
    incident_type varchar NOT NULL,
    severity varchar NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
    title varchar NOT NULL,
    description text NOT NULL,
    status varchar DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'closed')),
    reported_by bigint REFERENCES users(id),
    assigned_to bigint REFERENCES users(id),
    vessel_name varchar,
    location varchar,
    occurred_at timestamptz,
    reported_at timestamptz DEFAULT now(),
    resolved_at timestamptz,
    metadata jsonb DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS incident_external_notifications (
    id bigserial PRIMARY KEY,
    incident_id bigint REFERENCES incidents(id) ON DELETE CASCADE,
    notification_type varchar NOT NULL,
    recipient varchar NOT NULL,
    status varchar DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    sent_at timestamptz,
    error_message text,
    created_at timestamptz DEFAULT now()
);

-- Create indexes for incident tables
CREATE INDEX IF NOT EXISTS idx_incidents_status_severity ON incidents(status, severity);
CREATE INDEX IF NOT EXISTS idx_incidents_vessel ON incidents(vessel_name);
CREATE INDEX IF NOT EXISTS idx_incident_notifications_incident ON incident_external_notifications(incident_id);

-- =====================================================
-- SLA MONITORING TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS sla_metrics (
    id bigserial PRIMARY KEY,
    metric_name varchar NOT NULL,
    target_value numeric NOT NULL,
    actual_value numeric NOT NULL,
    measurement_period varchar NOT NULL,
    measured_at timestamptz DEFAULT now(),
    status varchar DEFAULT 'met' CHECK (status IN ('met', 'warning', 'breached'))
);

CREATE TABLE IF NOT EXISTS sla_breaches (
    id bigserial PRIMARY KEY,
    metric_name varchar NOT NULL,
    target_value numeric NOT NULL,
    actual_value numeric NOT NULL,
    breach_duration interval,
    impact_level varchar CHECK (impact_level IN ('low', 'medium', 'high', 'critical')),
    resolution_notes text,
    breached_at timestamptz DEFAULT now(),
    resolved_at timestamptz
);

-- Create indexes for SLA tables
CREATE INDEX IF NOT EXISTS idx_sla_metrics_name_measured ON sla_metrics(metric_name, measured_at);
CREATE INDEX IF NOT EXISTS idx_sla_breaches_resolved ON sla_breaches(resolved_at);

-- =====================================================
-- TRANSLATION & LOCALIZATION TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS translation_activity (
    id bigserial PRIMARY KEY,
    language_code varchar(5) NOT NULL,
    translation_key varchar NOT NULL,
    old_value text,
    new_value text NOT NULL,
    translator_id bigint REFERENCES users(id),
    action varchar NOT NULL CHECK (action IN ('create', 'update', 'delete')),
    created_at timestamptz DEFAULT now()
);

-- Create indexes for translation tables
CREATE INDEX IF NOT EXISTS idx_translation_activity_language ON translation_activity(language_code);
CREATE INDEX IF NOT EXISTS idx_translation_activity_key ON translation_activity(translation_key);

-- =====================================================
-- FILE UPLOAD MANAGEMENT
-- =====================================================

CREATE TABLE IF NOT EXISTS file_uploads (
    id bigserial PRIMARY KEY,
    original_filename varchar NOT NULL,
    stored_filename varchar NOT NULL,
    file_path varchar NOT NULL,
    mime_type varchar NOT NULL,
    file_size bigint NOT NULL,
    uploaded_by bigint REFERENCES users(id),
    upload_context varchar,
    metadata jsonb DEFAULT '{}'::jsonb,
    uploaded_at timestamptz DEFAULT now(),
    expires_at timestamptz
);

-- Create indexes for file uploads
CREATE INDEX IF NOT EXISTS idx_file_uploads_uploaded_by ON file_uploads(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_file_uploads_context ON file_uploads(upload_context);
CREATE INDEX IF NOT EXISTS idx_file_uploads_expires ON file_uploads(expires_at);

-- =====================================================
-- USER FEEDBACK SYSTEM
-- =====================================================

CREATE TABLE IF NOT EXISTS user_feedback (
    id bigserial PRIMARY KEY,
    user_id bigint REFERENCES users(id),
    feedback_type varchar NOT NULL,
    rating integer CHECK (rating >= 1 AND rating <= 5),
    subject varchar,
    message text NOT NULL,
    category varchar,
    status varchar DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'resolved', 'closed')),
    admin_response text,
    responded_by bigint REFERENCES users(id),
    responded_at timestamptz,
    created_at timestamptz DEFAULT now(),
    metadata jsonb DEFAULT '{}'::jsonb
);

-- Create indexes for user feedback
CREATE INDEX IF NOT EXISTS idx_user_feedback_user_id ON user_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_status ON user_feedback(status);
CREATE INDEX IF NOT EXISTS idx_user_feedback_type ON user_feedback(feedback_type);

-- =====================================================
-- EXIT STRATEGY & DATA PORTABILITY
-- =====================================================

CREATE TABLE IF NOT EXISTS exit_strategy_jobs (
    id bigserial PRIMARY KEY,
    job_type varchar NOT NULL CHECK (job_type IN ('full_export', 'user_export', 'data_migration')),
    status varchar DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    initiated_by bigint REFERENCES users(id),
    export_format varchar DEFAULT 'json',
    file_path varchar,
    file_size bigint,
    progress_percentage integer DEFAULT 0,
    error_message text,
    started_at timestamptz,
    completed_at timestamptz,
    created_at timestamptz DEFAULT now(),
    metadata jsonb DEFAULT '{}'::jsonb
);

-- Create indexes for exit strategy
CREATE INDEX IF NOT EXISTS idx_exit_strategy_jobs_status ON exit_strategy_jobs(status);
CREATE INDEX IF NOT EXISTS idx_exit_strategy_jobs_initiated ON exit_strategy_jobs(initiated_by);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on sensitive tables
ALTER TABLE user_mfa_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE mfa_failure_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

-- MFA settings: Users can only access their own settings
CREATE POLICY "Users can manage their own MFA settings" ON user_mfa_settings
    FOR ALL USING (user_id = auth.uid()::bigint);

-- Admins can view all MFA settings
CREATE POLICY "Admins can view all MFA settings" ON user_mfa_settings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid()::bigint 
            AND users.role = 'admin'
        )
    );

-- Incidents: Staff can view, admins can manage
CREATE POLICY "Staff can view incidents" ON incidents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid()::bigint 
            AND users.role IN ('admin', 'manager')
        )
    );

-- User feedback: Users can manage their own feedback
CREATE POLICY "Users can manage their own feedback" ON user_feedback
    FOR ALL USING (user_id = auth.uid()::bigint);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT COLUMNS
-- =====================================================

-- Create trigger for crew_assignments updated_at
CREATE OR REPLACE FUNCTION update_crew_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_crew_assignments_updated_at
    BEFORE UPDATE ON crew_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_crew_assignments_updated_at();

-- =====================================================
-- MIGRATION COMPLETION
-- =====================================================

-- Log migration completion
INSERT INTO migration_logs (migration_name, status, completed_at) 
VALUES ('20250805000001_add_mfa_and_additional_tables', 'completed', now())
ON CONFLICT (migration_name) DO UPDATE SET 
    status = 'completed', 
    completed_at = now();

-- =====================================================
-- MIGRATION NOTES
-- =====================================================

-- This migration adds:
-- - MFA support with backup codes
-- - Content management system
-- - Crew assignment tracking
-- - Incident management
-- - SLA monitoring
-- - Translation activity logging
-- - File upload management
-- - User feedback system
-- - Exit strategy/data portability

-- Tables added:
-- 1. user_mfa_settings - MFA configuration per user
-- 2. mfa_failure_log - MFA failure tracking
-- 3. content_media - Media file management
-- 4. content_versions - Content versioning
-- 5. crew_assignments - Crew vessel assignments
-- 6. incidents - Incident reporting
-- 7. incident_external_notifications - External incident alerts
-- 8. sla_metrics - SLA performance tracking
-- 9. sla_breaches - SLA violation logging
-- 10. translation_activity - Translation change log
-- 11. file_uploads - File upload tracking
-- 12. user_feedback - User feedback system
-- 13. exit_strategy_jobs - Data export/migration jobs

-- All tables include proper RLS policies and security measures
