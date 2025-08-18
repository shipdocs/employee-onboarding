-- Add MFA support to the maritime onboarding system
-- This migration adds Multi-Factor Authentication capabilities

-- Create user_mfa_settings table for storing encrypted MFA secrets
CREATE TABLE user_mfa_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  secret TEXT NOT NULL, -- Encrypted JSON string containing TOTP secret
  backup_codes TEXT[], -- Array of encrypted backup codes
  enabled BOOLEAN DEFAULT false,
  setup_completed_at TIMESTAMP,
  last_used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create MFA failure tracking table for rate limiting
CREATE TABLE mfa_failure_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  ip_address INET,
  failure_type VARCHAR(50) DEFAULT 'totp_invalid', -- 'totp_invalid', 'backup_code_invalid', 'rate_limited'
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_user_mfa_settings_user_id ON user_mfa_settings(user_id);
CREATE UNIQUE INDEX idx_user_mfa_settings_user_unique ON user_mfa_settings(user_id);
CREATE INDEX idx_mfa_failure_log_user_time ON mfa_failure_log(user_id, created_at);
CREATE INDEX idx_mfa_failure_log_ip_time ON mfa_failure_log(ip_address, created_at);

-- Enable Row Level Security
ALTER TABLE user_mfa_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE mfa_failure_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_mfa_settings
CREATE POLICY "Users can only access their own MFA settings"
ON user_mfa_settings FOR ALL
USING (true); -- Service role bypass for API access

-- RLS Policies for mfa_failure_log
CREATE POLICY "Users can only access their own MFA failure logs"
ON mfa_failure_log FOR ALL
USING (true); -- Service role bypass for API access

-- Admin policy for MFA management
CREATE POLICY "Service role can access all MFA settings for management"
ON user_mfa_settings FOR SELECT
USING (true); -- Service role bypass for API access

-- Admin policy for failure log monitoring
CREATE POLICY "Service role can access all MFA failure logs for monitoring"
ON mfa_failure_log FOR SELECT
USING (true); -- Service role bypass for API access

-- Add MFA requirement tracking to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_required BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enforced_at TIMESTAMP;

-- Set MFA requirement for existing admin and manager users
UPDATE users 
SET mfa_required = true, 
    mfa_enforced_at = NOW() 
WHERE role IN ('admin', 'manager') 
AND mfa_required IS NOT true;

-- Create function to automatically set MFA requirement for new privileged users
CREATE OR REPLACE FUNCTION set_mfa_requirement_for_privileged_users()
RETURNS TRIGGER AS $$
BEGIN
  -- Set MFA requirement for admin and manager roles
  IF NEW.role IN ('admin', 'manager') AND (OLD.role IS NULL OR OLD.role NOT IN ('admin', 'manager')) THEN
    NEW.mfa_required = true;
    NEW.mfa_enforced_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically set MFA requirement
DROP TRIGGER IF EXISTS trigger_set_mfa_requirement ON users;
CREATE TRIGGER trigger_set_mfa_requirement
  BEFORE INSERT OR UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION set_mfa_requirement_for_privileged_users();

-- Create function to clean up old MFA failure logs (for maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_mfa_failure_logs()
RETURNS void AS $$
BEGIN
  -- Delete failure logs older than 30 days
  DELETE FROM mfa_failure_log 
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE user_mfa_settings IS 'Stores encrypted MFA secrets and settings for users';
COMMENT ON TABLE mfa_failure_log IS 'Tracks MFA verification failures for rate limiting and security monitoring';
COMMENT ON COLUMN user_mfa_settings.secret IS 'AES-256-GCM encrypted TOTP secret as JSON string';
COMMENT ON COLUMN user_mfa_settings.backup_codes IS 'Array of encrypted backup codes for account recovery';
COMMENT ON COLUMN mfa_failure_log.failure_type IS 'Type of MFA failure: totp_invalid, backup_code_invalid, rate_limited';
COMMENT ON COLUMN users.mfa_required IS 'Whether MFA is required for this user based on role';
COMMENT ON COLUMN users.mfa_enforced_at IS 'When MFA requirement was first enforced for this user';