/**
 * API endpoint for managing a specific certificate
 * GET /api/manager/certificates/[id] - Get certificate details
 * PUT /api/manager/certificates/[id] - Update certificate
 * DELETE /api/manager/certificates/[id] - Delete certificate
 *
 * This endpoint allows managers to view, update, or delete a specific certificate
 */

const db = require('../../../lib/database');
const { requireManager } = require('../../../lib/auth');
const { StorageService } = require('../../../lib/storage');
const { adminRateLimit } = require('../../../lib/rateLimit');

module.exports = adminRateLimit(requireManager(async (req, res) => {
  try {

    // Get certificate ID from the URL
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'Certificate ID is required' });
    }

    // Handle different HTTP methods
    switch (req.method) {
      case 'GET':
        return await getCertificate(id, res);
      case 'PUT':
        return await updateCertificate(id, req.body, res);
      case 'DELETE':
        return await deleteCertificate(id, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    // console.error(`Error in certificate [${req.query.id}] endpoint:`, error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}));

/**
 * Get certificate details by ID
 * @param {string} id - Certificate ID
 * @param {object} res - Response object
 */
async function getCertificate(id, res) {
  // Fetch certificate with user details
  const { data: certificate, error } = await supabase
    .from('certificates')
    .select(`
      *,
      users:user_id (
        id,
        first_name,
        last_name,
        email,
        position,
        vessel_assignment
      )
    `)
    .eq('id', id)
    .single();

  if (error) {
    // console.error('Error fetching certificate:', error);
    return res.status(500).json({ error: 'Failed to fetch certificate' });
  }

  if (!certificate) {
    return res.status(404).json({ error: 'Certificate not found' });
  }

  // Get the certificate file URL if it exists
  let fileUrl = null;
  if (certificate.pdf_url) {
    try {
      fileUrl = await StorageService.getFileUrl('certificates', certificate.pdf_url);
    } catch (error) {

      // Continue without the URL
    }
  }

  // Return the certificate with file URL
  return res.status(200).json({
    ...certificate,
    file_url: fileUrl
  });
}

/**
 * Update certificate details
 * @param {string} id - Certificate ID
 * @param {object} data - Updated certificate data
 * @param {object} res - Response object
 */
async function updateCertificate(id, data, res) {
  // Validate required fields
  if (!data) {
    return res.status(400).json({ error: 'No update data provided' });
  }

  // Extract allowed fields to update
  const {
    certificate_type,
    issued_at,
    expires_at,
    certificate_data,
    pdf_url
  } = data;

  // Build update object with only provided fields
  const updateData = {};
  if (certificate_type !== undefined) updateData.certificate_type = certificate_type;
  if (issued_at !== undefined) updateData.issued_at = issued_at;
  if (expires_at !== undefined) updateData.expires_at = expires_at;
  if (certificate_data !== undefined) updateData.certificate_data = certificate_data;
  if (pdf_url !== undefined) updateData.pdf_url = pdf_url;

  // Update the certificate
  const { data: updatedCertificate, error } = await supabase
    .from('certificates')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    // console.error('Error updating certificate:', error);
    return res.status(500).json({ error: 'Failed to update certificate' });
  }

  // Log the update

  return res.status(200).json(updatedCertificate);
}

/**
 * Delete a certificate
 * @param {string} id - Certificate ID
 * @param {object} res - Response object
 */
async function deleteCertificate(id, res) {
  // First, get the certificate to check if it has a file to delete
  const certificateResult = await db.query('SELECT pdf_url FROM certificates WHERE id = $1', [id]);
    const certificate = certificateResult.rows[0];
    const fetchError = !certificate;

  if (fetchError) {
    // console.error('Error fetching certificate for deletion:', fetchError);
    return res.status(500).json({ error: 'Failed to fetch certificate for deletion' });
  }

  if (!certificate) {
    return res.status(404).json({ error: 'Certificate not found' });
  }

  // Delete the certificate file from storage if it exists
  if (certificate.pdf_url) {
    try {
      await StorageService.deleteFile('certificates', certificate.pdf_url);

    } catch (storageError) {

      // Continue with deletion even if file removal fails
    }
  }

  // Delete the certificate record
  const { error: deleteError } = await supabase
    .from('certificates')
    .delete()
    .eq('id', id);

  if (deleteError) {
    // console.error('Error deleting certificate:', deleteError);
    return res.status(500).json({ error: 'Failed to delete certificate' });
  }

  // Log the deletion

  return res.status(200).json({ success: true, message: 'Certificate deleted successfully' });
}
