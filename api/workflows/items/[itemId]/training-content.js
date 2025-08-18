// API endpoint for managing training content for workflow items
const { requireAdmin } = require('../../../../lib/auth');
const { workflowEngine } = require('../../../../services/workflow-engine');
async function handler(req, res) {
  try {
    const { itemId } = req.query;
    const user = req.user;

    if (req.method === 'POST') {
      // Create training content for workflow item
      const trainingContent = req.body;

      const result = await workflowEngine.createTrainingContentForWorkflowItem(itemId, trainingContent);

      return res.status(201).json({
        success: true,
        message: 'Training content created successfully',
        ...result
      });
    }

    if (req.method === 'PUT') {
      // Update training content for workflow item
      const trainingContent = req.body;

      const result = await workflowEngine.updateTrainingContentForWorkflowItem(itemId, trainingContent);

      return res.status(200).json({
        success: true,
        message: 'Training content updated successfully',
        ...result
      });
    }

    if (req.method === 'DELETE') {
      // Unlink training content from workflow item

      // Get the workflow item first
      const { supabase } = require('../../../../lib/supabase');
const { apiRateLimit } = require('../../../../lib/rateLimit');

      const { error } = await supabase
        .from('workflow_phase_items')
        .update({
          content_source: 'inline',
          training_phase_id: null,
          training_item_number: null
        })
        .eq('id', itemId);

      if (error) {
        throw error;
      }

      return res.status(200).json({
        success: true,
        message: 'Training content unlinked successfully',
        workflow_item_id: itemId
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (_error) {
    // console.error('❌ [API] Training content endpoint error:', _error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: _error.message
    });
  }
}

module.exports = apiRateLimit(requireAdmin(handler));
