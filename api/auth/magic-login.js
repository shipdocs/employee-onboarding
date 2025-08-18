// Vercel API Route: /api/auth/magic-login.js
const { supabase } = require('../../lib/supabase');
const { generateTokenPair } = require('../../lib/auth');
const { authRateLimit } = require('../../lib/rateLimit');
const { notificationService } = require('../../lib/notificationService');
const { createAPIHandler, createError, createValidationError, createAuthError, createDatabaseError } = require('../../lib/apiHandler');

// Helper function to log security events for magic link attempts (non-blocking)
function logMagicLinkSecurityEvent(token, ipAddress, userAgent, eventType, details = {}) {
  // Make this completely non-blocking to prevent RLS issues from breaking login
  setImmediate(async () => {
    try {
      // Use service role key to bypass RLS for security logging
      const { error } = await supabase
        .from('security_events')
        .insert({
          event_id: require('crypto').randomUUID(),
          type: `magic_link_${eventType}`,
          severity: eventType === 'invalid_token' || eventType === 'expired_token' ? 'medium' : 'low',
          user_id: null,
          ip_address: ipAddress,
          user_agent: userAgent,
          details: {
            token_hash: token ? require('crypto').createHash('sha256').update(token).digest('hex').substring(0, 16) : null,
            timestamp: new Date().toISOString(),
            ...details
          },
          threats: eventType === 'invalid_token' ? ['token_brute_force'] : []
        });

      if (error) {
        console.error('🚨 [SECURITY] Failed to log magic link security event (non-critical):', error.message);
      }
    } catch (securityError) {
      console.error('🚨 [SECURITY] Security event logging error (non-critical):', securityError.message);
    }
  });
}

async function handler(req, res) {
  console.log('🔍 [MAGIC-LOGIN] Handler called');
  const { token } = req.body;
  const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';

  if (!token) {
    console.log('❌ [MAGIC-LOGIN] No token provided');
    throw createValidationError('Token is required', {
      missingFields: ['token']
    });
  }

  console.log('🔍 [MAGIC-LOGIN] Token received, proceeding with verification');

  // Verify magic link (allow multiple uses within expiry period)
  const { data: linkData, error: linkError } = await supabase
    .from('magic_links')
    .select('*')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (linkError || !linkData) {
    // Log security event for invalid/expired magic link attempt (non-blocking)
    logMagicLinkSecurityEvent(token, clientIP, userAgent, 'invalid_token', {
      error: linkError?.message || 'Token not found or expired'
    });

    throw createError('AUTH_TOKEN_EXPIRED', 'Invalid or expired login link');
  }

  // Get user data
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('email', linkData.email)
    .single();

  if (userError || !userData) {
    throw createError('DB_RECORD_NOT_FOUND', 'User not found', {
      email: linkData.email
    });
  }

  // Block magic link login for privileged users (admin/manager)
  if (['admin', 'manager'].includes(userData.role)) {
    // Log security event for privileged user attempting magic link (non-blocking)
    logMagicLinkSecurityEvent(token, clientIP, userAgent, 'privileged_user_attempt', {
      email: linkData.email,
      role: userData.role,
      reason: 'Staff members must use password login'
    });

    throw createError('AUTH_METHOD_NOT_ALLOWED', 'Staff members must use the Staff Login option with password and MFA. Magic links are only available for crew members.');
  }

  // Track usage but don't mark as used to allow multiple logins within expiry window
  const { error: updateError } = await supabase
    .from('magic_links')
    .update({ used_at: new Date().toISOString() })
    .eq('token', token)
    .is('used_at', null); // Only update if not already used (for first-time tracking)

  if (updateError) {
    // Don't fail the login for this non-critical update
  }

  // Update user status to in_progress if they're crew and currently not_started
  if (userData.role === 'crew' && userData.status === 'not_started') {
    const { error: statusUpdateError } = await supabase
      .from('users')
      .update({
        status: 'in_progress',
        updated_at: new Date().toISOString()
      })
      .eq('id', userData.id);

    if (statusUpdateError) {
      // Don't fail the login, just log the error
    } else {
      // Update the userData object to reflect the change
      userData.status = 'in_progress';
    }
  }

  // Check for first-time login and trigger notifications
  try {
    await notificationService.checkAndHandleFirstLogin(userData);
  } catch (notificationError) {
    // Don't fail the login for notification errors
    console.error('🚨 [MAGIC-LOGIN] Notification service error (non-critical):', notificationError);
  }

  // Log successful magic link usage (non-blocking)
  logMagicLinkSecurityEvent(token, clientIP, userAgent, 'successful_login', {
    email: linkData.email,
    user_id: userData.id,
    role: userData.role
  });

  // Generate token pair (access + refresh tokens)
  console.log('🔍 [MAGIC-LOGIN] Generating token pair');
  const tokenResult = await generateTokenPair(userData, req);
  
  if (!tokenResult.success) {
    throw createError('AUTH_TOKEN_GENERATION_FAILED', 'Failed to generate authentication tokens');
  }

  console.log('✅ [MAGIC-LOGIN] Login successful for:', userData.email);
  res.json({
    token: tokenResult.accessToken,
    refreshToken: tokenResult.refreshToken,
    expiresIn: tokenResult.expiresIn,
    tokenType: tokenResult.tokenType,
    user: {
      id: userData.id,
      email: userData.email,
      firstName: userData.first_name,
      lastName: userData.last_name,
      role: userData.role,
      position: userData.position,
      vesselAssignment: userData.vessel_assignment,
      status: userData.status,
      preferredLanguage: userData.preferred_language
    }
  });
}

// Create the standardized handler with error handling
const apiHandler = createAPIHandler(handler, {
  allowedMethods: ['POST']
});

// Export with rate limiting
module.exports = authRateLimit(apiHandler);
