const { requireAuth } = require('../../lib/auth.js');
const { workflowEngine } = require('../../services/workflow-engine.js');
const { trainingRateLimit } = require('../../lib/rateLimit');
async function handler(req, res) {
  try {

    const user = req.user;

    if (req.method === 'GET') {

      const filters = {};

      // Parse query parameters
      if (req.query.status) {
        filters.status = req.query.status;
      }
      if (req.query.workflow_slug) {
        filters.workflow_slug = req.query.workflow_slug;
      }

      try {
        const instances = await workflowEngine.getUserWorkflowInstances(user.userId, filters);

        // For each instance, get basic progress summary
        const instancesWithProgress = await Promise.all(
          instances.map(async (instance) => {
            try {
              const progress = await workflowEngine.getWorkflowProgress(instance.id);

              const totalItems = progress.length;
              const completedItems = progress.filter(p => p.status === 'completed').length;
              const progressPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

              return {
                ...instance,
                progress_summary: {
                  total_items: totalItems,
                  completed_items: completedItems,
                  progress_percentage: progressPercentage,
                  current_phase_name: instance.workflow?.phases?.find(
                    p => p.phase_number === instance.current_phase
                  )?.name || `Phase ${instance.current_phase}`
                }
              };
            } catch (progressError) {

              return {
                ...instance,
                progress_summary: {
                  total_items: 0,
                  completed_items: 0,
                  progress_percentage: 0,
                  current_phase_name: `Phase ${instance.current_phase}`
                }
              };
            }
          })
        );

        return res.status(200).json(instancesWithProgress);

      } catch (instanceError) {
        // console.error('❌ [INSTANCES] Error fetching user instances:', instanceError);
        return res.status(500).json({
          error: 'Failed to fetch workflow instances',
          details: instanceError.message
        });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    // console.error('❌ [ERROR] Critical error fetching user workflows:', error);
    // console.error('❌ [ERROR] Stack trace:', error.stack);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = trainingRateLimit(requireAuth(handler));
