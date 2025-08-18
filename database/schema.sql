-- =====================================================
-- MARITIME ONBOARDING SYSTEM - COMPLETE SCHEMA
-- =====================================================
-- This file contains the complete database schema for the Maritime Onboarding System
-- It creates all tables, indexes, functions, and triggers needed for the application
-- This replaces all individual migration files for clean installations

-- =====================================================
-- EXTENSIONS
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- ROLES AND PERMISSIONS
-- =====================================================

-- Create Supabase-compatible roles
DO $$
BEGIN
    -- Anonymous role for public access
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
        CREATE ROLE anon NOLOGIN NOINHERIT;
    END IF;

    -- Authenticated role for logged-in users
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated NOLOGIN NOINHERIT;
    END IF;

    -- Service role for backend operations
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'service_role') THEN
        CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
    END IF;
END
$$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;

-- =====================================================
-- CORE SYSTEM TABLES
-- =====================================================

-- Users table (core user management)
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(50) NOT NULL DEFAULT 'crew',
    position VARCHAR(100),
    preferred_language VARCHAR(10) DEFAULT 'en',
    status VARCHAR(20) DEFAULT 'active',
    is_active BOOLEAN DEFAULT true,
    password_hash TEXT,
    last_login TIMESTAMP WITH TIME ZONE,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    last_failed_attempt TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System settings table
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(255) UNIQUE NOT NULL,
    value TEXT,
    description TEXT,
    category VARCHAR(100) DEFAULT 'general',
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Managers table
CREATE TABLE IF NOT EXISTS managers (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    department VARCHAR(100),
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Manager permissions table
CREATE TABLE IF NOT EXISTS manager_permissions (
    id BIGSERIAL PRIMARY KEY,
    manager_id BIGINT REFERENCES managers(id) ON DELETE CASCADE,
    permission_type VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id BIGINT,
    granted_by BIGINT REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- AUTHENTICATION & SECURITY TABLES
-- =====================================================

-- Magic links for passwordless authentication
CREATE TABLE IF NOT EXISTS magic_links (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT false,
    used_at TIMESTAMP WITH TIME ZONE,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Token blacklist for security
CREATE TABLE IF NOT EXISTS token_blacklist (
    id BIGSERIAL PRIMARY KEY,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    user_id BIGINT REFERENCES users(id),
    reason VARCHAR(100),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit log for security tracking
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(100),
    record_id BIGINT,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Security events table
CREATE TABLE IF NOT EXISTS security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id VARCHAR(255) UNIQUE NOT NULL,
    type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    ip_address INET,
    user_agent TEXT,
    details JSONB DEFAULT '{}',
    threats TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MFA support tables
CREATE TABLE IF NOT EXISTS user_mfa_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    secret TEXT NOT NULL,
    backup_codes TEXT[],
    enabled BOOLEAN DEFAULT false,
    setup_completed_at TIMESTAMP,
    last_used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS mfa_failure_log (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    ip_address INET,
    user_agent TEXT,
    failure_reason VARCHAR NOT NULL,
    attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(255) NOT NULL UNIQUE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ip_address INET NOT NULL,
    user_agent TEXT,
    device_fingerprint VARCHAR(32),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    terminated_at TIMESTAMP WITH TIME ZONE,
    termination_reason VARCHAR(50),
    CONSTRAINT valid_termination CHECK (
        (is_active = true AND terminated_at IS NULL AND termination_reason IS NULL) OR
        (is_active = false AND terminated_at IS NOT NULL AND termination_reason IS NOT NULL)
    )
);

-- Refresh tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE,
    is_revoked BOOLEAN DEFAULT false,
    revoked_at TIMESTAMP WITH TIME ZONE,
    device_info JSONB DEFAULT '{}'
);

-- Password history table
CREATE TABLE IF NOT EXISTS password_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TRAINING & CONTENT MANAGEMENT TABLES
-- =====================================================

-- Training items table
CREATE TABLE IF NOT EXISTS training_items (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    content_type VARCHAR(50) NOT NULL,
    content_data JSONB DEFAULT '{}',
    duration_minutes INTEGER,
    difficulty_level VARCHAR(20) DEFAULT 'beginner',
    category VARCHAR(100),
    is_mandatory BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_by BIGINT REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Training sessions table
CREATE TABLE IF NOT EXISTS training_sessions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    training_item_id BIGINT REFERENCES training_items(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'not_started',
    progress_percentage INTEGER DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    score INTEGER,
    time_spent_minutes INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Content media table
CREATE TABLE IF NOT EXISTS content_media (
    id BIGSERIAL PRIMARY KEY,
    filename VARCHAR NOT NULL,
    original_name VARCHAR NOT NULL,
    mime_type VARCHAR NOT NULL,
    file_size BIGINT NOT NULL,
    storage_path VARCHAR NOT NULL,
    uploaded_by BIGINT REFERENCES users(id),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Content versions table
CREATE TABLE IF NOT EXISTS content_versions (
    id BIGSERIAL PRIMARY KEY,
    content_id BIGINT NOT NULL,
    content_type VARCHAR NOT NULL,
    version_number INTEGER NOT NULL,
    content_data JSONB NOT NULL,
    created_by BIGINT REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_published BOOLEAN DEFAULT false,
    published_at TIMESTAMP WITH TIME ZONE
);

-- =====================================================
-- WORKFLOW MANAGEMENT TABLES
-- =====================================================

-- Workflows table
CREATE TABLE IF NOT EXISTS workflows (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    is_mandatory BOOLEAN DEFAULT false,
    estimated_duration_minutes INTEGER,
    created_by BIGINT REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workflow phases table
CREATE TABLE IF NOT EXISTS workflow_phases (
    id BIGSERIAL PRIMARY KEY,
    workflow_id BIGINT REFERENCES workflows(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    phase_order INTEGER NOT NULL,
    is_required BOOLEAN DEFAULT true,
    estimated_duration_minutes INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workflow instances table
CREATE TABLE IF NOT EXISTS workflow_instances (
    id BIGSERIAL PRIMARY KEY,
    workflow_id BIGINT REFERENCES workflows(id) ON DELETE CASCADE,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'not_started',
    current_phase_id BIGINT REFERENCES workflow_phases(id),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workflow progress table
CREATE TABLE IF NOT EXISTS workflow_progress (
    id BIGSERIAL PRIMARY KEY,
    workflow_instance_id BIGINT REFERENCES workflow_instances(id) ON DELETE CASCADE,
    phase_id BIGINT REFERENCES workflow_phases(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'not_started',
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- QUIZ & ASSESSMENT TABLES
-- =====================================================

-- Quiz content table
CREATE TABLE IF NOT EXISTS quiz_content (
    id BIGSERIAL PRIMARY KEY,
    question TEXT NOT NULL,
    question_type VARCHAR(50) DEFAULT 'multiple_choice',
    options JSONB DEFAULT '[]',
    correct_answer JSONB NOT NULL,
    explanation TEXT,
    difficulty_level VARCHAR(20) DEFAULT 'medium',
    category VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_by BIGINT REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quiz results table
CREATE TABLE IF NOT EXISTS quiz_results (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    quiz_content_id BIGINT REFERENCES quiz_content(id) ON DELETE CASCADE,
    user_answer JSONB NOT NULL,
    is_correct BOOLEAN NOT NULL,
    time_taken_seconds INTEGER,
    attempt_number INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quiz history table
CREATE TABLE IF NOT EXISTS quiz_history (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    quiz_session_id UUID DEFAULT gen_random_uuid(),
    total_questions INTEGER NOT NULL,
    correct_answers INTEGER NOT NULL,
    score_percentage DECIMAL(5,2) NOT NULL,
    time_taken_minutes INTEGER,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- CREW MANAGEMENT TABLES
-- =====================================================

-- Crew assignments table
CREATE TABLE IF NOT EXISTS crew_assignments (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    vessel_name VARCHAR NOT NULL,
    position VARCHAR NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    status VARCHAR DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    assigned_by BIGINT REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- FORMS & DOCUMENTS TABLES
-- =====================================================

-- Forms table
CREATE TABLE IF NOT EXISTS forms (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    form_schema JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    version INTEGER DEFAULT 1,
    created_by BIGINT REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Certificates table
CREATE TABLE IF NOT EXISTS certificates (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    certificate_type VARCHAR(100) NOT NULL,
    certificate_name VARCHAR(255) NOT NULL,
    issued_date DATE NOT NULL,
    expiry_date DATE,
    certificate_data JSONB DEFAULT '{}',
    file_path VARCHAR(500),
    issued_by BIGINT REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- MONITORING & LOGGING TABLES
-- =====================================================

-- API logs table
CREATE TABLE IF NOT EXISTS api_logs (
    id BIGSERIAL PRIMARY KEY,
    method VARCHAR(10) NOT NULL,
    endpoint VARCHAR(500) NOT NULL,
    status_code INTEGER NOT NULL,
    response_time_ms INTEGER,
    user_id BIGINT REFERENCES users(id),
    ip_address INET,
    user_agent TEXT,
    request_body JSONB,
    response_body JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Error logs table
CREATE TABLE IF NOT EXISTS error_logs (
    id BIGSERIAL PRIMARY KEY,
    error_type VARCHAR(100) NOT NULL,
    error_message TEXT NOT NULL,
    stack_trace TEXT,
    user_id BIGINT REFERENCES users(id),
    endpoint VARCHAR(500),
    request_data JSONB,
    severity VARCHAR(20) DEFAULT 'error',
    resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email logs table
CREATE TABLE IF NOT EXISTS email_logs (
    id BIGSERIAL PRIMARY KEY,
    recipient_email VARCHAR(255) NOT NULL,
    sender_email VARCHAR(255),
    subject VARCHAR(500),
    email_type VARCHAR(100),
    status VARCHAR(50) DEFAULT 'pending',
    sent_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    user_id BIGINT REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email notifications table
CREATE TABLE IF NOT EXISTS email_notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    body TEXT NOT NULL,
    email_type VARCHAR(100),
    status VARCHAR(50) DEFAULT 'pending',
    scheduled_for TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- FILE MANAGEMENT TABLES
-- =====================================================

-- File uploads table
CREATE TABLE IF NOT EXISTS file_uploads (
    id BIGSERIAL PRIMARY KEY,
    original_filename VARCHAR(255) NOT NULL,
    stored_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100),
    uploaded_by BIGINT REFERENCES users(id),
    upload_purpose VARCHAR(100),
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INTERNATIONALIZATION TABLES
-- =====================================================

-- Maritime terminology table
CREATE TABLE IF NOT EXISTS maritime_terminology (
    id BIGSERIAL PRIMARY KEY,
    term_key VARCHAR(255) UNIQUE NOT NULL,
    english_term VARCHAR(500) NOT NULL,
    definition TEXT,
    category VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Translation memory table
CREATE TABLE IF NOT EXISTS translation_memory (
    id BIGSERIAL PRIMARY KEY,
    source_text TEXT NOT NULL,
    target_text TEXT NOT NULL,
    source_language VARCHAR(10) NOT NULL,
    target_language VARCHAR(10) NOT NULL,
    context VARCHAR(255),
    quality_score DECIMAL(3,2),
    created_by BIGINT REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- SYSTEM NOTIFICATION TABLES
-- =====================================================

-- System notifications table
CREATE TABLE IF NOT EXISTS system_notifications (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    notification_type VARCHAR(50) DEFAULT 'info',
    target_audience VARCHAR(50) DEFAULT 'all',
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_by BIGINT REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Feature flags table
CREATE TABLE IF NOT EXISTS feature_flags (
    id BIGSERIAL PRIMARY KEY,
    flag_name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_enabled BOOLEAN DEFAULT false,
    target_audience JSONB DEFAULT '{}',
    rollout_percentage INTEGER DEFAULT 0,
    created_by BIGINT REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- User indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- Authentication indexes
CREATE INDEX IF NOT EXISTS idx_magic_links_token ON magic_links(token);
CREATE INDEX IF NOT EXISTS idx_magic_links_user_id ON magic_links(user_id);
CREATE INDEX IF NOT EXISTS idx_magic_links_expires_at ON magic_links(expires_at);
CREATE INDEX IF NOT EXISTS idx_token_blacklist_token_hash ON token_blacklist(token_hash);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id ON user_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);

-- Security indexes
CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(type);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_table_name ON audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);

-- MFA indexes
CREATE INDEX IF NOT EXISTS idx_user_mfa_settings_user_id ON user_mfa_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_mfa_settings_enabled ON user_mfa_settings(enabled);
CREATE INDEX IF NOT EXISTS idx_mfa_failure_log_user_attempted ON mfa_failure_log(user_id, attempted_at);

-- Training indexes
CREATE INDEX IF NOT EXISTS idx_training_items_category ON training_items(category);
CREATE INDEX IF NOT EXISTS idx_training_items_is_active ON training_items(is_active);
CREATE INDEX IF NOT EXISTS idx_training_sessions_user_id ON training_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_training_sessions_status ON training_sessions(status);

-- Workflow indexes
CREATE INDEX IF NOT EXISTS idx_workflows_category ON workflows(category);
CREATE INDEX IF NOT EXISTS idx_workflows_is_active ON workflows(is_active);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_user_id ON workflow_instances(user_id);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_status ON workflow_instances(status);

-- Content indexes
CREATE INDEX IF NOT EXISTS idx_content_media_uploaded_by ON content_media(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_content_versions_content_id ON content_versions(content_id, version_number);

-- Crew management indexes
CREATE INDEX IF NOT EXISTS idx_crew_assignments_user_id ON crew_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_crew_assignments_vessel ON crew_assignments(vessel_name);
CREATE INDEX IF NOT EXISTS idx_crew_assignments_status ON crew_assignments(status);

-- Quiz indexes
CREATE INDEX IF NOT EXISTS idx_quiz_content_category ON quiz_content(category);
CREATE INDEX IF NOT EXISTS idx_quiz_content_is_active ON quiz_content(is_active);
CREATE INDEX IF NOT EXISTS idx_quiz_results_user_id ON quiz_results(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_history_user_id ON quiz_history(user_id);

-- Monitoring indexes
CREATE INDEX IF NOT EXISTS idx_api_logs_endpoint ON api_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_logs_status_code ON api_logs(status_code);
CREATE INDEX IF NOT EXISTS idx_api_logs_created_at ON api_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_error_logs_error_type ON error_logs(error_type);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON error_logs(resolved);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_notifications_status ON email_notifications(status);

-- System indexes
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);
CREATE INDEX IF NOT EXISTS idx_feature_flags_flag_name ON feature_flags(flag_name);
CREATE INDEX IF NOT EXISTS idx_feature_flags_is_enabled ON feature_flags(is_enabled);

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to relevant tables
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_system_settings_updated_at ON system_settings;
CREATE TRIGGER update_system_settings_updated_at
    BEFORE UPDATE ON system_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_managers_updated_at ON managers;
CREATE TRIGGER update_managers_updated_at
    BEFORE UPDATE ON managers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_training_items_updated_at ON training_items;
CREATE TRIGGER update_training_items_updated_at
    BEFORE UPDATE ON training_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_training_sessions_updated_at ON training_sessions;
CREATE TRIGGER update_training_sessions_updated_at
    BEFORE UPDATE ON training_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_workflows_updated_at ON workflows;
CREATE TRIGGER update_workflows_updated_at
    BEFORE UPDATE ON workflows
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_workflow_phases_updated_at ON workflow_phases;
CREATE TRIGGER update_workflow_phases_updated_at
    BEFORE UPDATE ON workflow_phases
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_workflow_instances_updated_at ON workflow_instances;
CREATE TRIGGER update_workflow_instances_updated_at
    BEFORE UPDATE ON workflow_instances
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_workflow_progress_updated_at ON workflow_progress;
CREATE TRIGGER update_workflow_progress_updated_at
    BEFORE UPDATE ON workflow_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_quiz_content_updated_at ON quiz_content;
CREATE TRIGGER update_quiz_content_updated_at
    BEFORE UPDATE ON quiz_content
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_crew_assignments_updated_at ON crew_assignments;
CREATE TRIGGER update_crew_assignments_updated_at
    BEFORE UPDATE ON crew_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_feature_flags_updated_at ON feature_flags;
CREATE TRIGGER update_feature_flags_updated_at
    BEFORE UPDATE ON feature_flags
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to cleanup expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
    temp_count INTEGER;
BEGIN
    DELETE FROM token_blacklist WHERE expires_at < NOW();
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;

    DELETE FROM magic_links WHERE expires_at < NOW() AND used = false;
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;

    DELETE FROM refresh_tokens WHERE expires_at < NOW();
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to check if account is locked
CREATE OR REPLACE FUNCTION is_account_locked(user_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    user_record RECORD;
BEGIN
    SELECT failed_login_attempts, locked_until
    INTO user_record
    FROM users
    WHERE email = user_email AND is_active = true;

    -- If user doesn't exist, return false
    IF NOT FOUND THEN
        RETURN false;
    END IF;

    -- Check if account is currently locked
    IF user_record.locked_until IS NOT NULL AND user_record.locked_until > NOW() THEN
        RETURN true;
    END IF;

    RETURN false;
END;
$$ LANGUAGE plpgsql;

-- Function to record failed login attempt
CREATE OR REPLACE FUNCTION record_failed_login(
    user_email TEXT,
    client_ip INET DEFAULT NULL,
    client_user_agent TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    user_record RECORD;
    max_attempts INTEGER := 5;
    lockout_minutes INTEGER := 30;
    new_attempts INTEGER;
    lockout_time TIMESTAMP WITH TIME ZONE;
    result JSON;
BEGIN
    -- Get lockout settings
    SELECT value::INTEGER INTO max_attempts
    FROM system_settings
    WHERE key = 'max_login_attempts'
    LIMIT 1;

    SELECT value::INTEGER INTO lockout_minutes
    FROM system_settings
    WHERE key = 'lockout_duration_minutes'
    LIMIT 1;

    -- Use defaults if settings not found
    max_attempts := COALESCE(max_attempts, 5);
    lockout_minutes := COALESCE(lockout_minutes, 30);

    -- Get current user record
    SELECT id, failed_login_attempts, locked_until
    INTO user_record
    FROM users
    WHERE email = user_email;

    -- If user doesn't exist, create a dummy response to prevent user enumeration
    IF NOT FOUND THEN
        result := json_build_object(
            'success', false,
            'attempts', max_attempts,
            'locked', false,
            'error', 'User not found'
        );
        RETURN result;
    END IF;

    -- Increment failed attempts
    new_attempts := COALESCE(user_record.failed_login_attempts, 0) + 1;

    -- Check if account should be locked
    IF new_attempts >= max_attempts THEN
        lockout_time := NOW() + (lockout_minutes || ' minutes')::INTERVAL;

        UPDATE users
        SET failed_login_attempts = new_attempts,
            locked_until = lockout_time,
            last_failed_attempt = NOW()
        WHERE email = user_email;

        result := json_build_object(
            'success', false,
            'attempts', new_attempts,
            'locked', true,
            'locked_until', lockout_time
        );
    ELSE
        UPDATE users
        SET failed_login_attempts = new_attempts,
            last_failed_attempt = NOW()
        WHERE email = user_email;

        result := json_build_object(
            'success', false,
            'attempts', new_attempts,
            'locked', false
        );
    END IF;

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to record successful login (clears failed attempts)
CREATE OR REPLACE FUNCTION record_successful_login(
    user_email TEXT,
    client_ip INET DEFAULT NULL,
    client_user_agent TEXT DEFAULT NULL
)
RETURNS JSON AS $$
BEGIN
    UPDATE users
    SET failed_login_attempts = 0,
        locked_until = NULL,
        last_login = NOW()
    WHERE email = user_email;

    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SCHEMA COMPLETE
-- =====================================================

-- Log schema creation
INSERT INTO system_settings (key, value, description, category) VALUES
('schema_version', '1.0.0', 'Current database schema version', 'system'),
('schema_created_at', NOW()::text, 'When the schema was created', 'system'),
('total_tables_created', '30+', 'Number of tables in the schema', 'system')
ON CONFLICT (key) DO UPDATE SET
value = EXCLUDED.value,
updated_at = NOW();
