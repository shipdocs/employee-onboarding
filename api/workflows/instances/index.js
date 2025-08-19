const { supabase } = require('../../../lib/supabase');
const { requireAuth } = require('../../../lib/auth.js');
const { trainingRateLimit } = require('../../../lib/rateLimit');

/**
 * Workflow Instances API
 * Handles workflow execution instances
 */
module.exports = trainingRateLimit(requireAuth(async function handler(req, res) {
  try {
    const user = req.user;

    if (req.method === 'GET') {
      let query = supabase
        .from('workflow_instances')
        .select(`
          *,
          workflow_templates (
            id,
            name,
            description,
            type,
            category
          ),
          workflow_step_progress (
            id,
            workflow_step_id,
            status,
            response_data,
            started_at,
            completed_at,
            workflow_steps (
              id,
              step_number,
              name,
              type
            )
          )
        `);

      // Filter based on user role
      if (user.role === 'crew') {
        // Crew members can only see their own instances
        query = query.eq('assigned_to', user.id);
      } else if (user.role === 'manager') {
        // Managers see instances for their company
        query = query.eq('company_id', user.company_id);
      }
      // Admins see all instances (no additional filter)

      // Apply filters from query params
      if (req.query.status) {
        query = query.eq('status', req.query.status);
      }
      if (req.query.template_id) {
        query = query.eq('workflow_template_id', req.query.template_id);
      }
      if (req.query.assigned_to) {
        query = query.eq('assigned_to', req.query.assigned_to);
      }

      query = query.order('created_at', { ascending: false });

      const { data: instances, error } = await query;

      if (error) {
        console.error('Error fetching workflow instances:', error);
        return res.status(500).json({ error: 'Failed to fetch workflow instances' });
      }

      return res.status(200).json(instances || []);
    }

    if (req.method === 'POST') {
      // Create new workflow instance
      const {
        workflow_template_id,
        assigned_to,
        crew_member_id,
        due_date,
        context_data
      } = req.body;

      if (!workflow_template_id) {
        return res.status(400).json({ error: 'Workflow template ID is required' });
      }

      // Check if template exists and is active
      const { data: template, error: templateError } = await supabase
        .from('workflow_templates')
        .select('*')
        .eq('id', workflow_template_id)
        .eq('is_active', true)
        .single();

      if (templateError || !template) {
        return res.status(400).json({ error: 'Invalid or inactive workflow template' });
      }

      // Create workflow instance
      const instanceData = {
        workflow_template_id,
        assigned_to: assigned_to || user.id,
        assigned_by: user.id,
        crew_member_id,
        status: 'pending',
        current_step_number: 1,
        due_date,
        collected_data: context_data || {},
        company_id: user.company_id
      };

      const { data: instance, error: instanceError } = await supabase
        .from('workflow_instances')
        .insert(instanceData)
        .select()
        .single();

      if (instanceError) {
        console.error('Error creating workflow instance:', instanceError);
        return res.status(500).json({ error: 'Failed to create workflow instance' });
      }

      // Create step progress records for all steps
      const { data: steps, error: stepsError } = await supabase
        .from('workflow_steps')
        .select('*')
        .eq('workflow_template_id', workflow_template_id)
        .order('step_number');

      if (stepsError) {
        console.error('Error fetching workflow steps:', stepsError);
        return res.status(500).json({ error: 'Failed to initialize workflow steps' });
      }

      if (steps && steps.length > 0) {
        const progressData = steps.map((step, index) => ({
          workflow_instance_id: instance.id,
          workflow_step_id: step.id,
          status: index === 0 ? 'pending' : 'pending' // First step is ready, others pending
        }));

        const { error: progressError } = await supabase
          .from('workflow_step_progress')
          .insert(progressData);

        if (progressError) {
          console.error('Error creating step progress:', progressError);
          // Clean up instance
          await supabase.from('workflow_instances').delete().eq('id', instance.id);
          return res.status(500).json({ error: 'Failed to initialize workflow progress' });
        }
      }

      // Fetch complete instance with relations
      const { data: completeInstance, error: fetchError } = await supabase
        .from('workflow_instances')
        .select(`
          *,
          workflow_templates (
            id,
            name,
            description,
            type
          ),
          workflow_step_progress (
            *,
            workflow_steps (*)
          )
        `)
        .eq('id', instance.id)
        .single();

      if (fetchError) {
        console.error('Error fetching complete instance:', fetchError);
        return res.status(500).json({ error: 'Instance created but fetch failed' });
      }

      return res.status(201).json(completeInstance);
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Critical error in workflow instances:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}));
