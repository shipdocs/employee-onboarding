const db = require('../../../lib/database');
const { requireManagerOrAdmin } = require('../../../lib/auth.js');
const { apiRateLimit } = require('../../../lib/rateLimit');

/**
 * Training Phases to Workflows Migration API
 * Migrates existing training phases to the new workflow system
 */
module.exports = apiRateLimit(requireManagerOrAdmin(async function handler(req, res) {
  try {
    const user = req.user;

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const {
      dry_run = false,
      company_id = null,
      specific_phases = null
    } = req.body;

    let results = {
      dry_run,
      phases_found: 0,
      phases_migrated: 0,
      workflows_created: 0,
      errors: [],
      warnings: [],
      created_workflows: []
    };

    // Get existing training phases
    let query = supabase
      .from('training_phases')
      .select('*')
      .order('phase_number');

    if (company_id) {
      query = query.eq('company_id', company_id);
    } else if (user.role === 'manager') {
      // Managers can only migrate their company's phases
      query = query.eq('company_id', user.company_id);
    }

    if (specific_phases && Array.isArray(specific_phases)) {
      query = query.in('id', specific_phases);
    }

    const { data: trainingPhases, error: phasesError } = await query;

    if (phasesError) {
      console.error('Error fetching training phases:', phasesError);
      return res.status(500).json({ error: 'Failed to fetch training phases' });
    }

    results.phases_found = trainingPhases?.length || 0;

    if (!trainingPhases || trainingPhases.length === 0) {
      return res.status(200).json({
        ...results,
        message: 'No training phases found to migrate'
      });
    }

    // Process each training phase
    for (const phase of trainingPhases) {
      try {
        const migrationResult = await migrateTrainingPhase(phase, dry_run, user);

        if (migrationResult.success) {
          results.phases_migrated++;
          if (migrationResult.workflow_created) {
            results.workflows_created++;
            if (migrationResult.workflow) {
              results.created_workflows.push(migrationResult.workflow);
            }
          }
        } else {
          results.errors.push({
            phase_id: phase.id,
            phase_name: phase.title,
            error: migrationResult.error
          });
        }

        if (migrationResult.warnings?.length > 0) {
          results.warnings.push(...migrationResult.warnings.map(w => ({
            phase_id: phase.id,
            phase_name: phase.title,
            warning: w
          })));
        }

      } catch (error) {
        console.error(`Error migrating phase ${phase.id}:`, error);
        results.errors.push({
          phase_id: phase.id,
          phase_name: phase.title,
          error: error.message
        });
      }
    }

    return res.status(200).json({
      ...results,
      message: dry_run
        ? `Dry run completed. ${results.workflows_created} workflows would be created.`
        : `Migration completed. Created ${results.workflows_created} workflows from ${results.phases_migrated} phases.`
    });

  } catch (error) {
    console.error('Critical error in training phase migration:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}));

/**
 * Migrate a single training phase to workflow format
 */
async function migrateTrainingPhase(phase, dryRun, user) {
  const result = {
    success: false,
    workflow_created: false,
    workflow: null,
    warnings: [],
    error: null
  };

  try {
    // Check if workflow already exists for this phase
    const { data: existingWorkflow } = await supabase
      .from('workflow_templates')
      .select('id, name')
      .eq('name', phase.title)
      .eq('company_id', phase.company_id)
      .single();

    if (existingWorkflow) {
      result.warnings.push(`Workflow "${phase.title}" already exists`);
      result.success = true;
      return result;
    }

    // Convert training phase to workflow template
    const workflowData = {
      name: phase.title,
      description: phase.description,
      type: 'onboarding', // Training phases are typically onboarding workflows
      category: phase.category || 'training',
      config: {
        time_limit: phase.time_limit || 24,
        passing_score: phase.passing_score || 80,
        migrated_from_phase: true,
        original_phase_id: phase.id,
        original_phase_number: phase.phase_number
      },
      metadata: {
        migration_date: new Date().toISOString(),
        migrated_by: user.id,
        original_created_at: phase.created_at,
        original_updated_at: phase.updated_at
      },
      company_id: phase.company_id,
      created_by: user.id,
      updated_by: user.id,
      is_active: phase.status === 'published'
    };

    if (dryRun) {
      result.success = true;
      result.workflow_created = true;
      result.workflow = workflowData;
      return result;
    }

    // Create workflow template
    const { data: workflow, error: workflowError } = await supabase
      .from('workflow_templates')
      .insert(workflowData)
      .select()
      .single();

    if (workflowError) {
      throw new Error(`Failed to create workflow: ${workflowError.message}`);
    }

    // Convert training items to workflow steps
    if (phase.items && Array.isArray(phase.items) && phase.items.length > 0) {
      const steps = await convertItemsToSteps(phase.items, workflow.id, phase);

      if (steps.length > 0) {
        const { error: stepsError } = await supabase
          .from('workflow_steps')
          .insert(steps);

        if (stepsError) {
          result.warnings.push(`Failed to create workflow steps: ${stepsError.message}`);
        }
      }
    } else {
      // Create basic content step if no items exist
      const basicStep = {
        workflow_template_id: workflow.id,
        step_number: 1,
        name: phase.title,
        description: phase.description,
        type: 'content',
        content: {
          html: phase.description || '<p>Training content</p>',
          migrated: true
        },
        is_required: true
      };

      const { error: stepError } = await supabase
        .from('workflow_steps')
        .insert([basicStep]);

      if (stepError) {
        result.warnings.push(`Failed to create basic step: ${stepError.message}`);
      }
    }

    result.success = true;
    result.workflow_created = true;
    result.workflow = workflow;

    return result;

  } catch (error) {
    result.error = error.message;
    return result;
  }
}

/**
 * Convert training phase items to workflow steps
 */
async function convertItemsToSteps(items, workflowId, phase) {
  const steps = [];

  items.forEach((item, index) => {
    let stepType = 'content'; // Default type
    let stepContent = {};

    // Determine step type based on item properties
    if (item.type) {
      stepType = item.type;
    } else if (item.category) {
      // Map category to step type
      switch (item.category.toLowerCase()) {
        case 'quiz':
        case 'assessment':
          stepType = 'quiz';
          break;
        case 'form':
        case 'paperwork':
          stepType = 'form';
          break;
        case 'upload':
        case 'document':
          stepType = 'upload';
          break;
        case 'approval':
        case 'signoff':
          stepType = 'approval';
          break;
        default:
          stepType = 'content';
      }
    }

    // Convert content based on type
    switch (stepType) {
      case 'content':
        stepContent = {
          html: item.content || item.description || '',
          objectives: item.objectives || [],
          keyPoints: item.keyPoints || [],
          procedures: item.procedures || [],
          migrated: true
        };
        break;

      case 'quiz':
        stepContent = {
          questions: item.quiz_questions || [],
          passing_score: item.passing_score || phase.passing_score || 80
        };
        break;

      case 'form':
        // Try to extract form fields from existing structure
        stepContent = {
          fields: item.form_fields || extractFormFieldsFromContent(item.content)
        };
        break;

      case 'upload':
        stepContent = {};
        break;

      case 'approval':
        stepContent = {};
        break;
    }

    const step = {
      workflow_template_id: workflowId,
      step_number: item.number || index + 1,
      name: item.title,
      description: item.description,
      type: stepType,
      content: stepType === 'content' ? stepContent : {},
      form_schema: stepType === 'form' ? stepContent : {},
      quiz_data: stepType === 'quiz' ? stepContent : {},
      is_required: item.required !== false,
      time_limit_hours: item.time_limit,
      requires_signature: item.requires_signature || false,
      requires_photo: item.requires_photo || false,
      ui_config: {
        migrated: true,
        original_category: item.category
      }
    };

    steps.push(step);
  });

  return steps;
}

/**
 * Extract form fields from content (basic implementation)
 */
function extractFormFieldsFromContent(content) {
  if (!content || typeof content !== 'string') {
    return [];
  }

  const fields = [];

  // Look for common form patterns in content
  // This is a simple implementation - could be enhanced
  const patterns = [
    /Name:\s*_+/gi,
    /Date:\s*_+/gi,
    /Signature:\s*_+/gi,
    /Comments:\s*_+/gi
  ];

  patterns.forEach((pattern, index) => {
    const matches = content.match(pattern);
    if (matches) {
      matches.forEach((match, matchIndex) => {
        const fieldName = match.split(':')[0].toLowerCase().trim();
        fields.push({
          id: `extracted_${index}_${matchIndex}`,
          name: fieldName.replace(/\s+/g, '_'),
          label: fieldName.charAt(0).toUpperCase() + fieldName.slice(1),
          type: fieldName.includes('date') ? 'date' :
                fieldName.includes('signature') ? 'text' :
                fieldName.includes('comment') ? 'textarea' : 'text',
          required: true
        });
      });
    }
  });

  return fields;
}
