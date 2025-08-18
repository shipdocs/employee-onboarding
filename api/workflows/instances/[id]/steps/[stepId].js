const { createClient } = require('@supabase/supabase-js');
const { requireAuth } = require('../../../../../lib/auth.js');
const { trainingRateLimit } = require('../../../../../lib/rateLimit');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

/**
 * Workflow Step Progress API
 * Handles step completion and progress tracking
 */
module.exports = trainingRateLimit(requireAuth(async function handler(req, res) {
  try {
    const { id: instanceId, stepId } = req.query;
    const user = req.user;

    if (!instanceId || !stepId) {
      return res.status(400).json({ error: 'Instance ID and Step ID are required' });
    }

    if (req.method === 'GET') {
      // Get step progress details
      const { data: progress, error } = await supabase
        .from('workflow_step_progress')
        .select(`
          *,
          workflow_steps (*),
          workflow_instances (
            id,
            assigned_to,
            company_id,
            status
          )
        `)
        .eq('workflow_instance_id', instanceId)
        .eq('workflow_step_id', stepId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Step progress not found' });
        }
        console.error('Error fetching step progress:', error);
        return res.status(500).json({ error: 'Failed to fetch step progress' });
      }

      // Check access permissions
      if (user.role === 'crew' && progress.workflow_instances.assigned_to !== user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      return res.status(200).json(progress);
    }

    if (req.method === 'PUT') {
      // Update step progress
      const {
        status,
        response_data,
        quiz_score,
        uploaded_files,
        signature_url,
        photo_url,
        validation_notes
      } = req.body;

      const updateData = {
        updated_at: new Date().toISOString()
      };

      if (status) {
        updateData.status = status;
        if (status === 'in_progress') {
          updateData.started_at = new Date().toISOString();
        }
        if (status === 'completed') {
          updateData.completed_at = new Date().toISOString();
        }
      }

      if (response_data !== undefined) {
        updateData.response_data = response_data;
      }

      if (quiz_score !== undefined) {
        updateData.quiz_score = quiz_score;
        updateData.quiz_attempts = supabase.sql`quiz_attempts + 1`;
      }

      if (uploaded_files) {
        updateData.uploaded_files = uploaded_files;
      }

      if (signature_url) {
        updateData.signature_url = signature_url;
      }

      if (photo_url) {
        updateData.photo_url = photo_url;
      }

      if (validation_notes) {
        updateData.validation_notes = validation_notes;
        updateData.validated_by = user.id;
      }

      // Check permissions - crew can only update their own steps
      let query = supabase
        .from('workflow_step_progress')
        .update(updateData)
        .eq('workflow_instance_id', instanceId)
        .eq('workflow_step_id', stepId);

      if (user.role === 'crew') {
        // Add additional check to ensure crew member owns the instance
        const { data: instance, error: instanceError } = await supabase
          .from('workflow_instances')
          .select('assigned_to')
          .eq('id', instanceId)
          .single();

        if (instanceError || instance.assigned_to !== user.id) {
          return res.status(403).json({ error: 'Access denied' });
        }
      }

      const { data: progress, error } = await query.select().single();

      if (error) {
        console.error('Error updating step progress:', error);
        return res.status(500).json({ error: 'Failed to update step progress' });
      }

      // If step was completed, check if we should advance to next step
      if (status === 'completed') {
        await advanceWorkflowIfReady(instanceId, stepId);
      }

      return res.status(200).json(progress);
    }

    if (req.method === 'POST') {
      // Complete step (convenience method)
      const { response_data, quiz_score, files } = req.body;

      const updateData = {
        status: 'completed',
        completed_at: new Date().toISOString(),
        response_data: response_data || {},
        updated_at: new Date().toISOString()
      };

      if (quiz_score !== undefined) {
        updateData.quiz_score = quiz_score;
        updateData.quiz_attempts = supabase.sql`quiz_attempts + 1`;
      }

      if (files) {
        updateData.uploaded_files = files;
      }

      const { data: progress, error } = await supabase
        .from('workflow_step_progress')
        .update(updateData)
        .eq('workflow_instance_id', instanceId)
        .eq('workflow_step_id', stepId)
        .select()
        .single();

      if (error) {
        console.error('Error completing step:', error);
        return res.status(500).json({ error: 'Failed to complete step' });
      }

      // Advance workflow if ready
      await advanceWorkflowIfReady(instanceId, stepId);

      return res.status(200).json(progress);
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Critical error in step progress:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}));

/**
 * Helper function to advance workflow to next step if current step is completed
 */
async function advanceWorkflowIfReady(instanceId, completedStepId) {
  try {
    // Get current workflow state
    const { data: instance, error: instanceError } = await supabase
      .from('workflow_instances')
      .select(`
        *,
        workflow_templates (
          workflow_steps (
            id,
            step_number,
            is_required
          )
        )
      `)
      .eq('id', instanceId)
      .single();

    if (instanceError || !instance) {
      console.error('Error fetching instance for advancement:', instanceError);
      return;
    }

    // Get all step progress
    const { data: allProgress, error: progressError } = await supabase
      .from('workflow_step_progress')
      .select(`
        *,
        workflow_steps (
          step_number,
          is_required
        )
      `)
      .eq('workflow_instance_id', instanceId)
      .order('workflow_steps.step_number');

    if (progressError) {
      console.error('Error fetching step progress:', progressError);
      return;
    }

    // Check if all required steps up to current point are completed
    const currentStepNumber = instance.current_step_number;
    const requiredSteps = allProgress.filter(p =>
      p.workflow_steps.step_number <= currentStepNumber &&
      p.workflow_steps.is_required
    );

    const allRequiredCompleted = requiredSteps.every(p => p.status === 'completed');

    if (allRequiredCompleted) {
      // Find next step
      const nextStep = allProgress.find(p =>
        p.workflow_steps.step_number > currentStepNumber
      );

      if (nextStep) {
        // Advance to next step
        await supabase
          .from('workflow_instances')
          .update({
            current_step_number: nextStep.workflow_steps.step_number,
            status: 'in_progress',
            updated_at: new Date().toISOString()
          })
          .eq('id', instanceId);

        // Set next step as pending/ready
        await supabase
          .from('workflow_step_progress')
          .update({
            status: 'pending',
            updated_at: new Date().toISOString()
          })
          .eq('id', nextStep.id);

      } else {
        // No more steps - complete workflow
        await supabase
          .from('workflow_instances')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', instanceId);

        // TODO: Trigger completion actions (certificates, notifications, etc.)
      }
    }

  } catch (_error) {
    console.error('Error advancing workflow:', _error);
  }
}
