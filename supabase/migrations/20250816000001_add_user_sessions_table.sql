-- Create user_sessions table for enhanced session management
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR(255) NOT NULL UNIQUE,
  user_id BIGINT NOT NULL,
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id ON user_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_active ON user_sessions(user_id, is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Note: Since we're not using Supabase Auth, we'll rely on application-level security
-- These policies are placeholders and actual security is enforced in the application
CREATE POLICY "Allow all for now" ON user_sessions
  FOR ALL USING (true);

-- Create function to automatically clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE user_sessions
  SET 
    is_active = false,
    terminated_at = NOW(),
    termination_reason = 'EXPIRED'
  WHERE 
    is_active = true 
    AND expires_at < NOW();
END;
$$;

-- Create a scheduled job to clean up expired sessions (runs every hour)
-- Note: This requires pg_cron extension to be enabled in Supabase
-- If pg_cron is not available, this cleanup should be called from the application periodically
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'cleanup-expired-sessions',
      '0 * * * *', -- Every hour
      'SELECT cleanup_expired_sessions();'
    );
  END IF;
END $$;

-- Add trigger to enforce concurrent session limit
CREATE OR REPLACE FUNCTION enforce_concurrent_session_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  active_session_count INTEGER;
  max_sessions INTEGER := 3;
  oldest_session_id VARCHAR(255);
BEGIN
  -- Count active sessions for the user
  SELECT COUNT(*)
  INTO active_session_count
  FROM user_sessions
  WHERE user_id = NEW.user_id
    AND is_active = true
    AND session_id != NEW.session_id;
  
  -- If at or over the limit, terminate the oldest session
  IF active_session_count >= max_sessions THEN
    -- Find the oldest active session
    SELECT session_id
    INTO oldest_session_id
    FROM user_sessions
    WHERE user_id = NEW.user_id
      AND is_active = true
      AND session_id != NEW.session_id
    ORDER BY created_at ASC
    LIMIT 1;
    
    -- Terminate the oldest session
    IF oldest_session_id IS NOT NULL THEN
      UPDATE user_sessions
      SET 
        is_active = false,
        terminated_at = NOW(),
        termination_reason = 'CONCURRENT_LIMIT'
      WHERE session_id = oldest_session_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for concurrent session enforcement
CREATE TRIGGER enforce_session_limit
  AFTER INSERT ON user_sessions
  FOR EACH ROW
  WHEN (NEW.is_active = true)
  EXECUTE FUNCTION enforce_concurrent_session_limit();

-- Add function to terminate all sessions for a user (useful for security events)
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

-- Add function to get active session count for a user
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