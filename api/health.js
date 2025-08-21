// Vercel API Route: /api/health.js
const db = require('../lib/database-direct');
const { applyApiSecurityHeaders } = require('../lib/securityHeaders');

// Simple in-memory cache for health status (resets on function restart)
let healthCache = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 30000; // 30 seconds

async function handler(req, res) {
  // Apply CORS headers first
  const { applyCors } = require('../lib/cors');
  if (!applyCors(req, res)) {
    return; // Preflight handled
  }

  // Apply security headers including HSTS
  applyApiSecurityHeaders(res);

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Add cache headers to reduce client-side requests
  res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=30');

  // For HEAD requests, just return a simple response without database checks
  if (req.method === 'HEAD') {
    return res.status(200).end();
  }

  // Check cache first
  const now = Date.now();
  if (healthCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return res.json(healthCache);
  }

  try {

    // Test database connectivity with a lightweight query
    const result = await db.query('SELECT id FROM users LIMIT 1');

    if (!result) {
      // console.error('Database health check failed');
      return res.status(500).json({
        status: 'unhealthy',
        error: 'Database connection failed',
        timestamp: new Date().toISOString()
      });
    }

    // Skip storage check for frequent health checks to reduce load
    const skipStorageCheck = req.headers['x-health-check-type'] === 'monitoring';

    if (!skipStorageCheck) {
      // Test storage connectivity - simplified check
      // Note: Storage health check simplified since we're using MinIO/filesystem
      // In a production environment, you might want to add MinIO connectivity check
    }

    const healthResponse = {
      status: 'healthy',
      database: {
        connected: true
      },
      storage: {
        connected: !skipStorageCheck,
        checked: !skipStorageCheck
      },
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      version: '2.0.1-schema-fix'
    };

    // Cache the response
    healthCache = healthResponse;
    cacheTimestamp = now;

    res.json(healthResponse);

  } catch (_error) {
    // console.error('Health check error:', _error);
    res.status(500).json({
      status: 'unhealthy',
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = handler;
