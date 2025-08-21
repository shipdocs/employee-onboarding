/**
 * Security Logger Utility
 * Provides centralized security event logging functionality
 */

const { supabase } = require('./database-supabase-compat');

/**
 * Log authorization failure events
 */
async function logAuthorizationFailure(req, userId = null, requiredRole = null, actualRole = null) {
  try {
    const clientIP = req.headers['x-forwarded-for'] ||
                     req.headers['x-real-ip'] ||
                     req.connection?.remoteAddress ||
                     req.socket?.remoteAddress ||
                     'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    const endpoint = req.url || 'unknown';
    const method = req.method || 'unknown';

    const { error } = await supabase
      .from('security_events')
      .insert({
        event_id: `auth_fail_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'authorization_failure',
        severity: 'medium',
        user_id: userId,
        ip_address: clientIP,
        user_agent: userAgent,
        details: {
          endpoint: endpoint,
          method: method,
          required_role: requiredRole,
          actual_role: actualRole,
          timestamp: new Date().toISOString()
        },
        threats: ['privilege_escalation_attempt']
      });

    if (error) {
      console.error('Failed to log authorization failure:', error);
    }
  } catch (err) {
    console.error('Security logging error:', err);
  }
}

/**
 * Log admin operation events
 */
async function logAdminOperation(userId, email, operation, targetId, details, ipAddress, userAgent) {
  try {
    const { error } = await supabase
      .from('security_events')
      .insert({
        event_id: `admin_op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'admin_operation',
        severity: 'low',
        user_id: userId,
        ip_address: ipAddress,
        user_agent: userAgent,
        details: {
          email: email,
          operation: operation,
          target_id: targetId,
          details: details,
          timestamp: new Date().toISOString()
        },
        threats: []
      });

    if (error) {
      console.error('Failed to log admin operation:', error);
    }
  } catch (err) {
    console.error('Security logging error:', err);
  }
}

/**
 * Log file upload security events
 */
async function logFileUploadEvent(userId, email, fileName, fileSize, success, reason, ipAddress, userAgent) {
  try {
    const { error } = await supabase
      .from('security_events')
      .insert({
        event_id: `file_upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: success ? 'file_upload_success' : 'file_upload_rejected',
        severity: success ? 'low' : 'medium',
        user_id: userId,
        ip_address: ipAddress,
        user_agent: userAgent,
        details: {
          email: email,
          file_name: fileName,
          file_size: fileSize,
          success: success,
          reason: reason,
          timestamp: new Date().toISOString()
        },
        threats: success ? [] : ['malicious_file_upload_attempt']
      });

    if (error) {
      console.error('Failed to log file upload event:', error);
    }
  } catch (err) {
    console.error('Security logging error:', err);
  }
}

/**
 * Log suspicious activity
 */
async function logSuspiciousActivity(userId, activityType, details, ipAddress, userAgent) {
  try {
    const { error } = await supabase
      .from('security_events')
      .insert({
        event_id: `suspicious_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'suspicious_activity_detected',
        severity: 'high',
        user_id: userId,
        ip_address: ipAddress,
        user_agent: userAgent,
        details: {
          activity_type: activityType,
          details: details,
          timestamp: new Date().toISOString()
        },
        threats: ['suspicious_behavior', activityType]
      });

    if (error) {
      console.error('Failed to log suspicious activity:', error);
    }
  } catch (err) {
    console.error('Security logging error:', err);
  }
}

/**
 * Enhanced auth wrapper that logs authorization failures
 */
function withSecurityLogging(authFunction) {
  return async function(handler) {
    const wrappedHandler = authFunction(handler);

    return async function(req, res) {
      try {
        // Call the original auth handler
        return await wrappedHandler(req, res);
      } catch (error) {
        // If it's an authorization error, log it
        if (error.statusCode === 401 || error.statusCode === 403) {
          await logAuthorizationFailure(
            req,
            req.user?.userId || null,
            error.requiredRole || null,
            req.user?.role || null
          );
        }
        throw error;
      }
    };
  };
}

module.exports = {
  logAuthorizationFailure,
  logAdminOperation,
  logFileUploadEvent,
  logSuspiciousActivity,
  withSecurityLogging
};
