const { createClient } = require('@supabase/supabase-js');
const { requireManagerOrAdmin } = require('../../../lib/auth.js');
const { apiRateLimit } = require('../../../lib/rateLimit');
const configManager = require('../../../lib/security/SecureConfigManager');

const supabase = createClient(
  configManager.getString('SUPABASE_URL'), 
  configManager.getString('SUPABASE_SERVICE_ROLE_KEY')
);

/**
 * Workflow Templates API
 * Handles CRUD operations for workflow templates
 */
module.exports = apiRateLimit(requireManagerOrAdmin(async function handler(req, res) {
  try {
    const user = req.user;

    if (req.method === 'GET') {
      // Get all workflow templates
      const { data: templates, error } = await supabase
        .from('workflow_templates')
        .select(`
          *,
          workflow_steps (
            id,
            step_number,
            name,
            description,
            type,
            is_required,
            time_limit_hours,
            passing_score
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching workflow templates:', error);
        return res.status(500).json({ error: 'Failed to fetch workflow templates' });
      }

      return res.status(200).json(templates || []);
    }

    if (req.method === 'POST') {
      // Create new workflow template
      const {
        name,
        description,
        type,
        category,
        config,
        metadata,
        steps
      } = req.body;

      if (!name || !type) {
        return res.status(400).json({ error: 'Name and type are required' });
      }

      // Start transaction
      const { data: template, error: templateError } = await supabase
        .from('workflow_templates')
        .insert({
          name,
          description,
          type,
          category,
          config: config || {},
          metadata: metadata || {},
          company_id: user.company_id,
          created_by: user.id,
          updated_by: user.id
        })
        .select()
        .single();

      if (templateError) {
        console.error('Error creating workflow template:', templateError);
        return res.status(500).json({ error: 'Failed to create workflow template' });
      }

      // Create workflow steps if provided
      if (steps && Array.isArray(steps)) {
        const stepData = steps.map((step, index) => ({
          workflow_template_id: template.id,
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
          ui_config: step.ui_config || {}
        }));

        const { error: stepsError } = await supabase
          .from('workflow_steps')
          .insert(stepData);

        if (stepsError) {
          console.error('Error creating workflow steps:', stepsError);
          // Clean up template
          await supabase.from('workflow_templates').delete().eq('id', template.id);
          return res.status(500).json({ error: 'Failed to create workflow steps' });
        }
      }

      // Fetch complete template with steps
      const { data: completeTemplate, error: fetchError } = await supabase
        .from('workflow_templates')
        .select(`
          *,
          workflow_steps (*)
        `)
        .eq('id', template.id)
        .single();

      if (fetchError) {
        console.error('Error fetching complete template:', fetchError);
        return res.status(500).json({ error: 'Template created but fetch failed' });
      }

      return res.status(201).json(completeTemplate);
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Critical error in workflow templates:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}));
