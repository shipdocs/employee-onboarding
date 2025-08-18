/**
 * Authentication Service Health Check Endpoint
 * Vercel API Route: /api/health/auth
 */

const { verifyJWT, generateJWT } = require('../../lib/auth');
const { supabase } = require('../../lib/supabase');

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();
  const checks = {
    jwtSecret: false,
    tokenGeneration: false,
    tokenVerification: false,
    blacklistCheck: false
  };

  try {
    // Test 1: Check JWT secret configuration
    checks.jwtSecret = !!process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32;

    if (checks.jwtSecret) {
      // Test 2: Generate test token
      try {
        const testToken = generateJWT({
          userId: 'health-check-test',
          email: 'health@test.com',
          role: 'test',
          purpose: 'health-check'
        });
        checks.tokenGeneration = !!testToken;

        // Test 3: Verify test token
        if (testToken) {
          const decoded = verifyJWT(testToken);
          checks.tokenVerification = decoded && decoded.userId === 'health-check-test';
        }
      } catch (tokenError) {
        console.error('Token test failed:', tokenError);
      }

      // Test 4: Check blacklist functionality
      try {
        const { error } = await supabase
          .from('token_blacklist')
          .select('count')
          .limit(1);

        checks.blacklistCheck = !error;
      } catch (blacklistError) {
        console.error('Blacklist check failed:', blacklistError);
      }
    }

    const responseTime = Date.now() - startTime;
    const allChecks = Object.values(checks).every(check => check === true);

    res.status(allChecks ? 200 : 503).json({
      status: allChecks ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      responseTime,
      checks,
      details: {
        jwtSecretLength: process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0,
        minimumRequired: 32
      }
    });

  } catch (_error) {
    console.error('Auth health check error:', _error);
    res.status(503).json({
      status: 'unhealthy',
      error: 'Authentication check failed',
      details: _error.message,
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime,
      checks
    });
  }
}

module.exports = handler;
