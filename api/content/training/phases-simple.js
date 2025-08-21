const db = require('../../../lib/database-direct');
const { requireManagerOrAdmin } = require('../../../lib/auth');
const { apiRateLimit } = require('../../../lib/rateLimit');
async function handler(req, res) {
  try {

    if (req.method === 'GET') {

      // Get all training phases
      const { data: phases, error } = await supabase
        .from('training_phases')
        .select('*')
        .order('phase_number', { ascending: true });

      if (error) {
        // console.error('❌ [DB] Error fetching training phases:', _error);
        if (error.code === '42P01') {

          return res.status(200).json([]);
        }
        return res.status(500).json({ error: 'Failed to fetch training phases' });
      }

      return res.status(200).json(phases || []);
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (_error) {
    // console.error('❌ [ERROR] Critical error in phases-simple:', _error);
    return res.status(500).json({ error: 'Internal server error', details: _error.message });
  }
}

// Export with authentication wrapper - this is the pattern that works
module.exports = apiRateLimit(requireManagerOrAdmin(handler));
