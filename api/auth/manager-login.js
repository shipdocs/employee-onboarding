// Vercel API Route: /api/auth/manager-login.js
const { supabase } = require('../../lib/supabase');
const { generateTokenPair } = require('../../lib/auth');
const { authRateLimit } = require('../../lib/rateLimit');
const { accountLockout } = require('../../lib/accountLockout');
const bcrypt = require('bcrypt');
const { notificationService } = require('../../lib/notificationService');
const { ErrorHandler, createAuthError, createValidationError } = require('../../lib/errorHandler');
const { asyncHandler, requestIdMiddleware } = require('../../lib/middleware/errorMiddleware');
const { validators, sanitizers, validateObject } = require('../../lib/validation');
const securityFirewallIntegration = require('../../lib/services/securityFirewallIntegration');

// Helper function to log failed login attempts as security events
async function logFailedLoginAttempt(email, ipAddress, userAgent, reason) {
  try {
    await supabase
      .from('security_events')
      .insert({
        event_id: `auth_fail_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'authentication_failure',
        severity: 'medium',
        user_id: null, // No user ID for failed attempts
        ip_address: ipAddress,
        user_agent: userAgent,
        details: {
          email: email,
          reason: reason,
          timestamp: new Date().toISOString()
        },
        threats: ['brute_force_attempt']
      });

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
  } catch (_error) {
    console.error('Failed to log security event:', _error);
  }
}

const handler = asyncHandler(async (req, res) => {
  if (req.method !== 'POST') {
    throw createValidationError('VALIDATION_INVALID_METHOD', 'Method not allowed', { allowedMethods: ['POST'] });
  }

  try {
    // Check if environment variables are configured
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      // console.error('Missing Supabase environment variables');
      throw createAuthError('SYSTEM_CONFIGURATION_ERROR', 'Database connection not configured');
    }

    if (!process.env.JWT_SECRET) {
      // console.error('Missing JWT_SECRET environment variable');
      throw createAuthError('SYSTEM_CONFIGURATION_ERROR', 'Authentication not configured');
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
      }
    };

    const validationErrors = validateObject(req.body, validationSchema);
    if (validationErrors.length > 0) {
      throw createValidationError('VALIDATION_INVALID_FORMAT', 'Validation failed', { errors: validationErrors });
    }

    // Get validated and sanitized values
    const { email, password } = req.body;

    // Get client info for lockout tracking
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = sanitizers.log(req.headers['user-agent'] || 'unknown');
    const normalizedEmail = email; // Already normalized by validator

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

      throw createAuthError('AUTH_ACCOUNT_LOCKED', message, {
        locked: true,
        lockedUntil: lockoutStatus?.lockedUntil,
        failedAttempts: lockoutStatus?.failedAttempts
      });
    }

    // Get user from database
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', normalizedEmail)
      .eq('role', 'manager')
      .eq('is_active', true)
      .single();

    if (userError || !user) {
      // Record failed attempt for non-existent users too (prevent user enumeration)
      await accountLockout.recordFailedLogin(normalizedEmail, clientIP, userAgent);

      // Log security event
      logFailedLoginAttempt(normalizedEmail, clientIP, userAgent, 'user_not_found');

      throw createAuthError('AUTH_INVALID_CREDENTIALS', 'Invalid email or password');
    }

    // Check if user has a password hash
    if (!user.password_hash) {
      await accountLockout.recordFailedLogin(normalizedEmail, clientIP, userAgent);

      // Log security event
      logFailedLoginAttempt(normalizedEmail, clientIP, userAgent, 'no_password_configured');

      throw createAuthError('AUTH_ACCOUNT_NOT_CONFIGURED', 'Account not properly configured. Please contact administrator.');
    }

    // Verify password using bcrypt
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      // Record failed login attempt
      const failedResult = await accountLockout.recordFailedLogin(normalizedEmail, clientIP, userAgent);

      // Log security event
      logFailedLoginAttempt(normalizedEmail, clientIP, userAgent, 'invalid_password');

      if (failedResult.locked) {
        const lockoutSettings = await accountLockout.getLockoutSettings();
        const message = accountLockout.formatLockoutMessage(
          new Date(failedResult.locked_until),
          failedResult.attempts,
          lockoutSettings.maxAttempts
        );

        throw createAuthError('AUTH_ACCOUNT_LOCKED', message, {
          locked: true,
          lockedUntil: failedResult.locked_until,
          attempts: failedResult.attempts
        });
      } else {
        const lockoutSettings = await accountLockout.getLockoutSettings();
        const remaining = lockoutSettings.maxAttempts - failedResult.attempts;
        const message = `Invalid email or password. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining before account lockout.`;

        throw createAuthError('AUTH_INVALID_CREDENTIALS', message, {
          attemptsRemaining: remaining,
          failedAttempts: failedResult.attempts
        });
      }
    }

    // Check if user is active (managers use 'fully_completed' status)
    if (user.status !== 'fully_completed') {
      throw createAuthError('AUTH_ACCOUNT_NOT_ACTIVE', 'Account is not active', {
        currentStatus: user.status,
        requiredStatus: 'fully_completed'
      });
    }

    // Check for first-time login and trigger notifications
    try {
      await notificationService.checkAndHandleFirstLogin(user);
    } catch (notificationError) {
      // console.error('Error handling first login notifications:', notificationError);
      // Don't fail the login for notification errors
    }

    // Record successful login (clears failed attempts)
    await accountLockout.recordSuccessfulLogin(normalizedEmail, clientIP, userAgent);

    // Fetch manager permissions if user is a manager
    let permissions = [];
    if (user.role === 'manager') {
      const { data: permissionData, error: permissionError } = await supabase
        .from('manager_permissions')
        .select('permission_key')
        .eq('manager_id', user.id);

      if (!permissionError && permissionData) {
        permissions = permissionData.map(p => p.permission_key);
      }
    }

    // Generate token pair (access + refresh tokens)
    const tokenResult = await generateTokenPair(user, req);
    
    if (!tokenResult.success) {
      throw createAuthError('AUTH_TOKEN_GENERATION_FAILED', 'Failed to generate authentication tokens');
    }

    // Log successful manager login
    await supabase
      .from('audit_log')
      .insert({
        user_id: user.id,
        action: 'manager_login',
        resource_type: 'authentication',
        details: {
          ip_address: clientIP,
          user_agent: userAgent,
          lockout_cleared: true
        },
        ip_address: clientIP,
        user_agent: userAgent
      });

    res.json({
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
        vesselAssignment: user.vessel_assignment,
        status: user.status,
        preferredLanguage: user.preferred_language,
        permissions: permissions
      }
    });

  } catch (_error) {
    // If it's already an APIError, re-throw it to be handled by middleware
    if (error.name === 'APIError' || error.name === 'AuthError' || error.name === 'ValidationError') {
      throw error;
    }

    // Handle unexpected errors
    // console.error('Manager login unexpected error:', _error);
    throw createAuthError('SYSTEM_INTERNAL_ERROR', 'Login failed', {
      originalError: _error.message
    });
  }
});

// Export with rate limiting and error handling
const wrappedHandler = (req, res) => {
  // Add request ID middleware
  requestIdMiddleware(req, res, () => {
    // Handle the request with error middleware
    handler(req, res).catch(error => {
      ErrorHandler.handle(error, req, res);
    });
  });
};

module.exports = authRateLimit(wrappedHandler);
