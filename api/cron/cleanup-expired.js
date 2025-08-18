// Vercel Cron Job: /api/cron/cleanup-expired.js - Clean up expired data and files
const { supabase } = require('../../lib/supabase');

async function handler(req, res) {
  // Verify this is a cron request
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000)).toISOString();
    const oneWeekAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000)).toISOString();
    const oneMonthAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000)).toISOString();

    let cleanupStats = {
      expiredMagicLinks: 0,
      oldEmailNotifications: 0,
      orphanedFiles: 0,
      expiredSessions: 0,
      errors: 0
    };

    // 1. Clean up expired magic links

    try {
      const { data: expiredLinks, error: selectError } = await supabase
        .from('magic_links')
        .select('id')
        .lt('expires_at', now.toISOString());

      if (selectError) {
        throw selectError;
      }

      if (expiredLinks && expiredLinks.length > 0) {
        const { error: deleteError } = await supabase
          .from('magic_links')
          .delete()
          .lt('expires_at', now.toISOString());

        if (deleteError) {
          throw deleteError;
        }

        cleanupStats.expiredMagicLinks = expiredLinks.length;

      } else {

      }
    } catch (_error) {
      cleanupStats.errors++;
      // console.error('❌ Error cleaning up magic links:', _error.message);
    }

    // 2. Clean up old email notifications (keep last 30 days)

    try {
      const { data: oldNotifications, error: selectError } = await supabase
        .from('email_notifications')
        .select('id')
        .lt('created_at', oneMonthAgo);

      if (selectError) {
        throw selectError;
      }

      if (oldNotifications && oldNotifications.length > 0) {
        const { error: deleteError } = await supabase
          .from('email_notifications')
          .delete()
          .lt('created_at', oneMonthAgo);

        if (deleteError) {
          throw deleteError;
        }

        cleanupStats.oldEmailNotifications = oldNotifications.length;

      } else {

      }
    } catch (_error) {
      cleanupStats.errors++;
      // console.error('❌ Error cleaning up email notifications:', _error.message);
    }

    // 3. Clean up expired quiz randomization sessions (older than 1 day)

    try {
      const { data: expiredSessions, error: selectError } = await supabase
        .from('quiz_randomization_sessions')
        .select('id')
        .lt('created_at', oneDayAgo);

      if (selectError) {
        throw selectError;
      }

      if (expiredSessions && expiredSessions.length > 0) {
        const { error: deleteError } = await supabase
          .from('quiz_randomization_sessions')
          .delete()
          .lt('created_at', oneDayAgo);

        if (deleteError) {
          throw deleteError;
        }

        cleanupStats.expiredSessions = expiredSessions.length;

      } else {

      }
    } catch (_error) {
      cleanupStats.errors++;
      // console.error('❌ Error cleaning up quiz sessions:', _error.message);
    }

    // 4. Clean up orphaned files (files not referenced in database)

    try {
      // Get all file references from database
      const { data: fileUploads, error: uploadsError } = await supabase
        .from('file_uploads')
        .select('file_path');

      const { data: certificates, error: certsError } = await supabase
        .from('certificates')
        .select('file_path');

      if (uploadsError || certsError) {
        throw new Error('Failed to fetch file references from database');
      }

      const referencedFiles = new Set();

      // Collect all referenced file paths
      fileUploads?.forEach(upload => {
        if (upload.file_path) referencedFiles.add(upload.file_path);
      });

      certificates?.forEach(cert => {
        if (cert.file_path) referencedFiles.add(cert.file_path);
      });

      // Check each storage bucket for orphaned files
      const buckets = ['training-photos', 'certificates', 'documents'];
      let totalOrphanedFiles = 0;

      for (const bucketName of buckets) {
        try {
          const { data: files, error: listError } = await supabase.storage
            .from(bucketName)
            .list('', {
              limit: 1000,
              sortBy: { column: 'created_at', order: 'asc' }
            });

          if (listError) {
            // console.error(`❌ Error listing files in ${bucketName}:`, listError.message);
            continue;
          }

          if (!files || files.length === 0) {

            continue;
          }

          // Find orphaned files (older than 1 week and not referenced)
          const orphanedFiles = files.filter(file => {
            const fileAge = new Date(file.created_at);
            const isOld = fileAge < new Date(oneWeekAgo);
            const isOrphaned = !referencedFiles.has(file.name) && !referencedFiles.has(`${bucketName}/${file.name}`);
            return isOld && isOrphaned && !file.name.includes('Safety_Management_System'); // Keep important documents
          });

          if (orphanedFiles.length > 0) {

            // Delete orphaned files in batches
            const filesToDelete = orphanedFiles.map(file => file.name);
            const { error: deleteError } = await supabase.storage
              .from(bucketName)
              .remove(filesToDelete);

            if (deleteError) {
              // console.error(`❌ Error deleting orphaned files from ${bucketName}:`, deleteError.message);
            } else {
              totalOrphanedFiles += orphanedFiles.length;

            }
          } else {

          }
        } catch (_error) {
          // console.error(`❌ Error processing ${bucketName} bucket:`, _error.message);
        }
      }

      cleanupStats.orphanedFiles = totalOrphanedFiles;
    } catch (_error) {
      cleanupStats.errors++;
      // console.error('❌ Error cleaning up orphaned files:', _error.message);
    }

    // 5. Update user last_seen timestamps for active sessions

    try {
      // This would typically be done by the application, but we can clean up stale data here
      const { data: activeUsers, error: usersError } = await supabase
        .from('users')
        .select('id, last_login_at')
        .eq('status', 'active')
        .is('last_login_at', null);

      if (usersError) {
        throw usersError;
      }

      if (activeUsers && activeUsers.length > 0) {

        // We don't update these automatically as it should be done by the app
      }
    } catch (_error) {
      // console.error('❌ Error checking user activity:', _error.message);
    }

    // 6. Log cleanup statistics
    const { error: logError } = await supabase
      .from('email_notifications')
      .insert({
        user_id: null,
        email_type: 'system_cleanup',
        subject: 'Daily Cleanup Job Completed',
        status: 'sent',
        created_at: now.toISOString()
      });

    if (logError) {
      // console.error('❌ Error logging cleanup stats:', logError.message);
    }

    res.json({
      success: true,
      cleanupStats,
      timestamp: now.toISOString()
    });

  } catch (_error) {
    // console.error('❌ Cleanup job failed:', _error);
    res.status(500).json({
      success: false,
      error: _error.message,
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = handler;
