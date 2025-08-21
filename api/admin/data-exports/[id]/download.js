/**
 * Data Export Download API
 * Admin interface for downloading completed data export files
 */

const { supabase } = require('../../../../lib/database-supabase-compat');
const { authenticateRequest } = require('../../../../lib/auth');
const { adminRateLimit } = require('../../../../lib/rateLimit');

const { db } = require('../../../../lib/database');

module.exports = adminRateLimit(async (req, res) => {
  try {
    // Verify admin authentication with proper blacklist checking
    const user = await authenticateRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Access token required' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'Export ID is required' });
    }

    // Get export record
    const exportRecordResult = await db.query('SELECT * FROM data_exports WHERE id = $1', [id]);
    const exportRecord = exportRecordResult.rows[0];
    const exportError = !exportRecord;

    if (exportError || !exportRecord) {
      return res.status(404).json({ error: 'Export not found' });
    }

    if (exportRecord.status !== 'completed') {
      return res.status(400).json({
        error: 'Export is not ready for download',
        status: exportRecord.status
      });
    }

    // Get export data from export_data table
    const exportDataResult = await db.query('SELECT * FROM export_data WHERE request_id = $1', [id]);
    const exportData = exportDataResult.rows[0];
    const dataError = !exportData;

    if (dataError || !exportData) {
      return res.status(404).json({ error: 'Export data not found' });
    }

    // Convert export data to JSON
    const jsonData = JSON.stringify(exportData.data, null, 2);
    const buffer = Buffer.from(jsonData, 'utf8');

    // Set headers for file download
    const fileName = exportData.file_name || `export-${id}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', buffer.length);

    // Log the download
    await supabase
      .from('audit_log')
      .insert({
        user_id: user.id,
        action: 'admin_download_data_export',
        resource_type: 'data_export',
        resource_id: id,
        details: {
          export_id: id,
          file_size: buffer.length,
          file_name: fileName,
          timestamp: new Date().toISOString()
        },
        ip_address: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        user_agent: req.headers['user-agent']
      });

    res.send(buffer);

  } catch (error) {
    console.error('Data export download error:', error);
    return res.status(500).json({
      error: 'Failed to download export file',
      details: error.message
    });
  }
});
