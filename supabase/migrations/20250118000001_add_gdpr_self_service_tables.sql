-- GDPR Self-Service Tables Migration
-- Adds tables for user-initiated GDPR requests and compliance notifications

-- Create export_data table for storing actual export data
CREATE TABLE IF NOT EXISTS export_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id BIGINT NOT NULL REFERENCES data_exports(id) ON DELETE CASCADE,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Indexes
    CONSTRAINT export_data_request_id_unique UNIQUE (request_id)
);

-- Create compliance_notifications table for manual review processes
CREATE TABLE IF NOT EXISTS compliance_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(100) NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'medium',
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    request_id BIGINT,
    message TEXT NOT NULL,
    assigned_to VARCHAR(100),
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    resolved_by VARCHAR(100),
    resolution_notes TEXT,
    
    -- Constraints
    CONSTRAINT compliance_notifications_type_check 
        CHECK (type IN ('data_deletion_review', 'export_review', 'compliance_issue', 'audit_request')),
    CONSTRAINT compliance_notifications_priority_check 
        CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    CONSTRAINT compliance_notifications_status_check 
        CHECK (status IN ('pending', 'in_progress', 'resolved', 'escalated'))
);

-- Add missing columns to data_exports table if they don't exist
DO $$ 
BEGIN
    -- Add download tracking columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'data_exports' AND column_name = 'download_count') THEN
        ALTER TABLE data_exports ADD COLUMN download_count INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'data_exports' AND column_name = 'last_downloaded_at') THEN
        ALTER TABLE data_exports ADD COLUMN last_downloaded_at TIMESTAMPTZ;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'data_exports' AND column_name = 'expires_at') THEN
        ALTER TABLE data_exports ADD COLUMN expires_at TIMESTAMPTZ;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'data_exports' AND column_name = 'download_url') THEN
        ALTER TABLE data_exports ADD COLUMN download_url TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'data_exports' AND column_name = 'metadata') THEN
        ALTER TABLE data_exports ADD COLUMN metadata JSONB DEFAULT '{}';
    END IF;
END $$;

-- Add missing columns to data_deletions table if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'data_deletions' AND column_name = 'confirmation_text') THEN
        ALTER TABLE data_deletions ADD COLUMN confirmation_text TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'data_deletions' AND column_name = 'processed_by') THEN
        ALTER TABLE data_deletions ADD COLUMN processed_by VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'data_deletions' AND column_name = 'error_message') THEN
        ALTER TABLE data_deletions ADD COLUMN error_message TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'data_deletions' AND column_name = 'metadata') THEN
        ALTER TABLE data_deletions ADD COLUMN metadata JSONB DEFAULT '{}';
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_export_data_request_id ON export_data(request_id);
CREATE INDEX IF NOT EXISTS idx_compliance_notifications_type ON compliance_notifications(type);
CREATE INDEX IF NOT EXISTS idx_compliance_notifications_status ON compliance_notifications(status);
CREATE INDEX IF NOT EXISTS idx_compliance_notifications_priority ON compliance_notifications(priority);
CREATE INDEX IF NOT EXISTS idx_compliance_notifications_user_id ON compliance_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_compliance_notifications_created_at ON compliance_notifications(created_at);

-- Create indexes on new data_exports columns
CREATE INDEX IF NOT EXISTS idx_data_exports_expires_at ON data_exports(expires_at);
CREATE INDEX IF NOT EXISTS idx_data_exports_status_user ON data_exports(status, user_id);

-- Create indexes on new data_deletions columns
CREATE INDEX IF NOT EXISTS idx_data_deletions_status_user ON data_deletions(status, user_id);

-- Enable Row Level Security
ALTER TABLE export_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for export_data
-- Users can only access their own export data
CREATE POLICY "Users can access their own export data" ON export_data
    FOR ALL USING (
        request_id IN (
            SELECT id FROM data_exports WHERE user_id = auth.uid()
        )
    );

-- Admins can access all export data
CREATE POLICY "Admins can access all export data" ON export_data
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- RLS Policies for compliance_notifications
-- Only admins and compliance team can access notifications
CREATE POLICY "Admins can access all compliance notifications" ON compliance_notifications
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Users can only see notifications related to their own requests
CREATE POLICY "Users can see their own related notifications" ON compliance_notifications
    FOR SELECT USING (user_id = auth.uid());

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for compliance_notifications
DROP TRIGGER IF EXISTS update_compliance_notifications_updated_at ON compliance_notifications;
CREATE TRIGGER update_compliance_notifications_updated_at
    BEFORE UPDATE ON compliance_notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to automatically set export expiration
CREATE OR REPLACE FUNCTION set_export_expiration()
RETURNS TRIGGER AS $$
BEGIN
    -- Set expiration to 7 days from completion if not already set
    IF NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.expires_at IS NULL THEN
        NEW.expires_at = NOW() + INTERVAL '7 days';
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for automatic export expiration
DROP TRIGGER IF EXISTS set_data_export_expiration ON data_exports;
CREATE TRIGGER set_data_export_expiration
    BEFORE UPDATE ON data_exports
    FOR EACH ROW
    EXECUTE FUNCTION set_export_expiration();

-- Create function to clean up expired exports
CREATE OR REPLACE FUNCTION cleanup_expired_exports()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete expired export data
    DELETE FROM export_data 
    WHERE request_id IN (
        SELECT id FROM data_exports 
        WHERE expires_at < NOW() AND status = 'completed'
    );
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Update export requests to mark as expired
    UPDATE data_exports 
    SET status = 'expired', download_url = NULL
    WHERE expires_at < NOW() AND status = 'completed';
    
    RETURN deleted_count;
END;
$$ language 'plpgsql';

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON export_data TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON compliance_notifications TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Insert initial compliance notification for testing
INSERT INTO compliance_notifications (
    type,
    priority,
    message,
    assigned_to,
    created_at
) VALUES (
    'audit_request',
    'medium',
    'GDPR self-service portal has been deployed and is ready for use. Initial compliance review recommended.',
    'compliance-team',
    NOW()
) ON CONFLICT DO NOTHING;

-- Add comment for documentation
COMMENT ON TABLE export_data IS 'Stores the actual exported user data for GDPR compliance';
COMMENT ON TABLE compliance_notifications IS 'Manages notifications for compliance team review and manual processes';
COMMENT ON FUNCTION cleanup_expired_exports() IS 'Cleans up expired export data to maintain storage efficiency and privacy';
COMMENT ON FUNCTION set_export_expiration() IS 'Automatically sets expiration date for completed exports';

-- Create view for GDPR request summary
CREATE OR REPLACE VIEW gdpr_request_summary AS
SELECT 
    u.id as user_id,
    u.email,
    u.first_name,
    u.last_name,
    COUNT(de.id) as total_export_requests,
    COUNT(CASE WHEN de.status = 'completed' THEN 1 END) as completed_exports,
    COUNT(dd.id) as total_deletion_requests,
    COUNT(CASE WHEN dd.status = 'completed' THEN 1 END) as completed_deletions,
    MAX(de.created_at) as last_export_request,
    MAX(dd.created_at) as last_deletion_request
FROM users u
LEFT JOIN data_exports de ON u.id = de.user_id
LEFT JOIN data_deletions dd ON u.id = dd.user_id
GROUP BY u.id, u.email, u.first_name, u.last_name;

-- Grant access to the view
GRANT SELECT ON gdpr_request_summary TO authenticated;

-- Enable RLS on the view
ALTER VIEW gdpr_request_summary SET (security_invoker = true);
