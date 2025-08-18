// Vercel API Route: /api/admin/cleanup-tokens.js
const { requireAdmin } = require('../../lib/auth');
const { supabase } = require('../../lib/supabase');
const { adminRateLimit } = require('../../lib/rateLimit');

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Use the pre-configured supabase client

    // Call the cleanup function in the database
    const { data, error } = await supabase
      .rpc('cleanup_expired_blacklisted_tokens');

    if (error) {
      console.error('Error cleaning up tokens:', _error);
      return res.status(500).json({ error: 'Failed to cleanup tokens' });
    }

    // Get current blacklist statistics
    const { data: stats, error: _statsError } = await supabase
      .from('token_blacklist_stats')
      .select('*')
      .order('blacklist_date', { ascending: false })
      .limit(30);

    res.json({
      success: true,
      message: `Cleaned up ${data || 0} expired tokens`,
      deletedCount: data || 0,
      currentStats: stats || []
    });

  } catch (_error) {
    console.error('Token cleanup error:', _error);
    res.status(500).json({ error: 'Token cleanup failed' });
  }
}

// Require admin authentication
module.exports = adminRateLimit(requireAdmin(handler));
