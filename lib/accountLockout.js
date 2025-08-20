// Simple Account Lockout Service
const { supabase } = require('./supabase');

class AccountLockout {
  /**
   * Check if an account is currently locked
   */
  async isAccountLocked(email) {
    try {
      const { data, error } = await supabase.rpc('is_account_locked', {
        user_email: email
      });

      if (error) {
        // console.error('Error checking account lockout:', error);
        return false; // Fail open for availability
      }

      return data === true;
    } catch (error) {
      // console.error('Error in isAccountLocked:', error);
      return false; // Fail open for availability
    }
  }

  /**
   * Record a failed login attempt
   */
  async recordFailedLogin(email, ipAddress = null, userAgent = null) {
    try {
      const { data, error } = await supabase.rpc('record_failed_login', {
        user_email: email,
        client_ip: ipAddress,
        client_user_agent: userAgent
      });

      if (error) {
        // console.error('Error recording failed login:', error);
        return { success: false, error: error.message };
      }

      return data;
    } catch (error) {
      // console.error('Error in recordFailedLogin:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Record a successful login (clears failed attempts)
   */
  async recordSuccessfulLogin(email, ipAddress = null, userAgent = null) {
    try {
      const { data, error } = await supabase.rpc('record_successful_login', {
        user_email: email,
        client_ip: ipAddress,
        client_user_agent: userAgent
      });

      if (error) {
        // console.error('Error recording successful login:', error);
        return { success: false, error: error.message };
      }

      return data;
    } catch (error) {
      // console.error('Error in recordSuccessfulLogin:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get lockout status with details
   */
  async getLockoutStatus(email) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('failed_login_attempts, locked_until, last_failed_attempt')
        .eq('email', email)
        .single();

      if (error) {
        // console.error('Error getting lockout status:', error);
        return null;
      }

      const isLocked = data.locked_until ? new Date(data.locked_until) > new Date() : false;

      return {
        isLocked,
        failedAttempts: data.failed_login_attempts || 0,
        lockedUntil: data.locked_until ? new Date(data.locked_until) : null,
        lastFailedAttempt: data.last_failed_attempt ? new Date(data.last_failed_attempt) : null
      };
    } catch (error) {
      // console.error('Error in getLockoutStatus:', error);
      return null;
    }
  }

  /**
   * Format lockout error message for user
   */
  formatLockoutMessage(lockedUntil, failedAttempts = 0, maxAttempts = 5) {
    if (!lockedUntil) {
      const remaining = maxAttempts - failedAttempts;
      return `Invalid login credentials. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining before account lockout.`;
    }

    const minutes = Math.ceil((lockedUntil.getTime() - Date.now()) / (1000 * 60));

    if (minutes <= 1) {
      return 'Account is temporarily locked. Please try again in less than 1 minute.';
    }

    return `Account is temporarily locked due to too many failed login attempts. Please try again in ${minutes} minutes.`;
  }

  /**
   * Get lockout settings from system_settings
   */
  async getLockoutSettings() {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('key, value')
        .eq('category', 'security')
        .in('key', ['max_login_attempts', 'lockout_duration_minutes', 'enable_account_lockout']);

      if (error) {
        // console.error('Error getting lockout settings:', error);
        return {
          maxAttempts: 5,
          lockoutMinutes: 15,
          enabled: true
        };
      }

      const settings = {};
      data.forEach(setting => {
        try {
          settings[setting.key] = JSON.parse(setting.value);
        } catch {
          settings[setting.key] = setting.value;
        }
      });

      return {
        maxAttempts: parseInt(settings.max_login_attempts) || 5,
        lockoutMinutes: parseInt(settings.lockout_duration_minutes) || 15,
        enabled: settings.enable_account_lockout !== 'false'
      };
    } catch (error) {
      // console.error('Error in getLockoutSettings:', error);
      return {
        maxAttempts: 5,
        lockoutMinutes: 15,
        enabled: true
      };
    }
  }
}

const accountLockout = new AccountLockout();

module.exports = { accountLockout };
