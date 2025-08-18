/**
 * Security Monitoring Configuration
 * Defines security events, thresholds, and alert rules
 */

module.exports = {
  // Security events to monitor
  events: {
    authentication: {
      failedLogin: {
        threshold: 5,           // Alert after 5 failed attempts
        window: 300000,         // Within 5 minutes
        severity: 'high',
        actions: ['log', 'alert', 'rateLimit']
      },
      bruteForce: {
        threshold: 10,          // 10 attempts
        window: 600000,         // Within 10 minutes
        severity: 'critical',
        actions: ['log', 'alert', 'block', 'notify']
      },
      suspiciousLocation: {
        enabled: true,
        severity: 'medium',
        actions: ['log', 'alert', 'requireMFA']
      },
      multipleSessions: {
        threshold: 3,           // More than 3 concurrent sessions
        severity: 'low',
        actions: ['log', 'notify']
      }
    },
    
    authorization: {
      privilegeEscalation: {
        severity: 'critical',
        actions: ['log', 'alert', 'block', 'audit']
      },
      unauthorizedAccess: {
        severity: 'high',
        actions: ['log', 'alert', 'audit']
      },
      dataExfiltration: {
        threshold: 100,         // More than 100 records accessed
        window: 60000,          // Within 1 minute
        severity: 'critical',
        actions: ['log', 'alert', 'block', 'audit']
      }
    },
    
    dataAccess: {
      bulkDownload: {
        threshold: 50,          // More than 50 records
        severity: 'medium',
        actions: ['log', 'alert', 'audit']
      },
      sensitiveDataAccess: {
        tables: ['users', 'certificates', 'audit_logs'],
        severity: 'high',
        actions: ['log', 'audit']
      },
      afterHoursAccess: {
        startHour: 22,          // 10 PM
        endHour: 6,             // 6 AM
        severity: 'low',
        actions: ['log', 'notify']
      }
    },
    
    systemIntegrity: {
      configurationChange: {
        severity: 'high',
        actions: ['log', 'alert', 'audit', 'backup']
      },
      maliciousPayload: {
        patterns: [
          '<script',
          'javascript:',
          'onerror=',
          'onclick=',
          'DROP TABLE',
          'DELETE FROM',
          '../..',
          '/etc/passwd'
        ],
        severity: 'critical',
        actions: ['log', 'alert', 'block', 'quarantine']
      },
      apiAbuse: {
        requestsPerMinute: 100,
        severity: 'high',
        actions: ['log', 'alert', 'rateLimit', 'block']
      }
    }
  },

  // Detection rules
  detectionRules: {
    // SQL Injection attempts
    sqlInjection: {
      patterns: [
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|CREATE|ALTER)\b.*\b(FROM|INTO|WHERE|TABLE)\b)/i,
        /(\b(OR|AND)\b\s*\d+\s*=\s*\d+)/i,
        /('|")\s*(OR|AND)\s*('|")\s*=\s*('|")/i
      ],
      severity: 'critical',
      autoBlock: true
    },
    
    // XSS attempts
    xss: {
      patterns: [
        /<script[^>]*>.*?<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi,
        /<iframe/gi,
        /<object/gi
      ],
      severity: 'high',
      autoBlock: true
    },
    
    // Path traversal
    pathTraversal: {
      patterns: [
        /\.\.[\/\\]/g,
        /\/etc\//g,
        /\/proc\//g,
        /\/var\//g
      ],
      severity: 'high',
      autoBlock: true
    },
    
    // Credential stuffing
    credentialStuffing: {
      indicators: [
        'rapidRequests',        // Many requests in short time
        'differentUserAgents',  // Changing user agents
        'distributedIPs',       // Multiple IPs
        'knownBotPatterns'      // Known bot signatures
      ],
      severity: 'critical',
      autoBlock: true
    }
  },

  // Response actions
  responseActions: {
    log: {
      destination: 'audit_logs',
      includeRequest: true,
      includeResponse: false,
      includeUserContext: true
    },
    
    alert: {
      channels: ['email', 'slack', 'sms'],
      recipients: {
        email: [
          process.env.SECURITY_EMAIL || 'security@maritime-onboarding.com'
        ],
        slack: process.env.SECURITY_SLACK_WEBHOOK,
        sms: process.env.SECURITY_SMS_NUMBERS?.split(',') || []
      },
      includeDetails: true,
      includeRecommendations: true
    },
    
    block: {
      duration: {
        temporary: 3600000,     // 1 hour
        permanent: null         // Indefinite
      },
      scope: {
        ip: true,
        user: true,
        session: true
      }
    },
    
    rateLimit: {
      limits: {
        soft: 50,               // Requests per minute
        hard: 100,              // Absolute max
        burst: 10               // Burst allowance
      }
    },
    
    audit: {
      detailed: true,
      includePII: false,        // Exclude personally identifiable information
      retention: 2555           // 7 years
    },
    
    quarantine: {
      isolate: true,
      notifyAdmin: true,
      requireManualReview: true
    }
  },

  // Incident response
  incidentResponse: {
    // Severity levels and response times
    severityLevels: {
      critical: {
        responseTime: 15,       // Minutes
        escalation: 'immediate',
        notifications: ['all'],
        requiresApproval: false
      },
      high: {
        responseTime: 60,       // Minutes
        escalation: 'manager',
        notifications: ['security', 'manager'],
        requiresApproval: false
      },
      medium: {
        responseTime: 240,      // 4 hours
        escalation: 'team',
        notifications: ['security'],
        requiresApproval: true
      },
      low: {
        responseTime: 1440,     // 24 hours
        escalation: 'none',
        notifications: ['security'],
        requiresApproval: true
      }
    },
    
    // Automated responses
    automatedResponses: {
      blockSuspiciousIP: true,
      disableCompromisedAccount: true,
      rollbackSuspiciousChanges: false,
      initiateForensics: true
    },
    
    // Forensics configuration
    forensics: {
      captureFullRequest: true,
      captureSystemState: true,
      preserveEvidence: true,
      retention: 90             // Days
    }
  },

  // Monitoring dashboard
  dashboard: {
    realTimeAlerts: true,
    refreshInterval: 5000,      // 5 seconds
    widgets: [
      'activeThreats',
      'failedLogins',
      'blockedRequests',
      'suspiciousActivity',
      'securityScore',
      'incidentTimeline'
    ],
    
    metrics: {
      securityScore: {
        factors: [
          'failedLoginRate',
          'blockedRequestRate',
          'incidentCount',
          'responseTime',
          'patchLevel'
        ],
        thresholds: {
          excellent: 90,
          good: 75,
          fair: 60,
          poor: 40
        }
      }
    }
  },

  // Compliance and reporting
  compliance: {
    gdpr: {
      enabled: true,
      dataRetention: 90,        // Days
      anonymization: true,
      rightToErasure: true
    },
    
    reporting: {
      weekly: {
        enabled: true,
        recipients: ['security@maritime-onboarding.com'],
        includeMetrics: true,
        includeTrends: true
      },
      monthly: {
        enabled: true,
        recipients: ['management@maritime-onboarding.com'],
        executiveSummary: true,
        detailedAnalysis: true
      },
      incident: {
        enabled: true,
        immediate: true,
        includeTimeline: true,
        includeRecommendations: true
      }
    }
  }
};