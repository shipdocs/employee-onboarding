const { requireAuth } = require('../../../lib/auth.js');
const { workflowService } = require('../../../lib/workflowService.js');
const { createAPIHandler, createError, createValidationError, createAuthError, createNotFoundError } = require('../../../lib/apiHandler');
const { apiRateLimit } = require('../../../lib/rateLimit');

async function handler(req, res) {
  const user = req.user;
  const { slug } = req.query;

  if (!slug) {
    throw createValidationError('Workflow slug is required', {
      missingFields: ['slug']
    });
  }

  try {
    const { user_id, additional_data } = req.body;

      // Determine target user
      let targetUserId = user_id || user.userId;

      // Check permissions for starting workflow for other users
      if (user_id && user_id !== user.userId) {
        if (user.role === 'admin') {
          // Admins can start workflows for anyone
          targetUserId = user_id;
        } else if (user.role === 'manager') {
          // Managers can start workflows for their crew
          // TODO: Add crew validation here
          targetUserId = user_id;
        } else {
          throw createError('AUTH_INSUFFICIENT_PERMISSIONS', 'You can only start workflows for yourself');
        }
      }

      const instance = await workflowService.startWorkflow(
        slug,
        targetUserId,
        additional_data || {}
      );

      res.status(201).json({
        success: true,
        instance_id: instance.id,
        workflow_slug: slug,
        user_id: targetUserId,
        status: instance.status,
        current_phase: instance.current_phase,
        started_at: instance.started_at
      });

    } catch (workflowError) {
      if (workflowError.message.includes('not found')) {
        throw createNotFoundError('Workflow', { slug });
      }
      if (workflowError.message.includes('not active')) {
        throw createValidationError('Workflow is not currently active', { slug });
      }

      throw createError('SYSTEM_INTERNAL_ERROR', 'Failed to start workflow', {
        originalError: workflowError.message
      });
    }
}

// Create the standardized handler with error handling
const apiHandler = createAPIHandler(handler, {
  allowedMethods: ['POST']
});

// Export with authentication
module.exports = apiRateLimit(requireAuth(apiHandler));
