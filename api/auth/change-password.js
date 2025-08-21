// Vercel API Route: /api/auth/change-password.js
const db = require('../../lib/database');
const { verifyJWT } = require('../../lib/auth');
const bcrypt = require('bcrypt');
const { validators, validateObject } = require('../../lib/validation');
const { createAPIHandler, createError, createValidationError } = require('../../lib/apiHandler');
const { authRateLimit } = require('../../lib/rateLimit');
const EnhancedPasswordValidator = require('../../lib/security/EnhancedPasswordValidator');
const PasswordHistoryService = require('../../lib/security/PasswordHistoryService');
const EnhancedSessionManager = require('../../lib/security/EnhancedSessionManager');

// Helper function to log password change security events
function logPasswordChangeEvent(userId, email, ipAddress, userAgent, eventType, success, reason = null) {
  // Use setTimeout to make this non-blocking
  setTimeout(async () => {
    try {
      const { error } = await supabase
        .from('security_events')
        .insert({
          event_id: `pwd_change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: eventType,
          severity: success ? 'low' : 'medium',
          user_id: userId,
          ip_address: ipAddress,
          user_agent: userAgent,
          details: {
            email: email,
            success: success,
            reason: reason,
            timestamp: new Date().toISOString()
          },
          threats: success ? [] : ['account_security_breach_attempt']
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
  try {
    // Get client info for security logging
    const clientIP = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Verify JWT token
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = verifyJWT(token);
    if (!decoded) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    // Only managers can change their password through this endpoint
    if (decoded.role !== 'manager') {
      return res.status(403).json({ error: 'Manager access required' });
    }

    // Validate request body
    const validationSchema = {
      currentPassword: {
        required: true,
        type: 'string',
        options: {
          minLength: 1,
          maxLength: 256
        }
      },
      newPassword: {
        required: true,
        type: 'password',
        options: {}
      }
    };

    const validationErrors = validateObject(req.body, validationSchema);
    if (validationErrors.length > 0) {
      throw createValidationError('Validation failed', { errors: validationErrors });
    }

    const { currentPassword, newPassword } = req.body;

    // Get current user from database
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', decoded.userId)
      .eq('role', 'manager')
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isCurrentPasswordValid) {
      // Log failed password change attempt
      logPasswordChangeEvent(
        decoded.userId,
        user.email,
        clientIP,
        userAgent,
        'password_change_failure',
        false,
        'incorrect_current_password'
      );
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Initialize enhanced password validator and history service
    const passwordValidator = new EnhancedPasswordValidator();
    const passwordHistoryService = new PasswordHistoryService();

    // Enhanced password validation with user context
    const userInfo = {
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      username: user.email.split('@')[0]
    };

    const passwordValidation = passwordValidator.validate(newPassword, {
      userInfo,
      minStrengthLevel: 'good' // Require good or higher strength
    });

    if (!passwordValidation.valid) {
      logPasswordChangeEvent(
        decoded.userId,
        user.email,
        clientIP,
        userAgent,
        'password_change_failure',
        false,
        'password_validation_failed'
      );
      throw createValidationError(passwordValidation.error, {
        strength: passwordValidation.strength,
        entropy: passwordValidation.entropy
      });
    }

    // Check password history to prevent reuse
    const historyValidation = await passwordHistoryService.validatePasswordHistory(
      decoded.userId,
      newPassword,
      { checkLastN: 12 } // Check last 12 passwords
    );

    if (!historyValidation.valid) {
      logPasswordChangeEvent(
        decoded.userId,
        user.email,
        clientIP,
        userAgent,
        'password_change_failure',
        false,
        'password_reuse_detected'
      );
      throw createValidationError(historyValidation.error, {
        lastUsed: historyValidation.lastUsed
      });
    }

    // Hash new password
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password in database
    const { error: updateError } = await supabase
      .from('users')
      .update({
        password_hash: newPasswordHash,
        updated_at: new Date().toISOString()
      })
      .eq('id', decoded.userId);

    if (updateError) {
      // Log failed password change due to database error
      logPasswordChangeEvent(
        decoded.userId,
        user.email,
        clientIP,
        userAgent,
        'password_change_failure',
        false,
        'database_updateerror'
      );
      return res.status(500).json({ error: 'Failed to update password' });
    }

    // Add password to history
    const historyResult = await passwordHistoryService.addPasswordToHistory(
      decoded.userId,
      newPassword,
      req
    );

    if (!historyResult.success) {
      console.error('Failed to add password to history:', historyResult.error);
      // Don't fail the password change, just log the error
    }

    // Invalidate all sessions after password change for security
    const sessionManager = new EnhancedSessionManager();
    const sessionTermination = await sessionManager.terminateAllUserSessions(
      decoded.userId,
      'PASSWORD_CHANGED'
    );

    if (!sessionTermination.success) {
      console.error('Failed to terminate sessions after password change:', sessionTermination.error);
      // Don't fail the password change, but log the issue
    }

    // Log successful password change
    logPasswordChangeEvent(
      decoded.userId,
      user.email,
      clientIP,
      userAgent,
      'password_change_success',
      true,
      null
    );

    res.json({
      success: true,
      message: 'Password updated successfully. All sessions have been terminated for security.',
      sessionsTerminated: sessionTermination?.terminatedCount || 0
    });

  } catch (error) {
    // Re-throw to be handled by API handler
    throw error;
  }
}

// Create the standardized handler with error handling
const apiHandler = createAPIHandler(handler, {
  allowedMethods: ['POST']
});

// Export with rate limiting
module.exports = authRateLimit(apiHandler);
