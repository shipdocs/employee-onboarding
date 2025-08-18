// services/workflow-engine.js - Dynamic workflow system engine
const { databaseService, supabase } = require('./database');

class WorkflowEngine {
  constructor() {
    this.db = databaseService;
  }

  // ====== WORKFLOW DEFINITION MANAGEMENT ======

  async getWorkflows(filters = {}) {
    // Check if we need a simple list (for content management) or full details
    const simple = filters.simple === true;

    let query;
    if (simple) {
      // Simple query for content management - just basic workflow info
      query = supabase.from('workflows').select(`
        id, name, slug, description, type, status, version,
        created_at, updated_at
      `);
    } else {
      // Full query with nested data (for workflow execution)
      query = supabase.from('workflows').select(`
        id, name, slug, description, type, status, version,
        config, metadata, created_at, updated_at,
        created_by, updated_by,
        workflow_phases (
          id, phase_number, name, description, type,
          config, required, estimated_duration,
          workflow_phase_items (
            id, item_number, type, title, content,
            validation_rules, required, content_source,
            training_phase_id, training_item_number
          )
        )
      `);
    }

    if (filters.type) {
      query = query.eq('type', filters.type);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.active_only) {
      query = query.eq('status', 'active');
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;

    // Enrich workflow items with training content (only for full queries)
    if (data && !simple) {
      for (const workflow of data) {
        if (workflow.workflow_phases) {
          // Sort phases by phase_number
          workflow.workflow_phases.sort((a, b) => a.phase_number - b.phase_number);

          // Process each phase
          for (const phase of workflow.workflow_phases) {
            if (phase.workflow_phase_items) {
              // Sort items within each phase by item_number
              phase.workflow_phase_items.sort((a, b) => a.item_number - b.item_number);

              // Enrich items with training content
              await this.enrichWorkflowItemsWithTrainingContent(phase.workflow_phase_items);
            }
          }
        }
      }
    }

    return data;
  }

  async getWorkflowById(id) {
    try {
      // First get the workflow without phases to avoid potential ambiguity
      const { data: workflow, error: workflowError } = await supabase
        .from('workflows')
        .select('id, name, slug, description, type, status, version, config, metadata, created_at, updated_at')
        .eq('id', id)
        .single();

      if (workflowError) throw workflowError;

      // Then get the phases separately
      const { data: phases, error: phasesError } = await supabase
        .from('workflow_phases')
        .select(`
          id, phase_number, name, description, type,
          config, required, estimated_duration,
          workflow_phase_items (
            id, item_number, type, title, content,
            validation_rules, required
          )
        `)
        .eq('workflow_id', id)
        .order('phase_number');

      if (phasesError) throw phasesError;

      // Combine the results
      return {
        ...workflow,
        workflow_phases: phases || []
      };
    } catch (error) {
      // console.error('❌ [WORKFLOW-ENGINE] Error in getWorkflowById:', error);
      throw error;
    }
  }

  async getWorkflowBySlug(slug) {
    try {
      // First get the workflow without phases to avoid potential ambiguity
      const { data: workflow, error: workflowError } = await supabase
        .from('workflows')
        .select('id, name, slug, description, type, status, version, config, metadata, created_at, updated_at')
        .eq('slug', slug)
        .single();

      if (workflowError) throw workflowError;

      // Then get the phases separately
      const { data: phases, error: phasesError } = await supabase
        .from('workflow_phases')
        .select(`
          id, phase_number, name, description, type,
          config, required, estimated_duration,
          workflow_phase_items (
            id, item_number, type, title, content,
            validation_rules, required
          )
        `)
        .eq('workflow_id', workflow.id)
        .order('phase_number');

      if (phasesError) throw phasesError;

      // Combine the results
      return {
        ...workflow,
        workflow_phases: phases || []
      };
    } catch (error) {
      // console.error('❌ [WORKFLOW-ENGINE] Error in getWorkflowBySlug:', error);
      throw error;
    }
  }

  async createWorkflow(workflowData) {

    // Filter out any translation-related fields that might cause issues
    const {
      workflow_phases,
      translations,
      titleTranslations,
      descriptionTranslations,
      adaptedTitle,
      adaptedDescription,
      workflowId,
      phaseCount,
      phases,
      ...cleanWorkflowData
    } = workflowData;

    const { data, error } = await supabase
      .from('workflows')
      .insert([cleanWorkflowData])
      .select()
      .single();

    if (error) {
      // console.error('❌ [WORKFLOW-ENGINE] Database error creating workflow:', error);
      // console.error('❌ [WORKFLOW-ENGINE] Error details:', {
      //   message: error.message,
      //   code: error.code,
      //   details: error.details,
      //   hint: error.hint
      // });
      throw error;
    }

    // Handle phases if provided
    if ((workflow_phases && workflow_phases.length > 0) || (phases && phases.length > 0)) {
      const phasesToCreate = workflow_phases || phases || [];

      try {
        await this.updateWorkflowPhases(data.id, phasesToCreate);
        
        // Fetch the complete workflow with phases
        const completeWorkflow = await this.getWorkflowById(data.id);
        return completeWorkflow;
      } catch (phaseError) {
        // console.error('❌ [WORKFLOW-ENGINE] Failed to create phases for new workflow:', phaseError);
        // Return the workflow even if phases failed
        return data;
      }
    }
    
    return data;
  }

  async updateWorkflow(id, workflowData) {

    // Extract phases and translation-related fields from workflow data
    const {
      workflow_phases,
      translations,
      titleTranslations,
      descriptionTranslations,
      adaptedTitle,
      adaptedDescription,
      workflowId,
      phaseCount,
      phases,
      ...mainWorkflowData
    } = workflowData;

    // Update main workflow
    const { data: updatedWorkflow, error } = await supabase
      .from('workflows')
      .update(mainWorkflowData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Handle phases if provided (check both workflow_phases and phases)
    const phasesToUpdate = workflow_phases || phases;
    if (phasesToUpdate && Array.isArray(phasesToUpdate)) {

      try {
        await this.updateWorkflowPhases(id, phasesToUpdate);
        
      } catch (phaseError) {
        // console.error('❌ [WORKFLOW-ENGINE] Phase update failed:', phaseError);
        // console.error('❌ [WORKFLOW-ENGINE] Phase error details:', {
        //   message: phaseError.message,
        //   code: phaseError.code,
        //   details: phaseError.details,
        //   hint: phaseError.hint
        // });
        // THROW the error instead of silently continuing
        throw new Error(`Failed to update workflow phases: ${phaseError.message}`);
      }
    }

    // Return complete workflow with phases
    try {
      const completeWorkflow = await this.getWorkflowById(id);
      
      return completeWorkflow;
    } catch (getError) {
      // console.error('❌ [WORKFLOW-ENGINE] Failed to retrieve updated workflow:', getError);
      // console.error('❌ [WORKFLOW-ENGINE] Get error details:', {
      //   message: getError.message,
      //   code: getError.code,
      //   details: getError.details,
      //   hint: getError.hint
      // });
      
      // If we can't get the complete workflow, at least return the updated basic data
      
      return {
        ...updatedWorkflow,
        workflow_phases: []
      };
    }
  }

  async deleteWorkflow(id) {
    // Soft delete by setting status to archived
    return this.updateWorkflow(id, { status: 'archived' });
  }

  // ====== WORKFLOW PHASES MANAGEMENT ======

  async updateWorkflowPhases(workflowId, phases) {

    try {
      // Get existing phases
      
      const { data: existingPhases, error: fetchError } = await supabase
        .from('workflow_phases')
        .select('id, phase_number')
        .eq('workflow_id', workflowId);

      if (fetchError) {
        // console.error('❌ [WORKFLOW-ENGINE] Failed to fetch existing phases:', fetchError);
        throw fetchError;
      }

      // Handle phase reordering by using temporary phase numbers first
      const phasesWithIds = phases.filter(phase => phase.id && !phase.id.startsWith('temp-'));
      if (phasesWithIds.length > 0) {

        // Step 1: Set all phases to temporary negative numbers to avoid conflicts
        for (let i = 0; i < phasesWithIds.length; i++) {
          const phase = phasesWithIds[i];
          const tempPhaseNumber = -(i + 1000); // Use negative numbers to avoid conflicts

          const { error: tempUpdateError } = await supabase
            .from('workflow_phases')
            .update({ phase_number: tempPhaseNumber })
            .eq('id', phase.id);

          if (tempUpdateError) {
            // console.error(`❌ [WORKFLOW-ENGINE] Failed to set temporary phase number for ${phase.id}:`, tempUpdateError);
            throw tempUpdateError;
          }
        }

        // Step 2: Update to final phase numbers
        for (let i = 0; i < phasesWithIds.length; i++) {
          const phase = phasesWithIds[i];
          const finalPhaseNumber = phase.phase_number || (i + 1);

          const { error: finalUpdateError } = await supabase
            .from('workflow_phases')
            .update({ phase_number: finalPhaseNumber })
            .eq('id', phase.id);

          if (finalUpdateError) {
            // console.error(`❌ [WORKFLOW-ENGINE] Failed to set final phase number for ${phase.id}:`, finalUpdateError);
            throw finalUpdateError;
          }
        }

      }

      // Separate new phases (temp IDs) from existing phases
      const newPhases = phases.filter(phase => phase.id && phase.id.toString().startsWith('temp-'));
      const existingPhasesToUpdate = phases.filter(phase => phase.id && !phase.id.toString().startsWith('temp-'));

      // SAFETY: Only delete phases if explicitly marked for deletion
      // Don't automatically delete phases that aren't in the update list
      // This prevents accidental data loss when partial updates are sent
      const phaseIdsToKeep = existingPhasesToUpdate.map(p => p.id);
      const phasesToDelete = existingPhases.filter(ep => !phaseIdsToKeep.includes(ep.id));

      // Only delete if phases are explicitly marked for deletion (e.g., with a delete flag)
      const explicitlyMarkedForDeletion = phases.filter(p => p._delete === true);

      if (explicitlyMarkedForDeletion.length > 0) {
        try {
          const { error: deleteError } = await supabase
            .from('workflow_phases')
            .delete()
            .in('id', explicitlyMarkedForDeletion.map(p => p.id));

          if (deleteError) {
            // console.error('❌ [WORKFLOW-ENGINE] Delete phase error:', deleteError);
            throw deleteError;
          }
        } catch (delErr) {
          // console.error('❌ [WORKFLOW-ENGINE] Delete phase failed with:', delErr);
          throw delErr;
        }
      } else if (phasesToDelete.length > 0) {

      }

      // Update existing phases
      for (const phase of existingPhasesToUpdate) {
        const {
          id,
          workflow_phase_items,
          translations,
          titleTranslations,
          descriptionTranslations,
          adaptedTitle,
          adaptedDescription,
          created_at,
          updated_at,
          ...phaseData
        } = phase; // Remove all non-db fields

        try {
          // Only include valid workflow_phases columns for update
          // Explicitly exclude translations to avoid trigger issues
          const validUpdateData = {
            phase_number: phaseData.phase_number,
            name: phaseData.name || phaseData.title || '',
            description: phaseData.description || '',
            type: phaseData.type || 'content',
            config: phaseData.config || {},
            required: phaseData.required !== undefined ? phaseData.required : true,
            estimated_duration: typeof phaseData.estimated_duration === 'string'
              ? parseInt(phaseData.estimated_duration) || null
              : phaseData.estimated_duration || null,
            workflow_id: workflowId
            // Note: Don't update updated_at manually, let the database handle it
            // Note: Explicitly NOT including translations to avoid trigger conflicts
          };

          const { data: updateResult, error: updateError } = await supabase
            .from('workflow_phases')
            .update(validUpdateData)
            .eq('id', id)
            .select('id, phase_number, name, description, type, config, required, estimated_duration, updated_at');

          if (updateError) {
            // console.error(`❌ [WORKFLOW-ENGINE] Update phase ${id} error:`, updateError);
            throw updateError;
          }

          // Handle phase items if provided
          if (workflow_phase_items && Array.isArray(workflow_phase_items)) {
            
            await this.updatePhaseItems(id, workflow_phase_items);
          }
        } catch (updErr) {
          // console.error(`❌ [WORKFLOW-ENGINE] Update phase ${id} failed with:`, updErr);
          throw updErr;
        }
      }

      // Insert new phases
      if (newPhases.length > 0) {
        const newPhaseData = newPhases.map(phase => {
          const { 
            id, 
            workflow_phase_items, 
            translations,
            titleTranslations,
            descriptionTranslations,
            adaptedTitle,
            adaptedDescription,
            ...phaseData 
          } = phase; // Remove all non-db fields
          
          // Only include valid workflow_phases columns
          const validPhaseData = {
            phase_number: phaseData.phase_number,
            name: phaseData.name || phaseData.title || '',
            description: phaseData.description || '',
            type: phaseData.type || 'content',
            config: phaseData.config || {},
            required: phaseData.required !== undefined ? phaseData.required : true,
            estimated_duration: phaseData.estimated_duration || null,
            workflow_id: workflowId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          return validPhaseData;
        });

        try {
          const { data: insertedPhases, error: insertError } = await supabase
            .from('workflow_phases')
            .insert(newPhaseData)
            .select('id, phase_number');

          if (insertError) {
            // console.error('❌ [WORKFLOW-ENGINE] Insert phase error:', insertError);
            throw insertError;
          }

          // Handle phase items for new phases
          for (let i = 0; i < newPhases.length; i++) {
            const originalPhase = newPhases[i];
            const insertedPhase = insertedPhases[i];

            if (originalPhase.workflow_phase_items && Array.isArray(originalPhase.workflow_phase_items)) {
              
              await this.updatePhaseItems(insertedPhase.id, originalPhase.workflow_phase_items);
            }
          }
        } catch (insErr) {
          // console.error('❌ [WORKFLOW-ENGINE] Insert phase failed with:', insErr);
          throw insErr;
        }
      }

    } catch (error) {
      // console.error('❌ [WORKFLOW-ENGINE] Failed to update phases:', error);
      throw error;
    }
  }

  async createWorkflowPhase(phaseData) {
    const { data, error } = await supabase
      .from('workflow_phases')
      .insert([phaseData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateWorkflowPhase(id, phaseData) {
    const { data, error } = await supabase
      .from('workflow_phases')
      .update(phaseData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteWorkflowPhase(id) {
    const { error } = await supabase
      .from('workflow_phases')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  }

  // ====== WORKFLOW PHASE ITEMS MANAGEMENT ======

  async createWorkflowPhaseItem(itemData) {
    const { data, error } = await supabase
      .from('workflow_phase_items')
      .insert([itemData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateWorkflowPhaseItem(id, itemData) {
    const { data, error } = await supabase
      .from('workflow_phase_items')
      .update(itemData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteWorkflowPhaseItem(id) {
    const { error } = await supabase
      .from('workflow_phase_items')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  }

  async updatePhaseItems(phaseId, items) {

    try {
      // Get existing items for this phase
      const { data: existingItems, error: fetchError } = await supabase
        .from('workflow_phase_items')
        .select('id, item_number')
        .eq('phase_id', phaseId);

      if (fetchError) {
        // console.error('❌ [WORKFLOW-ENGINE] Failed to fetch existing phase items:', fetchError);
        throw fetchError;
      }

      // Separate new items (temp IDs) from existing items
      const newItems = items.filter(item => item.id && item.id.toString().startsWith('temp-'));
      const existingItemsToUpdate = items.filter(item => item.id && !item.id.toString().startsWith('temp-'));

      // Handle item reordering by using temporary item numbers first
      if (existingItemsToUpdate.length > 0) {

        // Step 1: Set all items to temporary negative numbers to avoid conflicts
        for (let i = 0; i < existingItemsToUpdate.length; i++) {
          const item = existingItemsToUpdate[i];
          const tempItemNumber = -(i + 1000); // Use negative numbers to avoid conflicts

          const { error: tempUpdateError } = await supabase
            .from('workflow_phase_items')
            .update({ item_number: tempItemNumber })
            .eq('id', item.id);

          if (tempUpdateError) {
            // console.error(`❌ [WORKFLOW-ENGINE] Failed to set temporary item number for ${item.id}:`, tempUpdateError);
            throw tempUpdateError;
          }
        }

        // Step 2: Update to final item numbers and other data
        for (let i = 0; i < existingItemsToUpdate.length; i++) {
          const item = existingItemsToUpdate[i];
          const {
            id,
            created_at,
            updated_at,
            ...itemData
          } = item;

          // Prepare valid item data for update
          const validItemData = {
            item_number: itemData.item_number || (i + 1),
            type: itemData.type || 'content',
            title: itemData.title || '',
            content: itemData.content || {},
            validation_rules: itemData.validation_rules || {},
            required: itemData.required !== undefined ? itemData.required : true,
            phase_id: phaseId
          };

          const { data: updateResult, error: updateError } = await supabase
            .from('workflow_phase_items')
            .update(validItemData)
            .eq('id', id)
            .select('id, item_number, title, type, content');

          if (updateError) {
            // console.error(`❌ [WORKFLOW-ENGINE] Update item ${id} error:`, updateError);
            throw updateError;
          }

        }

      }

      // Insert new items
      if (newItems.length > 0) {
        const newItemData = newItems.map(item => {
          const { id, created_at, updated_at, ...itemData } = item;

          return {
            phase_id: phaseId,
            item_number: itemData.item_number,
            type: itemData.type || 'content',
            title: itemData.title || '',
            content: itemData.content || {},
            validation_rules: itemData.validation_rules || {},
            required: itemData.required !== undefined ? itemData.required : true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
        });

        const { error: insertError } = await supabase
          .from('workflow_phase_items')
          .insert(newItemData);

        if (insertError) {
          // console.error('❌ [WORKFLOW-ENGINE] Insert item error:', insertError);
          throw insertError;
        }
      }

    } catch (error) {
      // console.error('❌ [WORKFLOW-ENGINE] Failed to update phase items:', error);
      throw error;
    }
  }

  // ====== WORKFLOW INSTANCE MANAGEMENT ======

  async createWorkflowInstance(instanceData) {
    const { data, error } = await supabase
      .from('workflow_instances')
      .insert([instanceData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getWorkflowInstance(id) {
    const { data, error } = await supabase
      .from('workflow_instances')
      .select(`
        id, workflow_id, user_id, status, current_phase,
        data, started_at, completed_at, expires_at,
        created_at, updated_at,
        workflow:workflows (
          id, name, slug, type, config
        ),
        user:users (
          id, email, full_name, role
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async getUserWorkflowInstances(userId, filters = {}) {
    let query = supabase
      .from('workflow_instances')
      .select(`
        id, workflow_id, user_id, status, current_phase,
        data, started_at, completed_at, expires_at,
        workflow:workflows (
          id, name, slug, type, config
        )
      `)
      .eq('user_id', userId);

    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.workflow_slug) {
      query = query.eq('workflow.slug', filters.workflow_slug);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async updateWorkflowInstance(id, instanceData) {
    const { data, error } = await supabase
      .from('workflow_instances')
      .update(instanceData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // ====== WORKFLOW PROGRESS MANAGEMENT ======

  async getWorkflowProgress(instanceId) {
    const { data, error } = await supabase
      .from('workflow_progress')
      .select(`
        id, instance_id, phase_id, item_id, status,
        data, started_at, completed_at,
        phase:workflow_phases (
          id, phase_number, name, type
        ),
        item:workflow_phase_items (
          id, item_number, type, title, content
        )
      `)
      .eq('instance_id', instanceId)
      .order('phase.phase_number', { ascending: true })
      .order('item.item_number', { ascending: true });

    if (error) throw error;
    return data;
  }

  async updateWorkflowProgress(instanceId, phaseId, itemId, progressData) {
    // Upsert progress record
    const { data, error } = await supabase
      .from('workflow_progress')
      .upsert([{
        instance_id: instanceId,
        phase_id: phaseId,
        item_id: itemId,
        ...progressData
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // ====== WORKFLOW EXECUTION ENGINE ======

  async startWorkflow(workflowSlug, userId, additionalData = {}) {
    // Get workflow definition
    const workflow = await this.getWorkflowBySlug(workflowSlug);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowSlug}`);
    }

    if (workflow.status !== 'active') {
      throw new Error(`Workflow is not active: ${workflowSlug}`);
    }

    // Check if user already has an active instance
    const existingInstances = await this.getUserWorkflowInstances(userId, {
      status: 'in_progress'
    });

    const existingInstance = existingInstances.find(
      instance => instance.workflow.slug === workflowSlug
    );

    if (existingInstance) {
      return existingInstance; // Return existing instance instead of creating new
    }

    // Create new workflow instance
    const instanceData = {
      workflow_id: workflow.id,
      user_id: userId,
      status: 'in_progress',
      current_phase: 1,
      data: {
        workflow_version: workflow.version,
        started_by: 'user',
        ...additionalData
      },
      started_at: new Date().toISOString()
    };

    const instance = await this.createWorkflowInstance(instanceData);

    // Initialize progress for all items in first phase
    await this.initializePhaseProgress(instance.id, workflow.workflow_phases[0]);

    return instance;
  }

  async initializePhaseProgress(instanceId, phase) {
    if (!phase || !phase.workflow_phase_items) return;

    const progressPromises = phase.workflow_phase_items.map(item => 
      this.updateWorkflowProgress(instanceId, phase.id, item.id, {
        status: 'not_started'
      })
    );

    await Promise.all(progressPromises);
  }

  async completeWorkflowItem(instanceId, phaseId, itemId, itemData = {}) {
    // Update item progress
    const progress = await this.updateWorkflowProgress(instanceId, phaseId, itemId, {
      status: 'completed',
      data: itemData,
      completed_at: new Date().toISOString()
    });

    // Check if phase is complete
    await this.checkPhaseCompletion(instanceId, phaseId);

    return progress;
  }

  async checkPhaseCompletion(instanceId, phaseId) {
    // Get all items in this phase
    const allProgress = await supabase
      .from('workflow_progress')
      .select(`
        id, status, item:workflow_phase_items (
          id, required
        )
      `)
      .eq('instance_id', instanceId)
      .eq('phase_id', phaseId);

    if (allProgress.error) throw allProgress.error;

    // Check if all required items are completed
    const requiredItems = allProgress.data.filter(p => p.item.required);
    const completedRequiredItems = requiredItems.filter(p => p.status === 'completed');

    if (completedRequiredItems.length === requiredItems.length) {
      await this.completePhase(instanceId, phaseId);
    }
  }

  async completePhase(instanceId, phaseId) {
    const instance = await this.getWorkflowInstance(instanceId);
    const workflow = await this.getWorkflowBySlug(instance.workflow.slug);

    const currentPhase = workflow.workflow_phases.find(p => p.id === phaseId);
    const nextPhase = workflow.workflow_phases.find(
      p => p.phase_number === currentPhase.phase_number + 1
    );

    if (nextPhase) {
      // Move to next phase
      await this.updateWorkflowInstance(instanceId, {
        current_phase: nextPhase.phase_number
      });

      // Initialize next phase progress
      await this.initializePhaseProgress(instanceId, nextPhase);
    } else {
      // Complete entire workflow
      await this.completeWorkflow(instanceId);
    }

    // Trigger phase completion actions (PDFs, emails, etc.)
    await this.triggerPhaseCompletionActions(instanceId, phaseId);
  }

  async completeWorkflow(instanceId) {
    await this.updateWorkflowInstance(instanceId, {
      status: 'completed',
      completed_at: new Date().toISOString()
    });

    // Trigger workflow completion actions
    await this.triggerWorkflowCompletionActions(instanceId);
  }

  async triggerPhaseCompletionActions(instanceId, phaseId) {
    // Get PDF templates for this phase
    const { data: templates, error } = await supabase
      .from('workflow_pdf_templates')
      .select('*')
      .eq('phase_id', phaseId)
      .eq('trigger_on', 'phase_complete');

    if (error) throw error;

    // Generate PDFs (implement based on existing PDF service)
    for (const template of templates) {
      await this.generateWorkflowPDF(instanceId, template);
    }
  }

  async triggerWorkflowCompletionActions(instanceId) {
    const instance = await this.getWorkflowInstance(instanceId);

    // Get workflow-level PDF templates
    const { data: templates, error } = await supabase
      .from('workflow_pdf_templates')
      .select('*')
      .eq('workflow_id', instance.workflow_id)
      .eq('trigger_on', 'workflow_complete');

    if (error) throw error;

    // Generate completion PDFs
    for (const template of templates) {
      await this.generateWorkflowPDF(instanceId, template);
    }
  }

  async generateWorkflowPDF(instanceId, template) {
    try {

      // Get workflow instance with user data
      const instance = await this.getWorkflowInstance(instanceId);
      if (!instance) {
        throw new Error('Workflow instance not found');
      }

      // Get workflow progress for dynamic data
      const progress = await this.getWorkflowProgress(instanceId);
      
      // Prepare data for PDF generation
      const pdfData = await this.preparePDFData(instance, progress, template);
      
      // Check if we have a template_id (existing PDF template)
      if (template.template_data?.template_id) {
        // Use existing PDF template system
        const pdfGenerationAPI = require('../api/pdf/generate-certificate');
        return await pdfGenerationAPI.generateFromWorkflow(template.template_data.template_id, pdfData);
      }
      
      // For workflow-specific templates, we need to create them dynamically
      return await this.generateDynamicPDF(template, pdfData);
      
    } catch (error) {
      // console.error('Failed to generate workflow PDF:', error);
      throw error;
    }
  }

  async preparePDFData(instance, progress, template) {
    // Base data available for all templates
    const baseData = {
      user: {
        full_name: instance.user?.full_name || 'Unknown User',
        email: instance.user?.email || 'unknown@example.com',
        role: instance.user?.role || 'crew'
      },
      workflow: {
        name: instance.workflow?.name || 'Unknown Workflow',
        type: instance.workflow?.type || 'unknown',
        started_at: instance.started_at,
        completed_at: instance.completed_at,
        current_phase: instance.current_phase,
        status: instance.status
      },
      instance: {
        id: instance.id,
        data: instance.data || {},
        progress_summary: this.calculateProgressSummary(progress)
      },
      generation: {
        date: new Date().toISOString(),
        template_name: template.name,
        template_type: template.template_type
      }
    };

    // Apply data mapping if specified in template
    if (template.template_data?.data_mapping) {
      return this.applyDataMapping(baseData, template.template_data.data_mapping);
    }

    return baseData;
  }

  calculateProgressSummary(progress) {
    if (!progress || progress.length === 0) {
      return { total_items: 0, completed_items: 0, completion_percentage: 0 };
    }

    const totalItems = progress.length;
    const completedItems = progress.filter(p => p.status === 'completed').length;
    const completionPercentage = Math.round((completedItems / totalItems) * 100);

    return {
      total_items: totalItems,
      completed_items: completedItems,
      completion_percentage: completionPercentage,
      phases_completed: [...new Set(progress.filter(p => p.status === 'completed').map(p => p.phase?.phase_number))].length
    };
  }

  applyDataMapping(data, mapping) {
    const mappedData = {};
    
    for (const [key, path] of Object.entries(mapping)) {
      try {
        // Simple path resolution (e.g., "user.full_name" -> data.user.full_name)
        const value = path.split('.').reduce((obj, prop) => {
          if (prop.startsWith('{{') && prop.endsWith('}}')) {
            // Handle template variables like {{user.full_name}}
            const cleanPath = prop.slice(2, -2);
            return cleanPath.split('.').reduce((o, p) => o?.[p], data);
          }
          return obj?.[prop];
        }, data);
        
        mappedData[key] = value || `[${key}]`; // Fallback to placeholder
      } catch (error) {
        
        mappedData[key] = `[${key}]`;
      }
    }
    
    return mappedData;
  }

  async generateDynamicPDF(template, data) {
    // For now, return a success indicator
    // In a full implementation, this would generate PDFs using a template engine
    
    return {
      success: true,
      template_name: template.name,
      generated_at: new Date().toISOString(),
      data_used: Object.keys(data)
    };
  }

  // ====== VALIDATION ======

  validateWorkflowConfig(config) {
    if (!config.name || typeof config.name !== 'string') {
      throw new Error('Workflow name is required and must be a string');
    }

    if (!config.slug || typeof config.slug !== 'string') {
      throw new Error('Workflow slug is required and must be a string');
    }

    if (!config.type || typeof config.type !== 'string') {
      throw new Error('Workflow type is required and must be a string');
    }

    if (config.phases && Array.isArray(config.phases)) {
      config.phases.forEach((phase, index) => {
        if (!phase.name || typeof phase.name !== 'string') {
          throw new Error(`Phase ${index + 1} name is required and must be a string`);
        }
        if (!phase.type || typeof phase.type !== 'string') {
          throw new Error(`Phase ${index + 1} type is required and must be a string`);
        }
      });
    }

    return true;
  }

  // ====== STATISTICS & ANALYTICS ======

  async getWorkflowStatistics(workflowId, dateRange = {}) {
    const { data: instances, error } = await supabase
      .from('workflow_instances')
      .select('id, status, started_at, completed_at')
      .eq('workflow_id', workflowId);

    if (error) throw error;

    const stats = {
      total_instances: instances.length,
      completed: instances.filter(i => i.status === 'completed').length,
      in_progress: instances.filter(i => i.status === 'in_progress').length,
      abandoned: instances.filter(i => i.status === 'abandoned').length,
      completion_rate: 0,
      average_completion_time: 0
    };

    if (stats.total_instances > 0) {
      stats.completion_rate = (stats.completed / stats.total_instances) * 100;
    }

    // Calculate average completion time
    const completedInstances = instances.filter(
      i => i.status === 'completed' && i.started_at && i.completed_at
    );

    if (completedInstances.length > 0) {
      const totalTime = completedInstances.reduce((sum, instance) => {
        const startTime = new Date(instance.started_at);
        const endTime = new Date(instance.completed_at);
        return sum + (endTime - startTime);
      }, 0);

      stats.average_completion_time = totalTime / completedInstances.length;
    }

    return stats;
  }

  // ====== HEALTH CHECK ======

  async healthCheck() {
    try {
      const { data, error } = await supabase
        .from('workflows')
        .select('count')
        .limit(1);

      return { healthy: !error, service: 'workflow-engine', error: error?.message };
    } catch (error) {
      return { healthy: false, service: 'workflow-engine', error: error.message };
    }
  }

  // ====== TRAINING CONTENT INTEGRATION ======

  /**
   * Enrich workflow items with training content
   */
  async enrichWorkflowItemsWithTrainingContent(items) {
    if (!items || !Array.isArray(items)) return;

    // Group items by training phase to minimize database queries
    const trainingPhaseIds = [...new Set(
      items
        .filter(item => item.content_source === 'training_reference' && item.training_phase_id)
        .map(item => item.training_phase_id)
    )];

    if (trainingPhaseIds.length === 0) return;

    // Fetch all required training phases
    const { data: trainingPhases, error } = await supabase
      .from('training_phases')
      .select('id, title, description, items, status')
      .in('id', trainingPhaseIds)
      .eq('status', 'published');

    if (error) {
      // console.error('❌ [WORKFLOW-ENGINE] Error fetching training phases:', error);
      return;
    }

    // Create a lookup map for training phases
    const trainingPhaseMap = new Map();
    trainingPhases?.forEach(phase => {
      trainingPhaseMap.set(phase.id, phase);
    });

    // Enrich each workflow item
    for (const item of items) {
      if (item.content_source === 'training_reference' && item.training_phase_id) {
        const trainingPhase = trainingPhaseMap.get(item.training_phase_id);
        
        if (trainingPhase && trainingPhase.items) {
          // Find the specific training item
          const trainingItem = trainingPhase.items.find(
            tItem => tItem.number === item.training_item_number
          );

          if (trainingItem) {
            // Enrich the workflow item with training content
            item.enriched_content = {
              title: trainingItem.title || item.title,
              description: trainingItem.description,
              category: trainingItem.category,
              content: trainingItem.content,
              source: 'training_phase',
              training_phase_id: trainingPhase.id,
              training_phase_title: trainingPhase.title,
              training_item_number: item.training_item_number
            };
          } else {
            // Training item not found
            item.enriched_content = {
              title: item.title,
              description: 'Training content not found',
              content: { overview: 'The referenced training content could not be found.' },
              source: 'training_phase_missing',
              error: `Training item ${item.training_item_number} not found in phase ${trainingPhase.title}`
            };
          }
        } else {
          // Training phase not found or not published
          item.enriched_content = {
            title: item.title,
            description: 'Training phase not available',
            content: { overview: 'The referenced training phase is not available.' },
            source: 'training_phase_unavailable',
            error: `Training phase ${item.training_phase_id} not found or not published`
          };
        }
      } else if (item.content_source === 'inline' || !item.content_source) {
        // Use inline content
        item.enriched_content = {
          title: item.title,
          content: item.content || {},
          source: 'inline'
        };
      }
    }
  }

  /**
   * Create or update training content for a workflow item
   */
  async createTrainingContentForWorkflowItem(workflowItemId, trainingContent) {
    try {
      // Get the workflow item
      const { data: workflowItem, error: itemError } = await supabase
        .from('workflow_phase_items')
        .select(`
          id, title, phase_id,
          workflow_phases!inner(
            id, phase_number, name,
            workflows!inner(id, name, slug)
          )
        `)
        .eq('id', workflowItemId)
        .single();

      if (itemError) throw itemError;

      const workflow = workflowItem.workflow_phases.workflows;
      const phase = workflowItem.workflow_phases;

      // Create a new training phase for this content
      const trainingPhaseData = {
        phase_number: 2000 + phase.phase_number, // Use high numbers to avoid conflicts
        title: `${workflow.name} - ${phase.name}`,
        description: `Training content for ${workflow.name}, Phase ${phase.phase_number}`,
        time_limit: 24,
        items: [{
          number: '01',
          title: trainingContent.title || workflowItem.title,
          description: trainingContent.description || '',
          category: trainingContent.category || 'general',
          content: trainingContent.content || {}
        }],
        status: 'published',
        version: 1
      };

      const { data: newTrainingPhase, error: phaseError } = await supabase
        .from('training_phases')
        .insert(trainingPhaseData)
        .select('id')
        .single();

      if (phaseError) throw phaseError;

      // Update the workflow item to reference the new training phase
      const { error: updateError } = await supabase
        .from('workflow_phase_items')
        .update({
          content_source: 'training_reference',
          training_phase_id: newTrainingPhase.id,
          training_item_number: 1
        })
        .eq('id', workflowItemId);

      if (updateError) throw updateError;

      return {
        success: true,
        training_phase_id: newTrainingPhase.id,
        workflow_item_id: workflowItemId
      };

    } catch (error) {
      // console.error('❌ [WORKFLOW-ENGINE] Error creating training content:', error);
      throw error;
    }
  }

  /**
   * Update training content for a workflow item
   */
  async updateTrainingContentForWorkflowItem(workflowItemId, trainingContent) {
    try {
      // Get the workflow item with its training reference
      const { data: workflowItem, error: itemError } = await supabase
        .from('workflow_phase_items')
        .select('id, training_phase_id, training_item_number, content_source')
        .eq('id', workflowItemId)
        .single();

      if (itemError) throw itemError;

      if (workflowItem.content_source !== 'training_reference' || !workflowItem.training_phase_id) {
        throw new Error('Workflow item is not linked to training content');
      }

      // Get the current training phase
      const { data: trainingPhase, error: phaseError } = await supabase
        .from('training_phases')
        .select('id, items')
        .eq('id', workflowItem.training_phase_id)
        .single();

      if (phaseError) throw phaseError;

      // Update the specific training item
      const updatedItems = trainingPhase.items.map(item => {
        if (item.number === workflowItem.training_item_number) {
          return {
            ...item,
            title: trainingContent.title || item.title,
            description: trainingContent.description || item.description,
            category: trainingContent.category || item.category,
            content: trainingContent.content || item.content
          };
        }
        return item;
      });

      // Update the training phase
      const { error: updateError } = await supabase
        .from('training_phases')
        .update({ items: updatedItems })
        .eq('id', workflowItem.training_phase_id);

      if (updateError) throw updateError;

      return {
        success: true,
        training_phase_id: workflowItem.training_phase_id,
        workflow_item_id: workflowItemId
      };

    } catch (error) {
      // console.error('❌ [WORKFLOW-ENGINE] Error updating training content:', error);
      throw error;
    }
  }
}

// Export singleton instance
const workflowEngine = new WorkflowEngine();

module.exports = {
  WorkflowEngine,
  workflowEngine
};