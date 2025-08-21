// lib/security/EnhancedSessionManager.js - Enhanced session management with concurrent limits
const crypto = require('crypto');
const { supabase } = require('../database-supabase-compat');
const securityAuditLogger = require('./SecurityAuditLogger');

class EnhancedSessionManager {
  constructor(options = {}) {
    this.maxConcurrentSessions = options.maxConcurrentSessions || 3;
    this.sessionTimeout = options.sessionTimeout || 2 * 60 * 60 * 1000; // 2 hours default
    this.auditLogger = securityAuditLogger;
  }

  /**
   * Create a new session for a user
   */
  async createSession(userId, req) {
    try {
      // Generate session ID
      const sessionId = crypto.randomBytes(32).toString('hex');

      // Extract session metadata
      const metadata = this.extractSessionMetadata(req);

      // Check concurrent session limit
      const activeSessions = await this.getActiveSessions(userId);

      if (activeSessions.length >= this.maxConcurrentSessions) {
        // Terminate oldest session
        await this.terminateOldestSession(userId, activeSessions);

        // Log session limit exceeded
        await this.auditLogger.logEvent({
          type: 'SESSION_LIMIT_EXCEEDED',
          severity: 'warning',
          userId: userId,
          details: {
            active_sessions: activeSessions.length,
            max_allowed: this.maxConcurrentSessions,
            action: 'terminated_oldest'
          },
          ipAddress: metadata.ip_address,
          userAgent: metadata.user_agent
        });
      }

      // Create new session in database
      const { data: session, error } = await supabase
        .from('user_sessions')
        .insert({
          session_id: sessionId,
          user_id: userId,
          ip_address: metadata.ip_address,
          user_agent: metadata.user_agent,
          device_fingerprint: metadata.device_fingerprint,
          expires_at: new Date(Date.now() + this.sessionTimeout).toISOString(),
          is_active: true,
          created_at: new Date().toISOString(),
          last_activity: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Log session creation
      await this.auditLogger.logEvent({
        type: 'SESSION_CREATED',
        severity: 'info',
        userId: userId,
        details: {
          session_id: sessionId,
          expires_at: session.expires_at
        },
        ipAddress: metadata.ip_address,
        userAgent: metadata.user_agent
      });

      return {
        success: true,
        sessionId,
        expiresAt: session.expires_at
      };
    } catch (error) {
      console.error('Session creation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Validate an existing session
   */
  async validateSession(sessionId, userId, req) {
    try {
      // Get session from database
      const { data: session, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('session_id', sessionId)
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (error || !session) {
        return { valid: false, reason: 'SESSION_NOT_FOUND' };
      }

      // Check if session is expired
      if (new Date(session.expires_at) < new Date()) {
        await this.terminateSession(sessionId, 'EXPIRED');
        return { valid: false, reason: 'SESSION_EXPIRED' };
      }

      // Validate session binding (IP and User Agent)
      const metadata = this.extractSessionMetadata(req);

      if (session.ip_address !== metadata.ip_address) {
        // Log suspicious activity
        await this.auditLogger.logEvent({
          type: 'SESSION_IP_MISMATCH',
          severity: 'high',
          userId: userId,
          details: {
            session_id: sessionId,
            original_ip: session.ip_address,
            current_ip: metadata.ip_address
          },
          ipAddress: metadata.ip_address,
          userAgent: metadata.user_agent
        });

        // Terminate session for security
        await this.terminateSession(sessionId, 'IP_MISMATCH');
        return { valid: false, reason: 'SESSION_IP_MISMATCH' };
      }

      // Update last activity
      await this.updateLastActivity(sessionId);

      return {
        valid: true,
        session
      };
    } catch (error) {
      console.error('Session validation error:', error);
      return {
        valid: false,
        reason: 'VALIDATION_ERROR',
        error: error.message
      };
    }
  }

  /**
   * Terminate a specific session
   */
  async terminateSession(sessionId, reason = 'MANUAL') {
    try {
      // Mark session as inactive
      const { error } = await supabase
        .from('user_sessions')
        .update({
          is_active: false,
          terminated_at: new Date().toISOString(),
          termination_reason: reason
        })
        .eq('session_id', sessionId);

      if (error) {
        throw error;
      }

      // Log session termination
      await this.auditLogger.logEvent({
        type: 'SESSION_TERMINATED',
        severity: 'info',
        details: {
          session_id: sessionId,
          reason
        }
      });

      return { success: true };
    } catch (error) {
      console.error('Session termination error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Terminate all sessions for a user
   */
  async terminateAllUserSessions(userId, reason = 'SECURITY_EVENT') {
    try {
      // Get all active sessions
      const { data: sessions, error: fetchError } = await supabase
        .from('user_sessions')
        .select('session_id')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (fetchError) {
        throw fetchError;
      }

      // Terminate all sessions
      const { error: updateError } = await supabase
        .from('user_sessions')
        .update({
          is_active: false,
          terminated_at: new Date().toISOString(),
          termination_reason: reason
        })
        .eq('user_id', userId)
        .eq('is_active', true);

      if (updateError) {
        throw updateError;
      }

      // Log bulk termination
      await this.auditLogger.logEvent({
        type: 'ALL_SESSIONS_TERMINATED',
        severity: 'warning',
        userId: userId,
        details: {
          terminated_count: sessions?.length || 0,
          reason
        }
      });

      return {
        success: true,
        terminatedCount: sessions?.length || 0
      };
    } catch (error) {
      console.error('Bulk session termination error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get active sessions for a user
   */
  async getActiveSessions(userId) {
    try {
      const { data: sessions, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return sessions || [];
    } catch (error) {
      console.error('Error fetching active sessions:', error);
      return [];
    }
  }

  /**
   * Terminate the oldest session for a user
   */
  async terminateOldestSession(userId, activeSessions = null) {
    try {
      const sessions = activeSessions || await this.getActiveSessions(userId);

      if (sessions.length === 0) {
        return { success: false, error: 'No active sessions' };
      }

      // Find oldest session
      const oldestSession = sessions.reduce((oldest, current) => {
        return new Date(current.created_at) < new Date(oldest.created_at) ? current : oldest;
      });

      return await this.terminateSession(oldestSession.session_id, 'CONCURRENT_LIMIT');
    } catch (error) {
      console.error('Error terminating oldest session:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update last activity timestamp for a session
   */
  async updateLastActivity(sessionId) {
    try {
      const { error } = await supabase
        .from('user_sessions')
        .update({
          last_activity: new Date().toISOString()
        })
        .eq('session_id', sessionId);

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating last activity:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions() {
    try {
      const { data: expiredSessions, error: fetchError } = await supabase
        .from('user_sessions')
        .select('session_id')
        .eq('is_active', true)
        .lt('expires_at', new Date().toISOString());

      if (fetchError) {
        throw fetchError;
      }

      if (expiredSessions && expiredSessions.length > 0) {
        const { error: updateError } = await supabase
          .from('user_sessions')
          .update({
            is_active: false,
            terminated_at: new Date().toISOString(),
            termination_reason: 'EXPIRED'
          })
          .in('session_id', expiredSessions.map(s => s.session_id));

        if (updateError) {
          throw updateError;
        }

        console.log(`Cleaned up ${expiredSessions.length} expired sessions`);
      }

      return {
        success: true,
        cleanedCount: expiredSessions?.length || 0
      };
    } catch (error) {
      console.error('Session cleanup error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Extract session metadata from request
   */
  extractSessionMetadata(req) {
    const userAgent = req.headers['user-agent'] || 'unknown';
    const ipAddress = req.headers['x-forwarded-for'] ||
                     req.connection?.remoteAddress ||
                     'unknown';

    // Generate device fingerprint
    const fingerprintData = `${userAgent}|${req.headers['accept-language'] || ''}|${req.headers['accept-encoding'] || ''}`;
    const deviceFingerprint = crypto
      .createHash('sha256')
      .update(fingerprintData)
      .digest('hex')
      .substring(0, 16);

    return {
      ip_address: ipAddress,
      user_agent: userAgent,
      device_fingerprint: deviceFingerprint
    };
  }

  /**
   * Check if session management is required for a user action
   */
  shouldInvalidateSessions(action) {
    const invalidationTriggers = [
      'PASSWORD_CHANGED',
      'ACCOUNT_LOCKED',
      'SUSPICIOUS_ACTIVITY',
      'MFA_DISABLED',
      'ROLE_CHANGED',
      'ACCOUNT_COMPROMISED'
    ];

    return invalidationTriggers.includes(action);
  }
}

module.exports = EnhancedSessionManager;
