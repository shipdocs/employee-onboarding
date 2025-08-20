// lib/settingsService.js - System Settings Service
const supabase = require('./supabase');

/**
 * Settings Service
 *
 * Provides access to system settings stored in the database
 * with fallback to environment variables for backward compatibility
 */

class SettingsService {
  constructor() {
    this.supabase = supabase;
    this.settingsCache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
    this.lastCacheUpdate = 0;
  }

  /**
   * Get all system settings from database
   * @returns {Object} Settings organized by category
   * @throws {Error} If database connection fails
   */
  async getAllSettings() {
    // Check cache first
    if (this.isCacheValid()) {
      const allSettings = {};
      for (const [category, settings] of this.settingsCache.entries()) {
        allSettings[category] = settings;
      }
      return allSettings;
    }

    // Fetch from database - no fallbacks
    if (!this.supabase) {
      throw new Error('Database connection not available. Cannot fetch settings.');
    }

    try {
      const { data: settings, error } = await this.supabase
        .from('system_settings')
        .select('category, key, value, type');

      if (error) {
        // console.error('Error fetching system settings:', error);
        throw new Error(`Failed to fetch system settings: ${error.message}`);
      }

      // Organize settings by category
      const settingsMap = {};
      settings.forEach(setting => {
        if (!settingsMap[setting.category]) {
          settingsMap[setting.category] = {};
        }
        settingsMap[setting.category][setting.key] = setting.value;
      });

      // Update cache
      this.settingsCache = new Map(Object.entries(settingsMap));
      this.lastCacheUpdate = Date.now();

      return settingsMap;
    } catch (error) {
      // console.error('Error in getAllSettings:', error);
      throw error;
    }
  }

  /**
   * Get a specific setting value
   * @param {string} category - Setting category
   * @param {string} key - Setting key
   * @param {*} defaultValue - Default value if not found
   * @returns {*} Setting value
   * @throws {Error} If database connection fails
   */
  async getSetting(category, key, defaultValue = null) {
    // Check cache first
    if (this.isCacheValid()) {
      const categorySettings = this.settingsCache.get(category);
      if (categorySettings && categorySettings[key] !== undefined) {
        return categorySettings[key];
      }
    }

    // Fetch from database - no fallbacks
    if (!this.supabase) {
      throw new Error('Database connection not available. Cannot fetch settings.');
    }

    try {
      const { data: setting, error } = await this.supabase
        .from('system_settings')
        .select('value')
        .eq('category', category)
        .eq('key', key)
        .single();

      if (error || !setting) {
        return defaultValue;
      }

      return setting.value;
    } catch (error) {
      // console.error(`Error fetching setting ${category}.${key}:`, error);
      throw error;
    }
  }

  /**
   * Get email configuration from settings
   * @returns {Object} Email configuration
   * @throws {Error} If email settings are not properly configured
   */
  async getEmailConfig() {
    console.log('🔍 [SETTINGS] ===== STRICT EMAIL CONFIGURATION (NO FALLBACKS) =====');

    // Get email settings from database ONLY - ABSOLUTELY NO FALLBACKS
    const dbEmailSettings = await this.getCategorySettings('email');

    if (!dbEmailSettings || Object.keys(dbEmailSettings).length === 0) {
      throw new Error('Email settings not found in database. Please configure email settings through the admin interface.');
    }

    // Validate required settings - STRICT VALIDATION
    const provider = dbEmailSettings.email_service_provider;
    if (!provider) {
      throw new Error('Email service provider not configured. Please set email_service_provider in admin settings.');
    }

    if (!['smtp', 'mailersend'].includes(provider)) {
      throw new Error(`Invalid email provider: ${provider}. Supported providers: smtp, mailersend`);
    }

    const fromEmail = dbEmailSettings.from_email;
    const fromName = dbEmailSettings.from_name;

    if (!fromEmail) {
      throw new Error('From email address not configured. Please set from_email in admin settings.');
    }

    // Validate provider-specific settings
    if (provider === 'smtp') {
      const smtpHost = dbEmailSettings.smtp_host;
      const smtpUser = dbEmailSettings.smtp_user;
      const smtpPassword = dbEmailSettings.smtp_password;

      if (!smtpHost || !smtpUser || !smtpPassword) {
        throw new Error(`SMTP configuration incomplete. Missing: ${[
          !smtpHost && 'smtp_host',
          !smtpUser && 'smtp_user',
          !smtpPassword && 'smtp_password'
        ].filter(Boolean).join(', ')}. Please configure in admin settings.`);
      }

    } else if (provider === 'mailersend') {
      const apiKey = dbEmailSettings.mailersend_api_key;
      const domain = dbEmailSettings.mailersend_domain;

      if (!apiKey || !domain) {
        throw new Error(`MailerSend configuration incomplete. Missing: ${[
          !apiKey && 'mailersend_api_key',
          !domain && 'mailersend_domain'
        ].filter(Boolean).join(', ')}. Please configure in admin settings.`);
      }

    } else {
      throw new Error(`Unsupported email provider: ${provider}. Supported providers: smtp, mailersend`);
    }

    return {
      provider: provider,
      fromEmail: fromEmail,
      fromName: fromName || 'Maritime Onboarding',

      // SMTP Configuration
      smtp: {
        host: dbEmailSettings.smtp_host,
        port: parseInt(dbEmailSettings.smtp_port || '587'),
        secure: (dbEmailSettings.smtp_secure || 'false') === 'true',
        user: dbEmailSettings.smtp_user,
        password: dbEmailSettings.smtp_password
      },

      // MailerSend Configuration
      mailersend: {
        apiKey: dbEmailSettings.mailersend_api_key,
        domain: dbEmailSettings.mailersend_domain,
        fromEmail: dbEmailSettings.mailersend_from_email || fromEmail,
        fromName: dbEmailSettings.mailersend_from_name || fromName
      }
    };
  }

  /**
   * Get all settings for a specific category
   * @param {string} category - Category name
   * @returns {Object} Category settings
   * @throws {Error} If database connection fails
   */
  async getCategorySettings(category) {
    // Check cache first
    if (this.isCacheValid()) {
      return this.settingsCache.get(category) || {};
    }

    // Fetch from database - no fallbacks
    if (!this.supabase) {
      throw new Error('Database connection not available. Cannot fetch settings.');
    }

    try {

      const { data: settings, error } = await this.supabase
        .from('system_settings')
        .select('key, value')
        .eq('category', category);

      if (error) {
        // console.error(`❌ [SETTINGS] Supabase query error for ${category}:`, error);
        throw new Error(`Failed to fetch ${category} settings from database: ${error.message}`);
      }

      if (settings && settings.length > 0) {
        console.log(`🔍 [SETTINGS] Found ${settings.length} settings for category: ${category}`);
      }

      const categorySettings = {};
      settings.forEach(setting => {
        categorySettings[setting.key] = setting.value;
      });

      // Update cache
      this.settingsCache.set(category, categorySettings);
      this.lastCacheUpdate = Date.now();

      return categorySettings;
    } catch (error) {
      // console.error(`Error in getCategorySettings for ${category}:`, error);
      throw error;
    }
  }

  /**
   * Check if cache is still valid
   * @returns {boolean}
   */
  isCacheValid() {
    return (Date.now() - this.lastCacheUpdate) < this.cacheExpiry;
  }

  /**
   * Clear settings cache
   */
  clearCache() {
    this.settingsCache.clear();
    this.lastCacheUpdate = 0;
  }

  /**
   * Update a specific setting and clear cache
   * @param {string} category - Setting category
   * @param {string} key - Setting key
   * @param {*} value - Setting value
   * @throws {Error} If database update fails
   */
  async updateSetting(category, key, value) {
    if (!this.supabase) {
      throw new Error('Database connection not available. Cannot update settings.');
    }

    try {
      const { error } = await this.supabase
        .from('system_settings')
        .upsert({
          category,
          key,
          value,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'category,key',
          ignoreDuplicates: false
        });

      if (error) {
        // console.error(`Error updating setting ${category}.${key}:`, error);
        throw new Error(`Failed to update setting: ${error.message}`);
      }

      // Clear cache to force refresh
      this.clearCache();

    } catch (error) {
      // console.error(`Error in updateSetting for ${category}.${key}:`, error);
      throw error;
    }
  }

  // Environment fallback methods removed - settings must be configured in database
}

// Export singleton instance
const settingsService = new SettingsService();
module.exports = { settingsService, SettingsService };
module.exports.default = settingsService;
