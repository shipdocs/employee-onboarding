/**
 * Admin Security Configuration API
 * Handles security configuration management for admin dashboard
 */

const db = require('../../../lib/database-direct');
const { applyApiSecurityHeaders } = require('../../../lib/securityHeaders');
const { adminRateLimit } = require('../../../lib/rateLimit');

module.exports = adminRateLimit(async (req, res) => {
  try {
    applyApiSecurityHeaders(res);

    // Verify admin authentication
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    // TODO: Replace with JWT auth.getUser(token) implementation
    const user = null;
    const authError = new Error('Authentication not implemented');

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Check if user is admin
    const profileResult = await db.query('SELECT role FROM user_profiles WHERE user_id = $1', [user.id]);
    const profile = profileResult.rows[0];
    const profileError = !profile;

    if (profileError || profile?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    switch (req.method) {
      case 'GET':
        return await getSecurityConfig(req, res);
      case 'PUT':
        return await updateSecurityConfig(req, res, user);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Security config API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});

async function getSecurityConfig(req, res) {
  try {
    // Get security configuration from system settings
    const { data: settings, error } = await supabase
      .from('system_settings')
      .select('*')
      .like('key', 'security_%');

    if (error) {
      console.error('Failed to fetch security settings:', error);
      return res.status(500).json({ error: 'Failed to fetch security configuration' });
    }

    // Transform settings into configuration object
    const config = {
      // Authentication settings
      authentication: {
        mfa_required: false,
        session_timeout: 24, // hours
        max_login_attempts: 10,
        lockout_duration: 60, // minutes
        password_policy: {
          min_length: 8,
          require_uppercase: true,
          require_lowercase: true,
          require_numbers: true,
          require_symbols: false
        }
      },

      // Monitoring settings
      monitoring: {
        log_failed_logins: true,
        log_successful_logins: false,
        alert_on_suspicious_activity: true,
        alert_threshold: 5,
        monitoring_enabled: true
      },

      // Firewall settings
      firewall: {
        enabled: !!process.env.VERCEL_ACCESS_TOKEN,
        auto_block_enabled: true,
        block_threshold: 10,
        block_duration: 60, // minutes
        whitelist_ips: []
      },

      // Notification settings
      notifications: {
        email_alerts: true,
        webhook_alerts: false,
        alert_recipients: [],
        webhook_url: ''
      },

      // Data retention
      retention: {
        security_events_days: 90,
        audit_logs_days: 365,
        session_logs_days: 30
      }
    };

    // Override with actual settings from database
    if (settings) {
      settings.forEach(setting => {
        const keyParts = setting.key.split('_');
        if (keyParts.length >= 2) {
          const category = keyParts[1];
          const subKey = keyParts.slice(2).join('_');

          if (config[category] && subKey) {
            try {
              config[category][subKey] = JSON.parse(setting.value);
            } catch {
              config[category][subKey] = setting.value;
            }
          }
        }
      });
    }

    // Add current status information
    const status = {
      last_updated: new Date().toISOString(),
      active_sessions: 0, // Would need to query sessions table
      recent_alerts: 0,
      firewall_status: config.firewall.enabled ? 'active' : 'disabled'
    };

    // Get recent security events count
    const { count: recentEventsCount } = await supabase
      .from('security_events')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - (24 * 60 * 60 * 1000)).toISOString());

    status.recent_alerts = recentEventsCount || 0;

    return res.json({
      config,
      status,
      environment: {
        has_vercel_token: !!process.env.VERCEL_ACCESS_TOKEN,
        has_webhook_url: !!process.env.SECURITY_WEBHOOK_URL,
        has_email_config: !!process.env.SMTP_HOST
      }
    });

  } catch (error) {
    console.error('Get security config error:', error);
    return res.status(500).json({
      error: 'Failed to fetch security configuration',
      details: error.message
    });
  }
}

async function updateSecurityConfig(req, res, user) {
  try {
    const { config } = req.body;

    if (!config) {
      return res.status(400).json({ error: 'Configuration data is required' });
    }

    // Validate configuration structure
    const validCategories = ['authentication', 'monitoring', 'firewall', 'notifications', 'retention'];
    const updates = [];

    for (const [category, settings] of Object.entries(config)) {
      if (!validCategories.includes(category)) {
        continue;
      }

      for (const [key, value] of Object.entries(settings)) {
        const settingKey = `security_${category}_${key}`;
        const settingValue = typeof value === 'object' ? JSON.stringify(value) : String(value);

        updates.push({
          key: settingKey,
          value: settingValue,
          updated_by: user.id,
          updated_at: new Date().toISOString()
        });
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid configuration updates provided' });
    }

    // Update settings in database
    for (const update of updates) {
      const { error } = await supabase
        .from('system_settings')
        .upsert(update, { onConflict: 'key' });

      if (error) {
        console.error('Failed to update setting:', update.key, error);
      }
    }

    // Log the configuration change
    await supabase
      .from('security_events')
      .insert({
        event_id: `config_update_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'security_config_updated',
        severity: 'medium',
        user_id: user.id,
        ip_address: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        user_agent: req.headers['user-agent'],
        details: {
          updated_settings: updates.map(u => u.key),
          timestamp: new Date().toISOString()
        },
        threats: []
      });

    return res.json({
      success: true,
      message: 'Security configuration updated successfully',
      updated_settings: updates.length
    });

  } catch (error) {
    console.error('Update security config error:', error);
    return res.status(500).json({
      error: 'Failed to update security configuration',
      details: error.message
    });
  }
}
