/**
 * Password History Service
 * Manages password history tracking and validation to prevent password reuse
 */

const bcrypt = require('bcrypt');
const { supabase } = require('../supabase');

class PasswordHistoryService {
  constructor(options = {}) {
    this.maxHistoryEntries = options.maxHistoryEntries || 24; // Keep last 24 passwords
    this.retentionMonths = options.retentionMonths || 12; // Keep 12 months of history
  }

  /**
   * Add password to history
   * @param {string} userId - User ID
   * @param {string} password - Plain text password
   * @param {object} req - Request object for IP and user agent
   * @returns {Promise<object>} - Result of the operation
   */
  async addPasswordToHistory(userId, password, req = null) {
    try {
      if (!userId || !password) {
        return { success: false, error: 'User ID and password are required' };
      }

      // Hash the password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Insert into password history
      const { data, error } = await supabase
        .from('password_history')
        .insert({
          user_id: userId,
          password_hash: passwordHash,
          ip_address: req?.headers?.['x-forwarded-for'] || req?.connection?.remoteAddress || null,
          user_agent: req?.headers?.['user-agent'] || null
        });

      if (error) {
        console.error('Error adding password to history:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in addPasswordToHistory:', error);
      return { success: false, error: 'Failed to add password to history' };
    }
  }

  /**
   * Check if password has been used before
   * @param {string} userId - User ID
   * @param {string} password - Plain text password to check
   * @param {number} checkLastN - Number of recent passwords to check (default: all)
   * @returns {Promise<object>} - Result indicating if password was used before
   */
  async isPasswordReused(userId, password, checkLastN = null) {
    try {
      if (!userId || !password) {
        return { isReused: false, error: 'User ID and password are required' };
      }

      // Get password history for the user
      let query = supabase
        .from('password_history')
        .select('password_hash, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      // Limit to last N passwords if specified
      if (checkLastN && checkLastN > 0) {
        query = query.limit(checkLastN);
      }

      const { data: passwordHistory, error } = await query;

      if (error) {
        console.error('Error fetching password history:', error);
        return { isReused: false, error: error.message };
      }

      if (!passwordHistory || passwordHistory.length === 0) {
        return { isReused: false };
      }

      // Check each historical password
      for (const historyEntry of passwordHistory) {
        const isMatch = await bcrypt.compare(password, historyEntry.password_hash);
        if (isMatch) {
          return {
            isReused: true,
            lastUsed: historyEntry.created_at,
            message: 'This password has been used before. Please choose a different password.'
          };
        }
      }

      return { isReused: false };
    } catch (error) {
      console.error('Error in isPasswordReused:', error);
      return { isReused: false, error: 'Failed to check password history' };
    }
  }

  /**
   * Get password history statistics for a user
   * @param {string} userId - User ID
   * @returns {Promise<object>} - Password history statistics
   */
  async getPasswordHistoryStats(userId) {
    try {
      if (!userId) {
        return { success: false, error: 'User ID is required' };
      }

      const { data: passwordHistory, error } = await supabase
        .from('password_history')
        .select('created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching password history stats:', error);
        return { success: false, error: error.message };
      }

      const totalPasswords = passwordHistory ? passwordHistory.length : 0;
      const oldestPassword = totalPasswords > 0 ? passwordHistory[totalPasswords - 1].created_at : null;
      const newestPassword = totalPasswords > 0 ? passwordHistory[0].created_at : null;

      return {
        success: true,
        stats: {
          totalPasswords,
          oldestPassword,
          newestPassword,
          maxHistoryEntries: this.maxHistoryEntries
        }
      };
    } catch (error) {
      console.error('Error in getPasswordHistoryStats:', error);
      return { success: false, error: 'Failed to get password history statistics' };
    }
  }

  /**
   * Clean up old password history entries
   * @param {string} userId - User ID (optional, if not provided cleans all users)
   * @returns {Promise<object>} - Result of cleanup operation
   */
  async cleanupOldPasswords(userId = null) {
    try {
      let deletedCount = 0;

      if (userId) {
        // Clean up for specific user
        const cutoffDate = new Date();
        cutoffDate.setMonth(cutoffDate.getMonth() - this.retentionMonths);

        const { error } = await supabase
          .from('password_history')
          .delete()
          .eq('user_id', userId)
          .lt('created_at', cutoffDate.toISOString());

        if (error) {
          console.error('Error cleaning up user password history:', error);
          return { success: false, error: error.message };
        }
      } else {
        // Use the database function for global cleanup
        const { data, error } = await supabase.rpc('cleanup_old_password_history');

        if (error) {
          console.error('Error running password history cleanup:', error);
          return { success: false, error: error.message };
        }

        deletedCount = data || 0;
      }

      return { success: true, deletedCount };
    } catch (error) {
      console.error('Error in cleanupOldPasswords:', error);
      return { success: false, error: 'Failed to cleanup old passwords' };
    }
  }

  /**
   * Validate password against history
   * @param {string} userId - User ID
   * @param {string} password - Plain text password to validate
   * @param {object} options - Validation options
   * @returns {Promise<object>} - Validation result
   */
  async validatePasswordHistory(userId, password, options = {}) {
    const checkLastN = options.checkLastN || this.maxHistoryEntries;
    const allowReuse = options.allowReuse || false;

    if (allowReuse) {
      return { valid: true };
    }

    const reuseCheck = await this.isPasswordReused(userId, password, checkLastN);

    if (reuseCheck.error) {
      // On error, allow password change to avoid blocking users
      console.error('Password history validation error:', reuseCheck.error);
      return { valid: true, warning: 'Could not verify password history' };
    }

    if (reuseCheck.isReused) {
      return {
        valid: false,
        error: reuseCheck.message || 'Password has been used recently. Please choose a different password.',
        lastUsed: reuseCheck.lastUsed
      };
    }

    return { valid: true };
  }

  /**
   * Get password change recommendations
   * @param {string} userId - User ID
   * @returns {Promise<object>} - Password change recommendations
   */
  async getPasswordChangeRecommendations(userId) {
    try {
      const stats = await this.getPasswordHistoryStats(userId);
      
      if (!stats.success) {
        return { success: false, error: stats.error };
      }

      const recommendations = [];

      // Check if user has password history
      if (stats.stats.totalPasswords === 0) {
        recommendations.push('This is your first password. Choose a strong, unique password.');
      } else {
        recommendations.push(`You have changed your password ${stats.stats.totalPasswords} times.`);
        
        if (stats.stats.totalPasswords >= this.maxHistoryEntries) {
          recommendations.push(`Your last ${this.maxHistoryEntries} passwords are remembered and cannot be reused.`);
        } else {
          recommendations.push(`Your last ${stats.stats.totalPasswords} passwords cannot be reused.`);
        }
      }

      // Check password age
      if (stats.stats.newestPassword) {
        const lastChange = new Date(stats.stats.newestPassword);
        const daysSinceChange = Math.floor((Date.now() - lastChange.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysSinceChange > 90) {
          recommendations.push('Consider changing your password regularly for better security.');
        }
      }

      return {
        success: true,
        recommendations,
        stats: stats.stats
      };
    } catch (error) {
      console.error('Error in getPasswordChangeRecommendations:', error);
      return { success: false, error: 'Failed to get password change recommendations' };
    }
  }

  /**
   * Force password history cleanup for a user (admin function)
   * @param {string} userId - User ID
   * @returns {Promise<object>} - Result of cleanup operation
   */
  async forceCleanupUserHistory(userId) {
    try {
      if (!userId) {
        return { success: false, error: 'User ID is required' };
      }

      const { error } = await supabase
        .from('password_history')
        .delete()
        .eq('user_id', userId);

      if (error) {
        console.error('Error force cleaning user password history:', error);
        return { success: false, error: error.message };
      }

      return { success: true, message: 'Password history cleared for user' };
    } catch (error) {
      console.error('Error in forceCleanupUserHistory:', error);
      return { success: false, error: 'Failed to cleanup user password history' };
    }
  }
}

module.exports = PasswordHistoryService;