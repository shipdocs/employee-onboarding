const { requireAuth } = require('../../../lib/auth.js');
const { workflowEngine } = require('../../../services/workflow-engine.js');
const { trainingRateLimit } = require('../../../lib/rateLimit');
const { handleErrorAndRespond, createSimpleError } = require('../../../lib/security/secureErrorHandlerHelper');
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
            // Admins can view any instance
          } else if (user.role === 'manager') {
            // TODO: Check if user is manager of the instance owner
            // For now, allow managers to view any instance
          } else {
            return res.status(403).json({
              error: 'You can only view your own workflow instances'
            });
          }
        }

        // Get progress for this instance
        const progress = await workflowEngine.getWorkflowProgress(id);

        const response = {
          ...instance,
          progress: progress
        };

        return res.status(200).json(response);

      } catch (instanceError) {
        const error = createSimpleError('Workflow instance not found', 404, 'DB_RECORD_NOT_FOUND');
        return await handleErrorAndRespond(error, req, res, user);
      }
    }

    if (req.method === 'PUT') {

      try {
        const instance = await workflowEngine.getWorkflowInstance(id);

        // Check permissions
        if (instance.user_id !== user.userId && user.role !== 'admin') {
          return res.status(403).json({
            error: 'You can only update your own workflow instances'
          });
        }

        const { status, data } = req.body;
        const updateData = {};

        if (status) {
          // Validate status transitions
          const validStatuses = ['in_progress', 'completed', 'abandoned'];
          if (!validStatuses.includes(status)) {
            return res.status(400).json({
              error: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
            });
          }
          updateData.status = status;

          if (status === 'completed') {
            updateData.completed_at = new Date().toISOString();
          }
        }

        if (data) {
          updateData.data = { ...instance.data, ...data };
        }

        const updatedInstance = await workflowEngine.updateWorkflowInstance(id, updateData);

        return res.status(200).json(updatedInstance);

      } catch (updateError) {
        const error = createSimpleError('Failed to update workflow instance', 500, 'DB_QUERY_ERROR');
        error.details = { originalError: updateError.message };
        return await handleErrorAndRespond(error, req, res, user);
      }
    }

    const error = createSimpleError('Method not allowed', 405, 'VALIDATION_INVALID_METHOD');
    return await handleErrorAndRespond(error, req, res, user);

  } catch (error) {
    await handleErrorAndRespond(error, req, res, req.user);
  }
}

module.exports = trainingRateLimit(requireAuth(handler));
