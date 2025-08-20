/**
 * Security Incident Response Service
 *
 * Provides automated security incident creation, escalation procedures,
 * and forensic data collection for security events.
 */

const EventEmitter = require('events');
const crypto = require('crypto');

class SecurityIncidentResponse extends EventEmitter {
  constructor() {
    super();
    this.incidents = new Map();
    this.escalationRules = new Map();
    this.responsePlaybooks = new Map();
    this.forensicCollectors = new Map();

    // Initialize default escalation rules
    this.initializeDefaultEscalationRules();

    // Initialize default response playbooks
    this.initializeDefaultPlaybooks();

    // Initialize forensic collectors
    this.initializeForensicCollectors();
  }

  /**
   * Initialize default escalation rules
   */
  initializeDefaultEscalationRules() {
    // Critical incidents - immediate escalation
    this.escalationRules.set('critical', {
      level: 'critical',
      escalateAfter: 0, // Immediate
      notificationChannels: ['email', 'sms', 'webhook'],
      assignees: ['security-team', 'incident-commander'],
      autoActions: ['block-ip', 'disable-user', 'collect-forensics']
    });

    // High severity incidents - escalate after 15 minutes
    this.escalationRules.set('high', {
      level: 'high',
      escalateAfter: 15 * 60 * 1000, // 15 minutes
      notificationChannels: ['email', 'webhook'],
      assignees: ['security-team'],
      autoActions: ['collect-forensics', 'rate-limit-ip']
    });

    // Medium severity incidents - escalate after 1 hour
    this.escalationRules.set('medium', {
      level: 'medium',
      escalateAfter: 60 * 60 * 1000, // 1 hour
      notificationChannels: ['email'],
      assignees: ['security-analyst'],
      autoActions: ['collect-forensics']
    });

    // Low severity incidents - escalate after 4 hours
    this.escalationRules.set('low', {
      level: 'low',
      escalateAfter: 4 * 60 * 60 * 1000, // 4 hours
      notificationChannels: ['email'],
      assignees: ['security-analyst'],
      autoActions: []
    });
  }

  /**
   * Initialize default response playbooks
   */
  initializeDefaultPlaybooks() {
    // XSS Attack Response
    this.responsePlaybooks.set('xss-attack', {
      name: 'XSS Attack Response',
      severity: 'high',
      steps: [
        'Identify affected endpoints and users',
        'Block malicious requests at WAF level',
        'Sanitize affected content',
        'Review and update input validation',
        'Notify affected users if data was compromised'
      ],
      autoActions: ['block-ip', 'sanitize-content', 'collect-forensics'],
      estimatedTime: '2-4 hours'
    });

    // Brute Force Attack Response
    this.responsePlaybooks.set('brute-force-attack', {
      name: 'Brute Force Attack Response',
      severity: 'medium',
      steps: [
        'Identify source IP addresses',
        'Implement rate limiting',
        'Lock affected accounts temporarily',
        'Review authentication logs',
        'Update security monitoring rules'
      ],
      autoActions: ['block-ip', 'lock-accounts', 'increase-rate-limits'],
      estimatedTime: '1-2 hours'
    });

    // Malware Detection Response
    this.responsePlaybooks.set('malware-detection', {
      name: 'Malware Detection Response',
      severity: 'critical',
      steps: [
        'Quarantine infected files immediately',
        'Scan all recent uploads',
        'Identify upload source and user',
        'Review file validation rules',
        'Update malware signatures'
      ],
      autoActions: ['quarantine-files', 'scan-recent-uploads', 'block-user'],
      estimatedTime: '30 minutes - 2 hours'
    });

    // Data Breach Response
    this.responsePlaybooks.set('data-breach', {
      name: 'Data Breach Response',
      severity: 'critical',
      steps: [
        'Contain the breach immediately',
        'Assess scope of compromised data',
        'Preserve forensic evidence',
        'Notify legal and compliance teams',
        'Prepare breach notifications',
        'Implement additional security controls'
      ],
      autoActions: ['block-access', 'collect-forensics', 'notify-legal'],
      estimatedTime: '4-24 hours'
    });

    // Suspicious Session Activity Response
    this.responsePlaybooks.set('suspicious-session', {
      name: 'Suspicious Session Activity Response',
      severity: 'medium',
      steps: [
        'Terminate suspicious sessions',
        'Force password reset for affected users',
        'Review session logs',
        'Check for privilege escalation',
        'Update session security rules'
      ],
      autoActions: ['terminate-sessions', 'force-password-reset'],
      estimatedTime: '1-3 hours'
    });
  }

  /**
   * Initialize forensic data collectors
   */
  initializeForensicCollectors() {
    // Network forensics collector
    this.forensicCollectors.set('network', {
      name: 'Network Forensics',
      collect: async (incident) => {
        return {
          sourceIp: incident.metadata?.ipAddress,
          userAgent: incident.metadata?.userAgent,
          requestHeaders: incident.metadata?.headers,
          timestamp: incident.createdAt,
          geolocation: await this.getIpGeolocation(incident.metadata?.ipAddress)
        };
      }
    });

    // User activity collector
    this.forensicCollectors.set('user-activity', {
      name: 'User Activity Forensics',
      collect: async (incident) => {
        const userId = incident.metadata?.userId;
        if (!userId) return null;

        return {
          userId,
          recentSessions: await this.getUserRecentSessions(userId),
          recentActions: await this.getUserRecentActions(userId),
          accountStatus: await this.getUserAccountStatus(userId),
          permissions: await this.getUserPermissions(userId)
        };
      }
    });

    // System state collector
    this.forensicCollectors.set('system-state', {
      name: 'System State Forensics',
      collect: async (incident) => {
        return {
          systemLoad: process.cpuUsage(),
          memoryUsage: process.memoryUsage(),
          activeConnections: await this.getActiveConnections(),
          recentLogs: await this.getRecentSecurityLogs(),
          configurationState: await this.getSecurityConfiguration()
        };
      }
    });

    // File system collector
    this.forensicCollectors.set('filesystem', {
      name: 'File System Forensics',
      collect: async (incident) => {
        if (incident.type !== 'file-upload' && incident.type !== 'malware-detection') {
          return null;
        }

        return {
          affectedFiles: incident.metadata?.files || [],
          fileHashes: await this.calculateFileHashes(incident.metadata?.files),
          uploadHistory: await this.getRecentUploads(),
          quarantinedFiles: await this.getQuarantinedFiles()
        };
      }
    });
  }

  /**
   * Create a new security incident
   */
  async createIncident(eventData) {
    const incident = {
      id: crypto.randomUUID(),
      type: eventData.type,
      severity: this.determineSeverity(eventData),
      title: this.generateIncidentTitle(eventData),
      description: eventData.description || 'Automated security incident',
      status: 'open',
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: eventData.metadata || {},
      timeline: [{
        timestamp: new Date(),
        action: 'incident_created',
        description: 'Security incident automatically created',
        actor: 'system'
      }],
      forensicData: {},
      assignees: [],
      tags: eventData.tags || [],
      escalationLevel: 0,
      autoActionsExecuted: []
    };

    // Store the incident
    this.incidents.set(incident.id, incident);

    // Emit incident created event
    this.emit('incident-created', incident);

    // Execute immediate response actions
    await this.executeImmediateResponse(incident);

    // Schedule escalation if needed
    this.scheduleEscalation(incident);

    console.log(`🚨 Security incident created: ${incident.id} - ${incident.title}`);

    return incident;
  }

  /**
   * Determine incident severity based on event data
   */
  determineSeverity(eventData) {
    const severityRules = {
      'malware-detection': 'critical',
      'data-breach': 'critical',
      'privilege-escalation': 'critical',
      'xss-attack': 'high',
      'sql-injection': 'high',
      'brute-force-attack': 'medium',
      'suspicious-session': 'medium',
      'rate-limit-violation': 'low',
      'failed-authentication': 'low'
    };

    return severityRules[eventData.type] || 'medium';
  }

  /**
   * Generate incident title based on event data
   */
  generateIncidentTitle(eventData) {
    const titleTemplates = {
      'malware-detection': 'Malware Detected in File Upload',
      'xss-attack': 'Cross-Site Scripting Attack Detected',
      'brute-force-attack': 'Brute Force Attack in Progress',
      'data-breach': 'Potential Data Breach Detected',
      'suspicious-session': 'Suspicious Session Activity Detected',
      'rate-limit-violation': 'Rate Limiting Violations Detected'
    };

    const template = titleTemplates[eventData.type] || 'Security Event Detected';
    const source = eventData.metadata?.ipAddress ? ` from ${eventData.metadata.ipAddress}` : '';

    return `${template}${source}`;
  }

  /**
   * Execute immediate response actions
   */
  async executeImmediateResponse(incident) {
    const playbook = this.responsePlaybooks.get(incident.type);
    if (!playbook) {
      console.log(`No playbook found for incident type: ${incident.type}`);
      return;
    }

    // Execute auto actions
    for (const action of playbook.autoActions) {
      try {
        await this.executeAutoAction(incident, action);

        incident.autoActionsExecuted.push({
          action,
          timestamp: new Date(),
          status: 'success'
        });

        incident.timeline.push({
          timestamp: new Date(),
          action: 'auto_action_executed',
          description: `Executed automatic action: ${action}`,
          actor: 'system'
        });

      } catch (error) {
        console.error(`Failed to execute auto action ${action}:`, error);

        incident.autoActionsExecuted.push({
          action,
          timestamp: new Date(),
          status: 'failed',
          error: error.message
        });
      }
    }

    // Collect forensic data
    await this.collectForensicData(incident);

    // Update incident
    incident.updatedAt = new Date();
    this.incidents.set(incident.id, incident);
  }

  /**
   * Execute automatic response action
   */
  async executeAutoAction(incident, action) {
    switch (action) {
      case 'block-ip':
        await this.blockIpAddress(incident.metadata?.ipAddress);
        break;

      case 'disable-user':
        await this.disableUser(incident.metadata?.userId);
        break;

      case 'quarantine-files':
        await this.quarantineFiles(incident.metadata?.files);
        break;

      case 'terminate-sessions':
        await this.terminateUserSessions(incident.metadata?.userId);
        break;

      case 'collect-forensics':
        await this.collectForensicData(incident);
        break;

      case 'rate-limit-ip':
        await this.applyRateLimiting(incident.metadata?.ipAddress);
        break;

      case 'sanitize-content':
        await this.sanitizeContent(incident.metadata?.contentId);
        break;

      default:
        console.log(`Unknown auto action: ${action}`);
    }
  }

  /**
   * Collect forensic data for incident
   */
  async collectForensicData(incident) {
    console.log(`🔍 Collecting forensic data for incident ${incident.id}`);

    for (const [collectorName, collector] of this.forensicCollectors) {
      try {
        const data = await collector.collect(incident);
        if (data) {
          incident.forensicData[collectorName] = {
            data,
            collectedAt: new Date(),
            collector: collector.name
          };
        }
      } catch (error) {
        console.error(`Failed to collect ${collectorName} forensics:`, error);
        incident.forensicData[collectorName] = {
          error: error.message,
          collectedAt: new Date(),
          collector: collector.name
        };
      }
    }

    incident.timeline.push({
      timestamp: new Date(),
      action: 'forensics_collected',
      description: 'Forensic data collection completed',
      actor: 'system'
    });
  }

  /**
   * Schedule incident escalation
   */
  scheduleEscalation(incident) {
    const escalationRule = this.escalationRules.get(incident.severity);
    if (!escalationRule || escalationRule.escalateAfter === 0) {
      // Immediate escalation or no escalation needed
      if (escalationRule && escalationRule.escalateAfter === 0) {
        this.escalateIncident(incident);
      }
      return;
    }

    setTimeout(() => {
      // Check if incident is still open
      const currentIncident = this.incidents.get(incident.id);
      if (currentIncident && currentIncident.status === 'open') {
        this.escalateIncident(currentIncident);
      }
    }, escalationRule.escalateAfter);
  }

  /**
   * Escalate incident to next level
   */
  async escalateIncident(incident) {
    incident.escalationLevel += 1;
    incident.updatedAt = new Date();

    const escalationRule = this.escalationRules.get(incident.severity);
    if (escalationRule) {
      // Send notifications
      await this.sendEscalationNotifications(incident, escalationRule);

      // Assign to appropriate team members
      incident.assignees = escalationRule.assignees;
    }

    incident.timeline.push({
      timestamp: new Date(),
      action: 'incident_escalated',
      description: `Incident escalated to level ${incident.escalationLevel}`,
      actor: 'system'
    });

    this.incidents.set(incident.id, incident);
    this.emit('incident-escalated', incident);

    console.log(`📈 Incident ${incident.id} escalated to level ${incident.escalationLevel}`);
  }

  /**
   * Send escalation notifications
   */
  async sendEscalationNotifications(incident, escalationRule) {
    for (const channel of escalationRule.notificationChannels) {
      try {
        await this.sendNotification(incident, channel);
      } catch (error) {
        console.error(`Failed to send ${channel} notification:`, error);
      }
    }
  }

  /**
   * Send notification through specified channel
   */
  async sendNotification(incident, channel) {
    const message = this.formatNotificationMessage(incident);

    switch (channel) {
      case 'email':
        await this.sendEmailNotification(incident, message);
        break;

      case 'sms':
        await this.sendSmsNotification(incident, message);
        break;

      case 'webhook':
        await this.sendWebhookNotification(incident, message);
        break;

      default:
        console.log(`Unknown notification channel: ${channel}`);
    }
  }

  /**
   * Format notification message
   */
  formatNotificationMessage(incident) {
    return {
      subject: `Security Incident Alert: ${incident.title}`,
      body: `
Security Incident Details:
- ID: ${incident.id}
- Type: ${incident.type}
- Severity: ${incident.severity}
- Status: ${incident.status}
- Created: ${incident.createdAt.toISOString()}
- Description: ${incident.description}

Automatic actions taken:
${incident.autoActionsExecuted.map(action => `- ${action.action}: ${action.status}`).join('\n')}

Please review and take appropriate action.
      `.trim()
    };
  }

  /**
   * Update incident status
   */
  updateIncident(incidentId, updates) {
    const incident = this.incidents.get(incidentId);
    if (!incident) {
      throw new Error(`Incident not found: ${incidentId}`);
    }

    // Update fields
    Object.assign(incident, updates, { updatedAt: new Date() });

    // Add timeline entry
    incident.timeline.push({
      timestamp: new Date(),
      action: 'incident_updated',
      description: `Incident updated: ${Object.keys(updates).join(', ')}`,
      actor: updates.updatedBy || 'system'
    });

    this.incidents.set(incidentId, incident);
    this.emit('incident-updated', incident);

    return incident;
  }

  /**
   * Close incident
   */
  closeIncident(incidentId, resolution, closedBy = 'system') {
    const incident = this.incidents.get(incidentId);
    if (!incident) {
      throw new Error(`Incident not found: ${incidentId}`);
    }

    incident.status = 'closed';
    incident.resolution = resolution;
    incident.closedAt = new Date();
    incident.closedBy = closedBy;
    incident.updatedAt = new Date();

    incident.timeline.push({
      timestamp: new Date(),
      action: 'incident_closed',
      description: `Incident closed: ${resolution}`,
      actor: closedBy
    });

    this.incidents.set(incidentId, incident);
    this.emit('incident-closed', incident);

    console.log(`✅ Incident ${incidentId} closed: ${resolution}`);
    return incident;
  }

  /**
   * Get incident by ID
   */
  getIncident(incidentId) {
    return this.incidents.get(incidentId);
  }

  /**
   * Get all incidents with optional filters
   */
  getIncidents(filters = {}) {
    let incidents = Array.from(this.incidents.values());

    // Apply filters
    if (filters.status) {
      incidents = incidents.filter(i => i.status === filters.status);
    }

    if (filters.severity) {
      incidents = incidents.filter(i => i.severity === filters.severity);
    }

    if (filters.type) {
      incidents = incidents.filter(i => i.type === filters.type);
    }

    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      incidents = incidents.filter(i => i.createdAt >= startDate);
    }

    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      incidents = incidents.filter(i => i.createdAt <= endDate);
    }

    // Sort by creation date (newest first)
    incidents.sort((a, b) => b.createdAt - a.createdAt);

    return incidents;
  }

  /**
   * Generate incident report
   */
  generateIncidentReport(timeRange = '24h') {
    const now = new Date();
    let startTime;

    switch (timeRange) {
      case '1h':
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    const incidents = this.getIncidents({
      startDate: startTime.toISOString(),
      endDate: now.toISOString()
    });

    // Calculate statistics
    const stats = {
      total: incidents.length,
      open: incidents.filter(i => i.status === 'open').length,
      closed: incidents.filter(i => i.status === 'closed').length,
      critical: incidents.filter(i => i.severity === 'critical').length,
      high: incidents.filter(i => i.severity === 'high').length,
      medium: incidents.filter(i => i.severity === 'medium').length,
      low: incidents.filter(i => i.severity === 'low').length
    };

    // Group by type
    const byType = {};
    incidents.forEach(incident => {
      byType[incident.type] = (byType[incident.type] || 0) + 1;
    });

    // Calculate average resolution time for closed incidents
    const closedIncidents = incidents.filter(i => i.status === 'closed' && i.closedAt);
    const avgResolutionTime = closedIncidents.length > 0
      ? closedIncidents.reduce((sum, incident) => {
          return sum + (incident.closedAt - incident.createdAt);
        }, 0) / closedIncidents.length
      : 0;

    return {
      timeRange,
      startTime: startTime.toISOString(),
      endTime: now.toISOString(),
      statistics: stats,
      incidentsByType: byType,
      averageResolutionTime: Math.round(avgResolutionTime / 1000 / 60), // minutes
      recentIncidents: incidents.slice(0, 10),
      trends: this.calculateIncidentTrends(incidents)
    };
  }

  /**
   * Calculate incident trends
   */
  calculateIncidentTrends(incidents) {
    // Group incidents by hour for trend analysis
    const hourlyIncidents = {};

    incidents.forEach(incident => {
      const hour = new Date(incident.createdAt).toISOString().slice(0, 13);
      hourlyIncidents[hour] = (hourlyIncidents[hour] || 0) + 1;
    });

    const hours = Object.keys(hourlyIncidents).sort();
    const values = hours.map(hour => hourlyIncidents[hour]);

    // Calculate trend (simple linear regression slope)
    const n = values.length;
    if (n < 2) return 'stable';

    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = values.reduce((sum, y, x) => sum + x * y, 0);
    const sumXX = (n * (n - 1) * (2 * n - 1)) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

    if (slope > 0.1) return 'increasing';
    if (slope < -0.1) return 'decreasing';
    return 'stable';
  }

  // Mock implementations for auto actions (to be replaced with real implementations)
  async blockIpAddress(ipAddress) {
    if (!ipAddress) return;
    console.log(`🚫 Blocking IP address: ${ipAddress}`);
    // Implementation would integrate with firewall/WAF
  }

  async disableUser(userId) {
    if (!userId) return;
    console.log(`🚫 Disabling user: ${userId}`);
    // Implementation would disable user account
  }

  async quarantineFiles(files) {
    if (!files || !Array.isArray(files)) return;
    console.log(`🔒 Quarantining ${files.length} files`);
    // Implementation would move files to quarantine
  }

  async terminateUserSessions(userId) {
    if (!userId) return;
    console.log(`🔌 Terminating sessions for user: ${userId}`);
    // Implementation would terminate all user sessions
  }

  async applyRateLimiting(ipAddress) {
    if (!ipAddress) return;
    console.log(`⏱️ Applying rate limiting to IP: ${ipAddress}`);
    // Implementation would apply stricter rate limits
  }

  async sanitizeContent(contentId) {
    if (!contentId) return;
    console.log(`🧹 Sanitizing content: ${contentId}`);
    // Implementation would sanitize malicious content
  }

  // Mock implementations for forensic data collection
  async getIpGeolocation(ipAddress) {
    return { country: 'Unknown', city: 'Unknown' };
  }

  async getUserRecentSessions(userId) {
    return [];
  }

  async getUserRecentActions(userId) {
    return [];
  }

  async getUserAccountStatus(userId) {
    return { active: true };
  }

  async getUserPermissions(userId) {
    return [];
  }

  async getActiveConnections() {
    return [];
  }

  async getRecentSecurityLogs() {
    return [];
  }

  async getSecurityConfiguration() {
    return {};
  }

  async calculateFileHashes(files) {
    return {};
  }

  async getRecentUploads() {
    return [];
  }

  async getQuarantinedFiles() {
    return [];
  }

  async sendEmailNotification(incident, message) {
    console.log(`📧 Sending email notification for incident ${incident.id}`);
  }

  async sendSmsNotification(incident, message) {
    console.log(`📱 Sending SMS notification for incident ${incident.id}`);
  }

  async sendWebhookNotification(incident, message) {
    console.log(`🔗 Sending webhook notification for incident ${incident.id}`);
  }
}

// Singleton instance
let securityIncidentResponseInstance = null;

/**
 * Get singleton instance of SecurityIncidentResponse
 */
function getSecurityIncidentResponse() {
  if (!securityIncidentResponseInstance) {
    securityIncidentResponseInstance = new SecurityIncidentResponse();
  }
  return securityIncidentResponseInstance;
}

module.exports = {
  SecurityIncidentResponse,
  getSecurityIncidentResponse
};
