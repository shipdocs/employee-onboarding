-- Security Alert Configuration Tables
-- Allows GUI-based management of security alert settings

-- Security alert configuration table
CREATE TABLE IF NOT EXISTS security_alert_config (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by INTEGER REFERENCES users(id)
);

-- Security alert recipients table
CREATE TABLE IF NOT EXISTS security_alert_recipients (
    id SERIAL PRIMARY KEY,
    alert_type VARCHAR(50) NOT NULL, -- 'critical', 'warning', 'info'
    recipient_type VARCHAR(50) NOT NULL, -- 'email', 'slack', 'webhook'
    recipient_value TEXT NOT NULL, -- email address, slack channel, webhook URL
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id),
    UNIQUE(alert_type, recipient_type, recipient_value)
);

-- Security alert thresholds table
CREATE TABLE IF NOT EXISTS security_alert_thresholds (
    id SERIAL PRIMARY KEY,
    metric_name VARCHAR(100) NOT NULL,
    warning_threshold INTEGER,
    critical_threshold INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by INTEGER REFERENCES users(id),
    UNIQUE(metric_name)
);

-- Security alert history table (for persistent storage)
CREATE TABLE IF NOT EXISTS security_alerts (
    id SERIAL PRIMARY KEY,
    alert_id VARCHAR(100) UNIQUE NOT NULL,
    alert_type VARCHAR(50) NOT NULL, -- 'critical', 'warning'
    metric_name VARCHAR(100) NOT NULL,
    metric_value INTEGER NOT NULL,
    threshold_value INTEGER NOT NULL,
    message TEXT NOT NULL,
    is_resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by INTEGER REFERENCES users(id),
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default configuration
INSERT INTO security_alert_config (config_key, config_value, description) VALUES
('rate_limiting', '{"maxEmailsPerHour": 10, "cooldownMinutes": 15}', 'Email rate limiting configuration'),
('email_templates', '{"critical": "🚨 CRITICAL Security Alert - Maritime Onboarding", "warning": "⚠️ Security Warning - Maritime Onboarding"}', 'Email subject templates'),
('dashboard_url', '"http://localhost:3000/admin/security"', 'Security dashboard URL for email links'),
('emergency_contact', '"security@company.com"', 'Emergency security contact email')
ON CONFLICT (config_key) DO NOTHING;

-- Insert default thresholds
INSERT INTO security_alert_thresholds (metric_name, warning_threshold, critical_threshold) VALUES
('rateLimitViolations', 10, 50),
('xssAttempts', 5, 20),
('authFailures', 20, 100),
('malwareDetections', 1, 5),
('suspiciousSessions', 5, 15)
ON CONFLICT (metric_name) DO NOTHING;

-- Insert default recipients (fallback to env vars if not configured)
INSERT INTO security_alert_recipients (alert_type, recipient_type, recipient_value) VALUES
('critical', 'email', COALESCE(current_setting('app.security_email', true), 'security@company.com')),
('critical', 'email', COALESCE(current_setting('app.devops_email', true), 'devops@company.com')),
('warning', 'email', COALESCE(current_setting('app.devops_email', true), 'devops@company.com'))
ON CONFLICT (alert_type, recipient_type, recipient_value) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_security_alerts_created_at ON security_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_alerts_type ON security_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_security_alerts_metric ON security_alerts(metric_name);
CREATE INDEX IF NOT EXISTS idx_security_alerts_resolved ON security_alerts(is_resolved);
CREATE INDEX IF NOT EXISTS idx_security_alert_recipients_active ON security_alert_recipients(is_active) WHERE is_active = true;

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_security_alert_config_updated_at 
    BEFORE UPDATE ON security_alert_config 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_security_alert_recipients_updated_at 
    BEFORE UPDATE ON security_alert_recipients 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_security_alert_thresholds_updated_at 
    BEFORE UPDATE ON security_alert_thresholds 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policies for security
ALTER TABLE security_alert_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_alert_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_alert_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_alerts ENABLE ROW LEVEL SECURITY;

-- Only admins can manage security alert configuration
CREATE POLICY security_alert_config_admin_only ON security_alert_config
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

CREATE POLICY security_alert_recipients_admin_only ON security_alert_recipients
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

CREATE POLICY security_alert_thresholds_admin_only ON security_alert_thresholds
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Admins and managers can view security alerts
CREATE POLICY security_alerts_admin_manager_view ON security_alerts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'manager')
        )
    );

-- Only admins can update security alerts (mark as resolved)
CREATE POLICY security_alerts_admin_update ON security_alerts
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

COMMENT ON TABLE security_alert_config IS 'Configuration settings for security alert system';
COMMENT ON TABLE security_alert_recipients IS 'Email and notification recipients for security alerts';
COMMENT ON TABLE security_alert_thresholds IS 'Configurable thresholds for security metrics';
COMMENT ON TABLE security_alerts IS 'Historical record of all security alerts';

COMMENT ON COLUMN security_alert_config.config_value IS 'JSON configuration value';
COMMENT ON COLUMN security_alert_recipients.alert_type IS 'Type of alert: critical, warning, info';
COMMENT ON COLUMN security_alert_recipients.recipient_type IS 'Notification method: email, slack, webhook';
COMMENT ON COLUMN security_alert_thresholds.metric_name IS 'Security metric name (rateLimitViolations, xssAttempts, etc.)';
COMMENT ON COLUMN security_alerts.alert_id IS 'Unique identifier for the alert';
COMMENT ON COLUMN security_alerts.is_resolved IS 'Whether the alert has been acknowledged/resolved';
