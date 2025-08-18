/**
 * Vercel Firewall Admin API
 * Real integration with Vercel Firewall API for admin management
 */

const { supabase } = require('../../lib/supabase');
const { authenticateRequest } = require('../../lib/auth');
const vercelFirewallService = require('../../lib/services/vercelFirewallService');
const securityFirewallIntegration = require('../../lib/services/securityFirewallIntegration');
const { adminRateLimit } = require('../../lib/rateLimit');

module.exports = adminRateLimit(async (req, res) => {
  try {
    // Verify admin authentication with proper blacklist checking
    const user = await authenticateRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Access token required' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    switch (req.method) {
      case 'GET':
        return await getFirewallStatus(req, res);
      case 'POST':
        return await executeFirewallAction(req, res, user);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Vercel Firewall API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

async function getFirewallStatus(req, res) {
  try {
    // Get firewall status from integration service
    const status = await securityFirewallIntegration.getFirewallStatus();
    
    // Get configuration
    const config = securityFirewallIntegration.getConfiguration();

    // Test connection if enabled
    let connectionTest = null;
    if (vercelFirewallService.isEnabled()) {
      connectionTest = await vercelFirewallService.testConnection();
    }

    return res.json({
      ...status,
      configuration: config,
      connectionTest,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get firewall status error:', error);
    return res.status(500).json({ 
      error: 'Failed to get firewall status',
      details: error.message 
    });
  }
}

async function executeFirewallAction(req, res, user) {
  try {
    const { action, ipAddress, reason } = req.body;

    if (!action) {
      return res.status(400).json({ error: 'Action is required' });
    }

    let result;

    switch (action) {
      case 'block_ip':
        if (!ipAddress) {
          return res.status(400).json({ error: 'IP address is required for blocking' });
        }
        result = await securityFirewallIntegration.manuallyBlockIP(
          ipAddress, 
          reason || 'Manual admin block', 
          user.id
        );
        break;

      case 'unblock_ip':
        if (!ipAddress) {
          return res.status(400).json({ error: 'IP address is required for unblocking' });
        }
        result = await securityFirewallIntegration.manuallyUnblockIP(
          ipAddress, 
          reason || 'Manual admin unblock', 
          user.id
        );
        break;

      case 'test_connection':
        result = await vercelFirewallService.testConnection();
        break;

      case 'get_config':
        result = await vercelFirewallService.getFirewallConfig();
        break;

      case 'update_challenge_mode':
        const { enabled = true, mode = 'auto' } = req.body;
        result = await vercelFirewallService.updateChallengeMode(enabled, mode);
        break;

      case 'get_attack_data':
        result = await vercelFirewallService.getActiveAttackData();
        break;

      case 'create_bypass':
        if (!ipAddress) {
          return res.status(400).json({ error: 'IP address is required for bypass rule' });
        }
        result = await vercelFirewallService.createBypassRule(
          ipAddress, 
          reason || 'Manual admin bypass'
        );
        break;

      case 'update_thresholds':
        const { thresholds } = req.body;
        if (!thresholds) {
          return res.status(400).json({ error: 'Thresholds are required' });
        }
        securityFirewallIntegration.updateBlockThresholds(thresholds);
        result = { 
          success: true, 
          message: 'Block thresholds updated',
          newThresholds: thresholds 
        };
        break;

      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }

    return res.json({
      success: true,
      action,
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Execute firewall action error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Failed to execute firewall action',
      details: error.message 
    });
  }
}
