-- Maritime Onboarding System - Database Encryption Setup
-- This script enables encryption extensions and creates encrypted columns

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create encryption functions
CREATE OR REPLACE FUNCTION encrypt_field(plaintext TEXT, key_name TEXT DEFAULT 'default')
RETURNS TEXT AS $$
DECLARE
    encryption_key TEXT;
    encrypted_data TEXT;
BEGIN
    -- Get encryption key (in production, this would come from a secure key store)
    -- For now, we'll use a placeholder that will be replaced by the application
    encryption_key := 'ENCRYPTION_KEY_PLACEHOLDER';
    
    -- Encrypt the data using AES
    encrypted_data := encode(
        encrypt(
            plaintext::bytea,
            encryption_key::bytea,
            'aes'
        ),
        'base64'
    );
    
    RETURN encrypted_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create decryption function
CREATE OR REPLACE FUNCTION decrypt_field(encrypted_data TEXT, key_name TEXT DEFAULT 'default')
RETURNS TEXT AS $$
DECLARE
    encryption_key TEXT;
    decrypted_data TEXT;
BEGIN
    -- Get encryption key
    encryption_key := 'ENCRYPTION_KEY_PLACEHOLDER';
    
    -- Decrypt the data
    decrypted_data := convert_from(
        decrypt(
            decode(encrypted_data, 'base64'),
            encryption_key::bytea,
            'aes'
        ),
        'UTF8'
    );
    
    RETURN decrypted_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create secure hash function for searchable encryption
CREATE OR REPLACE FUNCTION create_search_hash(plaintext TEXT, salt TEXT DEFAULT '')
RETURNS TEXT AS $$
BEGIN
    RETURN encode(
        digest(
            plaintext || salt,
            'sha256'
        ),
        'hex'
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add encrypted columns to sensitive tables
-- Note: This will be done gradually to avoid breaking existing functionality

-- Users table - Add encrypted personal data column
ALTER TABLE users ADD COLUMN IF NOT EXISTS encrypted_personal_data TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS personal_data_hash TEXT;

-- Create index on hash for searching
CREATE INDEX IF NOT EXISTS idx_users_personal_data_hash ON users(personal_data_hash);

-- MFA settings - Add encrypted secret column
ALTER TABLE user_mfa_settings ADD COLUMN IF NOT EXISTS encrypted_secret_new TEXT;
ALTER TABLE user_mfa_settings ADD COLUMN IF NOT EXISTS encrypted_backup_codes_new TEXT;

-- Magic links - Add encrypted token column
ALTER TABLE magic_links ADD COLUMN IF NOT EXISTS encrypted_token_new TEXT;
ALTER TABLE magic_links ADD COLUMN IF NOT EXISTS token_hash TEXT;

-- Create index on token hash
CREATE INDEX IF NOT EXISTS idx_magic_links_token_hash ON magic_links(token_hash);

-- Certificates - Add encrypted data column
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS encrypted_certificate_data TEXT;

-- Audit log - Add encrypted values columns
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS encrypted_old_values TEXT;
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS encrypted_new_values TEXT;

-- Security events - Add encrypted details column
ALTER TABLE security_events ADD COLUMN IF NOT EXISTS encrypted_details TEXT;

-- Email logs - Add encrypted content columns
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS encrypted_subject TEXT;
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS encrypted_content TEXT;

-- Create encryption status table
CREATE TABLE IF NOT EXISTS encryption_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(100) NOT NULL,
    column_name VARCHAR(100) NOT NULL,
    encryption_enabled BOOLEAN DEFAULT false,
    migration_completed BOOLEAN DEFAULT false,
    migration_started_at TIMESTAMP WITH TIME ZONE,
    migration_completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(table_name, column_name)
);

-- Insert encryption status records
INSERT INTO encryption_status (table_name, column_name, encryption_enabled) VALUES
('users', 'encrypted_personal_data', true),
('user_mfa_settings', 'encrypted_secret_new', true),
('user_mfa_settings', 'encrypted_backup_codes_new', true),
('magic_links', 'encrypted_token_new', true),
('certificates', 'encrypted_certificate_data', true),
('audit_log', 'encrypted_old_values', true),
('audit_log', 'encrypted_new_values', true),
('security_events', 'encrypted_details', true),
('email_logs', 'encrypted_subject', true),
('email_logs', 'encrypted_content', true)
ON CONFLICT (table_name, column_name) DO NOTHING;

-- Create encryption key rotation log
CREATE TABLE IF NOT EXISTS encryption_key_rotation_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_name VARCHAR(100) NOT NULL,
    rotation_started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    rotation_completed_at TIMESTAMP WITH TIME ZONE,
    old_key_fingerprint VARCHAR(64),
    new_key_fingerprint VARCHAR(64),
    status VARCHAR(20) DEFAULT 'in_progress',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create function to update encryption status
CREATE OR REPLACE FUNCTION update_encryption_status(
    p_table_name VARCHAR(100),
    p_column_name VARCHAR(100),
    p_migration_completed BOOLEAN DEFAULT false
)
RETURNS VOID AS $$
BEGIN
    UPDATE encryption_status 
    SET 
        migration_completed = p_migration_completed,
        migration_completed_at = CASE 
            WHEN p_migration_completed THEN NOW() 
            ELSE migration_completed_at 
        END,
        migration_started_at = CASE 
            WHEN migration_started_at IS NULL THEN NOW() 
            ELSE migration_started_at 
        END,
        updated_at = NOW()
    WHERE table_name = p_table_name AND column_name = p_column_name;
END;
$$ LANGUAGE plpgsql;

-- Create function to check encryption status
CREATE OR REPLACE FUNCTION get_encryption_status()
RETURNS TABLE(
    table_name VARCHAR(100),
    column_name VARCHAR(100),
    encryption_enabled BOOLEAN,
    migration_completed BOOLEAN,
    migration_progress TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        es.table_name,
        es.column_name,
        es.encryption_enabled,
        es.migration_completed,
        CASE 
            WHEN es.migration_completed THEN 'Completed'
            WHEN es.migration_started_at IS NOT NULL THEN 'In Progress'
            ELSE 'Not Started'
        END as migration_progress
    FROM encryption_status es
    ORDER BY es.table_name, es.column_name;
END;
$$ LANGUAGE plpgsql;

-- Create backup encryption function
CREATE OR REPLACE FUNCTION encrypt_for_backup(data_to_encrypt TEXT, backup_key TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN encode(
        encrypt(
            data_to_encrypt::bytea,
            backup_key::bytea,
            'aes'
        ),
        'base64'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create backup decryption function
CREATE OR REPLACE FUNCTION decrypt_from_backup(encrypted_data TEXT, backup_key TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN convert_from(
        decrypt(
            decode(encrypted_data, 'base64'),
            backup_key::bytea,
            'aes'
        ),
        'UTF8'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit trigger for encryption operations
CREATE OR REPLACE FUNCTION audit_encryption_operations()
RETURNS TRIGGER AS $$
BEGIN
    -- Log encryption/decryption operations to audit log
    INSERT INTO audit_log (
        user_id,
        action,
        table_name,
        record_id,
        details,
        created_at
    ) VALUES (
        COALESCE(current_setting('app.current_user_id', true)::BIGINT, 0),
        TG_OP || '_ENCRYPTION',
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        jsonb_build_object(
            'operation', TG_OP,
            'encrypted_columns', TG_ARGV[0]
        ),
        NOW()
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION encrypt_field(TEXT, TEXT) TO PUBLIC;
GRANT EXECUTE ON FUNCTION decrypt_field(TEXT, TEXT) TO PUBLIC;
GRANT EXECUTE ON FUNCTION create_search_hash(TEXT, TEXT) TO PUBLIC;
GRANT EXECUTE ON FUNCTION update_encryption_status(VARCHAR(100), VARCHAR(100), BOOLEAN) TO PUBLIC;
GRANT EXECUTE ON FUNCTION get_encryption_status() TO PUBLIC;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_encryption_status_table ON encryption_status(table_name);
CREATE INDEX IF NOT EXISTS idx_encryption_key_rotation_log_key_name ON encryption_key_rotation_log(key_name);
CREATE INDEX IF NOT EXISTS idx_encryption_key_rotation_log_status ON encryption_key_rotation_log(status);

-- Log successful encryption setup
INSERT INTO audit_log (
    user_id,
    action,
    table_name,
    details,
    created_at
) VALUES (
    1, -- System user
    'ENCRYPTION_SETUP',
    'system',
    jsonb_build_object(
        'message', 'Database encryption extensions and functions created',
        'timestamp', NOW(),
        'version', '1.0'
    ),
    NOW()
);

-- Display setup completion message
DO $$
BEGIN
    RAISE NOTICE '✅ Database encryption setup completed successfully';
    RAISE NOTICE '📊 Run SELECT * FROM get_encryption_status(); to check status';
END $$;
