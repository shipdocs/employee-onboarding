// Test endpoint to check database connection
const db = require('../../lib/database-direct');
const { supabase } = require('../../lib/database-supabase-compat');
const { apiRateLimit } = require('../../lib/rateLimit');

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Simple database query to test connection
    const { data, error } = await supabase
      .from('users')
      .select('id, email, role')
      .limit(1);

    if (error) {
      console.error('Database connection error:', _error);
      return res.status(500).json({
        error: 'Database connection failed',
        details: _error.message
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Database connection working',
      userCount: data ? data.length : 0
    });

  } catch (_error) {
    console.error('Test endpoint error:', _error);
    return res.status(500).json({
      error: 'Test failed',
      details: _error.message
    });
  }
}

module.exports = apiRateLimit(handler);
