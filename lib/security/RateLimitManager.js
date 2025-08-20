// lib/security/RateLimitManager.js - Rate limit management utilities
const { globalRateLimiter } = require('./GlobalRateLimiter');
const { supabase } = require('../supabase');

/**
 * Rate Limit Manager - Utilities for managing rate limits
 */
class RateLimitManager {
  constructor() {
    this.rateLimiter = globalRateLimiter;
  }

  /**
   * Clear rate limit for a specific key
   */
  async clearRateLimit(key, reason = 'manual_clear', adminUser = null) {
    try {
      const result = await this.rateLimiter.clearRateLimit(key);

      // Log the action
      await this.logManagementAction('clear_rate_limit', {
        key: key,
        reason: reason,
        admin_user: adminUser?.email || 'system',
        success: result
      }, adminUser);

      return result;
    } catch (error) {
      console.error('Error clearing rate limit:', error);
      return false;
    }
  }

  /**
   * Clear multiple rate limits
   */
  async clearMultipleRateLimits(keys, reason = 'bulk_clear', adminUser = null) {
    const results = {};

    for (const key of keys) {
      results[key] = await this.clearRateLimit(key, reason, adminUser);
    }

    return results;
  }

  /**
   * Clear rate limits by pattern (e.g., all auth limits)
   */
  async clearRateLimitsByPattern(pattern, reason = 'pattern_clear', adminUser = null) {
    // This would require implementing pattern matching in the store
    // For now, return a placeholder
    console.warn('clearRateLimitsByPattern not fully implemented - requires store pattern support');

    await this.logManagementAction('clear_rate_limits_by_pattern', {
      pattern: pattern,
      reason: reason,
      admin_user: adminUser?.email || 'system',
      success: false,
      note: 'Pattern clearing not implemented'
    }, adminUser);

    return false;
  }

  /**
   * Get rate limit status for a key
   */
  async getRateLimitStatus(key) {
    try {
      return await this.rateLimiter.getRateLimitStatus(key);
    } catch (error) {
      console.error('Error getting rate limit status:', error);
      return null;
    }
  }

  /**
   * Get rate limit statistics
   */
  async getRateLimitStats() {
    try {
      const storeStats = await this.rateLimiter.getStoreStats();

      // Get recent violations count
      const { data: recentViolations, error } = await supabase
        .from('security_events')
        .select('id, severity, created_at')
        .eq('type', 'rate_limit_violation')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      const violationStats = {
        total24h: recentViolations?.length || 0,
        bySeverity: { low: 0, medium: 0, high: 0, critical: 0 }
      };

      if (recentViolations) {
        recentViolations.forEach(v => {
          if (violationStats.bySeverity[v.severity] !== undefined) {
            violationStats.bySeverity[v.severity]++;
          }
        });
      }

      return {
        store: storeStats,
        violations: violationStats,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting rate limit stats:', error);
      return null;
    }
  }

  /**
   * Check if IP is currently rate limited
   */
  async isIPRateLimited(ipAddress, endpointType = 'api') {
    const key = `${endpointType}:${ipAddress}`;
    const status = await this.getRateLimitStatus(key);

    if (!status) return false;

    const now = Date.now();
    return now < status.resetTime && status.count >= status.limit;
  }

  /**
   * Get top rate limit violators
   */
  async getTopViolators(timeRange = '24h', limit = 10) {
    try {
      let startTime;
      const now = new Date();

      switch (timeRange) {
        case '1h':
          startTime = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case '6h':
          startTime = new Date(now.getTime() - 6 * 60 * 60 * 1000);
          break;
        case '24h':
          startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        default:
          startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      }

      const { data: violations, error } = await supabase
        .from('security_events')
        .select('ip_address, severity, details')
        .eq('type', 'rate_limit_violation')
        .gte('created_at', startTime.toISOString());

      if (error) {
        console.error('Error fetching violations:', error);
        return [];
      }

      // Aggregate by IP address
      const violatorMap = new Map();

      violations.forEach(violation => {
        const ip = violation.ip_address || 'unknown';
        if (!violatorMap.has(ip)) {
          violatorMap.set(ip, {
            ip: ip,
            count: 0,
            severityBreakdown: { low: 0, medium: 0, high: 0, critical: 0 },
            endpoints: new Set(),
            lastViolation: null
          });
        }

        const violator = violatorMap.get(ip);
        violator.count++;
        violator.severityBreakdown[violation.severity]++;

        if (violation.details?.endpoint) {
          violator.endpoints.add(violation.details.endpoint);
        }

        if (!violator.lastViolation || violation.created_at > violator.lastViolation) {
          violator.lastViolation = violation.created_at;
        }
      });

      // Convert to array and sort by count
      return Array.from(violatorMap.values())
        .map(violator => ({
          ...violator,
          endpoints: Array.from(violator.endpoints)
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);

    } catch (error) {
      console.error('Error getting top violators:', error);
      return [];
    }
  }

  /**
   * Log management actions for audit trail
   */
  async logManagementAction(action, details, adminUser = null) {
    try {
      // Log to audit_log
      await supabase
        .from('audit_log')
        .insert({
          user_id: adminUser?.id || null,
          action: action,
          resource_type: 'rate_limit_management',
          details: {
            ...details,
            timestamp: new Date().toISOString()
          },
          ip_address: null,
          user_agent: null
        });

      // Log to security_events
      await supabase
        .from('security_events')
        .insert({
          event_id: `rate_mgmt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'rate_limit_management',
          severity: 'low',
          user_id: adminUser?.id || null,
          ip_address: null,
          user_agent: null,
          details: {
            action: action,
            ...details,
            timestamp: new Date().toISOString()
          },
          threats: []
        });

    } catch (error) {
      console.error('Failed to log management action:', error);
    }
  }

  /**
   * Emergency rate limit clear (for critical situations)
   */
  async emergencyClearAll(reason, adminUser) {
    try {
      console.warn('🚨 EMERGENCY: Clearing all rate limits');

      // This would clear all rate limits - use with extreme caution
      // For now, just log the action
      await this.logManagementAction('emergency_clear_all', {
        reason: reason,
        admin_user: adminUser?.email || 'system',
        timestamp: new Date().toISOString(),
        warning: 'Emergency clear all rate limits'
      }, adminUser);

      // In a real implementation, this would call store.clear()
      // return await this.rateLimiter.store.clear();

      console.warn('Emergency clear all not implemented - would require store.clear()');
      return false;

    } catch (error) {
      console.error('Emergency clear failed:', error);
      return false;
    }
  }
}

// Create singleton instance
const rateLimitManager = new RateLimitManager();

module.exports = {
  RateLimitManager,
  rateLimitManager
};
