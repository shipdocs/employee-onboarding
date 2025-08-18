-- AUTOMATIC SEED DATA FOR TESTING/PREVIEW ENVIRONMENTS
-- This file runs automatically after schema sync from production
-- Creates predictable test data while maintaining schema consistency

/**
 * HYBRID DATABASE SYNC SYSTEM
 * - Schema: Automatically synced from production (eliminates migration hell)
 * - Data: Controlled seed data for predictable testing
 * - Security: No production data exposure
 */

-- Clear existing test data (preserve schema) - fixed syntax
TRUNCATE TABLE
    audit_log,
    certificates,
    quiz_results,
    training_items,
    training_sessions,
    magic_links,
    manager_permissions,
    email_notifications,
    file_uploads,
    quiz_randomization_sessions,
    users
RESTART IDENTITY CASCADE;

-- Insert admin user with correct credentials
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
    'adminmartexx@shipdocs.app',
    'Admin',
    'Splinter',
    'admin',
    'System Administrator',
    'en',
    'active',
    true,
    '$2a$10$tDXZvzVF95Xib/.X9rlV1.Hjgi8NS5yNc3J4KhHKqMtyNVs/KUg4.',
    NOW(),
    NOW()
) ON CONFLICT (email) DO UPDATE SET
    updated_at = NOW(),
    is_active = true;

-- Insert test manager
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
    'manager@shipdocs.app',
    'Test',
    'Manager',
    'manager',
    'Training Manager',
    'en',
    'active',
    true,
    NOW(),
    NOW()
) ON CONFLICT (email) DO UPDATE SET
    updated_at = NOW(),
    is_active = true;

-- Insert test crew members
INSERT INTO users (
    email,
    first_name,
    last_name,
    role,
    position,
    vessel_assignment,
    expected_boarding_date,
    contact_phone,
    emergency_contact_name,
    emergency_contact_phone,
    preferred_language,
    status,
    is_active,
    created_at,
    updated_at
) VALUES
(
    'crew.test@shipdocs.app',
    'Test',
    'Crew',
    'crew',
    'Deck Officer',
    'MV Test Vessel',
    CURRENT_DATE + INTERVAL '30 days',
    '+31612345678',
    'Emergency Contact',
    '+31687654321',
    'en',
    'active',
    true,
    NOW(),
    NOW()
),
(
    'demo.crew@shipdocs.app',
    'Demo',
    'Sailor',
    'crew',
    'Engineer',
    'MV Demo Ship',
    CURRENT_DATE + INTERVAL '15 days',
    '+31698765432',
    'Demo Emergency',
    '+31612348765',
    'en',
    'active',
    true,
    NOW(),
    NOW()
) ON CONFLICT (email) DO UPDATE SET
    updated_at = NOW(),
    is_active = true;

-- Insert basic system settings
INSERT INTO admin_settings (setting_key, setting_value, description, created_at, updated_at)
VALUES
(
    'system_maintenance_mode',
    'false',
    'Enable/disable system maintenance mode',
    NOW(),
    NOW()
),
(
    'default_training_duration_days',
    '30',
    'Default number of days to complete training',
    NOW(),
    NOW()
),
(
    'quiz_passing_score',
    '80',
    'Minimum score required to pass quizzes',
    NOW(),
    NOW()
)
ON CONFLICT (setting_key) DO UPDATE SET
    updated_at = NOW();

-- Create training sessions for test crew
INSERT INTO training_sessions (user_id, phase, status, due_date, created_at, updated_at)
SELECT
    u.id,
    generate_series(1, 3) as phase,
    'not_started',
    CURRENT_DATE + INTERVAL '30 days' + (generate_series(1, 3) * INTERVAL '15 days'),
    NOW(),
    NOW()
FROM users u
WHERE u.role = 'crew' AND u.email LIKE '%test%'
ON CONFLICT (user_id, phase) DO UPDATE SET
    updated_at = NOW();

-- Success message
SELECT 'Testing environment seeded successfully with hybrid sync system!' as status;
