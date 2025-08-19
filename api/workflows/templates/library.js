const { supabase } = require('../../../lib/supabase');
const { requireManagerOrAdmin } = require('../../../lib/auth.js');
const { apiRateLimit } = require('../../../lib/rateLimit');

/**
 * Workflow Templates Library API
 * Manages pre-built workflow templates that can be imported
 */
module.exports = apiRateLimit(requireManagerOrAdmin(async function handler(req, res) {
  try {
    const user = req.user;

    if (req.method === 'GET') {
      // Get available templates from library
      const {
        category,
        industry,
        tags,
        public_only = false
      } = req.query;

      let query = supabase
        .from('workflow_template_library')
        .select('*')
        .order('times_used', { ascending: false });

      if (category) {
        query = query.eq('category', category);
      }

      if (industry) {
        query = query.eq('industry', industry);
      }

      if (tags) {
        const tagArray = tags.split(',');
        query = query.overlaps('tags', tagArray);
      }

      if (public_only === 'true') {
        query = query.eq('is_public', true);
      } else {
        // Show public templates and company's private templates
        // Use proper Supabase filter to prevent SQL injection
        query = query.or(`is_public.eq.true,company_id.eq.${user.company_id ? `"${user.company_id}"` : 'null'}`);
      }

      const { data: templates, error } = await query;

      if (error) {
        console.error('Error fetching template library:', error);
        return res.status(500).json({ error: 'Failed to fetch templates' });
      }

      return res.status(200).json(templates || []);
    }

    if (req.method === 'POST') {
      // Import template from library
      const { template_id, customize_name } = req.body;

      if (!template_id) {
        return res.status(400).json({ error: 'Template ID is required' });
      }

      // Get template from library
      const { data: template, error: templateError } = await supabase
        .from('workflow_template_library')
        .select('*')
        .eq('id', template_id)
        .single();

      if (templateError || !template) {
        return res.status(404).json({ error: 'Template not found' });
      }

      // Check access permissions
      if (!template.is_public && template.company_id !== user.company_id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Create workflow template from library template
      const workflowData = {
        name: customize_name || template.name,
        description: template.description,
        type: template.template_data.type,
        category: template.category,
        config: template.template_data.config || {},
        metadata: {
          ...template.template_data.metadata,
          imported_from_library: true,
          library_template_id: template.id,
          import_date: new Date().toISOString()
        },
        company_id: user.company_id,
        created_by: user.id,
        updated_by: user.id
      };

      const { data: workflow, error: workflowError } = await supabase
        .from('workflow_templates')
        .insert(workflowData)
        .select()
        .single();

      if (workflowError) {
        console.error('Error creating workflow from template:', workflowError);
        return res.status(500).json({ error: 'Failed to import template' });
      }

      // Create workflow steps from template
      if (template.template_data.steps) {
        const steps = template.template_data.steps.map((step, index) => ({
          workflow_template_id: workflow.id,
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
          .insert(steps);

        if (stepsError) {
          console.error('Error creating workflow steps:', stepsError);
          // Clean up workflow
          await supabase.from('workflow_templates').delete().eq('id', workflow.id);
          return res.status(500).json({ error: 'Failed to create workflow steps' });
        }
      }

      // Update usage count
      await supabase
        .from('workflow_template_library')
        .update({ times_used: (template.times_used || 0) + 1 })
        .eq('id', template_id);

      // Return complete workflow with steps
      const { data: completeWorkflow, error: fetchError } = await supabase
        .from('workflow_templates')
        .select(`
          *,
          workflow_steps (*)
        `)
        .eq('id', workflow.id)
        .single();

      if (fetchError) {
        console.error('Error fetching complete workflow:', fetchError);
        return res.status(500).json({ error: 'Template imported but fetch failed' });
      }

      return res.status(201).json(completeWorkflow);
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Critical error in template library:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}));

/**
 * Seed the template library with common workflow templates
 */
async function seedTemplateLibrary() {
  const templates = [
    {
      name: 'Basic Crew Onboarding',
      description: 'Standard onboarding process for new crew members',
      category: 'onboarding',
      industry: 'maritime',
      tags: ['onboarding', 'safety', 'basic'],
      is_public: true,
      template_data: {
        type: 'onboarding',
        config: { time_limit: 48, passing_score: 80 },
        steps: [
          {
            name: 'Safety Introduction',
            description: 'Basic safety procedures and emergency protocols',
            type: 'content',
            content: { html: '<h3>Safety Introduction</h3><p>Welcome aboard! This section covers essential safety procedures...</p>' },
            is_required: true,
            step_number: 1
          },
          {
            name: 'Personal Information Form',
            description: 'Complete your personal and contact information',
            type: 'form',
            form_schema: {
              fields: [
                { id: 'full_name', name: 'full_name', label: 'Full Name', type: 'text', required: true },
                { id: 'email', name: 'email', label: 'Email Address', type: 'email', required: true },
                { id: 'phone', name: 'phone', label: 'Phone Number', type: 'text', required: true },
                { id: 'emergency_contact', name: 'emergency_contact', label: 'Emergency Contact', type: 'text', required: true }
              ]
            },
            is_required: true,
            step_number: 2
          },
          {
            name: 'Safety Knowledge Quiz',
            description: 'Test your understanding of safety procedures',
            type: 'quiz',
            quiz_data: {
              questions: [
                {
                  id: 'q1',
                  question: 'What is the first action to take in case of a fire alarm?',
                  options: ['Continue working', 'Proceed to muster station', 'Call security', 'Ignore it'],
                  correct_answer: 'Proceed to muster station'
                }
              ]
            },
            passing_score: 80,
            is_required: true,
            step_number: 3
          },
          {
            name: 'Document Upload',
            description: 'Upload required certificates and documents',
            type: 'upload',
            requires_photo: false,
            is_required: true,
            step_number: 4
          },
          {
            name: 'Manager Approval',
            description: 'Final approval from department manager',
            type: 'approval',
            requires_signature: true,
            is_required: true,
            step_number: 5
          }
        ]
      }
    },
    {
      name: 'Equipment Inspection Checklist',
      description: 'Standard equipment inspection and maintenance checklist',
      category: 'checklist',
      industry: 'maritime',
      tags: ['equipment', 'inspection', 'maintenance'],
      is_public: true,
      template_data: {
        type: 'checklist',
        config: { time_limit: 24 },
        steps: [
          {
            name: 'Pre-Inspection Setup',
            description: 'Prepare for equipment inspection',
            type: 'content',
            content: { html: '<h3>Pre-Inspection Setup</h3><p>Before beginning the inspection...</p>' },
            is_required: true,
            step_number: 1
          },
          {
            name: 'Equipment Checklist',
            description: 'Complete the equipment inspection checklist',
            type: 'form',
            form_schema: {
              fields: [
                { id: 'equipment_id', name: 'equipment_id', label: 'Equipment ID', type: 'text', required: true },
                { id: 'visual_condition', name: 'visual_condition', label: 'Visual Condition', type: 'select', options: [
                  { value: 'excellent', label: 'Excellent' },
                  { value: 'good', label: 'Good' },
                  { value: 'fair', label: 'Fair' },
                  { value: 'poor', label: 'Poor' }
                ], required: true },
                { id: 'functional_test', name: 'functional_test', label: 'Functional Test Passed', type: 'radio', options: [
                  { value: 'yes', label: 'Yes' },
                  { value: 'no', label: 'No' }
                ], required: true },
                { id: 'notes', name: 'notes', label: 'Additional Notes', type: 'textarea', required: false }
              ]
            },
            is_required: true,
            step_number: 2
          },
          {
            name: 'Photo Documentation',
            description: 'Take photos of equipment condition',
            type: 'upload',
            requires_photo: true,
            is_required: true,
            step_number: 3
          },
          {
            name: 'Supervisor Sign-off',
            description: 'Supervisor approval of inspection results',
            type: 'approval',
            requires_signature: true,
            is_required: true,
            step_number: 4
          }
        ]
      }
    },
    {
      name: 'Incident Report Form',
      description: 'Digital incident reporting and documentation workflow',
      category: 'form',
      industry: 'maritime',
      tags: ['incident', 'safety', 'reporting'],
      is_public: true,
      template_data: {
        type: 'form',
        config: { time_limit: 2 },
        steps: [
          {
            name: 'Incident Details',
            description: 'Provide basic information about the incident',
            type: 'form',
            form_schema: {
              fields: [
                { id: 'incident_date', name: 'incident_date', label: 'Date of Incident', type: 'date', required: true },
                { id: 'incident_time', name: 'incident_time', label: 'Time of Incident', type: 'text', required: true },
                { id: 'location', name: 'location', label: 'Location', type: 'text', required: true },
                { id: 'type', name: 'type', label: 'Incident Type', type: 'select', options: [
                  { value: 'injury', label: 'Personal Injury' },
                  { value: 'near_miss', label: 'Near Miss' },
                  { value: 'equipment_damage', label: 'Equipment Damage' },
                  { value: 'environmental', label: 'Environmental' },
                  { value: 'other', label: 'Other' }
                ], required: true },
                { id: 'description', name: 'description', label: 'Incident Description', type: 'textarea', required: true }
              ]
            },
            is_required: true,
            step_number: 1
          },
          {
            name: 'Evidence Collection',
            description: 'Upload photos, documents, or other evidence',
            type: 'upload',
            requires_photo: false,
            is_required: false,
            step_number: 2
          },
          {
            name: 'Safety Officer Review',
            description: 'Safety officer review and validation',
            type: 'approval',
            requires_signature: true,
            is_required: true,
            step_number: 3
          }
        ]
      }
    },
    {
      name: 'Training Completion Assessment',
      description: 'Standard assessment workflow for training completion',
      category: 'assessment',
      industry: 'maritime',
      tags: ['training', 'assessment', 'certification'],
      is_public: true,
      template_data: {
        type: 'onboarding',
        config: { time_limit: 24, passing_score: 85 },
        steps: [
          {
            name: 'Training Material Review',
            description: 'Review all training materials before assessment',
            type: 'content',
            content: { html: '<h3>Training Review</h3><p>Please review all training materials...</p>' },
            is_required: true,
            step_number: 1
          },
          {
            name: 'Knowledge Assessment',
            description: 'Complete the knowledge assessment quiz',
            type: 'quiz',
            quiz_data: {
              questions: [
                {
                  id: 'q1',
                  question: 'Sample assessment question',
                  options: ['Option A', 'Option B', 'Option C', 'Option D'],
                  correct_answer: 'Option A'
                }
              ]
            },
            passing_score: 85,
            is_required: true,
            step_number: 2
          },
          {
            name: 'Practical Demonstration',
            description: 'Upload video or photos of practical skills demonstration',
            type: 'upload',
            requires_photo: true,
            is_required: true,
            step_number: 3
          },
          {
            name: 'Instructor Evaluation',
            description: 'Final evaluation by qualified instructor',
            type: 'approval',
            requires_signature: true,
            is_required: true,
            step_number: 4
          }
        ]
      }
    }
  ];

  try {
    for (const template of templates) {
      // Check if template already exists
      const { data: existing } = await supabase
        .from('workflow_template_library')
        .select('id')
        .eq('name', template.name)
        .single();

      if (!existing) {
        await supabase
          .from('workflow_template_library')
          .insert(template);
      }
    }

    console.log('Template library seeded successfully');
  } catch (_error) {
    console.error('Error seeding template library:', _error);
  }
}
