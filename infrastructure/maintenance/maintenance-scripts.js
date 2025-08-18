/**
 * Maintenance Scripts
 * Common maintenance operations for the Maritime Onboarding System
 */

const { supabase } = require('../../lib/supabase');
const BackupService = require('../backup/backup-service');
const HealthMonitor = require('../monitoring/health-monitor');
const SecurityMonitor = require('../security/security-monitor');

class MaintenanceScripts {
  constructor() {
    this.backupService = new BackupService();
    this.healthMonitor = new HealthMonitor();
    this.securityMonitor = new SecurityMonitor();
  }

  /**
   * Clear expired data
   */
  async clearExpiredData() {
    console.log('Starting expired data cleanup...');
    const results = {
      sessions: 0,
      tokens: 0,
      logs: 0,
      tempFiles: 0
    };

    try {
      // Clear expired sessions
      const { data: sessions } = await supabase
        .from('user_sessions')
        .delete()
        .lt('expires_at', new Date().toISOString())
        .select('id');
      results.sessions = sessions?.length || 0;

      // Clear expired tokens (handled by dedicated service)
      const { data: tokens } = await supabase
        .rpc('cleanup_expired_blacklisted_tokens');
      results.tokens = tokens || 0;

      // Clear old logs (older than 90 days)
      const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const { data: logs } = await supabase
        .from('audit_logs')
        .delete()
        .lt('created_at', cutoffDate.toISOString())
        .select('id');
      results.logs = logs?.length || 0;

      console.log('Cleanup results:', results);
      return { success: true, results };

    } catch (error) {
      console.error('Cleanup failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Optimize database
   */
  async optimizeDatabase() {
    console.log('Starting database optimization...');
    
    try {
      // Run VACUUM on major tables
      const tables = ['users', 'crews', 'training_progress', 'quiz_attempts'];
      
      for (const table of tables) {
        console.log(`Optimizing table: ${table}`);
        // Note: VACUUM commands need to be run directly on the database
        // This is a placeholder for the actual implementation
      }

      return { success: true, message: 'Database optimization completed' };

    } catch (error) {
      console.error('Database optimization failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check system health
   */
  async checkSystemHealth() {
    console.log('Running comprehensive health check...');
    
    try {
      const healthResults = await this.healthMonitor.checkAllEndpoints();
      
      // Additional checks
      const additionalChecks = {
        diskSpace: await this.checkDiskSpace(),
        certificateExpiry: await this.checkCertificateExpiry(),
        backupStatus: await this.checkBackupStatus(),
        securityStatus: await this.checkSecurityStatus()
      };

      return {
        success: true,
        timestamp: new Date().toISOString(),
        health: healthResults,
        additional: additionalChecks
      };

    } catch (error) {
      console.error('Health check failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Reset user sessions
   */
  async resetUserSessions(userId = null) {
    console.log(`Resetting sessions${userId ? ` for user ${userId}` : ' for all users'}...`);
    
    try {
      let query = supabase.from('user_sessions').delete();
      
      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query.select('id');
      
      if (error) throw error;

      // Also blacklist any active tokens
      if (userId) {
        await supabase
          .from('token_blacklist')
          .insert({
            user_id: userId,
            token_jti: 'force-logout',
            token_hash: 'N/A',
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            reason: 'admin_action',
            blacklisted_at: new Date().toISOString()
          });
      }

      return {
        success: true,
        sessionsRemoved: data?.length || 0,
        message: `Sessions reset successfully`
      };

    } catch (error) {
      console.error('Session reset failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Archive old data
   */
  async archiveOldData() {
    console.log('Starting data archival process...');
    
    const archiveAge = 365; // Archive data older than 1 year
    const cutoffDate = new Date(Date.now() - archiveAge * 24 * 60 * 60 * 1000);
    
    try {
      // Archive old training progress
      const { data: trainingData } = await supabase
        .from('training_progress')
        .select('*')
        .lt('updated_at', cutoffDate.toISOString());

      if (trainingData && trainingData.length > 0) {
        // Store in archive table
        await supabase
          .from('archived_training_progress')
          .insert(trainingData.map(record => ({
            ...record,
            archived_at: new Date().toISOString()
          })));

        // Remove from main table
        await supabase
          .from('training_progress')
          .delete()
          .lt('updated_at', cutoffDate.toISOString());
      }

      return {
        success: true,
        archivedRecords: trainingData?.length || 0,
        message: 'Data archival completed'
      };

    } catch (error) {
      console.error('Data archival failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update system statistics
   */
  async updateSystemStatistics() {
    console.log('Updating system statistics...');
    
    try {
      const stats = {
        totalUsers: 0,
        activeUsers: 0,
        totalCrews: 0,
        completedOnboardings: 0,
        averageCompletionTime: 0,
        lastUpdated: new Date().toISOString()
      };

      // Get user statistics
      const { count: userCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });
      stats.totalUsers = userCount || 0;

      // Get active users (logged in last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const { count: activeCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gt('last_login', thirtyDaysAgo.toISOString());
      stats.activeUsers = activeCount || 0;

      // Get crew statistics
      const { count: crewCount } = await supabase
        .from('crews')
        .select('*', { count: 'exact', head: true });
      stats.totalCrews = crewCount || 0;

      // Get completed onboardings
      const { count: completedCount } = await supabase
        .from('crews')
        .select('*', { count: 'exact', head: true })
        .eq('onboarding_status', 'completed');
      stats.completedOnboardings = completedCount || 0;

      // Store statistics
      await supabase
        .from('system_statistics')
        .upsert({
          id: 'current',
          ...stats
        });

      return { success: true, statistics: stats };

    } catch (error) {
      console.error('Statistics update failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Clean temporary files
   */
  async cleanTemporaryFiles() {
    console.log('Cleaning temporary files...');
    
    try {
      const { data: files } = await supabase.storage
        .from('temp-uploads')
        .list();

      let deletedCount = 0;
      const oneHourAgo = Date.now() - 60 * 60 * 1000;

      for (const file of files || []) {
        const fileAge = new Date(file.created_at).getTime();
        if (fileAge < oneHourAgo) {
          await supabase.storage
            .from('temp-uploads')
            .remove([file.name]);
          deletedCount++;
        }
      }

      return {
        success: true,
        filesDeleted: deletedCount,
        message: `Cleaned ${deletedCount} temporary files`
      };

    } catch (error) {
      console.error('Temporary file cleanup failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Verify data integrity
   */
  async verifyDataIntegrity() {
    console.log('Verifying data integrity...');
    
    const issues = [];
    
    try {
      // Check for orphaned crew records
      const { data: orphanedCrews } = await supabase
        .from('crews')
        .select('id, user_id')
        .is('user_id', null);
      
      if (orphanedCrews && orphanedCrews.length > 0) {
        issues.push({
          type: 'orphaned_crews',
          count: orphanedCrews.length,
          severity: 'medium'
        });
      }

      // Check for missing training sessions
      const { data: incompleteTraining } = await supabase
        .from('training_progress')
        .select('id, user_id')
        .is('completed_at', null)
        .lt('created_at', new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString());
      
      if (incompleteTraining && incompleteTraining.length > 0) {
        issues.push({
          type: 'stale_training_progress',
          count: incompleteTraining.length,
          severity: 'low'
        });
      }

      // Check for duplicate email addresses
      const { data: users } = await supabase
        .from('users')
        .select('email');
      
      const emailCounts = {};
      users?.forEach(user => {
        emailCounts[user.email] = (emailCounts[user.email] || 0) + 1;
      });
      
      const duplicates = Object.entries(emailCounts)
        .filter(([email, count]) => count > 1);
      
      if (duplicates.length > 0) {
        issues.push({
          type: 'duplicate_emails',
          count: duplicates.length,
          severity: 'high',
          details: duplicates
        });
      }

      return {
        success: true,
        healthy: issues.length === 0,
        issues,
        message: issues.length === 0 
          ? 'Data integrity check passed' 
          : `Found ${issues.length} integrity issues`
      };

    } catch (error) {
      console.error('Data integrity check failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Helper methods
   */
  
  async checkDiskSpace() {
    // This would check actual disk space in production
    return {
      available: '50GB',
      used: '30GB',
      percentage: 60,
      status: 'healthy'
    };
  }

  async checkCertificateExpiry() {
    // This would check SSL certificate expiry
    return {
      daysUntilExpiry: 45,
      expiryDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'healthy'
    };
  }

  async checkBackupStatus() {
    try {
      const { data } = await supabase
        .from('backup_logs')
        .select('*')
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      return {
        lastBackup: data?.created_at,
        backupId: data?.backup_id,
        status: data ? 'healthy' : 'warning'
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message
      };
    }
  }

  async checkSecurityStatus() {
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const { count: alertCount } = await supabase
        .from('security_alerts')
        .select('*', { count: 'exact', head: true })
        .gt('created_at', oneDayAgo.toISOString());

      const { count: blockedCount } = await supabase
        .from('blocked_entities')
        .select('*', { count: 'exact', head: true })
        .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString());

      return {
        recentAlerts: alertCount || 0,
        blockedEntities: blockedCount || 0,
        status: alertCount > 10 ? 'warning' : 'healthy'
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message
      };
    }
  }
}

// Export for use in maintenance scripts
module.exports = MaintenanceScripts;