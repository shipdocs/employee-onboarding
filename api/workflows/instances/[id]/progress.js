const { requireAuth } = require('../../../../lib/auth.js');
const { workflowEngine } = require('../../../../services/workflow-engine.js');
const { trainingRateLimit } = require('../../../../lib/rateLimit');
async function handler(req, res) {
  try {

    const user = req.user;
    const { id } = req.query;

    if (req.method === 'GET') {

      try {
        const instance = await workflowEngine.getWorkflowInstance(id);

        // Check permissions
        if (instance.user_id !== user.userId) {
          if (user.role === 'admin') {
            // Admins can view any progress
          } else if (user.role === 'manager') {
            // TODO: Check if user is manager of the instance owner
          } else {
            return res.status(403).json({
              error: 'You can only view your own progress'
            });
          }
        }

        const progress = await workflowEngine.getWorkflowProgress(id);

        return res.status(200).json(progress);

      } catch (progressError) {
        // console.error('❌ [PROGRESS] Error fetching progress:', progressError);
        return res.status(404).json({ error: 'Workflow instance not found' });
      }
    }

    if (req.method === 'POST') {

      const { phase_id, item_id, item_data, status } = req.body;

      if (!phase_id || !item_id) {
        return res.status(400).json({
          error: 'phase_id and item_id are required'
        });
      }

      try {
        const instance = await workflowEngine.getWorkflowInstance(id);

        // Check permissions
        if (instance.user_id !== user.userId && user.role !== 'admin') {
          return res.status(403).json({
            error: 'You can only update your own progress'
          });
        }

        let progress;

        if (status === 'completed') {
          // Complete the item
          progress = await workflowEngine.completeWorkflowItem(
            id,
            phase_id,
            item_id,
            item_data || {}
          );
        } else {
          // Update progress status
          const validStatuses = ['not_started', 'in_progress', 'completed', 'skipped'];
          if (status && !validStatuses.includes(status)) {
            return res.status(400).json({
              error: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
            });
          }

          const progressData = {
            status: status || 'in_progress',
            data: item_data
          };

          if (status === 'in_progress' && !progressData.started_at) {
            progressData.started_at = new Date().toISOString();
          }

          progress = await workflowEngine.updateWorkflowProgress(
            id,
            phase_id,
            item_id,
            progressData
          );
        }

        return res.status(200).json({
          success: true,
          progress: progress,
          message: status === 'completed' ? 'Item completed successfully' : 'Progress updated'
        });

      } catch (progressError) {
        // console.error('❌ [PROGRESS] Error updating progress:', progressError);
        return res.status(500).json({
          error: 'Failed to update progress',
          details: progressError.message
        });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (_error) {
    // console.error('❌ [ERROR] Critical error managing workflow progress:', _error);
    // console.error('❌ [ERROR] Stack trace:', error.stack);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = trainingRateLimit(requireAuth(handler));
