const { supabase } = require('../../lib/database-supabase-compat');
const { authenticateRequest } = require('../../lib/auth.js');
const { apiRateLimit } = require('../../lib/rateLimit');
async function handler(req, res) {
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

    // Try to query the training_phases table

    const { error } = await supabase
      .from('training_phases')
      .select('id')
      .limit(1);

    if (error && error.code === '42P01') {
      // Table doesn't exist

      return res.status(200).json({
        migrationNeeded: true,
        message: 'Content management tables not found. Please run migration 20250602000002_content_management_system.sql'
      });
    }

    if (error) {
      // console.error('❌ [DB] Error checking migration status:', _error);
      return res.status(500).json({ error: 'Failed to check migration status' });
    }

    return res.status(200).json({
      migrationNeeded: false,
      message: 'Content management tables are ready'
    });

  } catch (_error) {
    // console.error('❌ [ERROR] Critical error in check-migration:', _error);
    // console.error('❌ [ERROR] Stack trace:', error.stack);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Export handler
module.exports = apiRateLimit(handler);
