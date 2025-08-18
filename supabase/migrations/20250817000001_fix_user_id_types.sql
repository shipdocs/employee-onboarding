-- Fix user_id type mismatch in session tables
-- Changes UUID to BIGINT to match users table primary key type

-- Update user_sessions table
ALTER TABLE user_sessions 
  ALTER COLUMN user_id TYPE BIGINT USING NULL;

-- Update refresh_tokens table  
ALTER TABLE refresh_tokens
  ALTER COLUMN user_id TYPE BIGINT USING NULL;

-- Update user_mfa_settings table
ALTER TABLE user_mfa_settings
  ALTER COLUMN user_id TYPE BIGINT USING NULL;

-- Update mfa_failure_log table
ALTER TABLE mfa_failure_log
  ALTER COLUMN user_id TYPE BIGINT USING NULL;

-- Re-add foreign key constraints with correct type
ALTER TABLE user_sessions
  ADD CONSTRAINT user_sessions_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE refresh_tokens
  ADD CONSTRAINT refresh_tokens_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE user_mfa_settings
  ADD CONSTRAINT user_mfa_settings_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE mfa_failure_log
  ADD CONSTRAINT mfa_failure_log_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Update functions that reference UUID user_id to use BIGINT
-- Function: terminate_all_user_sessions
CREATE OR REPLACE FUNCTION terminate_all_user_sessions(p_user_id BIGINT, p_reason VARCHAR(50) DEFAULT 'SECURITY_EVENT')
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  terminated_count INTEGER;
BEGIN
  UPDATE user_sessions
  SET 
    is_active = false,
    terminated_at = NOW(),
    termination_reason = p_reason
  WHERE 
    user_id = p_user_id
    AND is_active = true;
  
  GET DIAGNOSTICS terminated_count = ROW_COUNT;
  RETURN terminated_count;
END;
$$;

-- Function: get_active_session_count
CREATE OR REPLACE FUNCTION get_active_session_count(p_user_id BIGINT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  session_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO session_count
  FROM user_sessions
  WHERE user_id = p_user_id
    AND is_active = true
    AND expires_at > NOW();
  
  RETURN session_count;
END;
$$;

-- Update RLS policies to use correct type casting
-- Drop existing policies
DROP POLICY IF EXISTS "Users can only access their own refresh tokens" ON refresh_tokens;
DROP POLICY IF EXISTS "Service role can manage all refresh tokens" ON refresh_tokens;
DROP POLICY IF EXISTS "Users can only access their own MFA settings" ON user_mfa_settings;
DROP POLICY IF EXISTS "Users can only access their own MFA failure logs" ON mfa_failure_log;

-- Recreate policies with proper type handling
CREATE POLICY "Service role full access to refresh tokens" ON refresh_tokens
  FOR ALL USING (true);

CREATE POLICY "Service role full access to user_mfa_settings" ON user_mfa_settings
  FOR ALL USING (true);

CREATE POLICY "Service role full access to mfa_failure_log" ON mfa_failure_log
  FOR ALL USING (true);

CREATE POLICY "Service role full access to user_sessions" ON user_sessions
  FOR ALL USING (true);

-- Add comments for documentation
COMMENT ON COLUMN user_sessions.user_id IS 'User ID from users table (BIGINT)';
COMMENT ON COLUMN refresh_tokens.user_id IS 'User ID from users table (BIGINT)';
COMMENT ON COLUMN user_mfa_settings.user_id IS 'User ID from users table (BIGINT)';
COMMENT ON COLUMN mfa_failure_log.user_id IS 'User ID from users table (BIGINT)';