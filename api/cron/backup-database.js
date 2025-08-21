/**
 * Vercel Cron Job: Database Backup
 * Schedule: Daily at 2 AM UTC
 * Performs automated database backups
 */

const BackupService = require('../../infrastructure/backup/backup-service');

async function handler(req, res) {
  // Verify cron secret
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers['x-cron-secret'] !== cronSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Prevent concurrent backups
  if (global.backupInProgress) {
    return res.status(409).json({
      error: 'Backup already in progress',
      status: 'conflict'
    });
  }

  global.backupInProgress = true;

  try {
    const backupService = new BackupService();

    // Determine backup type based on day of week
    const dayOfWeek = new Date().getUTCDay();
    const backupType = dayOfWeek === 0 ? 'full' : 'incremental'; // Full backup on Sundays

    // Perform backup
    const result = await backupService.backupDatabase(backupType);

    // Clean old backups
    if (dayOfWeek === 0) {
      await backupService.cleanOldBackups();
    }

    res.json({
      success: true,
      backupId: result.backupId,
      type: backupType,
      timestamp: new Date().toISOString(),
      metadata: result.metadata,
      nextRun: getNextRunTime()
    });

  } catch (error) {
    console.error('Database backup failed:', error);
    res.status(500).json({
      success: false,
      error: 'Backup failed',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  } finally {
    global.backupInProgress = false;
  }
}

function getNextRunTime() {
  const now = new Date();
  const next = new Date(now);
  next.setUTCDate(next.getUTCDate() + 1);
  next.setUTCHours(2, 0, 0, 0);
  return next.toISOString();
}

module.exports = handler;
