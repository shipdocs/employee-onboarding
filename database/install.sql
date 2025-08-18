-- =====================================================
-- MARITIME ONBOARDING SYSTEM - INSTALLATION DATA
-- =====================================================
-- This file contains the initial data and settings for a fresh installation
-- It should be run after the schema.sql file to populate the database with
-- essential data needed for the application to function

-- =====================================================
-- SYSTEM SETTINGS
-- =====================================================

INSERT INTO system_settings (key, value, description, category, is_public) VALUES
-- Application settings
('app_name', 'Maritime Onboarding System', 'Application name', 'application', true),
('app_version', '2.0.1', 'Current application version', 'application', true),
('app_environment', 'docker', 'Current environment', 'application', false),
('app_timezone', 'UTC', 'Default application timezone', 'application', true),
('app_language', 'en', 'Default application language', 'application', true),

-- Security settings
('session_timeout_minutes', '480', 'Session timeout in minutes (8 hours)', 'security', false),
('max_login_attempts', '5', 'Maximum login attempts before lockout', 'security', false),
('lockout_duration_minutes', '30', 'Account lockout duration in minutes', 'security', false),
('password_min_length', '8', 'Minimum password length', 'security', true),
('password_require_special', 'true', 'Require special characters in password', 'security', true),
('mfa_enabled', 'false', 'Multi-factor authentication enabled', 'security', false),

-- Email settings
('smtp_enabled', 'false', 'SMTP email sending enabled', 'email', false),
('smtp_host', 'localhost', 'SMTP server host', 'email', false),
('smtp_port', '1025', 'SMTP server port (MailHog for development)', 'email', false),
('smtp_secure', 'false', 'Use secure SMTP connection', 'email', false),
('from_email', 'noreply@maritime-onboarding.local', 'Default from email address', 'email', false),
('from_name', 'Maritime Onboarding System', 'Default from name', 'email', false),

-- Training settings
('training_pass_percentage', '80', 'Minimum percentage to pass training', 'training', true),
('quiz_max_attempts', '3', 'Maximum quiz attempts allowed', 'training', true),
('certificate_validity_days', '365', 'Certificate validity in days', 'training', true),

-- Workflow settings
('workflow_auto_assign', 'true', 'Automatically assign workflows to new users', 'workflow', false),
('workflow_reminder_days', '7', 'Days before sending workflow reminders', 'workflow', false),

-- File upload settings
('max_file_size_mb', '50', 'Maximum file upload size in MB', 'files', true),
('allowed_file_types', 'pdf,doc,docx,jpg,jpeg,png,mp4,mp3', 'Allowed file extensions', 'files', true),

-- API settings
('api_rate_limit_per_minute', '100', 'API rate limit per minute per user', 'api', false),
('api_enable_cors', 'true', 'Enable CORS for API', 'api', false),

-- Maintenance settings
('maintenance_mode', 'false', 'Application maintenance mode', 'maintenance', false),
('maintenance_message', 'System is under maintenance. Please try again later.', 'Maintenance mode message', 'maintenance', true),

-- Logging settings
('log_level', 'info', 'Application log level', 'logging', false),
('log_retention_days', '90', 'Log retention period in days', 'logging', false),
('audit_enabled', 'true', 'Enable audit logging', 'logging', false)

ON CONFLICT (key) DO UPDATE SET
value = EXCLUDED.value,
description = EXCLUDED.description,
updated_at = NOW();

-- =====================================================
-- DEFAULT ADMIN USER
-- =====================================================

-- Insert default admin user
INSERT INTO users (
    email,
    first_name,
    last_name,
    role,
    position,
    preferred_language,
    status,
    is_active,
    password_hash,
    created_at,
    updated_at
) VALUES (
    'admin@maritime-onboarding.local',
    'System',
    'Administrator',
    'admin',
    'System Administrator',
    'en',
    'active',
    true,
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password: password
    NOW(),
    NOW()
) ON CONFLICT (email) DO UPDATE SET
    updated_at = NOW(),
    is_active = true,
    password_hash = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';

-- =====================================================
-- BASIC MARITIME TERMINOLOGY
-- =====================================================

INSERT INTO maritime_terminology (term_key, english_term, definition, category) VALUES
('bridge', 'Bridge', 'The command center of a ship from which it is navigated', 'navigation'),
('port', 'Port', 'The left side of a ship when facing forward', 'navigation'),
('starboard', 'Starboard', 'The right side of a ship when facing forward', 'navigation'),
('bow', 'Bow', 'The front part of a ship', 'structure'),
('stern', 'Stern', 'The rear part of a ship', 'structure'),
('deck', 'Deck', 'A floor or platform on a ship', 'structure'),
('hull', 'Hull', 'The main body of a ship', 'structure'),
('mast', 'Mast', 'A tall pole on a ship that supports sails or equipment', 'structure'),
('anchor', 'Anchor', 'A heavy object used to keep a ship in place', 'equipment'),
('compass', 'Compass', 'An instrument for finding direction', 'navigation'),
('knot', 'Knot', 'A unit of speed equal to one nautical mile per hour', 'measurement'),
('fathom', 'Fathom', 'A unit of depth equal to six feet', 'measurement'),
('nautical_mile', 'Nautical Mile', 'A unit of distance equal to 1,852 meters', 'measurement'),
('captain', 'Captain', 'The commanding officer of a ship', 'crew'),
('first_mate', 'First Mate', 'The second-in-command on a ship', 'crew'),
('bosun', 'Bosun', 'The officer in charge of equipment and crew', 'crew'),
('helmsman', 'Helmsman', 'The person who steers the ship', 'crew'),
('lookout', 'Lookout', 'A person who watches for hazards or other ships', 'crew'),
('galley', 'Galley', 'The kitchen on a ship', 'facilities'),
('berth', 'Berth', 'A sleeping place on a ship', 'facilities')
ON CONFLICT (term_key) DO NOTHING;

-- =====================================================
-- BASIC TRAINING CATEGORIES
-- =====================================================

INSERT INTO training_items (title, description, content_type, category, is_mandatory, difficulty_level, created_by) VALUES
('Maritime Safety Basics', 'Introduction to basic maritime safety principles and procedures', 'text', 'safety', true, 'beginner', 1),
('Ship Navigation Fundamentals', 'Basic principles of ship navigation and compass use', 'text', 'navigation', true, 'beginner', 1),
('Emergency Procedures', 'Essential emergency procedures every crew member must know', 'text', 'safety', true, 'intermediate', 1),
('Maritime Communication', 'Radio communication protocols and procedures', 'text', 'communication', true, 'beginner', 1),
('Cargo Handling Safety', 'Safe procedures for handling various types of cargo', 'text', 'operations', false, 'intermediate', 1),
('Weather Awareness', 'Understanding weather patterns and their impact on maritime operations', 'text', 'navigation', false, 'beginner', 1),
('First Aid at Sea', 'Basic first aid procedures adapted for maritime environments', 'text', 'safety', true, 'intermediate', 1),
('Environmental Protection', 'Maritime environmental regulations and best practices', 'text', 'regulations', false, 'beginner', 1)
ON CONFLICT DO NOTHING;

-- =====================================================
-- BASIC WORKFLOWS
-- =====================================================

INSERT INTO workflows (name, description, category, is_mandatory, estimated_duration_minutes, created_by) VALUES
('New Crew Onboarding', 'Complete onboarding process for new crew members', 'onboarding', true, 480, 1),
('Safety Certification', 'Required safety training and certification process', 'safety', true, 240, 1),
('Navigation Training', 'Basic navigation skills training workflow', 'navigation', false, 180, 1),
('Emergency Response Training', 'Emergency procedures and response training', 'safety', true, 120, 1)
ON CONFLICT DO NOTHING;

-- =====================================================
-- FEATURE FLAGS
-- =====================================================

INSERT INTO feature_flags (flag_name, description, is_enabled, rollout_percentage, created_by) VALUES
('mfa_authentication', 'Multi-factor authentication feature', false, 0, 1),
('advanced_reporting', 'Advanced reporting and analytics', false, 0, 1),
('mobile_app_support', 'Mobile application support', false, 0, 1),
('real_time_notifications', 'Real-time push notifications', true, 100, 1),
('offline_mode', 'Offline mode for mobile devices', false, 0, 1),
('ai_recommendations', 'AI-powered training recommendations', false, 0, 1),
('video_training', 'Video-based training content', true, 100, 1),
('gamification', 'Gamification features for training', false, 0, 1)
ON CONFLICT (flag_name) DO UPDATE SET
is_enabled = EXCLUDED.is_enabled,
updated_at = NOW();

-- =====================================================
-- SYSTEM NOTIFICATIONS
-- =====================================================

INSERT INTO system_notifications (title, message, notification_type, target_audience, is_active, created_by) VALUES
('Welcome to Maritime Onboarding System', 'Welcome to the Maritime Onboarding System! Please complete your profile and begin your training modules.', 'info', 'new_users', true, 1),
('System Maintenance Scheduled', 'Regular system maintenance is scheduled for this weekend. Some features may be temporarily unavailable.', 'warning', 'all', false, 1),
('New Training Modules Available', 'New training modules have been added to the system. Check out the latest content in your dashboard.', 'info', 'all', true, 1)
ON CONFLICT DO NOTHING;

-- =====================================================
-- INSTALLATION COMPLETE
-- =====================================================

-- Log successful installation
INSERT INTO system_settings (key, value, description, category) VALUES
('installation_completed', 'true', 'Installation completed successfully', 'system'),
('installation_date', NOW()::text, 'Date when installation was completed', 'system'),
('initial_data_loaded', 'true', 'Initial data has been loaded', 'system')
ON CONFLICT (key) DO UPDATE SET
value = EXCLUDED.value,
updated_at = NOW();

-- Create a magic link for the admin user for easy first login
DO $$
DECLARE
    admin_id BIGINT;
    token_value TEXT;
BEGIN
    -- Get the admin user ID
    SELECT id INTO admin_id FROM users WHERE email = 'admin@maritime-onboarding.local';
    
    IF admin_id IS NOT NULL THEN
        -- Generate a token for easy first login
        token_value := 'admin-first-login-' || FLOOR(RANDOM() * 1000000)::TEXT;
        
        -- Delete any existing tokens for this user
        DELETE FROM magic_links WHERE user_id = admin_id;
        
        -- Insert the new token (valid for 24 hours)
        INSERT INTO magic_links (
            user_id,
            token,
            expires_at,
            used,
            created_at
        ) VALUES (
            admin_id,
            token_value,
            NOW() + INTERVAL '24 hours',
            false,
            NOW()
        );
        
        RAISE NOTICE 'Admin login token created: %', token_value;
        RAISE NOTICE 'Admin can login at: /auth/magic-link?token=%', token_value;
    END IF;
END
$$;
