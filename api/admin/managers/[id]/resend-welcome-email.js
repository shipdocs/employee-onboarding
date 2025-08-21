// Vercel API Route: /api/admin/managers/[id]/resend-welcome-email.js - Resend welcome email to manager
const { supabase } = require('../../../../lib/database-supabase-compat');
const { requireAdmin } = require('../../../../lib/auth');
const { unifiedEmailService } = require('../../../../lib/unifiedEmailService');
const bcrypt = require('bcrypt');

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'Manager ID is required' });
    }

    // Get manager details with current settings
    const { data: manager, error: managerError } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .eq('role', 'manager')
      .single();

    if (managerError || !manager) {
      return res.status(404).json({ error: 'Manager not found' });
    }

    // Check if manager is active
    if (!manager.is_active) {
      return res.status(400).json({ error: 'Cannot send welcome email to inactive manager' });
    }

    // Generate a secure temporary password using enhanced password validator
    const EnhancedPasswordValidator = require('../../../../lib/security/EnhancedPasswordValidator');
    const PasswordHistoryService = require('../../../../lib/security/PasswordHistoryService');

    const passwordValidator = new EnhancedPasswordValidator();
    const suggestions = passwordValidator.generateSuggestions(16);
    const newPassword = suggestions[0]; // Use the first generated suggestion

    // Validate the generated password (should always pass)
    const userInfo = {
      firstName: manager.first_name,
      lastName: manager.last_name,
      email: manager.email,
      username: manager.email.split('@')[0]
    };

    const passwordValidation = passwordValidator.validate(newPassword, {
      userInfo,
      minStrengthLevel: 'good'
    });

    if (!passwordValidation.valid) {
      console.error('Generated password failed validation:', passwordValidation.error);
      return res.status(500).json({ error: 'Failed to generate secure password' });
    }

    // Check password history to ensure uniqueness
    const passwordHistoryService = new PasswordHistoryService();
    const historyValidation = await passwordHistoryService.validatePasswordHistory(
      id,
      newPassword,
      { checkLastN: 12 }
    );

    if (!historyValidation.valid) {
      // If generated password conflicts with history, try another suggestion
      const alternativePassword = suggestions[1] || passwordValidator.generateSuggestions(18)[0];
      const altValidation = await passwordHistoryService.validatePasswordHistory(
        id,
        alternativePassword,
        { checkLastN: 12 }
      );

      if (!altValidation.valid) {
        console.error('Unable to generate unique password for manager');
        return res.status(500).json({ error: 'Failed to generate unique password' });
      }

      newPassword = alternativePassword;
    }

    // Hash the new password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update manager's password in database
    const { error: passwordError } = await supabase
      .from('users')
      .update({
        password_hash: passwordHash
        // Note: Removed first_login update as it doesn't exist in schema
      })
      .eq('id', id);

    if (passwordError) {
      // console.error('Error updating manager password:', passwordError);
      return res.status(500).json({ error: 'Failed to generate new password' });
    }

    // Add password to history
    const historyResult = await passwordHistoryService.addPasswordToHistory(
      id,
      newPassword,
      req
    );

    if (!historyResult.success) {
      console.error('Failed to add password to history:', historyResult.error);
      // Don't fail the operation, just log the error
    }

    // Generate and store magic link token
    const { generateMagicToken } = require('../../../../lib/auth');
    const token = generateMagicToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 3); // 3 hours from now

    // Store magic link in database
    const { error: linkError } = await supabase
      .from('magic_links')
      .insert({
        email: manager.email,
        token,
        expires_at: expiresAt.toISOString()
      });

    if (linkError) {
      // console.error('Error creating magic link:', linkError);
      // Continue anyway - password is already set
    }

    // Send welcome email with current language preference and new password
    try {

      const emailResult = await unifiedEmailService.sendManagerWelcomeEmailWithToken(
        manager,
        newPassword,
        token,
        manager.preferred_language || 'en'
      );

    } catch (emailError) {
      // console.error('📧 [ERROR] Failed to send welcome email:', emailError);
      return res.status(500).json({ error: 'Failed to send welcome email' });
    }

    // Log email notification
    await supabase
      .from('email_notifications')
      .insert({
        user_id: manager.id,
        email_type: 'manager_welcome_resend',
        subject: 'Welcome to Maritime Onboarding System - Manager Account Created',
        status: 'sent'
      });

    // Log admin action
    await supabase
      .from('audit_log')
      .insert({
        user_id: req.user.userId,
        action: 'resend_manager_welcome_email',
        resource_type: 'manager_management',
        resource_id: manager.id.toString(),
        details: {
          manager_email: manager.email,
          manager_name: `${manager.first_name} ${manager.last_name}`,
          language: manager.preferred_language || 'en',
          new_password_generated: true
        }
      });

    res.json({
      message: 'Manager welcome email resent successfully',
      manager: {
        id: manager.id,
        email: manager.email,
        firstName: manager.first_name,
        lastName: manager.last_name,
        language: manager.preferred_language || 'en'
      },
      emailDetails: {
        type: 'manager_welcome_resend',
        language: manager.preferred_language || 'en',
        newPasswordGenerated: true
      }
    });

  } catch (error) {
    // console.error('Error resending manager welcome email:', error);
    res.status(500).json({ error: 'Failed to resend welcome email' });
  }
}

const { adminRateLimit } = require('../../../../lib/rateLimit');

module.exports = adminRateLimit(requireAdmin(handler));
