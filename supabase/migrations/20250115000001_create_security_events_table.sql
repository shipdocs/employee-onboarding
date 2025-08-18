-- Create security_events table for comprehensive security event logging
-- This table stores all security-related events for monitoring and investigation

CREATE TABLE IF NOT EXISTS security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id VARCHAR(255) UNIQUE NOT NULL,
  type VARCHAR(100) NOT NULL,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ip_address INET,
  user_agent TEXT,
  details JSONB DEFAULT '{}',
  threats TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(type);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events(created_at);
CREATE INDEX IF NOT EXISTS idx_security_events_ip_address ON security_events(ip_address);
CREATE INDEX IF NOT EXISTS idx_security_events_event_id ON security_events(event_id);

-- Create composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_security_events_type_severity ON security_events(type, severity);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at_severity ON security_events(created_at, severity);

-- Create GIN index for JSONB details column for efficient JSON queries
CREATE INDEX IF NOT EXISTS idx_security_events_details ON security_events USING GIN(details);

-- Create GIN index for threats array
CREATE INDEX IF NOT EXISTS idx_security_events_threats ON security_events USING GIN(threats);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_security_events_updated_at 
    BEFORE UPDATE ON security_events 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add RLS (Row Level Security) policies
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all security events
CREATE POLICY "Admins can view all security events" ON security_events
    FOR SELECT USING (
        auth.role() = 'service_role' OR EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Policy: Users can only see their own security events (for transparency)
CREATE POLICY "Users can view their own security events" ON security_events
    FOR SELECT USING (user_id = auth.uid());

-- Policy: Only service role can insert security events
CREATE POLICY "Service role can insert security events" ON security_events
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Policy: Only service role can update security events
CREATE POLICY "Service role can update security events" ON security_events
    FOR UPDATE USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Grant necessary permissions
GRANT SELECT ON security_events TO authenticated;
GRANT ALL ON security_events TO service_role;

-- Add comments for documentation
COMMENT ON TABLE security_events IS 'Comprehensive security event logging for monitoring and investigation';
COMMENT ON COLUMN security_events.event_id IS 'Unique identifier for the security event';
COMMENT ON COLUMN security_events.type IS 'Type of security event (e.g., xss_attempt, rate_limit_violation)';
COMMENT ON COLUMN security_events.severity IS 'Severity level: low, medium, high, critical';
COMMENT ON COLUMN security_events.user_id IS 'ID of the user associated with the event (if applicable)';
COMMENT ON COLUMN security_events.ip_address IS 'IP address from which the event originated';
COMMENT ON COLUMN security_events.user_agent IS 'User agent string from the request';
COMMENT ON COLUMN security_events.details IS 'Additional event details stored as JSON';
COMMENT ON COLUMN security_events.threats IS 'Array of threat categories associated with this event';