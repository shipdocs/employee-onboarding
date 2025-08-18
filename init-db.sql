-- Initial database setup for self-hosted Employee Onboarding System
-- This script sets up the basic database structure and roles

-- Create necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Create basic roles for API access
DO $$
BEGIN
    -- Anonymous role for public access
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'web_anon') THEN
        CREATE ROLE web_anon NOLOGIN;
    END IF;
    
    -- Authenticated role for logged-in users
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated NOLOGIN;
    END IF;
    
    -- Service role for admin operations
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'service_role') THEN
        CREATE ROLE service_role NOLOGIN BYPASSRLS;
    END IF;
END
$$;

-- Grant basic permissions
GRANT USAGE ON SCHEMA public TO web_anon, authenticated, service_role;
GRANT ALL ON SCHEMA public TO service_role;

-- Create a simple users table to start with
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'crew',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Grant permissions on users table
GRANT SELECT ON users TO web_anon;
GRANT ALL ON users TO authenticated, service_role;

-- Create a function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for users table
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create a simple audit log table
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(100),
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

GRANT SELECT ON audit_log TO authenticated;
GRANT ALL ON audit_log TO service_role;

-- Insert a default admin user
INSERT INTO users (email, role) 
VALUES ('admin@localhost.com', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Create a view for user info (example)
CREATE OR REPLACE VIEW user_profiles AS
SELECT 
    id,
    email,
    role,
    created_at
FROM users;

GRANT SELECT ON user_profiles TO web_anon, authenticated, service_role;
