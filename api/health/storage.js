/**
 * Storage Health Check Endpoint
 * Vercel API Route: /api/health/storage
 */

const { supabase } = require('../../lib/supabase');

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();
  const checks = {
    listBuckets: false,
    readFile: false,
    writeFile: false,
    deleteFile: false
  };

  try {
    // Test 1: List buckets
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    checks.listBuckets = !listError && Array.isArray(buckets);

    if (checks.listBuckets && buckets.length > 0) {
      const testBucket = buckets[0].name;
      const testFileName = `health-check-${Date.now()}.txt`;
      const testContent = `Health check at ${new Date().toISOString()}`;

      // Test 2: Write file
      const { error: uploadError } = await supabase.storage
        .from(testBucket)
        .upload(testFileName, testContent, {
          contentType: 'text/plain',
          cacheControl: '3600'
        });

      checks.writeFile = !uploadError;

      if (checks.writeFile) {
        // Test 3: Read file
        const { data: downloadData, error: downloadError } = await supabase.storage
          .from(testBucket)
          .download(testFileName);

        checks.readFile = !downloadError && downloadData !== null;

        // Test 4: Delete file
        const { error: deleteError } = await supabase.storage
          .from(testBucket)
          .remove([testFileName]);

        checks.deleteFile = !deleteError;
      }
    }

    const responseTime = Date.now() - startTime;
    const allChecks = Object.values(checks).every(check => check === true);

    res.status(allChecks ? 200 : 503).json({
      status: allChecks ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      responseTime,
      checks,
      details: {
        bucketsFound: buckets?.length || 0,
        storageUrl: process.env.SUPABASE_URL ? 'configured' : 'missing'
      }
    });

  } catch (_error) {
    console.error('Storage health check error:', _error);
    res.status(503).json({
      status: 'unhealthy',
      error: 'Storage check failed',
      details: _error.message,
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime,
      checks
    });
  }
}

module.exports = handler;
