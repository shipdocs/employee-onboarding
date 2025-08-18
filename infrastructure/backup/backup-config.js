/**
 * Backup Configuration
 * Defines backup strategies, schedules, and retention policies
 */

module.exports = {
  // Database backup configuration
  database: {
    // Backup schedules
    schedules: {
      full: {
        cron: '0 2 * * *',      // Daily at 2 AM UTC
        retention: 30,          // Keep for 30 days
        compression: true,
        encryption: true
      },
      incremental: {
        cron: '0 */6 * * *',    // Every 6 hours
        retention: 7,           // Keep for 7 days
        compression: true
      },
      pointInTime: {
        enabled: true,          // Supabase Point-in-Time Recovery
        retention: 7            // 7 days of PITR
      }
    },
    
    // Tables to backup
    tables: {
      critical: [
        'users',
        'crews',
        'managers',
        'companies',
        'training_progress',
        'quiz_attempts',
        'certificates',
        'audit_logs'
      ],
      important: [
        'workflow_instances',
        'workflow_item_progress',
        'onboarding_reviews',
        'quiz_reviews',
        'feedback',
        'email_logs'
      ],
      optional: [
        'application_settings',
        'system_alerts',
        'health_metrics',
        'performance_metrics'
      ]
    },
    
    // Backup destinations
    destinations: {
      primary: {
        type: 's3',
        bucket: process.env.BACKUP_S3_BUCKET || 'maritime-onboarding-backups',
        region: process.env.AWS_REGION || 'eu-west-1',
        path: 'database-backups/'
      },
      secondary: {
        type: 'azure',
        container: process.env.BACKUP_AZURE_CONTAINER || 'backups',
        path: 'maritime-onboarding/'
      }
    }
  },

  // File storage backup
  storage: {
    schedules: {
      daily: {
        cron: '0 3 * * *',      // Daily at 3 AM UTC
        retention: 14,          // Keep for 14 days
        incremental: true
      },
      weekly: {
        cron: '0 4 * * 0',      // Weekly on Sunday at 4 AM UTC
        retention: 90,          // Keep for 90 days
        full: true
      }
    },
    
    // Buckets to backup
    buckets: [
      'certificates',
      'training-materials',
      'user-uploads',
      'pdf-templates',
      'company-logos'
    ],
    
    // File types to include
    include: [
      '*.pdf',
      '*.png',
      '*.jpg',
      '*.jpeg',
      '*.mp4',
      '*.doc',
      '*.docx'
    ],
    
    // File types to exclude
    exclude: [
      '*.tmp',
      '*.cache',
      'health-check-*'
    ]
  },

  // Application data backup
  application: {
    schedules: {
      configuration: {
        cron: '0 1 * * *',      // Daily at 1 AM UTC
        retention: 60           // Keep for 60 days
      }
    },
    
    // Configuration to backup
    items: [
      {
        name: 'environment_variables',
        source: 'vercel',
        sensitive: true
      },
      {
        name: 'application_settings',
        source: 'database',
        table: 'application_settings'
      },
      {
        name: 'email_templates',
        source: 'filesystem',
        path: 'services/email-templates/'
      },
      {
        name: 'pdf_templates',
        source: 'database',
        table: 'pdf_templates'
      }
    ]
  },

  // Retention policies
  retention: {
    // Default retention periods (in days)
    defaults: {
      daily: 7,
      weekly: 30,
      monthly: 365,
      yearly: 2555  // 7 years
    },
    
    // Compliance requirements
    compliance: {
      // GDPR compliance
      gdpr: {
        personalData: 365 * 3,  // 3 years
        auditLogs: 365 * 7,     // 7 years
        anonymization: true
      },
      
      // Maritime industry requirements
      maritime: {
        certificates: 365 * 10,  // 10 years
        training: 365 * 5,       // 5 years
        safety: 365 * 7         // 7 years
      }
    }
  },

  // Restore configuration
  restore: {
    // Test restore schedule
    testSchedule: '0 5 * * 1',  // Weekly on Monday at 5 AM UTC
    
    // Restore priorities
    priorities: {
      critical: ['users', 'auth', 'certificates'],
      high: ['training_progress', 'companies', 'workflows'],
      medium: ['settings', 'templates', 'logs'],
      low: ['metrics', 'analytics', 'cache']
    },
    
    // Restore verification
    verification: {
      enabled: true,
      checksums: true,
      dataIntegrity: true,
      testQueries: [
        'SELECT COUNT(*) FROM users',
        'SELECT COUNT(*) FROM crews',
        'SELECT COUNT(*) FROM certificates'
      ]
    }
  },

  // Monitoring and alerts
  monitoring: {
    // Backup health checks
    healthChecks: {
      preBackup: true,
      postBackup: true,
      verification: true
    },
    
    // Alert thresholds
    alerts: {
      backupFailure: {
        consecutive: 2,
        severity: 'critical'
      },
      backupSize: {
        increase: 50,  // Alert if backup size increases by 50%
        decrease: 30   // Alert if backup size decreases by 30%
      },
      backupDuration: {
        threshold: 3600  // Alert if backup takes more than 1 hour
      }
    }
  }
};