// lib/notificationService.js - System notification service for login alerts
const { supabase } = require('./database-supabase-compat');
const { unifiedEmailService } = require('./unifiedEmailService.js');
const { emailTemplateGenerator } = require('./emailTemplateGenerator.js');

const { db } = require('./database');

class NotificationService {
  /**
   * Handle first-time manager login - notify admin
   * @param {Object} manager - Manager user object
   */
  async handleFirstTimeManagerLogin(manager) {
    try {

      // Create notification record
      const notification = {
        notification_type: 'first_manager_login',
        recipient_type: 'admin',
        subject: `New Manager First Login: ${manager.first_name} ${manager.last_name}`,
        message: `Manager ${manager.first_name} ${manager.last_name} (${manager.email}) has logged in for the first time.`,
        metadata: {
          manager_id: manager.id,
          manager_email: manager.email,
          manager_name: `${manager.first_name} ${manager.last_name}`,
          position: manager.position,
          login_timestamp: new Date().toISOString()
        }
      };

      // Log notification attempt (system_notifications table may not exist yet)
      try {
        await supabase
          .from('system_notifications')
          .insert(notification);
      } catch (notificationError) {

      }

      // Get admin users
      const { data: admins, error: adminError } = await supabase
        .from('users')
        .select('id, email, first_name, last_name')
        .eq('role', 'admin')
        .eq('is_active', true);

      if (adminError || !admins || admins.length === 0) {
        // console.error('No active admin users found for notification:', adminError);
        return;
      }

      // Send email notification to all admins (simplified without email_logs table)
      for (const admin of admins) {
        try {

          await this.sendManagerFirstLoginEmail(admin, manager);

        } catch (emailError) {
          // console.error(`❌ Failed to send manager login notification to admin ${admin.email}:`, emailError);
        }
      }

      // Mark notification as sent (if table exists)
      try {
        await supabase
          .from('system_notifications')
          .update({ sent_at: new Date().toISOString() })
          .eq('notification_type', 'first_manager_login')
          .eq('metadata->manager_id', manager.id);
      } catch (error) {
        // Table may not exist yet, that's OK
      }

    } catch (error) {
      // console.error('Error handling first-time manager login notification:', error);
    }
  }

  /**
   * Handle first-time user/crew login - notify all managers
   * @param {Object} user - User object (crew member)
   */
  async handleFirstTimeUserLogin(user) {
    try {

      // Create notification record
      const notification = {
        notification_type: 'first_user_login',
        recipient_type: 'managers',
        subject: `New Crew Member First Login: ${user.first_name} ${user.last_name}`,
        message: `Crew member ${user.first_name} ${user.last_name} (${user.email}) has logged in for the first time and started their onboarding.`,
        metadata: {
          user_id: user.id,
          user_email: user.email,
          user_name: `${user.first_name} ${user.last_name}`,
          position: user.position,
          vessel_assignment: user.vessel_assignment,
          expected_boarding_date: user.expected_boarding_date,
          login_timestamp: new Date().toISOString()
        }
      };

      // Log notification attempt (system_notifications table may not exist yet)
      try {
        await supabase
          .from('system_notifications')
          .insert(notification);
      } catch (notificationError) {

      }

      // Get all active managers
      const { data: managers, error: managerError } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, position')
        .eq('role', 'manager')
        .eq('is_active', true);

      if (managerError || !managers || managers.length === 0) {
        // console.error('No active managers found for notification:', managerError);
        return;
      }

      // Send email notification to all managers (simplified without email_logs table)
      for (const manager of managers) {
        try {

          await this.sendUserFirstLoginEmail(manager, user);

        } catch (emailError) {
          // console.error(`❌ Failed to send user login notification to manager ${manager.email}:`, emailError);
        }
      }

      // Mark notification as sent (if table exists)
      try {
        await supabase
          .from('system_notifications')
          .update({ sent_at: new Date().toISOString() })
          .eq('notification_type', 'first_user_login')
          .eq('metadata->user_id', user.id);
      } catch (error) {
        // Table may not exist yet, that's OK
      }

    } catch (error) {
      // console.error('Error handling first-time user login notification:', error);
    }
  }

  /**
   * Send email notification to admin about manager first login
   * @param {Object} admin - Admin user object
   * @param {Object} manager - Manager user object
   */
  async sendManagerFirstLoginEmail(admin, manager) {
    const subject = `🔐 Manager First Login Alert: ${manager.first_name} ${manager.last_name}`;

    // Generate email content using template generator
    const htmlContent = await emailTemplateGenerator.generateFirstLoginNotificationTemplate(
      'manager',
      admin,
      manager,
      admin.preferred_language || 'en'
    );

    // Use unified email service factory to send
    return await unifiedEmailService.factory.sendEmail({
      to: admin.email,
      toName: `${admin.first_name} ${admin.last_name}`,
      subject: subject,
      html: htmlContent,
      logType: 'first_manager_login',
      userId: admin.id
    });
  }

  /**
   * Send email notification to managers about user first login
   * @param {Object} manager - Manager user object
   * @param {Object} user - User object (crew member)
   */
  async sendUserFirstLoginEmail(manager, user) {
    const subject = `👋 New Crew Member Started: ${user.first_name} ${user.last_name}`;

    // Generate email content using template generator
    const htmlContent = await emailTemplateGenerator.generateFirstLoginNotificationTemplate(
      'crew',
      manager,
      user,
      manager.preferred_language || 'en'
    );

    // Use unified email service factory to send
    return await unifiedEmailService.factory.sendEmail({
      to: manager.email,
      toName: `${manager.first_name} ${manager.last_name}`,
      subject: subject,
      html: htmlContent,
      logType: 'first_user_login',
      userId: manager.id
    });
  }

  /**
   * Log email to database (disabled until email_logs table is available)
   * @param {Object} emailData - Email log data
   */
  async logEmail(emailData) {
    // Email logging is temporarily disabled since email_logs table doesn't exist
    // Deduplication is now handled via user metadata flags
    // console.log(`Email logged: ${emailData.email_type} to ${emailData.recipient_email}`);
  }

  /**
   * Check if user is logging in for the first time and trigger notifications
   * @param {Object} user - User object
   */
  async checkAndHandleFirstLogin(user) {
    try {

      // Get current user data to check if notification already sent
      const currentUserResult = await db.query('SELECT id, first_login_at, login_count, first_login_notification_sent FROM users WHERE id = $1', [user.id]);
    const currentUser = currentUserResult.rows[0];
    const getUserError = !currentUser;

      if (getUserError) {
        // console.error('Failed to get current user data:', getUserError);
        return;
      }

      // Check if notification already sent using the dedicated column
      if (currentUser.first_login_notification_sent) {

        // Just increment login count
        await supabase
          .from('users')
          .update({
            login_count: (currentUser.login_count || 0) + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);
        return;
      }

      // This is the first login - use atomic update to set the flag and prevent race conditions
      const now = new Date().toISOString();
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({
          first_login_at: currentUser.first_login_at || now,
          first_login_notification_sent: true,
          login_count: (currentUser.login_count || 0) + 1,
          updated_at: now
        })
        .eq('id', user.id)
        .eq('first_login_notification_sent', false) // Only update if flag not already set
        .select('id, first_login_at, first_login_notification_sent')
        .single();

      // If the update succeeded, this is truly the first login
      if (!updateError && updatedUser) {

        // Trigger appropriate notifications based on user role
        if (user.role === 'manager') {
          await this.handleFirstTimeManagerLogin(user);
        } else if (user.role === 'crew') {
          await this.handleFirstTimeUserLogin(user);
        }
      } else if (updateError) {
        if (updateError.code === 'PGRST116') {
          // No rows updated means the flag was already set by another concurrent request

        } else {
          // console.error('Failed to update notification flag:', updateError);
        }

        // Still increment login count for returning users
        await supabase
          .from('users')
          .update({
            login_count: (currentUser.login_count || 0) + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);
      }
    } catch (error) {
      // console.error('Error in checkAndHandleFirstLogin:', error);
    }
  }
}

// Export singleton instance
const notificationService = new NotificationService();

module.exports = { notificationService, NotificationService };
