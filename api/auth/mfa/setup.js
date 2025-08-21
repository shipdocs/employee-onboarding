const mfaService = require('../../../lib/mfaService');
const { requireAuth } = require('../../../lib/auth');
const { authRateLimit } = require('../../../lib/rateLimit');

/**
 * MFA Setup Endpoint
 * POST /api/auth/mfa/setup
 *
 * Initiates MFA setup for the authenticated user by generating
 * TOTP secret, QR code, and backup codes.
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

    // Check if user already has MFA configured
    const currentStatus = await mfaService.getMFAStatus(userId);
    if (currentStatus.configured && currentStatus.enabled) {
      return res.status(409).json({
        error: 'MFA is already enabled for this user',
        code: 'MFA_ALREADY_ENABLED'
      });
    }

    // Generate MFA setup data
    const setupData = await mfaService.setupMFA(userId);

    // Return setup data (QR code, backup codes, manual entry key)
    return res.status(200).json({
      success: true,
      data: {
        qrCode: setupData.qrCode,
        backupCodes: setupData.backupCodes,
        manualEntryKey: setupData.manualEntryKey,
        issuer: setupData.issuer,
        serviceName: setupData.serviceName,
        instructions: {
          step1: 'Install an authenticator app (Google Authenticator, Authy, etc.)',
          step2: 'Scan the QR code or enter the manual key',
          step3: 'Enter the 6-digit code from your app to verify setup',
          step4: 'Save your backup codes in a secure location'
        }
      }
    });

  } catch (error) {
    console.error('MFA setup error:', error);

    // Return appropriate error based on error type
    if (error.message.includes('encryption key')) {
      return res.status(500).json({
        error: 'MFA service configuration error',
        code: 'MFA_CONFIG_ERROR'
      });
    }

    return res.status(500).json({
      error: 'Failed to setup MFA',
      code: 'MFA_SETUP_FAILED'
    });
  }
}

module.exports = authRateLimit(requireAuth(handler));
