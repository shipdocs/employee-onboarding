const { requireManagerOrAdmin } = require('../../lib/auth.js');
const { workflowService } = require('../../lib/workflowService.js');
const { apiRateLimit } = require('../../lib/rateLimit');

async function handler(req, res) {
  try {
    console.log('🔍 [WORKFLOWS] API called:', req.method, req.query);

    const user = req.user;
    console.log('👤 [WORKFLOWS] User:', user?.role, user?.id);

    if (req.method === 'GET') {

      const filters = {};

      // Parse query parameters
      if (req.query.type) {
        filters.type = req.query.type;
      }
      if (req.query.status) {
        filters.status = req.query.status;
      }
      if (req.query.active_only === 'true') {
        filters.active_only = true;
      }

      // Use simple query for better performance
      console.log('🔍 [WORKFLOWS] Fetching with filters:', filters);
      const workflows = await workflowService.getWorkflows(filters);
      console.log('✅ [WORKFLOWS] Found workflows:', workflows?.length || 0);

      return res.status(200).json(workflows || []);
    }

    if (req.method === 'POST') {

      // Only admins and managers can create workflows
      if (user.role !== 'admin' && user.role !== 'manager') {
        return res.status(403).json({ error: 'Only admins and managers can create workflows' });
      }

      const { name, slug, description, type, config, metadata } = req.body;

      if (!name || !slug || !type) {
        return res.status(400).json({
          error: 'Name, slug, and type are required'
        });
      }

      // Validate workflow configuration
      try {
        workflowService.validateWorkflowConfig({ name, slug, type, ...config });
      } catch (validationError) {
        return res.status(400).json({
          error: `Validation failed: ${validationError.message}`
        });
      }

      // Handle potential mismatch between user.id and user.userId
      const userId = user.userId || user.id;

      if (!userId) {
        // console.error('❌ [AUTH] No user ID found in auth token');
        return res.status(401).json({ error: 'Invalid authentication token' });
      }

      const workflowData = {
        name,
        slug,
        description,
        type,
        status: 'draft',
        config: config || {},
        metadata: metadata || {},
        created_by: userId,
        updated_by: userId
      };

      try {
        const newWorkflow = await workflowService.createWorkflow(workflowData);

        return res.status(201).json(newWorkflow);
      } catch (createError) {
        // console.error('❌ [CREATE] Workflow creation failed:', createError);
        // [CREATE] Error details:
        //   error: createError.message,
        //   workflowData
        // });
        return res.status(500).json({
          error: 'Failed to create workflow',
          details: createError.message
        });
      }
    }

    if (req.method === 'PUT' || req.method === 'PATCH') {

      // Only admins and managers can update workflows
      if (user.role !== 'admin' && user.role !== 'manager') {
        return res.status(403).json({ error: 'Only admins and managers can update workflows' });
      }

      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ error: 'Workflow ID is required' });
      }

      const updateData = req.body;
      const userId = user.userId || user.id;
      updateData.updated_by = userId;

      try {
        const updatedWorkflow = await workflowService.updateWorkflow(id, updateData);

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

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    // console.error('❌ [ERROR] Critical error in workflows:', error);
    // console.error('❌ [ERROR] Stack trace:', error.stack);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = apiRateLimit(requireManagerOrAdmin(handler));
