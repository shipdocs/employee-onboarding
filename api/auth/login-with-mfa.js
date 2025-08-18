// Enhanced login endpoint with MFA support
const { supabase } = require('../../lib/supabase');
const { generateTokenPair } = require('../../lib/auth');
const { authRateLimit, checkBodySize } = require('../../lib/rateLimit');
const { accountLockout } = require('../../lib/accountLockout');
const bcrypt = require('bcrypt');
const { notificationService } = require('../../lib/notificationService');
const { createAPIHandler, createError, createValidationError } = require('../../lib/apiHandler');
const { validateObject } = require('../../lib/validation');
const { withBodySizeLimit } = require('../../lib/middleware/bodySizeLimit');
const mfaService = require('../../lib/mfaService');
const { applyApiSecurityHeaders } = require('../../lib/securityHeaders');
const securityFirewallIntegration = require('../../lib/services/securityFirewallIntegration');

// Helper function to log failed login attempts as security events
function logFailedLoginAttempt(email, ipAddress, userAgent, reason) {
  // Use setTimeout to make this non-blocking
  setTimeout(async () => {
    try {
      const { error } = await supabase
        .from('security_events')
        .insert({
          event_id: `auth_fail_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'authentication_failure',
          severity: 'medium',
          user_id: null,
          ip_address: ipAddress,
          user_agent: userAgent,
          details: {
            email: email,
            reason: reason,
            timestamp: new Date().toISOString()
          },
          threats: ['brute_force_attempt']
        });

      if (error) {
        console.error('Failed to log security event:', error);
      }

      // Trigger firewall integration processing for failed login
      try {
        const firewallAction = await securityFirewallIntegration.processFailedLogin(
          ipAddress,
          email,
          userAgent,
          { reason, timestamp: new Date().toISOString() }
        );

        if (firewallAction && firewallAction.action !== 'monitored') {
          console.log(`Firewall action taken: ${firewallAction.action} for IP ${ipAddress}`);
        }
      } catch (firewallError) {
        console.error('Firewall integration processing failed:', firewallError);
        // Don't throw - firewall processing failure shouldn't break login flow
      }
    } catch (err) {
      console.error('Security logging error:', err);
    }
  }, 0);
}

/**
 * Enhanced Login Handler with MFA Support
 *
 * Supports two-phase authentication:
 * 1. Password verification
 * 2. MFA challenge (if enabled for user)
 */
async function handler(req, res) {
  // Apply security headers including HSTS
  applyApiSecurityHeaders(res);

  // Check environment configuration
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw createError('SYSTEM_CONFIGURATION_ERROR', 'Database connection not configured');
  }

  if (!process.env.JWT_SECRET) {
    throw createError('SYSTEM_CONFIGURATION_ERROR', 'Authentication not configured');
  }

  // Validate request body
  const validationSchema = {
    email: {
      required: true,
      type: 'email',
      options: {}
    },
    password: {
      required: true,
      type: 'string',
      options: {
        minLength: 1,
        maxLength: 256
      }
    },
    mfaToken: {
      required: false,
      type: 'string',
      options: {
        minLength: 6,
        maxLength: 8
      }
    },
    rememberDevice: {
      required: false,
      type: 'boolean'
    }
  };

  const validationErrors = validateObject(req.body, validationSchema);
  if (validationErrors.length > 0) {
    throw createValidationError('Validation failed', { errors: validationErrors });
  }

  const { email, password, mfaToken, rememberDevice = false } = req.body;

  // Get client info
  const clientIP = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
                  req.headers['x-real-ip'] ||
                  req.socket?.remoteAddress;
  const userAgent = req.headers['user-agent'] || 'unknown';
  const normalizedEmail = email.toLowerCase().trim();

  // Check if account is locked
  const isLocked = await accountLockout.isAccountLocked(normalizedEmail);
  if (isLocked) {
    const lockoutStatus = await accountLockout.getLockoutStatus(normalizedEmail);
    const lockoutSettings = await accountLockout.getLockoutSettings();

    const message = accountLockout.formatLockoutMessage(
      lockoutStatus?.lockedUntil,
      lockoutStatus?.failedAttempts,
      lockoutSettings.maxAttempts
    );

    throw createError('AUTH_ACCOUNT_LOCKED', message, {
      locked: true,
      lockedUntil: lockoutStatus?.lockedUntil
    });
  }

  // Get user from database
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('email', normalizedEmail)
    .eq('is_active', true)
    .single();

  if (userError || !user) {
    // Record failed attempt for non-existent users (prevent user enumeration)
    await accountLockout.recordFailedLogin(normalizedEmail, clientIP, userAgent);

    // Log security event
    logFailedLoginAttempt(normalizedEmail, clientIP, userAgent, 'user_not_found');

    throw createError('AUTH_INVALID_CREDENTIALS');
  }

  // Check if user has a password hash
  if (!user.password_hash) {
    await accountLockout.recordFailedLogin(normalizedEmail, clientIP, userAgent);

    // Log security event
    logFailedLoginAttempt(normalizedEmail, clientIP, userAgent, 'no_password_configured');

    throw createError('AUTH_ACCOUNT_NOT_CONFIGURED', 'Account not properly configured. Please contact system administrator.');
  }

  // Verify password
  const isValidPassword = await bcrypt.compare(password, user.password_hash);

  if (!isValidPassword) {
    // Record failed login attempt
    const failedResult = await accountLockout.recordFailedLogin(normalizedEmail, clientIP, userAgent);

    if (failedResult.locked) {
      const lockoutSettings = await accountLockout.getLockoutSettings();
      const message = accountLockout.formatLockoutMessage(
        new Date(failedResult.locked_until),
        failedResult.attempts,
        lockoutSettings.maxAttempts
      );

      throw createError('AUTH_ACCOUNT_LOCKED', message, {
        locked: true,
        lockedUntil: failedResult.locked_until
      });
    } else {
      const lockoutSettings = await accountLockout.getLockoutSettings();
      const remaining = lockoutSettings.maxAttempts - failedResult.attempts;
      const message = `Invalid email or password. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining before account lockout.`;

      // Log security event
      logFailedLoginAttempt(normalizedEmail, clientIP, userAgent, 'invalid_password');

      throw createError('AUTH_INVALID_CREDENTIALS', message, {
        attemptsRemaining: remaining
      });
    }
  }

  // Password is valid - now check MFA requirements
  const mfaStatus = await mfaService.getMFAStatus(user.id);
  const isPrivilegedUser = user.role === 'admin' || user.role === 'manager';
  const mfaRequired = user.mfa_required ||
                     (isPrivilegedUser && mfaService.isMFAEnforcementEnabled());

  // If MFA is required and enabled, verify MFA token
  if (mfaRequired && mfaStatus.enabled) {
    if (!mfaToken) {
      // Password is valid but MFA token is required
      return res.status(200).json({
        success: false,
        requiresMFA: true,
        message: 'Multi-factor authentication required',
        // Only return minimal user info to prevent information disclosure
        userId: user.id, // Only ID needed for MFA verification
        mfaEnabled: mfaStatus.enabled,
        backupCodesAvailable: mfaStatus.backupCodesEnabled
      });
    }

    // Verify MFA token
    const mfaResult = await mfaService.verifyTOTP(user.id, mfaToken, clientIP);

    if (!mfaResult.success) {
      // Log MFA failure as security event
      logFailedLoginAttempt(normalizedEmail, clientIP, userAgent, 'mfa_failure');

      if (mfaResult.retryAfter) {
        throw createError('AUTH_MFA_RATE_LIMITED', mfaResult.error, {
          retryAfter: mfaResult.retryAfter
        });
      }

      throw createError('AUTH_MFA_INVALID', mfaResult.error);
    }

    // Log successful MFA verification
    await supabase
      .from('audit_log')
      .insert({
        user_id: user.id,
        action: 'login_with_mfa_success',
        resource_type: 'authentication',
        details: {
          ip_address: clientIP,
          user_agent: userAgent,
          mfa_method: mfaResult.method,
          role: user.role
        },
        ip_address: clientIP,
        user_agent: userAgent
      });

  } else if (mfaRequired && !mfaStatus.enabled) {
    // MFA is required but not set up - redirect to setup
    return res.status(200).json({
      success: false,
      requiresMFASetup: true,
      message: 'Multi-factor authentication setup required for your account',
      // Only return minimal user info to prevent information disclosure
      userId: user.id, // Only ID needed for MFA setup
      gracePeriodDays: 7, // Allow 7 days to set up MFA
      setupInstructions: 'Please set up MFA in your profile settings to continue using your account.'
    });
  }

  // Check account status for non-privileged users
  if (!['admin', 'manager'].includes(user.role) && user.status !== 'fully_completed') {
    throw createError('AUTH_ACCOUNT_NOT_ACTIVE');
  }

  // Handle first-time login notifications
  try {
    await notificationService.checkAndHandleFirstLogin(user);
  } catch (notificationError) {
    // Don't fail the login for notification errors
    console.warn('First login notification failed:', notificationError);
  }

  // Record successful login (clears failed attempts)
  await accountLockout.recordSuccessfulLogin(normalizedEmail, clientIP, userAgent);

  // Generate token pair (access + refresh tokens)
  const tokenResult = await generateTokenPair(user, req);
  
  if (!tokenResult.success) {
    throw createError('AUTH_TOKEN_GENERATION_FAILED', 'Failed to generate authentication tokens');
  }

  // Log successful login
  const loginAction = mfaStatus.enabled ? 'login_with_mfa_complete' : 'login_success';
  await supabase
    .from('audit_log')
    .insert({
      user_id: user.id,
      action: loginAction,
      resource_type: 'authentication',
      details: {
        ip_address: clientIP,
        user_agent: userAgent,
        role: user.role,
        mfa_used: mfaStatus.enabled,
        lockout_cleared: true
      },
      ip_address: clientIP,
      user_agent: userAgent
    });

  // Return successful login response
  res.json({
    success: true,
    token: tokenResult.accessToken,
    refreshToken: tokenResult.refreshToken,
    expiresIn: tokenResult.expiresIn,
    tokenType: tokenResult.tokenType,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      position: user.position,
      status: user.status,
      preferredLanguage: user.preferred_language,
      mfaEnabled: mfaStatus.enabled,
      mfaRequired: mfaRequired
    },
    loginMethod: mfaStatus.enabled ? 'password_and_mfa' : 'password_only'
  });
}

// Create the standardized handler with error handling
const apiHandler = createAPIHandler(handler, {
  allowedMethods: ['POST']
});

// Export with rate limiting and body size limit
module.exports = authRateLimit(withBodySizeLimit(apiHandler, 'auth'));
