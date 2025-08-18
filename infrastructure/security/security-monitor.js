/**
 * Security Monitoring Service
 * Detects and responds to security events
 */

const { supabase } = require('../../lib/supabase');
const config = require('./security-monitoring-config');
const { SecurityEventEscalationService } = require('../../lib/services/securityEventEscalationService');
const crypto = require('crypto');

class SecurityMonitor {
  constructor() {
    this.config = config;
    this.eventCache = new Map();
    this.blockedEntities = new Map();
    this.incidentCounter = 0;
    this.escalationService = new SecurityEventEscalationService();
  }

  /**
   * Process security event
   */
  async processEvent(eventType, eventData) {
    const timestamp = new Date().toISOString();
    const eventId = this.generateEventId();

    try {
      // Enrich event data
      const enrichedEvent = await this.enrichEvent({
        id: eventId,
        type: eventType,
        timestamp,
        ...eventData
      });

      // Check detection rules
      const threats = await this.detectThreats(enrichedEvent);

      // Evaluate severity
      const severity = this.evaluateSeverity(eventType, threats);

      // Log event
      await this.logSecurityEvent(enrichedEvent, threats, severity);

      // Execute response actions
      if (threats.length > 0 || severity !== 'info') {
        await this.executeResponseActions(enrichedEvent, threats, severity);
      }

      // Check for incident escalation
      await this.checkIncidentEscalation(enrichedEvent, threats, severity);

      // Update metrics
      await this.updateSecurityMetrics(eventType, severity);

      return {
        eventId,
        processed: true,
        threats: threats.length,
        severity,
        actions: enrichedEvent.actions || []
      };

    } catch (error) {
      console.error('Security event processing failed:', error);
      await this.logError(eventId, error);
      throw error;
    }
  }

  /**
   * Enrich event with additional context
   */
  async enrichEvent(event) {
    const enriched = { ...event };

    // Add user context
    if (event.userId) {
      const { data: user } = await supabase
        .from('users')
        .select('email, role, created_at, last_login')
        .eq('id', event.userId)
        .single();

      enriched.user = user;
    }

    // Add IP information
    if (event.ipAddress) {
      enriched.ipInfo = {
        address: event.ipAddress,
        isKnown: await this.isKnownIP(event.ipAddress),
        isBlocked: this.blockedEntities.has(`ip:${event.ipAddress}`),
        country: event.country || 'unknown'
      };
    }

    // Add session context
    if (event.sessionId) {
      enriched.session = await this.getSessionContext(event.sessionId);
    }

    // Add historical context
    enriched.history = await this.getEventHistory(event.type, event.userId || event.ipAddress);

    return enriched;
  }

  /**
   * Detect threats based on rules
   */
  async detectThreats(event) {
    const threats = [];

    // Check authentication threats
    if (event.type.startsWith('auth.')) {
      const authThreats = await this.checkAuthenticationThreats(event);
      threats.push(...authThreats);
    }

    // Check for malicious patterns
    const maliciousPatterns = this.checkMaliciousPatterns(event);
    if (maliciousPatterns.length > 0) {
      threats.push({
        type: 'malicious_payload',
        patterns: maliciousPatterns,
        severity: 'critical'
      });
    }

    // Check rate limits
    const rateLimitViolation = await this.checkRateLimits(event);
    if (rateLimitViolation) {
      threats.push({
        type: 'rate_limit_violation',
        details: rateLimitViolation,
        severity: 'high'
      });
    }

    // Check for anomalous behavior
    const anomalies = await this.detectAnomalies(event);
    threats.push(...anomalies);

    return threats;
  }

  /**
   * Check authentication threats
   */
  async checkAuthenticationThreats(event) {
    const threats = [];
    const key = `auth:${event.userId || event.ipAddress}`;
    
    // Get recent events
    const recentEvents = this.getRecentEvents(key, 600000); // Last 10 minutes

    // Check for brute force
    if (event.type === 'auth.failed_login') {
      const failedAttempts = recentEvents.filter(e => e.type === 'auth.failed_login').length;
      
      if (failedAttempts >= this.config.events.authentication.bruteForce.threshold) {
        threats.push({
          type: 'brute_force_attack',
          attempts: failedAttempts,
          severity: 'critical'
        });
      } else if (failedAttempts >= this.config.events.authentication.failedLogin.threshold) {
        threats.push({
          type: 'multiple_failed_logins',
          attempts: failedAttempts,
          severity: 'high'
        });
      }
    }

    // Check for credential stuffing
    if (this.detectCredentialStuffing(event, recentEvents)) {
      threats.push({
        type: 'credential_stuffing',
        severity: 'critical'
      });
    }

    // Check for suspicious location
    if (event.type === 'auth.login' && event.ipInfo) {
      const isSuspicious = await this.checkSuspiciousLocation(event);
      if (isSuspicious) {
        threats.push({
          type: 'suspicious_location',
          location: event.ipInfo.country,
          severity: 'medium'
        });
      }
    }

    return threats;
  }

  /**
   * Check for malicious patterns
   */
  checkMaliciousPatterns(event) {
    const patterns = [];
    const checkFields = ['query', 'body', 'headers', 'url'];

    for (const field of checkFields) {
      if (!event[field]) continue;

      const content = typeof event[field] === 'string' 
        ? event[field] 
        : JSON.stringify(event[field]);

      // Check SQL injection patterns
      for (const pattern of this.config.detectionRules.sqlInjection.patterns) {
        if (pattern.test(content)) {
          patterns.push({ type: 'sql_injection', field, pattern: pattern.toString() });
        }
      }

      // Check XSS patterns
      for (const pattern of this.config.detectionRules.xss.patterns) {
        if (pattern.test(content)) {
          patterns.push({ type: 'xss', field, pattern: pattern.toString() });
        }
      }

      // Check path traversal
      for (const pattern of this.config.detectionRules.pathTraversal.patterns) {
        if (pattern.test(content)) {
          patterns.push({ type: 'path_traversal', field, pattern: pattern.toString() });
        }
      }
    }

    return patterns;
  }

  /**
   * Check rate limits
   */
  async checkRateLimits(event) {
    const key = `rate:${event.ipAddress || event.userId}`;
    const window = 60000; // 1 minute
    const recentRequests = this.getRecentEvents(key, window);

    if (recentRequests.length > this.config.events.systemIntegrity.apiAbuse.requestsPerMinute) {
      return {
        requests: recentRequests.length,
        window: window,
        limit: this.config.events.systemIntegrity.apiAbuse.requestsPerMinute
      };
    }

    return null;
  }

  /**
   * Detect anomalies
   */
  async detectAnomalies(event) {
    const anomalies = [];

    // Check for after-hours access
    if (this.isAfterHours(event.timestamp)) {
      anomalies.push({
        type: 'after_hours_access',
        time: new Date(event.timestamp).toLocaleTimeString(),
        severity: 'low'
      });
    }

    // Check for bulk data access
    if (event.recordsAccessed > this.config.events.dataAccess.bulkDownload.threshold) {
      anomalies.push({
        type: 'bulk_data_access',
        records: event.recordsAccessed,
        severity: 'medium'
      });
    }

    // Check for privilege escalation
    if (event.type === 'auth.role_change' && this.isPrivilegeEscalation(event)) {
      anomalies.push({
        type: 'privilege_escalation',
        from: event.oldRole,
        to: event.newRole,
        severity: 'critical'
      });
    }

    return anomalies;
  }

  /**
   * Execute response actions
   */
  async executeResponseActions(event, threats, severity) {
    const actions = this.determineActions(event.type, threats, severity);
    event.actions = actions;

    for (const action of actions) {
      try {
        switch (action) {
          case 'log':
            await this.logSecurityEvent(event, threats, severity);
            break;
          case 'alert':
            await this.sendSecurityAlert(event, threats, severity);
            break;
          case 'block':
            await this.blockEntity(event);
            break;
          case 'rateLimit':
            await this.applyRateLimit(event);
            break;
          case 'audit':
            await this.createAuditEntry(event);
            break;
          case 'quarantine':
            await this.quarantineRequest(event);
            break;
          case 'notify':
            await this.notifyUser(event);
            break;
        }
      } catch (error) {
        console.error(`Failed to execute action ${action}:`, error);
      }
    }
  }

  /**
   * Determine which actions to take
   */
  determineActions(eventType, threats, severity) {
    const actions = new Set(['log']); // Always log

    // Add actions based on event configuration
    const eventCategory = eventType.split('.')[0];
    const eventName = eventType.split('.')[1];
    
    const eventConfig = this.config.events[eventCategory]?.[eventName];
    if (eventConfig?.actions) {
      eventConfig.actions.forEach(action => actions.add(action));
    }

    // Add actions based on threats
    for (const threat of threats) {
      if (threat.severity === 'critical') {
        actions.add('alert');
        actions.add('block');
        actions.add('audit');
      } else if (threat.severity === 'high') {
        actions.add('alert');
        actions.add('audit');
      }
    }

    // Add actions based on severity
    if (severity === 'critical') {
      actions.add('alert');
      actions.add('block');
      actions.add('audit');
    }

    return Array.from(actions);
  }

  /**
   * Send security alert
   */
  async sendSecurityAlert(event, threats, severity) {
    const alert = {
      id: this.generateIncidentId(),
      timestamp: new Date().toISOString(),
      severity,
      event: {
        id: event.id,
        type: event.type,
        user: event.user?.email || 'unknown',
        ip: event.ipAddress
      },
      threats,
      recommendations: this.generateRecommendations(threats)
    };

    // Send to configured channels
    const channels = this.config.responseActions.alert.channels;
    
    if (channels.includes('email')) {
      await this.sendEmailAlert(alert);
    }
    
    if (channels.includes('slack')) {
      await this.sendSlackAlert(alert);
    }
    
    if (channels.includes('sms') && severity === 'critical') {
      await this.sendSMSAlert(alert);
    }

    // Log alert
    await supabase
      .from('security_alerts')
      .insert({
        incident_id: alert.id,
        severity,
        event_id: event.id,
        details: alert,
        created_at: alert.timestamp
      });
  }

  /**
   * Block entity (IP or user)
   */
  async blockEntity(event) {
    const duration = event.permanent 
      ? null 
      : this.config.responseActions.block.duration.temporary;

    if (event.ipAddress && this.config.responseActions.block.scope.ip) {
      const key = `ip:${event.ipAddress}`;
      this.blockedEntities.set(key, {
        blockedAt: Date.now(),
        duration,
        reason: event.type
      });

      await supabase
        .from('blocked_entities')
        .insert({
          type: 'ip',
          identifier: event.ipAddress,
          reason: event.type,
          expires_at: duration ? new Date(Date.now() + duration).toISOString() : null,
          created_at: new Date().toISOString()
        });
    }

    if (event.userId && this.config.responseActions.block.scope.user) {
      await supabase
        .from('users')
        .update({ 
          status: 'blocked',
          blocked_at: new Date().toISOString(),
          blocked_reason: event.type
        })
        .eq('id', event.userId);
    }
  }

  /**
   * Helper methods
   */
  
  generateEventId() {
    return `evt_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  generateIncidentId() {
    this.incidentCounter++;
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
    return `INC-${date}-${String(this.incidentCounter).padStart(4, '0')}`;
  }

  getRecentEvents(key, window) {
    const events = this.eventCache.get(key) || [];
    const cutoff = Date.now() - window;
    return events.filter(e => e.timestamp > cutoff);
  }

  cacheEvent(key, event) {
    const events = this.eventCache.get(key) || [];
    events.push({
      ...event,
      timestamp: Date.now()
    });
    
    // Keep only recent events
    const cutoff = Date.now() - 3600000; // 1 hour
    this.eventCache.set(key, events.filter(e => e.timestamp > cutoff));
  }

  isAfterHours(timestamp) {
    const hour = new Date(timestamp).getHours();
    return hour >= this.config.events.dataAccess.afterHoursAccess.startHour ||
           hour < this.config.events.dataAccess.afterHoursAccess.endHour;
  }

  isPrivilegeEscalation(event) {
    const privilegeOrder = ['crew', 'manager', 'admin'];
    const oldIndex = privilegeOrder.indexOf(event.oldRole);
    const newIndex = privilegeOrder.indexOf(event.newRole);
    return newIndex > oldIndex;
  }

  detectCredentialStuffing(event, recentEvents) {
    // Check for indicators
    const indicators = {
      rapidRequests: recentEvents.length > 10,
      differentUserAgents: new Set(recentEvents.map(e => e.userAgent)).size > 3,
      distributedIPs: new Set(recentEvents.map(e => e.ipAddress)).size > 5
    };

    return Object.values(indicators).filter(Boolean).length >= 2;
  }

  async checkSuspiciousLocation(event) {
    // Check if location is different from user's usual location
    const { data: recentLogins } = await supabase
      .from('audit_logs')
      .select('details')
      .eq('user_id', event.userId)
      .eq('action', 'login')
      .order('created_at', { ascending: false })
      .limit(10);

    if (!recentLogins || recentLogins.length < 2) return false;

    const locations = recentLogins.map(l => l.details?.country).filter(Boolean);
    const uniqueLocations = new Set(locations);
    
    return uniqueLocations.size > 2 || !locations.includes(event.ipInfo.country);
  }

  async isKnownIP(ipAddress) {
    const { data } = await supabase
      .from('known_ips')
      .select('id')
      .eq('ip_address', ipAddress)
      .single();

    return !!data;
  }

  async getSessionContext(sessionId) {
    const { data } = await supabase
      .from('user_sessions')
      .select('user_id, created_at, last_activity, ip_address')
      .eq('id', sessionId)
      .single();

    return data;
  }

  async getEventHistory(eventType, identifier) {
    const { data } = await supabase
      .from('security_events')
      .select('type, severity, created_at')
      .or(`user_id.eq.${identifier},ip_address.eq.${identifier}`)
      .order('created_at', { ascending: false })
      .limit(20);

    return {
      totalEvents: data?.length || 0,
      recentEvents: data || [],
      lastEvent: data?.[0]?.created_at
    };
  }

  evaluateSeverity(eventType, threats) {
    if (threats.some(t => t.severity === 'critical')) return 'critical';
    if (threats.some(t => t.severity === 'high')) return 'high';
    if (threats.some(t => t.severity === 'medium')) return 'medium';
    if (threats.length > 0) return 'low';
    return 'info';
  }

  generateRecommendations(threats) {
    const recommendations = [];

    for (const threat of threats) {
      switch (threat.type) {
        case 'brute_force_attack':
          recommendations.push('Enable account lockout after failed attempts');
          recommendations.push('Implement CAPTCHA for login forms');
          recommendations.push('Consider implementing MFA');
          break;
        case 'sql_injection':
          recommendations.push('Review and sanitize all user inputs');
          recommendations.push('Use parameterized queries');
          recommendations.push('Implement input validation');
          break;
        case 'suspicious_location':
          recommendations.push('Verify user identity through additional means');
          recommendations.push('Send notification to user about new location');
          break;
      }
    }

    return [...new Set(recommendations)];
  }

  async logSecurityEvent(event, threats, severity) {
    try {
      await supabase
        .from('security_events')
        .insert({
          event_id: event.id,
          type: event.type,
          severity,
          user_id: event.userId,
          ip_address: event.ipAddress,
          threats,
          details: event,
          created_at: event.timestamp
        });

      // Cache event for pattern detection
      const cacheKey = `${event.type}:${event.userId || event.ipAddress}`;
      this.cacheEvent(cacheKey, event);

    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  async updateSecurityMetrics(eventType, severity) {
    // Update metrics for dashboard
    try {
      await supabase
        .from('security_metrics')
        .insert({
          metric_type: 'event',
          event_type: eventType,
          severity,
          count: 1,
          timestamp: new Date().toISOString()
        });
    } catch (error) {
      console.error('Failed to update security metrics:', error);
    }
  }

  async sendEmailAlert(alert) {
    // Implementation would use unifiedEmailService
    console.log('Security email alert:', alert);
  }

  async sendSlackAlert(alert) {
    // Implementation would use Slack webhook
    console.log('Security Slack alert:', alert);
  }

  async sendSMSAlert(alert) {
    // Implementation would use SMS service
    console.log('Security SMS alert:', alert);
  }

  async createAuditEntry(event) {
    await supabase
      .from('audit_logs')
      .insert({
        user_id: event.userId,
        action: `security_event:${event.type}`,
        details: event,
        ip_address: event.ipAddress,
        user_agent: event.userAgent,
        created_at: event.timestamp
      });
  }

  async quarantineRequest(event) {
    await supabase
      .from('quarantined_requests')
      .insert({
        event_id: event.id,
        type: event.type,
        details: event,
        requires_review: true,
        created_at: event.timestamp
      });
  }

  async notifyUser(event) {
    if (!event.userId) return;

    await supabase
      .from('notifications')
      .insert({
        user_id: event.userId,
        type: 'security_alert',
        title: 'Security Alert',
        message: `Suspicious activity detected: ${event.type}`,
        severity: event.severity,
        created_at: event.timestamp
      });
  }

  async applyRateLimit(event) {
    // Rate limiting would be implemented at the API gateway level
    console.log('Applying rate limit for:', event.ipAddress || event.userId);
  }

  async logError(eventId, error) {
    await supabase
      .from('security_errors')
      .insert({
        event_id: eventId,
        error: error.message,
        stack: error.stack,
        created_at: new Date().toISOString()
      });
  }

  /**
   * Check if security event should escalate to incident
   */
  async checkIncidentEscalation(event, threats, severity) {
    try {
      // Prepare security event data for escalation service (sanitized)
      const securityEvent = {
        event_id: event.id,
        type: event.type,
        severity,
        threats: threats.map(threat => ({
          type: threat.type,
          severity: threat.severity,
          patterns: Array.isArray(threat.patterns) ? threat.patterns.slice(0, 5) : undefined,
          attempts: threat.attempts,
          details: threat.details
        })),
        details: {
          // Only include essential, non-sensitive details
          type: event.type,
          timestamp: event.timestamp,
          user_agent: event.userAgent ? event.userAgent.substring(0, 200) : undefined,
          endpoint: event.endpoint,
          method: event.method,
          status_code: event.statusCode,
          response_time: event.responseTime
        },
        created_at: event.timestamp,
        user_id: event.userId,
        ip_address: event.ipAddress
      };

      // Process escalation
      const result = await this.escalationService.processSecurityEvent(securityEvent);

      if (result.escalated) {
        console.log(`Security event ${event.id} escalated to incident ${result.incident_id}: ${result.reason}`);
      } else {
        console.log(`Security event ${event.id} not escalated: ${result.reason}`);
      }

      return result;
    } catch (error) {
      console.error('Error checking incident escalation:', error);
      return { escalated: false, error: error.message };
    }
  }
}

module.exports = SecurityMonitor;