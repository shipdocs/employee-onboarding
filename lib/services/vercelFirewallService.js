/**
 * Real Vercel Firewall Service
 * Actual integration with Vercel's Firewall API
 * Based on official Vercel API documentation
 */

const { supabase } = require('../supabase');

class VercelFirewallService {
  constructor() {
    this.apiUrl = 'https://api.vercel.com';
    this.token = process.env.VERCEL_ACCESS_TOKEN;
    this.teamId = process.env.VERCEL_TEAM_ID;
    this.projectId = process.env.VERCEL_PROJECT_ID;

    if (!this.token) {
      console.warn('VERCEL_ACCESS_TOKEN not configured - Firewall integration disabled');
    }

    if (!this.projectId) {
      console.warn('VERCEL_PROJECT_ID not configured - Firewall integration disabled');
    }
  }

  /**
   * Check if firewall integration is enabled
   */
  isEnabled() {
    return !!(this.token && this.projectId);
  }

  /**
   * Make authenticated request to Vercel API
   */
  async makeRequest(endpoint, method = 'GET', data = null) {
    if (!this.isEnabled()) {
      throw new Error('Vercel Firewall integration not configured');
    }

    const url = new URL(`${this.apiUrl}${endpoint}`);

    // Add query parameters
    url.searchParams.set('projectId', this.projectId);
    if (this.teamId) {
      url.searchParams.set('teamId', this.teamId);
    }

    const options = {
      method,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      }
    };

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = JSON.stringify(data);
    }

    console.log(`Making ${method} request to: ${url.toString()}`);

    const response = await fetch(url.toString(), options);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Vercel API error: ${response.status} - ${errorText}`);
      throw new Error(`Vercel API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('Vercel API response:', JSON.stringify(result, null, 2));
    return result;
  }

  /**
   * Get current firewall configuration
   * GET /v1/security/firewall/config/active
   */
  async getFirewallConfig() {
    try {
      const config = await this.makeRequest('/v1/security/firewall/config/active');

      // Log the action
      await this.logFirewallAction('get_config', {
        success: true,
        configVersion: config.version,
        firewallEnabled: config.firewallEnabled
      });

      return config;
    } catch (error) {
      console.error('Failed to get firewall config:', error);

      // Log the failed action
      await this.logFirewallAction('get_config', {
        success: false,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * Update firewall configuration
   * PUT /v1/security/firewall/config
   */
  async updateFirewallConfig(config) {
    try {
      const result = await this.makeRequest('/v1/security/firewall/config', 'PUT', config);

      // Log the action
      await this.logFirewallAction('update_config', {
        success: true,
        configData: config,
        resultVersion: result.active?.version
      });

      return result;
    } catch (error) {
      console.error('Failed to update firewall config:', error);

      // Log the failed action
      await this.logFirewallAction('update_config', {
        success: false,
        error: error.message,
        configData: config
      });

      throw error;
    }
  }

  /**
   * Block IP address by adding it to the firewall configuration
   */
  async blockIP(ipAddress, reason = 'Automated security response', notes = '') {
    try {
      // Get current configuration
      const currentConfig = await this.getFirewallConfig();

      // Check if IP is already blocked
      const existingIPs = currentConfig.ips || [];
      const isAlreadyBlocked = existingIPs.some(ip => ip.ip === ipAddress && ip.action === 'deny');

      if (isAlreadyBlocked) {
        console.log(`IP ${ipAddress} is already blocked`);
        return { success: true, message: 'IP already blocked', alreadyBlocked: true };
      }

      // Create new IP block entry
      const newIPBlock = {
        ip: ipAddress,
        action: 'deny',
        notes: notes || reason,
        hostname: '' // Optional hostname
      };

      // Add to existing IPs
      const updatedIPs = [...existingIPs, newIPBlock];

      // Update the firewall configuration
      const updatedConfig = {
        firewallEnabled: true, // Ensure firewall is enabled
        ips: updatedIPs,
        // Preserve existing configuration
        rules: currentConfig.rules || [],
        crs: currentConfig.crs || {},
        managedRules: currentConfig.managedRules || {}
      };

      const result = await this.updateFirewallConfig(updatedConfig);

      // Log the successful action
      await this.logFirewallAction('ip_block', {
        success: true,
        ip: ipAddress,
        reason,
        notes,
        configVersion: result.active?.version
      });

      return {
        success: true,
        result,
        message: `IP ${ipAddress} blocked successfully`,
        ipBlock: newIPBlock
      };

    } catch (error) {
      console.error(`Failed to block IP ${ipAddress}:`, error);

      // Log the failed action
      await this.logFirewallAction('ip_block', {
        success: false,
        ip: ipAddress,
        reason,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * Unblock IP address by removing it from the firewall configuration
   */
  async unblockIP(ipAddress) {
    try {
      // Get current configuration
      const currentConfig = await this.getFirewallConfig();

      // Remove IP from blocked list
      const existingIPs = currentConfig.ips || [];
      const updatedIPs = existingIPs.filter(ip => !(ip.ip === ipAddress && ip.action === 'deny'));

      if (updatedIPs.length === existingIPs.length) {
        console.log(`IP ${ipAddress} was not in blocked list`);
        return { success: true, message: 'IP was not blocked', wasNotBlocked: true };
      }

      // Update the firewall configuration
      const updatedConfig = {
        firewallEnabled: currentConfig.firewallEnabled,
        ips: updatedIPs,
        rules: currentConfig.rules || [],
        crs: currentConfig.crs || {},
        managedRules: currentConfig.managedRules || {}
      };

      const result = await this.updateFirewallConfig(updatedConfig);

      // Log the successful action
      await this.logFirewallAction('ip_unblock', {
        success: true,
        ip: ipAddress,
        configVersion: result.active?.version
      });

      return {
        success: true,
        result,
        message: `IP ${ipAddress} unblocked successfully`
      };

    } catch (error) {
      console.error(`Failed to unblock IP ${ipAddress}:`, error);

      // Log the failed action
      await this.logFirewallAction('ip_unblock', {
        success: false,
        ip: ipAddress,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * Enable/Update attack challenge mode
   * POST /v1/security/attack-challenge-mode
   */
  async updateChallengeMode(enabled = true, mode = 'auto') {
    try {
      const challengeData = {
        enabled,
        mode // 'auto', 'always', or 'never'
      };

      const result = await this.makeRequest('/v1/security/attack-challenge-mode', 'POST', challengeData);

      // Log the action
      await this.logFirewallAction('challenge_mode_update', {
        success: true,
        enabled,
        mode,
        result
      });

      return {
        success: true,
        result,
        message: `Challenge mode ${enabled ? 'enabled' : 'disabled'} with mode: ${mode}`
      };

    } catch (error) {
      console.error('Failed to update challenge mode:', error);

      // Log the failed action
      await this.logFirewallAction('challenge_mode_update', {
        success: false,
        enabled,
        mode,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * Get active attack data
   * GET /v1/security/attack-data
   */
  async getActiveAttackData() {
    try {
      const attackData = await this.makeRequest('/v1/security/attack-data');

      // Log the action
      await this.logFirewallAction('get_attack_data', {
        success: true,
        attackCount: attackData?.attacks?.length || 0
      });

      return attackData;
    } catch (error) {
      console.error('Failed to get attack data:', error);

      // Log the failed action
      await this.logFirewallAction('get_attack_data', {
        success: false,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * Create system bypass rule
   * POST /v1/security/firewall/bypass
   */
  async createBypassRule(ipAddress, reason = 'Trusted IP bypass') {
    try {
      const bypassData = {
        type: 'ip',
        value: ipAddress,
        reason,
        enabled: true
      };

      const result = await this.makeRequest('/v1/security/firewall/bypass', 'POST', bypassData);

      // Log the action
      await this.logFirewallAction('bypass_create', {
        success: true,
        ip: ipAddress,
        reason,
        result
      });

      return {
        success: true,
        result,
        message: `Bypass rule created for IP ${ipAddress}`
      };

    } catch (error) {
      console.error(`Failed to create bypass rule for ${ipAddress}:`, error);

      // Log the failed action
      await this.logFirewallAction('bypass_create', {
        success: false,
        ip: ipAddress,
        reason,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * Log firewall actions to database for audit trail
   */
  async logFirewallAction(action, details) {
    try {
      await supabase
        .from('security_events')
        .insert({
          event_id: require('crypto').randomUUID(),
          type: 'vercel_firewall_action',
          severity: 'medium',
          user_id: null, // System action
          ip_address: null,
          user_agent: 'vercel-firewall-service',
          details: {
            action,
            ...details,
            timestamp: new Date().toISOString(),
            service: 'vercel_firewall'
          },
          threats: action.includes('block') ? ['ip_blocking'] : []
        });
    } catch (error) {
      console.error('Failed to log firewall action:', error);
      // Don't throw - logging failure shouldn't break firewall operations
    }
  }

  /**
   * Test the firewall API connection
   */
  async testConnection() {
    try {
      if (!this.isEnabled()) {
        return {
          success: false,
          error: 'Firewall integration not configured',
          details: {
            hasToken: !!this.token,
            hasProjectId: !!this.projectId,
            hasTeamId: !!this.teamId
          }
        };
      }

      // Try to get the current configuration
      const config = await this.getFirewallConfig();

      return {
        success: true,
        message: 'Vercel Firewall API connection successful',
        details: {
          firewallEnabled: config.firewallEnabled,
          configVersion: config.version,
          rulesCount: config.rules?.length || 0,
          blockedIPsCount: config.ips?.filter(ip => ip.action === 'deny').length || 0
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        details: {
          hasToken: !!this.token,
          hasProjectId: !!this.projectId,
          hasTeamId: !!this.teamId
        }
      };
    }
  }
}

module.exports = new VercelFirewallService();
