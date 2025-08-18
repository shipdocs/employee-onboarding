-- Create refresh tokens table for JWT refresh token rotation
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ip_address INET,
  user_agent TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_active ON refresh_tokens(is_active);

-- Enable RLS
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can only access their own refresh tokens" ON refresh_tokens
  FOR ALL USING (true); -- Service role bypass for API access

-- Service role can manage all refresh tokens
CREATE POLICY "Service role can manage all refresh tokens" ON refresh_tokens
  FOR ALL USING (true); -- Service role full access

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_refresh_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER refresh_tokens_updated_at
  BEFORE UPDATE ON refresh_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_refresh_tokens_updated_at();

-- Create function to clean up expired refresh tokens
CREATE OR REPLACE FUNCTION cleanup_expired_refresh_tokens()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM refresh_tokens 
  WHERE expires_at < NOW() OR is_active = false;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION cleanup_expired_refresh_tokens() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_refresh_tokens() TO service_role;

COMMENT ON TABLE refresh_tokens IS 'Stores refresh tokens for JWT token rotation system';
COMMENT ON COLUMN refresh_tokens.token_hash IS 'SHA-256 hash of the refresh token for secure storage';
COMMENT ON COLUMN refresh_tokens.expires_at IS 'Expiration timestamp for the refresh token (typically 30 days)';
COMMENT ON COLUMN refresh_tokens.is_active IS 'Whether the refresh token is still valid and can be used';