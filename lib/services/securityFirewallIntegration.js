/**
 * Security Firewall Integration Service
 * Connects existing security monitoring with Vercel Firewall
 */

const { supabase } = require('../supabase');
const vercelFirewallService = require('./vercelFirewallService');

class SecurityFirewallIntegration {
  constructor() {
    this.isProcessing = false;
    this.blockThresholds = {
      failed_login_attempts: 10, // Block after 10 failed attempts
      time_window_minutes: 60,   // Within 60 minutes
      suspicious_activity: 5     // Block after 5 suspicious events
    };
  }

  /**
   * Process failed login attempt and determine if firewall action is needed
   */
  async processFailedLogin(ipAddress, userEmail, userAgent, additionalContext = {}) {
    try {
      if (!vercelFirewallService.isEnabled()) {
        console.log('Vercel Firewall not enabled - skipping firewall processing');
        return { action: 'firewall_disabled', ipAddress };
      }

      // Get recent failed attempts for this IP
      const recentAttempts = await this.getRecentFailedAttempts(ipAddress);
      const attemptCount = recentAttempts.length;

      console.log(`Processing failed login: IP ${ipAddress}, attempts: ${attemptCount}`);

      // Determine if we should block this IP
      if (attemptCount >= this.blockThresholds.failed_login_attempts) {
        const reason = `Automated block: ${attemptCount} failed login attempts in ${this.blockThresholds.time_window_minutes} minutes`;
        
        try {
          const blockResult = await vercelFirewallService.blockIP(
            ipAddress, 
            reason,
            `User: ${userEmail}, UserAgent: ${userAgent}`
          );

          // Create security incident for the block
          await this.createSecurityIncident('ip_blocked', {
            ip: ipAddress,
            reason,
            attemptCount,
            userEmail,
            blockResult
          });

          return {
            action: 'ip_blocked',
            ipAddress,
            attemptCount,
            reason,
            blockResult
          };

        } catch (blockError) {
          console.error('Failed to block IP via Vercel Firewall:', blockError);
          
          // Log the failure but don't throw
          await this.logFailedFirewallAction('ip_block', ipAddress, blockError.message);
          
          return {
            action: 'block_failed',
            ipAddress,
            attemptCount,
            error: blockError.message
          };
        }
      }

      // Not enough attempts to trigger blocking yet
      return {
        action: 'monitored',
        ipAddress,
        attemptCount,
        threshold: this.blockThresholds.failed_login_attempts
      };

    } catch (error) {
      console.error('Failed to process failed login for firewall:', error);
      return {
        action: 'processing_error',
        ipAddress,
        error: error.message
      };
    }
  }

  /**
   * Get recent failed attempts for an IP address
   */
  async getRecentFailedAttempts(ipAddress, timeWindowMinutes = null) {
    try {
      const windowMinutes = timeWindowMinutes || this.blockThresholds.time_window_minutes;
      const since = new Date(Date.now() - (windowMinutes * 60 * 1000));
      
      const { data: attempts, error } = await supabase
        .from('security_events')
        .select('*')
        .eq('type', 'failed_login')
        .gte('created_at', since.toISOString())
        .eq('ip_address', ipAddress)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to get recent failed attempts:', error);
        return [];
      }

      return attempts || [];
    } catch (error) {
      console.error('Failed to get recent failed attempts:', error);
      return [];
    }
  }

  /**
   * Manually block an IP address (for admin use)
   */
  async manuallyBlockIP(ipAddress, reason, adminUserId) {
    try {
      if (!vercelFirewallService.isEnabled()) {
        throw new Error('Vercel Firewall integration not configured');
      }

      const blockResult = await vercelFirewallService.blockIP(
        ipAddress,
        `Manual admin block: ${reason}`,
        `Blocked by admin user: ${adminUserId}`
      );

      // Log the manual action
      await supabase
        .from('security_events')
        .insert({
          event_id: require('crypto').randomUUID(),
          type: 'manual_ip_block',
          severity: 'high',
          user_id: adminUserId,
          ip_address: ipAddress,
          user_agent: 'admin-interface',
          details: {
            reason,
            blockResult,
            timestamp: new Date().toISOString()
          },
          threats: ['manual_block']
        });

      return {
        success: true,
        action: 'ip_blocked',
        ipAddress,
        reason,
        blockResult
      };

    } catch (error) {
      console.error(`Failed to manually block IP ${ipAddress}:`, error);
      throw error;
    }
  }

  /**
   * Manually unblock an IP address (for admin use)
   */
  async manuallyUnblockIP(ipAddress, reason, adminUserId) {
    try {
      if (!vercelFirewallService.isEnabled()) {
        throw new Error('Vercel Firewall integration not configured');
      }

      const unblockResult = await vercelFirewallService.unblockIP(ipAddress);

      // Log the manual action
      await supabase
        .from('security_events')
        .insert({
          event_id: require('crypto').randomUUID(),
          type: 'manual_ip_unblock',
          severity: 'medium',
          user_id: adminUserId,
          ip_address: ipAddress,
          user_agent: 'admin-interface',
          details: {
            reason,
            unblockResult,
            timestamp: new Date().toISOString()
          },
          threats: []
        });

      return {
        success: true,
        action: 'ip_unblocked',
        ipAddress,
        reason,
        unblockResult
      };

    } catch (error) {
      console.error(`Failed to manually unblock IP ${ipAddress}:`, error);
      throw error;
    }
  }

  /**
   * Get firewall status and statistics
   */
  async getFirewallStatus() {
    try {
      if (!vercelFirewallService.isEnabled()) {
        return {
          enabled: false,
          message: 'Vercel Firewall integration not configured',
          stats: {
            blockedIPs: 0,
            totalRules: 0,
            recentActions: []
          }
        };
      }

      // Test connection and get config
      const connectionTest = await vercelFirewallService.testConnection();
      
      if (!connectionTest.success) {
        return {
          enabled: false,
          error: connectionTest.error,
          details: connectionTest.details
        };
      }

      // Get current firewall configuration
      const config = await vercelFirewallService.getFirewallConfig();

      // Get recent firewall actions from our logs
      const { data: recentActions } = await supabase
        .from('security_events')
        .select('*')
        .eq('type', 'vercel_firewall_action')
        .order('created_at', { ascending: false })
        .limit(10);

      const blockedIPs = config.ips?.filter(ip => ip.action === 'deny') || [];

      return {
        enabled: true,
        firewallEnabled: config.firewallEnabled,
        stats: {
          blockedIPs: blockedIPs.length,
          totalRules: config.rules?.length || 0,
          configVersion: config.version,
          recentActions: recentActions || []
        },
        blockedIPs: blockedIPs.map(ip => ({
          ip: ip.ip,
          notes: ip.notes,
          hostname: ip.hostname
        })),
        connectionTest
      };

    } catch (error) {
      console.error('Failed to get firewall status:', error);
      return {
        enabled: false,
        error: error.message
      };
    }
  }

  /**
   * Create security incident for firewall actions
   */
  async createSecurityIncident(type, details) {
    try {
      const incidentData = {
        incident_id: `fw-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'firewall_security_action',
        severity: 'high',
        status: 'detected',
        title: `Firewall Action: ${type}`,
        description: `Automated firewall action: ${type}. Details: ${JSON.stringify(details)}`,
        detection_time: new Date().toISOString(),
        affected_systems: ['vercel_firewall', 'authentication'],
        metadata: {
          firewall_action: type,
          ...details,
          automated: true
        }
      };

      await supabase
        .from('incidents')
        .insert(incidentData);

    } catch (error) {
      console.error('Failed to create security incident:', error);
    }
  }

  /**
   * Log failed firewall actions
   */
  async logFailedFirewallAction(action, target, errorMessage) {
    try {
      await supabase
        .from('security_events')
        .insert({
          event_id: require('crypto').randomUUID(),
          type: 'firewall_action_failed',
          severity: 'high',
          user_id: null,
          ip_address: target,
          user_agent: 'security-firewall-integration',
          details: {
            action,
            target,
            error: errorMessage,
            timestamp: new Date().toISOString()
          },
          threats: ['firewall_failure']
        });
    } catch (error) {
      console.error('Failed to log failed firewall action:', error);
    }
  }

  /**
   * Update block thresholds (for admin configuration)
   */
  updateBlockThresholds(newThresholds) {
    this.blockThresholds = {
      ...this.blockThresholds,
      ...newThresholds
    };
    
    console.log('Updated firewall block thresholds:', this.blockThresholds);
  }

  /**
   * Get current configuration
   */
  getConfiguration() {
    return {
      firewallEnabled: vercelFirewallService.isEnabled(),
      blockThresholds: this.blockThresholds,
      hasToken: !!process.env.VERCEL_ACCESS_TOKEN,
      hasProjectId: !!process.env.VERCEL_PROJECT_ID,
      hasTeamId: !!process.env.VERCEL_TEAM_ID
    };
  }
}

module.exports = new SecurityFirewallIntegration();
