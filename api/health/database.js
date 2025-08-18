/**
 * Database Health Check Endpoint
 * Vercel API Route: /api/health/database
 */

const { supabase } = require('../../lib/supabase');

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();
  const checks = {
    connection: false,
    read: false,
    write: false,
    performance: false
  };

  try {
    // Test 1: Basic connection
    const { error: connError } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    checks.connection = !connError;

    // Test 2: Read operation
    const { data: readData, error: readError } = await supabase
      .from('application_settings')
      .select('key, value')
      .eq('key', 'system_health_check')
      .single();

    checks.read = !readError || readError.code === 'PGRST116'; // No rows is OK

    // Test 3: Write operation (update health check timestamp)
    const { error: writeError } = await supabase
      .from('application_settings')
      .upsert({
        key: 'system_health_check',
        value: new Date().toISOString(),
        category: 'monitoring',
        updated_at: new Date().toISOString()
      });

    checks.write = !writeError;

    // Test 4: Performance check (complex query)
    const perfStart = Date.now();
    const { error: perfError } = await supabase
      .from('users')
      .select(`
        id,
        crews!inner(id),
        manager_permissions!inner(id)
      `)
      .limit(10);

    const queryTime = Date.now() - perfStart;
    checks.performance = !perfError && queryTime < 1000; // Under 1 second

    const responseTime = Date.now() - startTime;
    const allChecks = Object.values(checks).every(check => check === true);

    res.status(allChecks ? 200 : 503).json({
      status: allChecks ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      responseTime,
      checks,
      details: {
        queryPerformance: `${queryTime}ms`,
        databaseUrl: process.env.SUPABASE_URL ? 'configured' : 'missing'
      }
    });

  } catch (_error) {
    console.error('Database health check error:', _error);
    res.status(503).json({
      status: 'unhealthy',
      error: 'Database check failed',
      details: _error.message,
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime,
      checks
    });
  }
}

module.exports = handler;
