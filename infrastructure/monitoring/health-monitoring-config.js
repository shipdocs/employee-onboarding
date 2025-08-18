/**
 * Health Monitoring Configuration
 * Defines health check endpoints, monitoring intervals, and alert thresholds
 */

module.exports = {
  // Health check endpoints
  endpoints: {
    api: {
      url: '/api/health',
      interval: 30000, // 30 seconds
      timeout: 5000, // 5 seconds
      retries: 3,
      critical: true
    },
    database: {
      url: '/api/health/database',
      interval: 60000, // 1 minute
      timeout: 10000, // 10 seconds
      retries: 2,
      critical: true
    },
    storage: {
      url: '/api/health/storage',
      interval: 300000, // 5 minutes
      timeout: 15000, // 15 seconds
      retries: 2,
      critical: false
    },
    email: {
      url: '/api/health/email',
      interval: 600000, // 10 minutes
      timeout: 20000, // 20 seconds
      retries: 1,
      critical: false
    },
    auth: {
      url: '/api/health/auth',
      interval: 300000, // 5 minutes
      timeout: 5000, // 5 seconds
      retries: 2,
      critical: true
    }
  },

  // Uptime monitoring
  uptime: {
    // External monitoring services
    services: [
      {
        name: 'UptimeRobot',
        enabled: true,
        apiKey: process.env.UPTIME_ROBOT_API_KEY,
        monitors: [
          { name: 'API Health', url: 'https://onboarding.burando.online/api/health' },
          { name: 'Login Page', url: 'https://onboarding.burando.online' },
          { name: 'Manager Dashboard', url: 'https://onboarding.burando.online/manager' }
        ]
      },
      {
        name: 'StatusPage',
        enabled: false,
        apiKey: process.env.STATUSPAGE_API_KEY,
        pageId: process.env.STATUSPAGE_PAGE_ID
      }
    ],
    
    // Response time thresholds (ms)
    responseTimeThresholds: {
      excellent: 200,
      good: 500,
      acceptable: 1000,
      poor: 2000,
      critical: 5000
    },
    
    // Uptime targets
    targets: {
      daily: 99.9,    // 99.9% daily uptime
      weekly: 99.95,  // 99.95% weekly uptime
      monthly: 99.9   // 99.9% monthly uptime
    }
  },

  // Alert configuration
  alerts: {
    // Alert channels
    channels: {
      email: {
        enabled: true,
        recipients: [
          process.env.ADMIN_EMAIL || 'admin@maritime-onboarding.com',
          process.env.TECH_LEAD_EMAIL || 'tech@maritime-onboarding.com'
        ],
        throttle: 300000 // 5 minutes between same alerts
      },
      slack: {
        enabled: process.env.SLACK_WEBHOOK_URL ? true : false,
        webhook: process.env.SLACK_WEBHOOK_URL,
        channel: '#system-alerts',
        throttle: 300000 // 5 minutes
      },
      pagerduty: {
        enabled: false,
        apiKey: process.env.PAGERDUTY_API_KEY,
        serviceKey: process.env.PAGERDUTY_SERVICE_KEY,
        escalationPolicy: 'critical-only'
      }
    },
    
    // Alert rules
    rules: [
      {
        name: 'API Down',
        condition: 'endpoint.api.status === "down"',
        severity: 'critical',
        channels: ['email', 'slack', 'pagerduty'],
        message: 'API health check is failing'
      },
      {
        name: 'Database Connection Failed',
        condition: 'endpoint.database.status === "down"',
        severity: 'critical',
        channels: ['email', 'slack', 'pagerduty'],
        message: 'Database connection is failing'
      },
      {
        name: 'High Response Time',
        condition: 'endpoint.api.responseTime > 2000',
        severity: 'warning',
        channels: ['email', 'slack'],
        message: 'API response time is above 2 seconds'
      },
      {
        name: 'Storage Unavailable',
        condition: 'endpoint.storage.status === "down"',
        severity: 'high',
        channels: ['email', 'slack'],
        message: 'Storage service is unavailable'
      },
      {
        name: 'Email Service Down',
        condition: 'endpoint.email.status === "down"',
        severity: 'medium',
        channels: ['email'],
        message: 'Email service is not responding'
      },
      {
        name: 'Multiple Failures',
        condition: 'failedEndpoints >= 3',
        severity: 'critical',
        channels: ['email', 'slack', 'pagerduty'],
        message: 'Multiple system components are failing'
      }
    ]
  },

  // Performance metrics
  metrics: {
    // Metrics to track
    track: [
      'response_time',
      'error_rate',
      'uptime_percentage',
      'database_query_time',
      'active_users',
      'failed_logins',
      'api_requests_per_minute'
    ],
    
    // Storage configuration
    storage: {
      retention: {
        raw: 7 * 24 * 60 * 60 * 1000,      // 7 days for raw data
        hourly: 30 * 24 * 60 * 60 * 1000,  // 30 days for hourly aggregates
        daily: 365 * 24 * 60 * 60 * 1000   // 1 year for daily aggregates
      }
    },
    
    // Performance thresholds
    thresholds: {
      errorRate: {
        warning: 0.01,  // 1% error rate
        critical: 0.05  // 5% error rate
      },
      queryTime: {
        warning: 100,   // 100ms average query time
        critical: 500   // 500ms average query time
      },
      apiRequests: {
        warning: 1000,  // 1000 requests per minute
        critical: 5000  // 5000 requests per minute
      }
    }
  },

  // Dashboard configuration
  dashboard: {
    refreshInterval: 10000, // 10 seconds
    defaultTimeRange: '24h',
    widgets: [
      'system_status',
      'uptime_graph',
      'response_time_chart',
      'error_rate_chart',
      'active_users',
      'recent_alerts'
    ]
  }
};