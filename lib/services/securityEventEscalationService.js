/**
 * Security Event Escalation Service
 * Automatically creates incidents from high/critical security events
 */

const { supabase } = require('../supabase');
const { externalIntegrationService } = require('./externalIntegrationService');
const settingsService = require('../settingsService');

class SecurityEventEscalationService {
  constructor() {
    // Default escalation rules (fallback if database settings unavailable)
    this.defaultEscalationRules = {
      escalationSeverities: ['critical', 'high'],
      alwaysEscalateTypes: [
        'security_threat_detected',
        'brute_force_attack',
        'credential_stuffing',
        'privilege_escalation'
      ],
      escalationThreats: [
        'sql_injection_attempt',
        'xss_attempt',
        'brute_force_attack',
        'credential_stuffing',
        'privilege_escalation',
        'malicious_payload'
      ],
      deduplicationWindow: 30
    };

    // Cache for settings
    this.settingsCache = null;
    this.settingsCacheTime = 0;
    this.settingsCacheTTL = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get escalation settings from database with caching
   */
  async getEscalationSettings() {
    const now = Date.now();

    // Return cached settings if still valid
    if (this.settingsCache && (now - this.settingsCacheTime) < this.settingsCacheTTL) {
      return this.settingsCache;
    }

    try {
      const settings = await settingsService.getSettings();

      // Parse settings with fallbacks
      const escalationEnabled = settings.security?.escalation_enabled !== 'false';
      const severityThreshold = settings.security?.escalation_severity_threshold || 'high';
      const dedupWindow = parseInt(settings.security?.escalation_dedup_window_minutes) || 30;
      const threatTypes = settings.security?.escalation_threat_types ?
        JSON.parse(settings.security.escalation_threat_types) :
        this.defaultEscalationRules.escalationThreats;

      // Build severity list based on threshold
      const severityLevels = ['low', 'medium', 'high', 'critical'];
      const thresholdIndex = severityLevels.indexOf(severityThreshold);
      const escalationSeverities = thresholdIndex >= 0 ?
        severityLevels.slice(thresholdIndex) :
        ['high', 'critical'];

      this.settingsCache = {
        enabled: escalationEnabled,
        escalationSeverities,
        alwaysEscalateTypes: this.defaultEscalationRules.alwaysEscalateTypes,
        escalationThreats: threatTypes,
        deduplicationWindow: dedupWindow
      };

      this.settingsCacheTime = now;
      return this.settingsCache;
    } catch (error) {
      console.error('Error loading escalation settings:', error);

      // Return default settings as fallback
      return {
        enabled: true,
        ...this.defaultEscalationRules
      };
    }
  }

  /**
   * Process security event and determine if it should escalate to incident
   */
  async processSecurityEvent(securityEvent) {
    try {
      // Get current escalation settings
      const settings = await this.getEscalationSettings();

      // Check if escalation is enabled
      if (!settings.enabled) {
        return { escalated: false, reason: 'Security event escalation is disabled' };
      }

      // Check if event should escalate
      const shouldEscalate = await this.shouldEscalateEvent(securityEvent, settings);

      if (!shouldEscalate) {
        return { escalated: false, reason: 'Event does not meet escalation criteria' };
      }

      // Check for recent duplicate incidents
      const isDuplicate = await this.checkForDuplicateIncident(securityEvent, settings);

      if (isDuplicate) {
        return { escalated: false, reason: 'Similar incident already exists within deduplication window' };
      }

      // Create incident from security event
      const incident = await this.createIncidentFromSecurityEvent(securityEvent);

      // Send external notifications
      await this.sendExternalNotifications(incident);

      return {
        escalated: true,
        incident_id: incident.incident_id,
        reason: 'Security event escalated to incident'
      };

    } catch (error) {
      console.error('Error processing security event escalation:', error);
      throw error;
    }
  }

  /**
   * Determine if security event should escalate to incident
   */
  async shouldEscalateEvent(securityEvent, settings) {
    const { type, severity, threats } = securityEvent;

    // Check severity level
    if (settings.escalationSeverities.includes(severity)) {
      return true;
    }

    // Check event type
    if (settings.alwaysEscalateTypes.includes(type)) {
      return true;
    }

    // Check threat types
    if (threats && Array.isArray(threats)) {
      const hasEscalationThreat = threats.some(threat =>
        settings.escalationThreats.includes(threat.type || threat)
      );
      if (hasEscalationThreat) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check for duplicate incidents within deduplication window
   */
  async checkForDuplicateIncident(securityEvent, settings) {
    const windowStart = new Date(Date.now() - (settings.deduplicationWindow * 60 * 1000));

    const { data: existingIncidents } = await supabase
      .from('incidents')
      .select('incident_id')
      .eq('type', `security.${securityEvent.type}`)
      .eq('source_system', 'security_monitor')
      .gte('created_at', windowStart.toISOString())
      .limit(1);

    return existingIncidents && existingIncidents.length > 0;
  }

  /**
   * Create incident from security event
   */
  async createIncidentFromSecurityEvent(securityEvent) {
    const incidentId = this.generateIncidentId();

    const incidentData = {
      incident_id: incidentId,
      type: `security.${securityEvent.type}`,
      severity: this.mapSecuritySeverityToIncidentSeverity(securityEvent.severity),
      status: 'detected',
      title: this.generateIncidentTitle(securityEvent),
      description: this.generateIncidentDescription(securityEvent),
      source_system: 'security_monitor',
      source_event_id: securityEvent.event_id,
      detection_time: securityEvent.created_at || new Date().toISOString(),
      affected_users: this.extractAffectedUsers(securityEvent),
      affected_systems: this.extractAffectedSystems(securityEvent),
      metadata: {
        security_event: securityEvent,
        escalation_reason: 'Automatic escalation from security monitoring',
        escalated_at: new Date().toISOString(),
        threats: securityEvent.threats || [],
        attack_details: securityEvent.details?.attack_details || {}
      },
      external_notifications: []
    };

    const { data: incident, error } = await supabase
      .from('incidents')
      .insert([incidentData])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create incident: ${error.message}`);
    }

    console.log(`Created incident ${incidentId} from security event ${securityEvent.event_id}`);
    return incident;
  }

  /**
   * Generate incident ID
   */
  generateIncidentId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `INC-${timestamp}-${random}`;
  }

  /**
   * Map security severity to incident severity
   */
  mapSecuritySeverityToIncidentSeverity(securitySeverity) {
    const mapping = {
      'critical': 'critical',
      'high': 'high',
      'medium': 'medium',
      'low': 'low',
      'info': 'low'
    };
    return mapping[securitySeverity] || 'medium';
  }

  /**
   * Generate incident title from security event
   */
  generateIncidentTitle(securityEvent) {
    const { type, threats, details } = securityEvent;

    if (threats && threats.length > 0) {
      const threatList = threats.join(', ');
      return `Security Threat Detected: ${threatList}`;
    }

    if (type === 'security_threat_detected') {
      const url = details?.url || 'unknown endpoint';
      return `Security Threat Detected on ${url}`;
    }

    return `Security Event: ${type}`;
  }

  /**
   * Generate incident description from security event
   */
  generateIncidentDescription(securityEvent) {
    const { type, threats, details, severity } = securityEvent;

    let description = `Security event of type "${type}" with severity "${severity}" was detected.\n\n`;

    if (threats && threats.length > 0) {
      description += `**Threats Detected:**\n${threats.map(t => `- ${t}`).join('\n')}\n\n`;
    }

    if (details?.url) {
      description += `**Affected Endpoint:** ${details.url}\n`;
    }

    if (details?.method) {
      description += `**HTTP Method:** ${details.method}\n`;
    }

    if (details?.attack_details) {
      description += '\n**Attack Details:**\n';
      Object.entries(details.attack_details).forEach(([key, value]) => {
        description += `- ${key}: ${JSON.stringify(value)}\n`;
      });
    }

    description += `\n**Event ID:** ${securityEvent.event_id}`;
    description += `\n**Detection Time:** ${securityEvent.created_at}`;

    return description;
  }

  /**
   * Extract affected users from security event
   */
  extractAffectedUsers(securityEvent) {
    const users = [];

    if (securityEvent.user_id) {
      users.push(securityEvent.user_id.toString());
    }

    // Extract from details if available
    if (securityEvent.details?.user?.email) {
      users.push(securityEvent.details.user.email);
    }

    return users.length > 0 ? users : null;
  }

  /**
   * Extract affected systems from security event
   */
  extractAffectedSystems(securityEvent) {
    const systems = ['maritime-onboarding-system'];

    if (securityEvent.details?.url) {
      systems.push(`endpoint:${securityEvent.details.url}`);
    }

    return systems;
  }

  /**
   * Send external notifications for incident
   */
  async sendExternalNotifications(incident) {
    try {
      await externalIntegrationService.sendNotifications(incident);
    } catch (error) {
      console.error('Failed to send external notifications for incident:', error);
      // Don't throw - incident creation should succeed even if notifications fail
    }
  }

  /**
   * Process multiple security events in batch
   */
  async processBatchSecurityEvents(securityEvents) {
    const results = [];

    for (const event of securityEvents) {
      try {
        const result = await this.processSecurityEvent(event);
        results.push({ event_id: event.event_id, ...result });
      } catch (error) {
        results.push({
          event_id: event.event_id,
          escalated: false,
          error: error.message
        });
      }
    }

    return results;
  }
}

module.exports = { SecurityEventEscalationService };
