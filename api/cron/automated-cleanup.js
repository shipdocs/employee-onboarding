/**
 * Vercel Cron Job: Automated System Cleanup
 * Schedule: Daily at 3 AM UTC
 * Cleans up expired tokens, sessions, and old data
 */

const AutomatedCleanupService = require('../../infrastructure/maintenance/automated-cleanup');

async function handler(req, res) {
  // Verify cron secret
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers['x-cron-secret'] !== cronSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Prevent concurrent executions
  if (global.cleanupInProgress) {
    return res.status(409).json({
      error: 'Cleanup already in progress',
      status: 'conflict'
    });
  }

  global.cleanupInProgress = true;

  try {
    const cleanupService = new AutomatedCleanupService();
    const result = await cleanupService.execute();

    res.status(result.success ? 200 : 500).json({
      success: result.success,
      timestamp: new Date().toISOString(),
      metrics: result.metrics,
      duration: result.duration,
      nextRun: getNextRunTime()
    });

  } catch (_error) {
    console.error('Automated cleanup failed:', _error);
    res.status(500).json({
      success: false,
      error: 'Cleanup failed',
      details: _error.message,
      timestamp: new Date().toISOString()
    });
  } finally {
    global.cleanupInProgress = false;
  }
}

function getNextRunTime() {
  const now = new Date();
  const next = new Date(now);
  next.setUTCDate(next.getUTCDate() + 1);
  next.setUTCHours(3, 0, 0, 0);
  return next.toISOString();
}

module.exports = handler;
