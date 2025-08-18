-- =====================================================
-- EMAIL LOGGING COMPLIANCE & SECURITY ENHANCEMENT
-- Migration: 20250806000000_enhance_email_logging_compliance.sql
-- Purpose: Add audit context and data retention to email logging
-- =====================================================

-- COMPLIANCE REQUIREMENTS ADDRESSED:
-- 1. Data retention limits with automatic purging
-- 2. Complete audit trail with actor identification
-- 3. GDPR compliance with user data lifecycle management
-- 4. Security monitoring with IP and device tracking

-- =====================================================
-- PHASE 1: ENHANCE EMAIL_NOTIFICATIONS TABLE
-- =====================================================

-- Add audit context and retention columns to existing email_notifications table
ALTER TABLE email_notifications 
ADD COLUMN IF NOT EXISTS user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS actor_email TEXT,
ADD COLUMN IF NOT EXISTS ip_address INET,
ADD COLUMN IF NOT EXISTS user_agent TEXT,
ADD COLUMN IF NOT EXISTS client_context JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS created_by TEXT DEFAULT 'system',
ADD COLUMN IF NOT EXISTS retention_category TEXT DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add comments for documentation
COMMENT ON COLUMN email_notifications.user_id IS 'User who triggered the email (for audit trail)';
COMMENT ON COLUMN email_notifications.actor_email IS 'Email of the person performing the action';
COMMENT ON COLUMN email_notifications.ip_address IS 'Client IP address for security tracking';
COMMENT ON COLUMN email_notifications.user_agent IS 'Client user agent for device identification';
COMMENT ON COLUMN email_notifications.client_context IS 'Additional client context (headers, etc.)';
COMMENT ON COLUMN email_notifications.expires_at IS 'When this log entry should be automatically deleted';
COMMENT ON COLUMN email_notifications.created_by IS 'System or service that created this log entry';
COMMENT ON COLUMN email_notifications.retention_category IS 'Data retention category (standard, extended, minimal)';

-- =====================================================
-- PHASE 2: ENHANCE EXISTING EMAIL_LOGS TABLE
-- =====================================================

-- Add missing audit context and retention columns to existing email_logs table
ALTER TABLE email_logs
ADD COLUMN IF NOT EXISTS body_preview TEXT,
ADD COLUMN IF NOT EXISTS user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS actor_email TEXT,
ADD COLUMN IF NOT EXISTS ip_address INET,
ADD COLUMN IF NOT EXISTS user_agent TEXT,
ADD COLUMN IF NOT EXISTS client_context JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS retention_category TEXT DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS created_by TEXT DEFAULT 'system',
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add constraints to existing table
ALTER TABLE email_logs
ADD CONSTRAINT IF NOT EXISTS email_logs_status_check
CHECK (status IN ('pending', 'sent', 'failed', 'bounced', 'delivered'));

ALTER TABLE email_logs
ADD CONSTRAINT IF NOT EXISTS email_logs_retention_category_check
CHECK (retention_category IN ('minimal', 'standard', 'extended', 'permanent'));

-- Add comments for documentation
COMMENT ON COLUMN email_logs.body_preview IS 'First 500 characters of email body for debugging';
COMMENT ON COLUMN email_logs.user_id IS 'User who triggered the email (for audit trail)';
COMMENT ON COLUMN email_logs.actor_email IS 'Email of the person performing the action';
COMMENT ON COLUMN email_logs.ip_address IS 'Client IP address for security tracking';
COMMENT ON COLUMN email_logs.user_agent IS 'Client user agent for device identification';
COMMENT ON COLUMN email_logs.client_context IS 'Additional client context (headers, etc.)';
COMMENT ON COLUMN email_logs.expires_at IS 'When this log entry should be automatically deleted';
COMMENT ON COLUMN email_logs.retention_category IS 'Data retention category (minimal, standard, extended, permanent)';
COMMENT ON COLUMN email_logs.created_by IS 'System or service that created this log entry';

-- =====================================================
-- PHASE 3: PERFORMANCE INDEXES
-- =====================================================

-- Indexes for email_notifications (existing table)
CREATE INDEX IF NOT EXISTS idx_email_notifications_expires_at 
ON email_notifications(expires_at) WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_email_notifications_user_id 
ON email_notifications(user_id) WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_email_notifications_created_at 
ON email_notifications(created_at);

CREATE INDEX IF NOT EXISTS idx_email_notifications_retention_cleanup 
ON email_notifications(expires_at, retention_category) WHERE expires_at IS NOT NULL;

-- Indexes for email_logs (new table)
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient_type 
ON email_logs(recipient_email, email_type);

CREATE INDEX IF NOT EXISTS idx_email_logs_status_created 
ON email_logs(status, created_at);

CREATE INDEX IF NOT EXISTS idx_email_logs_expires_at 
ON email_logs(expires_at);

CREATE INDEX IF NOT EXISTS idx_email_logs_user_id 
ON email_logs(user_id) WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_email_logs_retention_cleanup 
ON email_logs(expires_at, retention_category);

CREATE INDEX IF NOT EXISTS idx_email_logs_actor_email 
ON email_logs(actor_email) WHERE actor_email IS NOT NULL;

-- =====================================================
-- PHASE 4: DATA RETENTION FUNCTIONS
-- =====================================================

-- Function to calculate retention expiration based on category
CREATE OR REPLACE FUNCTION calculate_email_retention_expiration(
  retention_category TEXT DEFAULT 'standard'
) RETURNS TIMESTAMPTZ AS $$
DECLARE
  retention_days INTEGER;
BEGIN
  -- Set retention periods based on category
  CASE retention_category
    WHEN 'minimal' THEN retention_days := 30;    -- 30 days for non-critical emails
    WHEN 'standard' THEN retention_days := 90;   -- 90 days for normal business emails
    WHEN 'extended' THEN retention_days := 365;  -- 1 year for important notifications
    WHEN 'permanent' THEN RETURN NULL;           -- Never expire
    ELSE retention_days := 90; -- Default to standard
  END CASE;
  
  RETURN NOW() + (retention_days || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to cleanup expired email logs
CREATE OR REPLACE FUNCTION cleanup_expired_email_logs(
  batch_size INTEGER DEFAULT 1000,
  max_batches INTEGER DEFAULT 10
) RETURNS TABLE(
  table_name TEXT,
  deleted_count BIGINT,
  batch_count INTEGER
) AS $$
DECLARE
  batch_num INTEGER := 0;
  deleted_notifications BIGINT := 0;
  deleted_logs BIGINT := 0;
  temp_deleted BIGINT;
BEGIN
  -- Cleanup email_notifications table
  WHILE batch_num < max_batches LOOP
    DELETE FROM email_notifications 
    WHERE id IN (
      SELECT id FROM email_notifications 
      WHERE expires_at IS NOT NULL 
        AND expires_at < NOW()
      LIMIT batch_size
    );
    
    GET DIAGNOSTICS temp_deleted = ROW_COUNT;
    deleted_notifications := deleted_notifications + temp_deleted;
    batch_num := batch_num + 1;
    
    -- Exit if no more rows to delete
    IF temp_deleted = 0 THEN
      EXIT;
    END IF;
  END LOOP;
  
  -- Reset for email_logs table
  batch_num := 0;
  
  -- Cleanup email_logs table
  WHILE batch_num < max_batches LOOP
    DELETE FROM email_logs 
    WHERE id IN (
      SELECT id FROM email_logs 
      WHERE expires_at < NOW()
      LIMIT batch_size
    );
    
    GET DIAGNOSTICS temp_deleted = ROW_COUNT;
    deleted_logs := deleted_logs + temp_deleted;
    batch_num := batch_num + 1;
    
    -- Exit if no more rows to delete
    IF temp_deleted = 0 THEN
      EXIT;
    END IF;
  END LOOP;
  
  -- Return results
  RETURN QUERY VALUES 
    ('email_notifications', deleted_notifications, batch_num),
    ('email_logs', deleted_logs, batch_num);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PHASE 5: TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

-- Trigger to automatically set expires_at for email_notifications
CREATE OR REPLACE FUNCTION set_email_notification_expiration()
RETURNS TRIGGER AS $$
BEGIN
  -- Only set expiration if not already set
  IF NEW.expires_at IS NULL THEN
    NEW.expires_at := calculate_email_retention_expiration(
      COALESCE(NEW.retention_category, 'standard')
    );
  END IF;
  
  -- Update timestamp
  NEW.updated_at := NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for email_notifications
DROP TRIGGER IF EXISTS trigger_email_notifications_expiration ON email_notifications;
CREATE TRIGGER trigger_email_notifications_expiration
  BEFORE INSERT OR UPDATE ON email_notifications
  FOR EACH ROW
  EXECUTE FUNCTION set_email_notification_expiration();

-- Trigger for email_logs (set expiration and update timestamp)
CREATE OR REPLACE FUNCTION set_email_log_expiration()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate expiration for new records or when retention category changes
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.retention_category IS DISTINCT FROM NEW.retention_category) THEN
    -- Only set expiration if not already set or if retention category changed
    IF NEW.expires_at IS NULL OR (TG_OP = 'UPDATE' AND OLD.retention_category IS DISTINCT FROM NEW.retention_category) THEN
      NEW.expires_at := calculate_email_retention_expiration(
        COALESCE(NEW.retention_category, 'standard')
      );
    END IF;
  END IF;

  -- Update timestamp
  NEW.updated_at := NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for email_logs
DROP TRIGGER IF EXISTS trigger_email_logs_expiration ON email_logs;
CREATE TRIGGER trigger_email_logs_expiration
  BEFORE INSERT OR UPDATE ON email_logs
  FOR EACH ROW
  EXECUTE FUNCTION set_email_log_expiration();

-- =====================================================
-- PHASE 6: GDPR COMPLIANCE FUNCTIONS
-- =====================================================

-- Function to delete all email logs for a specific user (GDPR right to be forgotten)
CREATE OR REPLACE FUNCTION delete_user_email_logs(target_user_id BIGINT)
RETURNS TABLE(
  table_name TEXT,
  deleted_count BIGINT
) AS $$
DECLARE
  deleted_notifications BIGINT;
  deleted_logs BIGINT;
BEGIN
  -- Delete from email_notifications
  DELETE FROM email_notifications WHERE user_id = target_user_id;
  GET DIAGNOSTICS deleted_notifications = ROW_COUNT;
  
  -- Delete from email_logs
  DELETE FROM email_logs WHERE user_id = target_user_id;
  GET DIAGNOSTICS deleted_logs = ROW_COUNT;
  
  -- Return results
  RETURN QUERY VALUES 
    ('email_notifications', deleted_notifications),
    ('email_logs', deleted_logs);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PHASE 7: MONITORING AND COMPLIANCE VIEWS
-- =====================================================

-- View for email retention compliance monitoring
CREATE OR REPLACE VIEW email_retention_status AS
SELECT 
  'email_notifications' as table_name,
  retention_category,
  COUNT(*) as total_records,
  COUNT(*) FILTER (WHERE expires_at IS NULL) as permanent_records,
  COUNT(*) FILTER (WHERE expires_at < NOW()) as expired_records,
  COUNT(*) FILTER (WHERE expires_at > NOW()) as active_records,
  MIN(created_at) as oldest_record,
  MAX(created_at) as newest_record
FROM email_notifications 
GROUP BY retention_category

UNION ALL

SELECT 
  'email_logs' as table_name,
  retention_category,
  COUNT(*) as total_records,
  COUNT(*) FILTER (WHERE retention_category = 'permanent') as permanent_records,
  COUNT(*) FILTER (WHERE expires_at < NOW()) as expired_records,
  COUNT(*) FILTER (WHERE expires_at > NOW()) as active_records,
  MIN(created_at) as oldest_record,
  MAX(created_at) as newest_record
FROM email_logs 
GROUP BY retention_category;

-- =====================================================
-- PHASE 8: SECURITY POLICIES (RLS)
-- =====================================================

-- Enable RLS on email_logs table
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own email logs
CREATE POLICY email_logs_user_access ON email_logs
  FOR SELECT
  USING (
    user_id = get_current_user_id() OR
    get_current_user_role() IN ('admin', 'manager')
  );

-- Policy: Only system and admins can insert email logs
CREATE POLICY email_logs_insert_policy ON email_logs
  FOR INSERT
  WITH CHECK (
    get_current_user_role() IN ('admin', 'manager') OR
    created_by = 'system'
  );

-- =====================================================
-- PHASE 9: DATA MIGRATION FOR EXISTING RECORDS
-- =====================================================

-- Set expiration dates for existing email_logs records that don't have them
UPDATE email_logs
SET expires_at = calculate_email_retention_expiration(
  COALESCE(retention_category, 'standard')
)
WHERE expires_at IS NULL;

-- Set expiration dates for existing email_notifications records that don't have them
UPDATE email_notifications
SET expires_at = calculate_email_retention_expiration(
  COALESCE(retention_category, 'standard')
)
WHERE expires_at IS NULL;

-- =====================================================
-- MIGRATION COMPLETION
-- =====================================================

-- Add migration log entry
INSERT INTO migration_logs (migration_name, environment, applied_by, notes)
VALUES (
  '20250806000000_enhance_email_logging_compliance',
  COALESCE(current_setting('app.environment', true), 'production'),
  COALESCE(current_setting('app.user', true), 'system'),
  'Enhanced email logging with audit context, data retention, and GDPR compliance features'
);

-- Migration completed successfully
-- Tables enhanced: email_notifications (existing), email_logs (new)
-- Features added: audit context, data retention, automatic cleanup, GDPR compliance
-- Performance: optimized indexes for cleanup and queries
-- Security: RLS policies for data access control
