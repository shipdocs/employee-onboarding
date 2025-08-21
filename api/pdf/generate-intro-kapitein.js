// Vercel API Route: /api/pdf/generate-intro-kapitein.js
const db = require('../../lib/database-direct');
const { requireAuth } = require('../../lib/auth');
const AutomatedCertificateService = require('../../services/automated-certificate-service');
const { uploadRateLimit } = require('../../lib/rateLimit');

/**
 * API handler for generating the "Intro Kapitein" certificate
 * This endpoint triggers the certificate generation process using the AutomatedCertificateService
 *
 * - Requires authentication
 * - Managers can generate certificates for any user
 * - Crew members can only generate certificates for themselves
 * - Returns certificate ID and path on success
 */
async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authenticatedUserId = req.user.userId;
    const authenticatedUserRole = req.user.role;

    // Get targetUserId from request body or use authenticated user's ID
    let targetUserId = req.body.targetUserId || authenticatedUserId;

    // Permission check: Crew members can only generate certificates for themselves
    if (authenticatedUserRole !== 'manager' && targetUserId !== authenticatedUserId) {
      return res.status(403).json({
        error: 'Permission denied',
        message: 'Crew members can only generate certificates for themselves'
      });
    }

    // Verify target user exists
    const targetUserResult = await db.query('SELECT id, first_name, last_name, email, role FROM users WHERE id = $1', [targetUserId]);
    const targetUser = targetUserResult.rows[0];
    const userError = !targetUser;

    if (userError || !targetUser) {
      // console.error('Target user not found:', userError?.message || 'No user data returned');
      return res.status(404).json({ error: 'Target user not found' });
    }

    // Log certificate generation request

    // Generate and distribute certificate using the AutomatedCertificateService
    // Specify 'intro_kapitein' as the certificate type
    const certificateResult = await AutomatedCertificateService.generateAndDistributeCertificate(targetUserId, 'intro_kapitein');

    // Return success response with certificate details
    return res.status(200).json({
      success: true,
      message: 'Intro Kapitein certificate generated and distributed successfully',
      certificate: {
        id: certificateResult.certificateId,
        certificateNumber: certificateResult.certificateNumber,
        filename: certificateResult.filename,
        url: certificateResult.url
      },
      user: {
        id: targetUser.id,
        name: `${targetUser.first_name} ${targetUser.last_name}`,
        email: targetUser.email
      }
    });

  } catch (_error) {
    // Log the error
    // console.error('Error generating certificate:', _error);

    // Determine appropriate error response
    if (_error.message && _error.message.includes('User not found')) {
      return res.status(404).json({ error: 'User not found' });
    } else if (_error.message && _error.message.includes('No completed training')) {
      return res.status(400).json({ error: 'User has not completed required training' });
    } else if (_error.message && _error.message.includes('Permission')) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    // Generic error response
    return res.status(500).json({
      error: 'Failed to generate certificate',
      message: _error.message || 'An unexpected error occurred'
    });
  }
}

// Export the handler with authentication middleware
module.exports = uploadRateLimit(requireAuth(handler));
