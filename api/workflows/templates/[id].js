const { supabase } = require('../../../lib/supabase');
const { requireManagerOrAdmin } = require('../../../lib/auth.js');
const { apiRateLimit } = require('../../../lib/rateLimit');
const { handleErrorAndRespond, createSimpleError } = require('../../../lib/security/secureErrorHandlerHelper');

/**
 * Workflow Template by ID API
 * Handles individual template operations
 */
module.exports = apiRateLimit(requireManagerOrAdmin(async function handler(req, res) {
  try {
    const { id } = req.query;
    const user = req.user;

    if (!id) {
      const error = createSimpleError('Template ID is required', 400, 'VALIDATION_REQUIRED_FIELD');
      return await handleErrorAndRespond(error, req, res, user);
    }

    if (req.method === 'GET') {
      // Get specific workflow template with steps
      const { data: template, error } = await supabase
        .from('workflow_templates')
        .select(`
          *,
          workflow_steps (
            *
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          const notFoundError = createSimpleError('Workflow template not found', 404, 'DB_RECORD_NOT_FOUND');
          return await handleErrorAndRespond(notFoundError, req, res, user);
        }
        const dbError = createSimpleError('Failed to fetch workflow template', 500, 'DB_QUERY_ERROR');
        dbError.details = { originalError: error.message };
        return await handleErrorAndRespond(dbError, req, res, user);
      }

      return res.status(200).json(template);
    }

    if (req.method === 'PUT') {
      // Update workflow template
      const {
        name,
        description,
        type,
        category,
        config,
        metadata,
        is_active,
        steps
      } = req.body;

      // Update template
      const { data: template, error: templateError } = await supabase
        .from('workflow_templates')
        .update({
          name,
          description,
          type,
          category,
          config,
          metadata,
          is_active,
          version: supabase.sql`version + 1`,
          updated_by: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (templateError) {
        const dbError = createSimpleError('Failed to update workflow template', 500, 'DB_QUERY_ERROR');
        dbError.details = { originalError: templateError.message };
        return await handleErrorAndRespond(dbError, req, res, user);
      }

      // Update steps if provided
      if (steps && Array.isArray(steps)) {
        // Delete existing steps
        const { error: deleteError } = await supabase
          .from('workflow_steps')
          .delete()
          .eq('workflow_template_id', id);

        if (deleteError) {
          const dbError = createSimpleError('Failed to update workflow steps', 500, 'DB_QUERY_ERROR');
          dbError.details = { originalError: deleteError.message };
          return await handleErrorAndRespond(dbError, req, res, user);
        }

        // Insert new steps
        if (steps.length > 0) {
          const stepData = steps.map((step, index) => ({
            workflow_template_id: id,
            step_number: step.step_number || index + 1,
            name: step.name,
            description: step.description,
            type: step.type,
            content: step.content || {},
            form_schema: step.form_schema || {},
            quiz_data: step.quiz_data || {},
            action_config: step.action_config || {},
            is_required: step.is_required !== false,
            time_limit_hours: step.time_limit_hours,
            passing_score: step.passing_score,
            requires_signature: step.requires_signature || false,
            requires_photo: step.requires_photo || false,
            condition_logic: step.condition_logic || {},
            ui_config: step.ui_config || {}
          }));

          const { error: stepsError } = await supabase
            .from('workflow_steps')
            .insert(stepData);

          if (stepsError) {
            const dbError = createSimpleError('Failed to update workflow steps', 500, 'DB_QUERY_ERROR');
            dbError.details = { originalError: stepsError.message };
            return await handleErrorAndRespond(dbError, req, res, user);
          }
        }
      }

      // Fetch updated template with steps
      const { data: updatedTemplate, error: fetchError } = await supabase
        .from('workflow_templates')
        .select(`
          *,
          workflow_steps (*)
        `)
        .eq('id', id)
        .single();

      if (fetchError) {
        const dbError = createSimpleError('Template updated but fetch failed', 500, 'DB_QUERY_ERROR');
        dbError.details = { originalError: fetchError.message };
        return await handleErrorAndRespond(dbError, req, res, user);
      }

      return res.status(200).json(updatedTemplate);
    }

    if (req.method === 'DELETE') {
      // Delete workflow template (soft delete by setting is_active = false)
      const { error } = await supabase
        .from('workflow_templates')
        .update({
          is_active: false,
          updated_by: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        const dbError = createSimpleError('Failed to delete workflow template', 500, 'DB_QUERY_ERROR');
        dbError.details = { originalError: error.message };
        return await handleErrorAndRespond(dbError, req, res, user);
      }

      return res.status(200).json({ success: true, message: 'Workflow template deleted' });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    await handleErrorAndRespond(error, req, res, req.user);
  }
}));
