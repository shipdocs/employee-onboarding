/**
 * API endpoint for regenerating a certificate
 * POST /api/manager/certificates/regenerate
 *
 * This endpoint allows managers to regenerate a certificate for a user
 * using the AutomatedCertificateService
 */

const { supabase } = require('../../../lib/supabase');
const { requireManager } = require('../../../lib/auth');
const automatedCertificateService = require('../../../services/automated-certificate-service');
const { adminRateLimit } = require('../../../lib/rateLimit');

module.exports = adminRateLimit(requireManager(async (req, res) => {
  try {

    // Only allow POST method
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Get request body
    const { userId, certificateType, certificateId } = req.body;

    // Validate required fields
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Check if the user exists
    const { data: targetUser, error: userError } = await supabase
      .from('users')
      .select('id, first_name, last_name, email')
      .eq('id', userId)
      .single();

    if (userError || !targetUser) {
      // console.error('Error fetching user:', userError);
      return res.status(404).json({ error: 'User not found' });
    }

    // If certificateId is provided, check if it exists and belongs to the user
    if (certificateId) {
      const { data: existingCertificate, error: certError } = await supabase
        .from('certificates')
        .select('id, certificate_type')
        .eq('id', certificateId)
        .eq('user_id', userId)
        .single();

      if (certError || !existingCertificate) {
        // console.error('Error fetching certificate:', certError);
        return res.status(404).json({ error: 'Certificate not found or does not belong to the user' });
      }
    }

    // Log the regeneration request

    // Use the AutomatedCertificateService to regenerate the certificate
    const result = await automatedCertificateService.generateAndDistributeCertificate(
      userId,
      certificateType || 'standard'
    );

    // If an existing certificate was specified, mark it as replaced
    if (certificateId) {
      const { error: updateError } = await supabase
        .from('certificates')
        .update({
          metadata: {
            ...existingCertificate.metadata,
            replaced_by: result.certificateId,
            replaced_at: new Date().toISOString()
          }
        })
        .eq('id', certificateId);

      if (updateError) {

        // Continue even if update fails
      }
    }

    // Log the successful regeneration

    // Return the result
    return res.status(200).json({
      success: true,
      message: 'Certificate regenerated successfully',
      certificate: {
        id: result.certificateId,
        certificateNumber: result.certificateNumber,
        url: result.url,
        filename: result.filename
      }
    });

  } catch (_error) {
    // console.error('Error in certificate regeneration endpoint:', _error);
    return res.status(500).json({
      error: 'Failed to regenerate certificate',
      message: _error.message
    });
  }
}));
