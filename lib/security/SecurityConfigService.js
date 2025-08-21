/**
 * Security Configuration Service
 * 
 * Manages security alert configuration stored in database
 * Provides GUI-configurable security settings
 */

const { supabase } = require('../database-supabase-compat');

class SecurityConfigService {
  constructor() {
    this.configCache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
    this.lastCacheUpdate = 0;
  }

  /**
   * Get security alert configuration from database
   */
  async getConfig(configKey = null) {
    await this.refreshCacheIfNeeded();
    
    if (configKey) {
      return this.configCache.get(configKey);
    }
    
    return Object.fromEntries(this.configCache);
  }

  /**
   * Update security alert configuration
   */
  async updateConfig(configKey, configValue, updatedBy, description = null) {
    try {
      const { data, error } = await supabase
        .from('security_alert_config')
        .upsert({
          config_key: configKey,
          config_value: configValue,
          description: description,
          updated_by: updatedBy,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'config_key'
        });

      if (error) throw error;

      // Update cache
      this.configCache.set(configKey, configValue);
      
      console.log(`Security config updated: ${configKey}`);
      return { success: true, data };
      
    } catch (error) {
      console.error('Failed to update security config:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get alert recipients by type
   */
  async getAlertRecipients(alertType = null) {
    try {
      let query = supabase
        .from('security_alert_recipients')
        .select('*')
        .eq('is_active', true);

      if (alertType) {
        query = query.eq('alert_type', alertType);
      }

      const { data, error } = await query.order('alert_type', { ascending: true });

      if (error) throw error;

      // Group by alert type and recipient type
      const grouped = {};
      data.forEach(recipient => {
        if (!grouped[recipient.alert_type]) {
          grouped[recipient.alert_type] = {};
        }
        if (!grouped[recipient.alert_type][recipient.recipient_type]) {
          grouped[recipient.alert_type][recipient.recipient_type] = [];
        }
        grouped[recipient.alert_type][recipient.recipient_type].push(recipient.recipient_value);
      });

      return { success: true, data: grouped };
      
    } catch (error) {
      console.error('Failed to get alert recipients:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Add alert recipient
   */
  async addAlertRecipient(alertType, recipientType, recipientValue, createdBy) {
    try {
      const { data, error } = await supabase
        .from('security_alert_recipients')
        .insert({
          alert_type: alertType,
          recipient_type: recipientType,
          recipient_value: recipientValue,
          created_by: createdBy
        });

      if (error) throw error;

      console.log(`Alert recipient added: ${alertType} -> ${recipientType}: ${recipientValue}`);
      return { success: true, data };
      
    } catch (error) {
      console.error('Failed to add alert recipient:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Remove alert recipient
   */
  async removeAlertRecipient(id) {
    try {
      const { data, error } = await supabase
        .from('security_alert_recipients')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      console.log(`Alert recipient removed: ${id}`);
      return { success: true, data };
      
    } catch (error) {
      console.error('Failed to remove alert recipient:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get security alert thresholds
   */
  async getAlertThresholds() {
    try {
      const { data, error } = await supabase
        .from('security_alert_thresholds')
        .select('*')
        .eq('is_active', true)
        .order('metric_name');

      if (error) throw error;

      // Convert to object format expected by SecurityMonitoringService
      const thresholds = {};
      data.forEach(threshold => {
        thresholds[threshold.metric_name] = {
          warning: threshold.warning_threshold,
          critical: threshold.critical_threshold
        };
      });

      return { success: true, data: thresholds };
      
    } catch (error) {
      console.error('Failed to get alert thresholds:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update security alert threshold
   */
  async updateAlertThreshold(metricName, warningThreshold, criticalThreshold, updatedBy) {
    try {
      const { data, error } = await supabase
        .from('security_alert_thresholds')
        .upsert({
          metric_name: metricName,
          warning_threshold: warningThreshold,
          critical_threshold: criticalThreshold,
          updated_by: updatedBy,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'metric_name'
        });

      if (error) throw error;

      console.log(`Alert threshold updated: ${metricName} (${warningThreshold}/${criticalThreshold})`);
      return { success: true, data };
      
    } catch (error) {
      console.error('Failed to update alert threshold:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Store security alert in database
   */
  async storeAlert(alert) {
    try {
      const { data, error } = await supabase
        .from('security_alerts')
        .insert({
          alert_id: alert.id,
          alert_type: alert.type,
          metric_name: alert.metric,
          metric_value: alert.value,
          threshold_value: alert.threshold,
          message: alert.message,
          created_at: alert.timestamp
        });

      if (error) throw error;

      return { success: true, data };
      
    } catch (error) {
      console.error('Failed to store alert:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get security alerts with pagination
   */
  async getAlerts(page = 1, limit = 50, filters = {}) {
    try {
      let query = supabase
        .from('security_alerts')
        .select('*', { count: 'exact' });

      // Apply filters
      if (filters.alertType) {
        query = query.eq('alert_type', filters.alertType);
      }
      if (filters.metricName) {
        query = query.eq('metric_name', filters.metricName);
      }
      if (filters.isResolved !== undefined) {
        query = query.eq('is_resolved', filters.isResolved);
      }
      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate);
      }

      // Pagination
      const offset = (page - 1) * limit;
      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        success: true,
        data: {
          alerts: data,
          pagination: {
            page,
            limit,
            total: count,
            totalPages: Math.ceil(count / limit)
          }
        }
      };
      
    } catch (error) {
      console.error('Failed to get alerts:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Mark alert as resolved
   */
  async resolveAlert(alertId, resolvedBy, resolutionNotes = null) {
    try {
      const { data, error } = await supabase
        .from('security_alerts')
        .update({
          is_resolved: true,
          resolved_at: new Date().toISOString(),
          resolved_by: resolvedBy,
          resolution_notes: resolutionNotes
        })
        .eq('alert_id', alertId);

      if (error) throw error;

      console.log(`Alert resolved: ${alertId}`);
      return { success: true, data };
      
    } catch (error) {
      console.error('Failed to resolve alert:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Refresh configuration cache if needed
   */
  async refreshCacheIfNeeded() {
    const now = Date.now();
    if (now - this.lastCacheUpdate > this.cacheExpiry) {
      await this.refreshCache();
    }
  }

  /**
   * Refresh configuration cache from database
   */
  async refreshCache() {
    try {
      const { data, error } = await supabase
        .from('security_alert_config')
        .select('config_key, config_value');

      if (error) throw error;

      this.configCache.clear();
      data.forEach(config => {
        this.configCache.set(config.config_key, config.config_value);
      });

      this.lastCacheUpdate = Date.now();
      console.log('Security config cache refreshed');
      
    } catch (error) {
      console.error('Failed to refresh config cache:', error);
    }
  }

  /**
   * Get security dashboard statistics
   */
  async getDashboardStats(timeRange = '24h') {
    try {
      const now = new Date();
      let startTime;

      switch (timeRange) {
        case '1h':
          startTime = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case '24h':
          startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      }

      const { data, error } = await supabase
        .from('security_alerts')
        .select('alert_type, metric_name, is_resolved')
        .gte('created_at', startTime.toISOString());

      if (error) throw error;

      const stats = {
        totalAlerts: data.length,
        criticalAlerts: data.filter(a => a.alert_type === 'critical').length,
        warningAlerts: data.filter(a => a.alert_type === 'warning').length,
        resolvedAlerts: data.filter(a => a.is_resolved).length,
        unresolvedAlerts: data.filter(a => !a.is_resolved).length,
        alertsByMetric: {}
      };

      // Group by metric
      data.forEach(alert => {
        if (!stats.alertsByMetric[alert.metric_name]) {
          stats.alertsByMetric[alert.metric_name] = 0;
        }
        stats.alertsByMetric[alert.metric_name]++;
      });

      return { success: true, data: stats };
      
    } catch (error) {
      console.error('Failed to get dashboard stats:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = { SecurityConfigService };
