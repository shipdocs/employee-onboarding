// api/admin/security/file-quarantine.js - Quarantined files management
const { requireAdmin } = require('../../../lib/auth');
const { adminRateLimit } = require('../../../lib/rateLimit');
const SecureFileProcessor = require('../../../lib/security/SecureFileProcessor');
const MalwareScanner = require('../../../lib/security/MalwareScanner');

const fileProcessor = new SecureFileProcessor();
const malwareScanner = new MalwareScanner();

async function handler(req, res) {
  if (req.method === 'GET') {
    return await getQuarantinedFiles(req, res);
  } else if (req.method === 'DELETE') {
    return await cleanupQuarantine(req, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function getQuarantinedFiles(req, res) {
  try {
    const { limit = 50, type = 'all' } = req.query;

    // Get quarantined files from file processor
    const quarantinedFiles = await fileProcessor.getQuarantinedFiles();
    
    // Get malware scanner statistics
    const scannerStats = malwareScanner.getStatistics();

    // Filter by type if specified
    let filteredFiles = quarantinedFiles;
    if (type !== 'all') {
      filteredFiles = quarantinedFiles.filter(file => 
        file.analysis?.threats?.some(threat => threat.includes(type))
      );
    }

    // Limit results
    const limitedFiles = filteredFiles.slice(0, parseInt(limit));

    res.json({
      success: true,
      quarantinedFiles: limitedFiles,
      summary: {
        total: quarantinedFiles.length,
        filtered: filteredFiles.length,
        returned: limitedFiles.length,
        scannerStats: scannerStats
      },
      categories: {
        malware: quarantinedFiles.filter(f => f.analysis?.threats?.includes('malicious_content')).length,
        suspicious: quarantinedFiles.filter(f => f.analysis?.threats?.includes('suspicious_behavior')).length,
        polyglot: quarantinedFiles.filter(f => f.analysis?.threats?.includes('polyglot_file')).length,
        executable: quarantinedFiles.filter(f => f.analysis?.threats?.includes('embedded_executable')).length
      }
    });

  } catch (error) {
    console.error('Get quarantined files error:', error);
    res.status(500).json({
      error: 'Failed to retrieve quarantined files',
      details: error.message
    });
  }
}

async function cleanupQuarantine(req, res) {
  try {
    const { retentionDays = 30, confirm } = req.query;

    if (confirm !== 'true') {
      return res.status(400).json({
        error: 'Cleanup requires confirmation',
        message: 'Add ?confirm=true to proceed with cleanup'
      });
    }

    // Cleanup file processor quarantine
    const fileCleanup = await fileProcessor.cleanupQuarantine(parseInt(retentionDays));
    
    res.json({
      success: true,
      cleanup: {
        filesRemoved: fileCleanup.cleanedCount,
        retentionDays: parseInt(retentionDays),
        cleanupTime: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Quarantine cleanup error:', error);
    res.status(500).json({
      error: 'Failed to cleanup quarantine',
      details: error.message
    });
  }
}

module.exports = adminRateLimit(requireAdmin(handler));