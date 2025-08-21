const { requireManagerOrAdmin } = require('../../lib/auth.js');
const { workflowEngine } = require('../../services/workflow-engine.js');
const { adminRateLimit } = require('../../lib/rateLimit');
async function handler(req, res) {
  try {

    const user = req.user;
    const id = req.method === 'GET' ? req.query.id : req.body.id;

    if (!id) {
      return res.status(400).json({ error: 'Workflow ID is required' });
    }

    if (req.method === 'GET') {

      try {
        const workflow = await workflowEngine.getWorkflowById(id);
        if (!workflow) {
          return res.status(404).json({ error: 'Workflow not found' });
        }

        return res.status(200).json(workflow);
      } catch (error) {
        // console.error('❌ [GET] Failed to fetch workflow:', error);
        return res.status(500).json({ error: 'Failed to fetch workflow' });
      }
    }

    if (req.method === 'PUT' || req.method === 'PATCH') {

      // Only admins and managers can update workflows
      if (user.role !== 'admin' && user.role !== 'manager') {
        return res.status(403).json({ error: 'Only admins and managers can update workflows' });
      }

      const updateData = {
        ...req.body,
        updated_by: user.userId
      };

      try {
        const updatedWorkflow = await workflowEngine.updateWorkflow(id, updateData);

        return res.status(200).json(updatedWorkflow);
      } catch (error) {
        // console.error('❌ [UPDATE] Workflow update failed:', error);
        if (error.message.includes('not found')) {
          return res.status(404).json({ error: 'Workflow not found' });
        }
        return res.status(500).json({
          error: 'Failed to update workflow',
          details: error.message
        });
      }
    }

    if (req.method === 'DELETE') {

      // Only admins can delete workflows
      if (user.role !== 'admin') {
        return res.status(403).json({ error: 'Only admins can delete workflows' });
      }

      try {
        await workflowEngine.deleteWorkflow(id);

        return res.status(200).json({ success: true, message: 'Workflow archived' });
      } catch (error) {
        // console.error('❌ [DELETE] Workflow deletion failed:', error);
        return res.status(500).json({
          error: 'Failed to archive workflow',
          details: error.message
        });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    // console.error('❌ [ERROR] Critical error in workflow endpoint:', error);
    // console.error('❌ [ERROR] Stack trace:', error.stack);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = adminRateLimit(requireManagerOrAdmin(handler));
