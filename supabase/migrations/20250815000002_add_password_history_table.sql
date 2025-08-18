-- Create password history table for tracking password reuse
CREATE TABLE IF NOT EXISTS password_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_password_history_user_id ON password_history(user_id);
CREATE INDEX IF NOT EXISTS idx_password_history_created_at ON password_history(created_at);
CREATE INDEX IF NOT EXISTS idx_password_history_user_created ON password_history(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE password_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can only access their own password history" ON password_history
  FOR ALL USING (auth.uid() = user_id);

-- Service role can manage all password history
CREATE POLICY "Service role can manage all password history" ON password_history
  FOR ALL USING (auth.role() = 'service_role');

-- Create function to clean up old password history entries
CREATE OR REPLACE FUNCTION cleanup_old_password_history()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
  retention_months INTEGER := 12; -- Keep 12 months of history
BEGIN
  -- Delete password history older than retention period
  DELETE FROM password_history 
  WHERE created_at < NOW() - INTERVAL '1 month' * retention_months;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to limit password history per user
CREATE OR REPLACE FUNCTION limit_password_history_per_user()
RETURNS TRIGGER AS $$
DECLARE
  max_history_entries INTEGER := 24; -- Keep last 24 passwords
  excess_count INTEGER;
BEGIN
  -- Count current entries for this user
  SELECT COUNT(*) - max_history_entries INTO excess_count
  FROM password_history 
  WHERE user_id = NEW.user_id;
  
  -- Delete oldest entries if we exceed the limit
  IF excess_count > 0 THEN
    DELETE FROM password_history 
    WHERE id IN (
      SELECT id FROM password_history 
      WHERE user_id = NEW.user_id 
      ORDER BY created_at ASC 
      LIMIT excess_count
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to limit password history entries
CREATE TRIGGER password_history_limit_trigger
  AFTER INSERT ON password_history
  FOR EACH ROW
  EXECUTE FUNCTION limit_password_history_per_user();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION cleanup_old_password_history() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_password_history() TO service_role;

COMMENT ON TABLE password_history IS 'Stores hashed password history to prevent password reuse';
COMMENT ON COLUMN password_history.password_hash IS 'Bcrypt hash of the password for secure storage';
COMMENT ON COLUMN password_history.created_at IS 'When the password was set';
COMMENT ON COLUMN password_history.ip_address IS 'IP address where password was changed';
COMMENT ON COLUMN password_history.user_agent IS 'User agent of the client that changed the password';