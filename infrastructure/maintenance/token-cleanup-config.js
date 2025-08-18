/**
 * Token Cleanup Configuration
 * Handles automated cleanup of expired JWT tokens and blacklisted tokens
 */

module.exports = {
  // Token cleanup configuration
  tokenCleanup: {
    // Cron schedule for token cleanup (daily at 3 AM UTC)
    schedule: '0 3 * * *',
    
    // Retention policies
    retention: {
      // Keep blacklisted tokens for 24 hours after expiration for audit
      blacklistedTokensRetention: 24 * 60 * 60 * 1000, // 24 hours in ms
      
      // Keep audit logs for 90 days
      auditLogRetention: 90 * 24 * 60 * 60 * 1000, // 90 days in ms
      
      // Keep session logs for 30 days
      sessionLogRetention: 30 * 24 * 60 * 60 * 1000, // 30 days in ms
    },
    
    // Batch size for cleanup operations
    batchSize: 1000,
    
    // Maximum execution time (in seconds)
    maxExecutionTime: 50,
    
    // Error threshold before alerting
    errorThreshold: 3,
    
    // Notification settings
    notifications: {
      enabled: true,
      channels: ['email', 'slack'],
      recipients: {
        email: process.env.ADMIN_EMAIL || 'admin@maritime-onboarding.com',
        slack: process.env.SLACK_WEBHOOK_URL
      }
    }
  },
  
  // Database cleanup queries
  cleanupQueries: {
    // Clean expired blacklisted tokens
    expiredTokens: `
      DELETE FROM token_blacklist 
      WHERE expires_at < NOW() - INTERVAL '24 hours'
      AND blacklisted_at < NOW() - INTERVAL '24 hours'
      LIMIT $1
      RETURNING id, token_jti, user_id, expires_at
    `,
    
    // Clean old audit logs
    oldAuditLogs: `
      DELETE FROM audit_logs 
      WHERE created_at < NOW() - INTERVAL '90 days'
      LIMIT $1
      RETURNING id, action, created_at
    `,
    
    // Clean expired sessions
    expiredSessions: `
      DELETE FROM user_sessions 
      WHERE expires_at < NOW()
      OR last_activity < NOW() - INTERVAL '30 days'
      LIMIT $1
      RETURNING id, user_id, created_at
    `,
    
    // Clean orphaned data
    orphanedData: `
      -- Clean orphaned training progress
      DELETE FROM training_progress 
      WHERE user_id NOT IN (SELECT id FROM users)
      LIMIT $1;
      
      -- Clean orphaned quiz attempts
      DELETE FROM quiz_attempts 
      WHERE user_id NOT IN (SELECT id FROM users)
      LIMIT $1;
    `
  },
  
  // Monitoring configuration
  monitoring: {
    // Track cleanup metrics
    metrics: [
      'tokens_cleaned',
      'audit_logs_cleaned',
      'sessions_cleaned',
      'cleanup_duration',
      'cleanup_errors'
    ],
    
    // Performance thresholds
    thresholds: {
      maxDuration: 45000, // 45 seconds
      minTokensCleaned: 0, // Minimum tokens to clean (0 is valid)
      maxErrorRate: 0.05 // 5% error rate
    }
  }
};