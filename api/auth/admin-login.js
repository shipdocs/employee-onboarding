// Vercel API Route: /api/auth/admin-login.js - Admin login endpoint
const { supabase } = require('../../lib/supabase');
const { generateTokenPair } = require('../../lib/auth');
const { authRateLimit, checkBodySize } = require('../../lib/rateLimit');
const { accountLockout } = require('../../lib/accountLockout');
const bcrypt = require('bcrypt');
const { notificationService } = require('../../lib/notificationService');
const { createAPIHandler, createError, createValidationError, createAuthError, createDatabaseError } = require('../../lib/apiHandler');
const { validators, sanitizers, schema, validateObject } = require('../../lib/validation');
const { withBodySizeLimit } = require('../../lib/middleware/bodySizeLimit');

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
    } catch (err) {
      console.error('Security logging error:', err);
    }
  }, 0);
}

async function handler(req, res) {

  // Check if environment variables are configured
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
    }
  };

  const validationErrors = validateObject(req.body, validationSchema);
  if (validationErrors.length > 0) {
    throw createValidationError('Validation failed', { errors: validationErrors });
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

    throw createError('AUTH_ACCOUNT_LOCKED', message, {
      locked: true,
      lockedUntil: lockoutStatus?.lockedUntil
    });
  }

  // Get admin user from database
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('email', normalizedEmail)
    .eq('role', 'admin')
    .eq('is_active', true)
    .single();

  if (userError) {
    // Record failed attempt for non-existent users too (prevent user enumeration)
    await accountLockout.recordFailedLogin(normalizedEmail, clientIP, userAgent);

    // Log security event
    logFailedLoginAttempt(normalizedEmail, clientIP, userAgent, 'user_not_found');

    throw createError('AUTH_INVALID_CREDENTIALS');
  }

  if (!user) {
    // Let's check if user exists with different conditions
    const { data: anyUser } = await supabase
      .from('users')
      .select('email, role, is_active, status')
      .eq('email', normalizedEmail)
      .single();

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

      throw createError('AUTH_ACCOUNT_LOCKED', message, {
        locked: true,
        lockedUntil: failedResult.locked_until
      });
    } else {
      const lockoutSettings = await accountLockout.getLockoutSettings();
      const remaining = lockoutSettings.maxAttempts - failedResult.attempts;
      const message = `Invalid email or password. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining before account lockout.`;

      throw createError('AUTH_INVALID_CREDENTIALS', message, {
        attemptsRemaining: remaining
      });
    }
  }

  // Check if account is active (admin users don't need specific status check)
  if (user.role !== 'admin' && user.status !== 'fully_completed') {
    throw createError('AUTH_ACCOUNT_NOT_ACTIVE');
  }

  // Check for first-time login and trigger notifications (admins usually don't need this, but for consistency)
  try {
    await notificationService.checkAndHandleFirstLogin(user);
  } catch (notificationError) {
    // Don't fail the login for notification errors
  }

  // Record successful login (clears failed attempts)
  await accountLockout.recordSuccessfulLogin(normalizedEmail, clientIP, userAgent);

  // Generate token pair (access + refresh tokens)
  const tokenResult = await generateTokenPair(user, req);
  
  if (!tokenResult.success) {
    throw createError('AUTH_TOKEN_GENERATION_FAILED', 'Failed to generate authentication tokens');
  }

  // Log successful admin login
  await supabase
    .from('audit_log')
    .insert({
      user_id: user.id,
      action: 'admin_login',
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
      status: user.status,
      preferredLanguage: user.preferred_language
    }
  });
}

// Create the standardized handler with error handling
const apiHandler = createAPIHandler(handler, {
  allowedMethods: ['POST']
});

// Export with rate limiting and body size limit
module.exports = authRateLimit(withBodySizeLimit(apiHandler, 'auth'));
