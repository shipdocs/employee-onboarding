-- Admin User Seed
-- This file creates an admin user for local development

-- Check if the user already exists to avoid duplicates
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@example.com') THEN
        -- Insert admin user
        INSERT INTO users (
            email,
            first_name,
            last_name,
            role,
            position,
            preferred_language,
            status,
            is_active,
            created_at,
            updated_at
        ) VALUES (
            'admin@example.com',
            'Admin',
            'User',
            'admin',
            'System Administrator',
            'en',
            'active',
            true,
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'Admin user created successfully';
    ELSE
        RAISE NOTICE 'Admin user already exists, skipping creation';
    END IF;
END
$$;

-- Create a magic link for the admin user (for easy login)
DO $$
DECLARE
    admin_id BIGINT;
    token_value TEXT;
BEGIN
    -- Get the admin user ID
    SELECT id INTO admin_id FROM users WHERE email = 'admin@example.com';
    
    IF admin_id IS NOT NULL THEN
        -- Generate a token (this is a development token, not for production)
        token_value := 'admin-dev-token-' || FLOOR(RANDOM() * 1000000)::TEXT;
        
        -- Delete any existing tokens for this user
        DELETE FROM magic_links WHERE user_id = admin_id;
        
        -- Insert the new token
        INSERT INTO magic_links (
            user_id,
            token,
            expires_at,
            used,
            created_at
        ) VALUES (
            admin_id,
            token_value,
            NOW() + INTERVAL '7 days',
            false,
            NOW()
        );
        
        RAISE NOTICE 'Magic link created for admin user: %', token_value;
    END IF;
END
$$;