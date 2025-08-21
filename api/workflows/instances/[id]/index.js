const { supabase } = require('../../../../lib/database-supabase-compat');
const { requireAuth } = require('../../../../lib/auth.js');
const { trainingRateLimit } = require('../../../../lib/rateLimit');

/**
 * Workflow Instance by ID API
 * Handles individual instance operations and step progression
 */
module.exports = trainingRateLimit(requireAuth(async function handler(req, res) {
  try {
    const { id } = req.query;
    const user = req.user;

    if (!id) {
      return res.status(400).json({ error: 'Instance ID is required' });
    }

    if (req.method === 'GET') {
      // Get specific workflow instance with full details
      let query = supabase
        .from('workflow_instances')
        .select(`
          *,
          workflow_templates (
            *,
            workflow_steps (*)
          ),
          workflow_step_progress (
            *,
            workflow_steps (*)
          )
        `)
        .eq('id', id);

      // Apply access control
      if (user.role === 'crew') {
        query = query.eq('assigned_to', user.id);
      } else if (user.role === 'manager') {
        query = query.eq('company_id', user.company_id);
      }

      const { data: instance, error } = await query.single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Workflow instance not found' });
        }
        console.error('Error fetching workflow instance:', error);
        return res.status(500).json({ error: 'Failed to fetch workflow instance' });
      }

      return res.status(200).json(instance);
    }

    if (req.method === 'PUT') {
      // Update workflow instance
      const { status, current_step_number, collected_data } = req.body;

      const updateData = {
        updated_at: new Date().toISOString()
      };

      if (status) {
        updateData.status = status;
        if (status === 'in_progress' && !updateData.started_at) {
          updateData.started_at = new Date().toISOString();
        }
        if (status === 'completed') {
          updateData.completed_at = new Date().toISOString();
        }
      }

      if (current_step_number) {
        updateData.current_step_number = current_step_number;
      }

      if (collected_data) {
        updateData.collected_data = collected_data;
      }

      const { data: instance, error } = await supabase
        .from('workflow_instances')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating workflow instance:', error);
        return res.status(500).json({ error: 'Failed to update workflow instance' });
      }

      return res.status(200).json(instance);
    }

    if (req.method === 'DELETE') {
      // Cancel workflow instance
      const { error } = await supabase
        .from('workflow_instances')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        console.error('Error cancelling workflow instance:', error);
        return res.status(500).json({ error: 'Failed to cancel workflow instance' });
      }

      return res.status(200).json({ success: true, message: 'Workflow instance cancelled' });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Critical error in workflow instance:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}));
