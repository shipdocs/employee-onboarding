// lib/featureFlags.js - Feature Flag System for Refactoring Rollout
const { supabase } = require('./supabase');

/**
 * Feature Flag System
 *
 * Provides controlled feature rollouts with:
 * - Percentage-based rollouts
 * - User-specific targeting
 * - Environment-specific flags
 * - Real-time monitoring
 * - Automatic rollback capabilities
 */

class FeatureFlagService {
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
    this.monitoringEnabled = true;
  }

  /**
   * Get feature flag value
   * @param {string} flagKey - Unique flag identifier
   * @param {Object} context - User and environment context
   * @returns {Promise<boolean>} - Flag enabled state
   */
  async isEnabled(flagKey, context = {}) {
    try {
      // Check cache first
      const cached = this.getCached(flagKey);
      if (cached !== null) {
        return cached;
      }

      // Fetch from database
      const { data: flag, error } = await supabase
        .from('feature_flags')
        .select('*')
        .eq('key', flagKey)
        .eq('is_active', true)
        .single();

      if (error || !flag) {

        return false;
      }

      // Evaluate flag based on rules
      const enabled = await this.evaluateFlag(flag, context);

      // Cache result
      this.setCached(flagKey, enabled);

      // Track usage
      if (this.monitoringEnabled) {
        await this.trackUsage(flagKey, enabled, context);
      }

      return enabled;
    } catch (error) {
      // console.error(`Error checking feature flag ${flagKey}:`, error);
      return false; // Default to disabled on error
    }
  }

  /**
   * Evaluate flag rules
   * @param {Object} flag - Flag configuration
   * @param {Object} context - Evaluation context
   * @returns {Promise<boolean>} - Evaluation result
   */
  async evaluateFlag(flag, context) {
    // Check environment targeting
    if (flag.environments && flag.environments.length > 0) {
      const currentEnv = process.env.NODE_ENV || 'development';
      if (!flag.environments.includes(currentEnv)) {
        return false;
      }
    }

    // Check user targeting
    if (flag.target_users && flag.target_users.length > 0 && context.userId) {
      if (flag.target_users.includes(context.userId)) {
        return true;
      }
    }

    // Check role targeting
    if (flag.target_roles && flag.target_roles.length > 0 && context.userRole) {
      if (flag.target_roles.includes(context.userRole)) {
        return true;
      }
    }

    // Check percentage rollout
    if (flag.rollout_percentage !== null && flag.rollout_percentage !== undefined) {
      const hash = this.hashUserId(context.userId || 'anonymous');
      const bucket = hash % 100;
      return bucket < flag.rollout_percentage;
    }

    // Default to flag's enabled state
    return flag.is_enabled || false;
  }

  /**
   * Hash user ID for consistent bucketing
   * @param {string} userId - User identifier
   * @returns {number} - Hash value 0-99
   */
  hashUserId(userId) {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash) % 100;
  }

  /**
   * Track feature flag usage
   * @param {string} flagKey - Flag key
   * @param {boolean} enabled - Evaluation result
   * @param {Object} context - Usage context
   */
  async trackUsage(flagKey, enabled, context) {
    try {
      await supabase
        .from('feature_flag_usage')
        .insert({
          flag_key: flagKey,
          enabled,
          user_id: context.userId || null,
          user_role: context.userRole || null,
          environment: process.env.NODE_ENV || 'development',
          metadata: context.metadata || {}
        });
    } catch (error) {
      // Don't fail on tracking errors

    }
  }

  /**
   * Get cached flag value
   * @param {string} key - Cache key
   * @returns {boolean|null} - Cached value or null
   */
  getCached(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.cacheExpiry) {
      this.cache.delete(key);
      return null;
    }

    return cached.value;
  }

  /**
   * Set cached flag value
   * @param {string} key - Cache key
   * @param {boolean} value - Flag value
   */
  setCached(key, value) {
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }

  /**
   * Clear cache (useful for testing)
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get all active flags for a context
   * @param {Object} context - User and environment context
   * @returns {Promise<Object>} - Map of flag keys to values
   */
  async getAllFlags(context = {}) {
    try {
      const { data: flags, error } = await supabase
        .from('feature_flags')
        .select('*')
        .eq('is_active', true);

      if (error) {
        // console.error('Error fetching feature flags:', error);
        return {};
      }

      const result = {};
      for (const flag of flags) {
        result[flag.key] = await this.evaluateFlag(flag, context);
      }

      return result;
    } catch (error) {
      // console.error('Error getting all feature flags:', error);
      return {};
    }
  }

  /**
   * Check if refactoring features are enabled
   * @param {string} week - Refactoring week (e.g., 'week1', 'week2')
   * @param {Object} context - User context
   * @returns {Promise<boolean>} - Whether refactoring is enabled
   */
  async isRefactoringEnabled(week, context = {}) {
    const flagKey = `refactoring_${week}`;
    return this.isEnabled(flagKey, context);
  }
}

// Singleton instance
const featureFlags = new FeatureFlagService();

// Refactoring-specific flag keys
const REFACTORING_FLAGS = {
  FOUNDATION: 'refactoring_foundation',
  WEEK1_EMAIL: 'refactoring_week1_email',
  WEEK2_CONFIG: 'refactoring_week2_config',
  WEEK3_ERROR: 'refactoring_week3_error',
  WEEK4_DATABASE: 'refactoring_week4_database',
  WEEK5_WORKFLOW: 'refactoring_week5_workflow',
  WEEK6_CONTENT: 'refactoring_week6_content',
  WEEK7_TEMPLATE: 'refactoring_week7_template',
  WEEK8_NEW_WORKFLOW: 'refactoring_week8_new_workflow',
  WEEK9_MULTI_WORKFLOW: 'refactoring_week9_multi_workflow',
  WEEK10_ANALYTICS: 'refactoring_week10_analytics',
  WEEK11_PERFORMANCE: 'refactoring_week11_performance'
};

module.exports = {
  featureFlags,
  FeatureFlagService,
  REFACTORING_FLAGS
};
