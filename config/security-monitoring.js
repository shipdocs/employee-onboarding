/**
 * Security Monitoring Configuration
 * 
 * Configuration for automated dependency vulnerability scanning
 * and security monitoring alerts.
 */

module.exports = {
  // Vulnerability severity thresholds
  severityThresholds: {
    critical: {
      maxAllowed: 0,
      action: 'BLOCK_DEPLOYMENT',
      alertLevel: 'IMMEDIATE'
    },
    high: {
      maxAllowed: 0,
      action: 'BLOCK_DEPLOYMENT',
      alertLevel: 'IMMEDIATE'
    },
    moderate: {
      maxAllowed: 5,
      action: 'WARN',
      alertLevel: 'DAILY'
    },
    low: {
      maxAllowed: 10,
      action: 'LOG',
      alertLevel: 'WEEKLY'
    }
  },

  // Scanning schedule
  scanSchedule: {
    // Run full scan daily at 2 AM UTC
    daily: '0 2 * * *',
    // Run quick scan on every push/PR
    onPush: true,
    // Run comprehensive scan weekly on Sundays
    weekly: '0 2 * * 0'
  },

  // Packages to monitor closely
  criticalPackages: [
    // Authentication & Security
    'jsonwebtoken',
    'bcrypt',
    'speakeasy',
    'validator',
    'xss',
    'dompurify',
    
    // Database & API
    '@supabase/supabase-js',
    'axios',
    'formidable',
    
    // Email & Communication
    'nodemailer',
    'mailersend',
    
    // File Processing
    'pdf-lib',
    'jszip',
    
    // Core Framework
    'next',
    'react',
    'react-dom'
  ],

  // Packages to exclude from alerts (known false positives)
  excludePackages: [
    // Development-only packages with acceptable risks
    'eslint',
    'jest',
    'playwright'
  ],

  // Alert configuration
  alerts: {
    email: {
      enabled: process.env.NODE_ENV === 'production',
      recipients: [
        'security@maritime-example.com',
        'dev-team@maritime-example.com'
      ]
    },
    slack: {
      enabled: false,
      webhook: process.env.SLACK_SECURITY_WEBHOOK
    },
    github: {
      enabled: true,
      createIssues: true,
      assignees: ['security-team']
    }
  },

  // Reporting configuration
  reporting: {
    // Generate detailed reports
    generateReports: true,
    
    // Report retention (days)
    retentionDays: 90,
    
    // Report formats
    formats: ['json', 'html', 'csv'],
    
    // Report storage location
    outputDir: './reports/security',
    
    // Include in reports
    includeOutdated: true,
    includeLicenseInfo: false,
    includeDevDependencies: true
  },

  // Auto-fix configuration
  autoFix: {
    // Enable automatic fixes for low-risk vulnerabilities
    enabled: false,
    
    // Severity levels to auto-fix
    severityLevels: ['low'],
    
    // Require manual approval for these package types
    requireApproval: [
      'critical-packages',
      'major-version-updates'
    ],
    
    // Create PR for auto-fixes
    createPR: true,
    
    // Auto-merge conditions
    autoMerge: {
      enabled: false,
      requireTests: true,
      requireReviews: 1
    }
  },

  // Integration settings
  integrations: {
    // GitHub Security Advisories
    githubAdvisories: {
      enabled: true,
      token: process.env.GITHUB_TOKEN
    },
    
    // NPM Audit
    npmAudit: {
      enabled: true,
      auditLevel: 'moderate'
    },
    
    // Snyk (if available)
    snyk: {
      enabled: false,
      token: process.env.SNYK_TOKEN
    },
    
    // OWASP Dependency Check
    owaspDependencyCheck: {
      enabled: false,
      suppressionFile: './config/owasp-suppressions.xml'
    }
  },

  // Emergency procedures
  emergency: {
    // Critical vulnerability response time (hours)
    responseTime: 4,
    
    // Emergency contact
    contact: 'security@maritime-example.com',
    
    // Emergency procedures document
    proceduresUrl: 'https://docs.maritime-example.com/security/emergency-response',
    
    // Automatic actions for critical vulnerabilities
    automaticActions: [
      'NOTIFY_SECURITY_TEAM',
      'CREATE_INCIDENT',
      'BLOCK_DEPLOYMENTS'
    ]
  },

  // Compliance requirements
  compliance: {
    // Maritime industry security standards
    standards: [
      'ISO 27001',
      'NIST Cybersecurity Framework',
      'Maritime Cybersecurity Guidelines'
    ],
    
    // Required security controls
    requiredControls: [
      'VULNERABILITY_MANAGEMENT',
      'DEPENDENCY_SCANNING',
      'SECURITY_MONITORING',
      'INCIDENT_RESPONSE'
    ],
    
    // Audit requirements
    auditRequirements: {
      frequency: 'quarterly',
      documentation: true,
      evidenceRetention: 365 // days
    }
  }
};