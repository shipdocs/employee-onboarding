const mfaService = require('../../../lib/mfaService');
const { requireAuth } = require('../../../lib/auth');
const { authRateLimit } = require('../../../lib/rateLimit');

/**
 * MFA Backup Codes Endpoint
 * POST /api/auth/mfa/backup-codes
 *
 * Regenerates backup codes for the authenticated user.
 */
async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const userId = req.user.userId;

    // Check if MFA is available
    if (!mfaService.isMFAEnabled()) {
      return res.status(503).json({
        error: 'MFA is not available',
        code: 'MFA_DISABLED'
      });
    }

    // Check if backup codes are enabled
    if (!mfaService.areBackupCodesEnabled()) {
      return res.status(503).json({
        error: 'Backup codes are not enabled',
        code: 'BACKUP_CODES_DISABLED'
      });
    }

    // Get current MFA status to ensure user has MFA configured
    const mfaStatus = await mfaService.getMFAStatus(userId);

    if (!mfaStatus.configured) {
      return res.status(400).json({
        error: 'MFA must be configured before regenerating backup codes',
        code: 'MFA_NOT_CONFIGURED'
      });
    }

    // Get client IP for logging
    const clientIP = req.headers['x-forwarded-for'] ||
                     req.headers['x-real-ip'] ||
                     req.connection?.remoteAddress ||
                     req.socket?.remoteAddress ||
                     'unknown';

    // Regenerate backup codes
    const result = await mfaService.regenerateBackupCodes(userId, clientIP);

    if (!result.success) {
      return res.status(400).json({
        error: result.error,
        code: 'BACKUP_CODES_REGENERATION_FAILED'
      });
    }

    // Success response
    return res.status(200).json({
      success: true,
      message: 'Backup codes have been regenerated successfully',
      data: {
        backupCodes: result.backupCodes,
        count: result.backupCodes.length,
        regeneratedAt: new Date().toISOString()
      }
    });

  } catch (_error) {
    console.error('Backup codes regeneration error:', _error);

    // Return appropriate error based on error type
    if (_error.message.includes('MFA is not enabled')) {
      return res.status(503).json({
        error: 'MFA service is not available',
        code: 'MFA_SERVICE_DISABLED'
      });
    }

    if (_error.message.includes('not configured')) {
      return res.status(400).json({
        error: 'MFA is not configured for this user',
        code: 'MFA_NOT_CONFIGURED'
      });
    }

    return res.status(500).json({
      error: 'Failed to regenerate backup codes',
      code: 'BACKUP_CODES_ERROR'
    });
  }
}

module.exports = authRateLimit(requireAuth(handler));
