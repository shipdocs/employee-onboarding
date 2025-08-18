const { apiRateLimit } = require('../lib/rateLimit');

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // SECURITY: Only allow in development environment
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }

  try {
    res.json({
      status: 'success',
      message: 'API is working correctly',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      hasSupabaseUrl: !!process.env.SUPABASE_URL,
      hasSupabaseKey: !!process.env.SUPABASE_ANON_KEY,
      hasJwtSecret: !!process.env.JWT_SECRET,
      method: req.method,
      url: req.url
    });
  } catch (error) {
    console.error('Test endpoint error:', error);
    res.status(500).json({
      error: 'Test endpoint failed',
      message: error.message
    });
  }
}

// Vercel API Route: /api/test.js - Simple test endpoint
module.exports = apiRateLimit(handler);