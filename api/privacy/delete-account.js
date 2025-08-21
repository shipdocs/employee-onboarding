/**
 * Account Deletion API Endpoint
 * DELETE /api/privacy/delete-account - GDPR-compliant account deletion
 *
 * Body parameters:
 * - userId: User ID to delete (optional, defaults to requesting user)
 * - confirmDeletion: Must be true to proceed
 * - reason: Reason for deletion (gdpr_request, user_request, admin_action)
 * - verificationCode: MFA code or password for verification
 */

const { requireAuth } = require('../../lib/auth');
const accountDeletionService = require('../../lib/services/accountDeletionService');
const db = require('../../lib/database');
const bcrypt = require('bcrypt');
const mfaService = require('../../lib/mfaService');
const { apiRateLimit } = require('../../lib/rateLimit');

async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, confirmDeletion, reason = 'user_request', verificationCode } = req.body;
    const requestingUser = req.user;

    // Determine target user
    const targetUserId = userId || requestingUser.userId;
    const isSelfDeletion = targetUserId === requestingUser.userId;

    // Validation
    if (!confirmDeletion) {
      return res.status(400).json({
        error: 'Deletion must be explicitly confirmed',
        requiresConfirmation: true,
        warning: 'This action is irreversible. All data will be permanently deleted.'
      });
    }

    if (!verificationCode) {
      return res.status(400).json({
        error: 'Verification required',
        requiresVerification: true,
        verificationMethod: 'Please provide your password or MFA code'
      });
    }

    // Permission checks
    if (!isSelfDeletion) {
      // Only admins can delete other users
      if (requestingUser.role !== 'admin') {
        return res.status(403).json({
          error: 'Insufficient permissions. Only administrators can delete other user accounts.'
        });
      }

      // Admin must provide their own verification
      const adminVerified = await verifyUserCredentials(requestingUser.userId, verificationCode);
      if (!adminVerified) {
        return res.status(401).json({
          error: 'Invalid verification code. Please enter your password or MFA code.'
        });
      }
    } else {
      // User deleting their own account - verify their credentials
      const userVerified = await verifyUserCredentials(targetUserId, verificationCode);
      if (!userVerified) {
        return res.status(401).json({
          error: 'Invalid verification code. Please enter your password or MFA code.'
        });
      }
    }

    // Check if user exists
    const targetUserResult = await db.query('SELECT id, email, first_name, last_name, role FROM users WHERE id = $1', [targetUserId]);
    const targetUser = targetUserResult.rows[0];
    const userError = !targetUser;

    if (userError || !targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent deletion of last admin
    if (targetUser.role === 'admin') {
      const { count } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'admin')
        .eq('is_active', true);

      if (count <= 1) {
        return res.status(400).json({
          error: 'Cannot delete the last administrator account',
          code: 'LAST_ADMIN_PROTECTION'
        });
      }
    }

    // Log deletion request
    await supabase
      .from('audit_log')
      .insert({
        user_id: requestingUser.userId,
        action: 'initiate_account_deletion',
        resource_type: 'user_account',
        resource_id: targetUserId,
        details: {
          target_email: targetUser.email,
          reason: reason,
          self_deletion: isSelfDeletion
        }
      });

    // Perform deletion
    const deletionResult = await accountDeletionService.deleteUserAccount(
      targetUserId,
      requestingUser.userId,
      reason,
      true // confirmDeletion already validated above
    );

    if (!deletionResult.success) {
      return res.status(500).json({
        error: deletionResult.error || 'Account deletion failed',
        deletion_id: deletionResult.deletion_id
      });
    }

    // If self-deletion, invalidate current session
    if (isSelfDeletion) {
      // The user's token will become invalid after deletion
      res.setHeader('X-Auth-Invalidated', 'true');
    }

    // Return success with deletion certificate
    return res.status(200).json({
      success: true,
      message: 'Account successfully deleted in compliance with GDPR Article 17',
      deletion_id: deletionResult.deletion_id,
      certificate: deletionResult.certificate,
      gdpr_compliance: {
        article: 'Article 17 - Right to erasure',
        data_categories_deleted: deletionResult.certificate.data_categories_deleted,
        retention_exceptions: deletionResult.certificate.retention_exceptions,
        completed_at: deletionResult.certificate.completed_at
      }
    });

  } catch (error) {
    console.error('Account deletion error:', error);
    return res.status(500).json({
      error: 'Account deletion failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * Verify user credentials (password or MFA code)
 */
async function verifyUserCredentials(userId, verificationCode) {
  try {
    // First, try MFA verification
    const { data: mfaSettings } = await supabase
      .from('user_mfa_settings')
      .select('enabled')
      .eq('user_id', userId)
      .single();

    if (mfaSettings?.enabled) {
      // Try MFA code verification
      const mfaResult = await mfaService.verifyTOTP(userId, verificationCode);
      if (mfaResult.success) {
        return true;
      }
    }

    // If MFA fails or not enabled, try password verification
    const { data: user } = await supabase
      .from('users')
      .select('password_hash')
      .eq('id', userId)
      .single();

    if (user?.password_hash) {
      const passwordValid = await bcrypt.compare(verificationCode, user.password_hash);
      return passwordValid;
    }

    return false;
  } catch (error) {
    console.error('Credential verification error:', error);
    return false;
  }
}

module.exports = apiRateLimit(requireAuth(handler));
