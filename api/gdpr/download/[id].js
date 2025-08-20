/**
 * GDPR Self-Service API - Download Export Data
 * Allows users to download their exported data
 */

const { supabase } = require('../../../lib/supabase');
const { authenticateRequest } = require('../../../lib/auth');
const { applyApiSecurityHeaders } = require('../../../lib/securityHeaders');
const { userRateLimit } = require('../../../lib/rateLimit');

module.exports = async function handler(req, res) {
  // Apply security headers
  applyApiSecurityHeaders(res);

  // Apply rate limiting
  const rateLimitResult = await userRateLimit(req, res, { max: 10, windowMs: 60 * 60 * 1000 }); // 10 per hour
  if (!rateLimitResult.success) {
    return res.status(429).json({
      error: 'Too many download requests',
      retryAfter: rateLimitResult.retryAfter
    });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Authenticate user
    const user = await authenticateRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id: requestId } = req.query;

    if (!requestId) {
      return res.status(400).json({ error: 'Request ID is required' });
    }

    // Get export request and verify ownership
    const { data: exportRequest, error: requestError } = await supabase
      .from('data_exports')
      .select('*')
      .eq('id', requestId)
      .eq('user_id', user.id)
      .single();

    if (requestError || !exportRequest) {
      return res.status(404).json({ error: 'Export request not found' });
    }

    // Check if export is completed
    if (exportRequest.status !== 'completed') {
      return res.status(400).json({
        error: 'Export is not ready for download',
        status: exportRequest.status
      });
    }

    // Check if export has expired
    if (exportRequest.expires_at && new Date(exportRequest.expires_at) < new Date()) {
      return res.status(410).json({
        error: 'Export has expired. Please request a new export.'
      });
    }

    // Get the actual export data
    const { data: exportData, error: dataError } = await supabase
      .from('export_data')
      .select('data')
      .eq('request_id', requestId)
      .single();

    if (dataError || !exportData) {
      console.error('Error fetching export data:', dataError);
      return res.status(500).json({ error: 'Export data not found' });
    }

    // Log download event
    await supabase
      .from('audit_log')
      .insert({
        user_id: user.id,
        action: 'download_data_export',
        resource_type: 'data_export',
        resource_id: requestId,
        details: {
          fileName: exportRequest.file_name,
          fileSize: exportRequest.file_size,
          exportType: exportRequest.export_type
        },
        ip_address: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        user_agent: req.headers['user-agent']
      });

    // Update download count
    await supabase
      .from('data_exports')
      .update({
        download_count: (exportRequest.download_count || 0) + 1,
        last_downloaded_at: new Date().toISOString()
      })
      .eq('id', requestId);

    // Prepare the data for download
    const downloadData = {
      ...exportData.data,
      downloadInfo: {
        downloadedAt: new Date().toISOString(),
        downloadCount: (exportRequest.download_count || 0) + 1,
        expiresAt: exportRequest.expires_at,
        fileName: exportRequest.file_name
      }
    };

    // Set appropriate headers for file download
    const fileName = exportRequest.file_name || `data-export-${requestId}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', JSON.stringify(downloadData).length);

    // Send the data
    res.status(200).json(downloadData);

  } catch (error) {
    console.error('Download API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
