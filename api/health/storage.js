/**
 * Storage Health Check Endpoint
 * Vercel API Route: /api/health/storage
 */

const db = require('../../lib/database');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();
  const checks = {
    tempDirectory: false,
    writeFile: false,
    readFile: false,
    deleteFile: false,
    databaseConnection: false
  };

  try {
    // Test 1: Check temp directory access
    const tempDir = os.tmpdir();
    try {
      await fs.access(tempDir, fs.constants.W_OK | fs.constants.R_OK);
      checks.tempDirectory = true;
    } catch (error) {
      console.error('Temp directory access failed:', error);
    }

    if (checks.tempDirectory) {
      const testFileName = `health-check-${Date.now()}.txt`;
      const testFilePath = path.join(tempDir, testFileName);
      const testContent = `Health check at ${new Date().toISOString()}`;

      // Test 2: Write file
      try {
        await fs.writeFile(testFilePath, testContent, 'utf8');
        checks.writeFile = true;
      } catch (error) {
        console.error('Write file failed:', error);
      }

      if (checks.writeFile) {
        // Test 3: Read file
        try {
          const readContent = await fs.readFile(testFilePath, 'utf8');
          checks.readFile = readContent === testContent;
        } catch (error) {
          console.error('Read file failed:', error);
        }

        // Test 4: Delete file
        try {
          await fs.unlink(testFilePath);
          checks.deleteFile = true;
        } catch (error) {
          console.error('Delete file failed:', error);
        }
      }
    }

    // Test 5: Database connection
    try {
      const result = await db.query('SELECT 1 as test');
      checks.databaseConnection = result.rows && result.rows[0]?.test === 1;
    } catch (error) {
      console.error('Database check failed:', error);
    }

    const responseTime = Date.now() - startTime;
    const allChecks = Object.values(checks).every(check => check === true);

    res.status(allChecks ? 200 : 503).json({
      status: allChecks ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      responseTime,
      checks,
      details: {
        tempDirectory: tempDir,
        nodeVersion: process.version,
        platform: process.platform
      }
    });

  } catch (error) {
    console.error('Storage health check error:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: 'Storage check failed',
      details: error.message,
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime,
      checks
    });
  }
}

module.exports = handler;