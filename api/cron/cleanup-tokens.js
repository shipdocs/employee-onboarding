// Vercel Cron Job: /api/cron/cleanup-tokens.js
// This endpoint should be called by a cron job service (e.g., Vercel Cron, GitHub Actions, etc.)
// Recommended schedule: Daily at 3 AM UTC

const { createClient } = require('../../lib/supabase');

async function handler(req, res) {
  // Verify cron secret if provided
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers['x-cron-secret'] !== cronSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Use service role for cron job
    const supabase = createClient(true);

    // Call the cleanup function in the database
    const { data, error } = await supabase
      .rpc('cleanup_expired_blacklisted_tokens');

    if (error) {
      console.error('Error cleaning up tokens:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to cleanup tokens',
        details: error.message
      });
    }

    // Log cleanup results
    console.log(`Token cleanup completed: ${data || 0} tokens removed`);

    res.json({
      success: true,
      message: `Cleaned up ${data || 0} expired tokens`,
      deletedCount: data || 0,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Token cleanup error:', error);
    res.status(500).json({
      success: false,
      error: 'Token cleanup failed',
      details: error.message
    });
  }
}

module.exports = handler;
