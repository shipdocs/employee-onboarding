const mfaService = require('../../../lib/mfaService');
const { requireAuth } = require('../../../lib/auth');
const { authRateLimit } = require('../../../lib/rateLimit');

/**
 * MFA Status Endpoint
 * GET /api/auth/mfa/status
 *
 * Returns the current MFA status for the authenticated user.
 */
async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const userId = req.user.userId;

    // Get MFA status
    const status = await mfaService.getMFAStatus(userId);

    // Get user role to determine if MFA is required
    const { data: userData, error: userError } = await require('../../../lib/supabase').supabase
      .from('users')
      .select('role, mfa_required, mfa_enforced_at')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('Error fetching user data:', userError);
      return res.status(500).json({ error: 'Failed to fetch user data' });
    }

    const isPrivilegedUser = userData.role === 'admin' || userData.role === 'manager';
    const mfaRequired = userData.mfa_required || (isPrivilegedUser && mfaService.isMFAEnforcementEnabled());

    return res.status(200).json({
      success: true,
      data: {
        ...status,
        required: mfaRequired,
        enforcedAt: userData.mfa_enforced_at,
        userRole: userData.role,
        isPrivilegedUser,
        gracePeriodDays: mfaRequired && !status.enabled ? 7 : null,
        recommendations: {
          shouldSetup: !status.configured && (mfaRequired || isPrivilegedUser),
          shouldEnable: status.configured && !status.enabled && mfaRequired,
          shouldRegenerateBackupCodes: status.enabled && status.backupCodesCount < 3
        }
      }
    });

  } catch (_error) {
    console.error('MFA status error:', _error);
    return res.status(500).json({
      error: 'Failed to get MFA status',
      code: 'MFA_STATUS_FAILED'
    });
  }
}

module.exports = authRateLimit(requireAuth(handler));
