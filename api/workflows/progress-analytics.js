const { requireAuth } = require('../../lib/auth.js');
const { progressTrackingService } = require('../../services/progress-tracking.js');
const { apiRateLimit } = require('../../lib/rateLimit');
async function handler(req, res) {
  try {

    const user = req.user;

    if (req.method === 'GET') {
      const { type, instance_id, user_id, workflow_slug, days } = req.query;

      // Determine target user for analytics
      let targetUserId = user_id || user.userId;

      // Check permissions for viewing other users' analytics
      if (user_id && user_id !== user.userId) {
        if (user.role === 'admin') {
          // Admins can view anyone's analytics
        } else if (user.role === 'manager') {
          // TODO: Validate that user_id is in manager's crew
          // For now, allow managers to view any analytics
        } else {
          return res.status(403).json({
            error: 'You can only view your own progress analytics'
          });
        }
      }

      try {
        let analytics;

        switch (type) {
          case 'summary':

            analytics = await progressTrackingService.getUserProgressSummary(targetUserId);
            break;

          case 'detailed':
            if (!instance_id) {
              return res.status(400).json({
                error: 'instance_id is required for detailed analytics'
              });
            }

            analytics = await progressTrackingService.getDetailedProgressAnalytics(instance_id);
            break;

          case 'trends':
            if (!workflow_slug) {
              return res.status(400).json({
                error: 'workflow_slug is required for trend analytics'
              });
            }
            // Only managers and admins can view trend analytics
            if (user.role !== 'admin' && user.role !== 'manager') {
              return res.status(403).json({
                error: 'Only managers and admins can view trend analytics'
              });
            }

            const trendDays = parseInt(days) || 30;
            analytics = await progressTrackingService.getProgressTrends(workflow_slug, trendDays);
            break;

          case 'stuck-users':
            // Only managers and admins can view stuck users
            if (user.role !== 'admin' && user.role !== 'manager') {
              return res.status(403).json({
                error: 'Only managers and admins can view stuck users analytics'
              });
            }

            const thresholdDays = parseInt(days) || 7;
            analytics = await progressTrackingService.getStuckUsers(thresholdDays);
            break;

          default:
            return res.status(400).json({
              error: 'Invalid analytics type. Must be one of: summary, detailed, trends, stuck-users'
            });
        }

        return res.status(200).json({
          type: type,
          target_user_id: targetUserId,
          generated_at: new Date().toISOString(),
          data: analytics
        });

      } catch (analyticsError) {
        // console.error('❌ [ANALYTICS] Error generating analytics:', analyticsError);

        if (analyticsError.message.includes('not found')) {
          return res.status(404).json({
            error: analyticsError.message
          });
        }

        return res.status(500).json({
          error: 'Failed to generate analytics',
          details: analyticsError.message
        });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (_error) {
    // console.error('❌ [ERROR] Critical error in progress analytics:', _error);
    // console.error('❌ [ERROR] Stack trace:', error.stack);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = apiRateLimit(requireAuth(handler));
