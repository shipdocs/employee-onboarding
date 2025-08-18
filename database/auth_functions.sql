-- Authentication RPC Functions for Maritime Onboarding System

-- Function to check if account is locked
CREATE OR REPLACE FUNCTION is_account_locked(user_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    user_record RECORD;
BEGIN
    SELECT failed_login_attempts, locked_until
    INTO user_record
    FROM users
    WHERE email = user_email AND is_active = true;
    
    -- If user doesn't exist, return false
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- Check if account is currently locked
    IF user_record.locked_until IS NOT NULL AND user_record.locked_until > NOW() THEN
        RETURN true;
    END IF;
    
    RETURN false;
END;
$$ LANGUAGE plpgsql;

-- Function to record failed login attempt
CREATE OR REPLACE FUNCTION record_failed_login(
    user_email TEXT,
    client_ip INET DEFAULT NULL,
    client_user_agent TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    user_record RECORD;
    max_attempts INTEGER := 5;
    lockout_minutes INTEGER := 30;
    new_attempts INTEGER;
    lockout_time TIMESTAMP WITH TIME ZONE;
    result JSON;
BEGIN
    -- Get lockout settings
    SELECT value::INTEGER INTO max_attempts
    FROM system_settings
    WHERE key = 'max_login_attempts'
    LIMIT 1;
    
    SELECT value::INTEGER INTO lockout_minutes
    FROM system_settings
    WHERE key = 'lockout_duration_minutes'
    LIMIT 1;
    
    -- Use defaults if settings not found
    max_attempts := COALESCE(max_attempts, 5);
    lockout_minutes := COALESCE(lockout_minutes, 30);
    
    -- Get current user record
    SELECT id, failed_login_attempts, locked_until
    INTO user_record
    FROM users
    WHERE email = user_email;
    
    -- If user doesn't exist, create a dummy response to prevent user enumeration
    IF NOT FOUND THEN
        result := json_build_object(
            'success', false,
            'attempts', max_attempts,
            'locked', false,
            'error', 'User not found'
        );
        RETURN result;
    END IF;
    
    -- Increment failed attempts
    new_attempts := COALESCE(user_record.failed_login_attempts, 0) + 1;
    
    -- Check if account should be locked
    IF new_attempts >= max_attempts THEN
        lockout_time := NOW() + (lockout_minutes || ' minutes')::INTERVAL;
        
        UPDATE users
        SET failed_login_attempts = new_attempts,
            locked_until = lockout_time,
            last_failed_attempt = NOW()
        WHERE email = user_email;
        
        result := json_build_object(
            'success', false,
            'attempts', new_attempts,
            'locked', true,
            'locked_until', lockout_time
        );
    ELSE
        UPDATE users
        SET failed_login_attempts = new_attempts,
            last_failed_attempt = NOW()
        WHERE email = user_email;
        
        result := json_build_object(
            'success', false,
            'attempts', new_attempts,
            'locked', false
        );
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to record successful login (clears failed attempts)
CREATE OR REPLACE FUNCTION record_successful_login(
    user_email TEXT,
    client_ip INET DEFAULT NULL,
    client_user_agent TEXT DEFAULT NULL
)
RETURNS JSON AS $$
BEGIN
    UPDATE users
    SET failed_login_attempts = 0,
        locked_until = NULL,
        last_login = NOW()
    WHERE email = user_email;
    
    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql;
