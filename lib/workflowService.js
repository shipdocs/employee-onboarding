/**
 * Workflow Service for Vercel API Routes
 *
 * This is a Vercel-compatible version of the workflow engine
 * that can be used within API routes without external service dependencies
 */

const { supabase } = require('./database-supabase-compat');

class WorkflowService {
  constructor() {
    this.supabase = supabase;
  }

  /**
   * Get workflows with optional filters
   */
  async getWorkflows(filters = {}) {
    try {
      // Simple query for content management - just basic workflow info
      let query = this.db.from('workflows').select(`
        id, name, slug, description, type, status, version,
        created_at, updated_at
      `);

      // Apply filters
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

      if (error) {
        console.error('Error fetching workflows:', error);
        throw new Error(`Failed to fetch workflows: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('WorkflowService.getWorkflows error:', error);
      throw error;
    }
  }

  /**
   * Get a single workflow by slug
   */
  async getWorkflowBySlug(slug) {
    try {
      const { data, error } = await this.supabase
        .from('workflows')
        .select(`
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
        `)
        .eq('slug', slug)
        .single();

      if (error) {
        console.error('Error fetching workflow by slug:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('WorkflowService.getWorkflowBySlug error:', error);
      throw error;
    }
  }

  /**
   * Get a single workflow by ID
   */
  async getWorkflow(id) {
    try {
      const { data, error } = await this.supabase
        .from('workflows')
        .select(`
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
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching workflow:', error);
        throw new Error(`Failed to fetch workflow: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('WorkflowService.getWorkflow error:', error);
      throw error;
    }
  }

  /**
   * Create a new workflow
   */
  async createWorkflow(workflowData) {
    try {
      const { data, error } = await this.supabase
        .from('workflows')
        .insert(workflowData)
        .select()
        .single();

      if (error) {
        console.error('Error creating workflow:', error);
        throw new Error(`Failed to create workflow: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('WorkflowService.createWorkflow error:', error);
      throw error;
    }
  }

  /**
   * Update an existing workflow
   */
  async updateWorkflow(id, updates) {
    try {
      const { data, error } = await this.supabase
        .from('workflows')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating workflow:', error);
        throw new Error(`Failed to update workflow: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('WorkflowService.updateWorkflow error:', error);
      throw error;
    }
  }

  /**
   * Delete a workflow
   */
  async deleteWorkflow(id) {
    try {
      const { error } = await this.supabase
        .from('workflows')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting workflow:', error);
        throw new Error(`Failed to delete workflow: ${error.message}`);
      }

      return { success: true };
    } catch (error) {
      console.error('WorkflowService.deleteWorkflow error:', error);
      throw error;
    }
  }

  /**
   * Start a workflow instance for a user
   */
  async startWorkflow(workflowSlug, userId, additionalData = {}) {
    try {
      // Get the workflow by slug
      const { data: workflow, error: workflowError } = await this.supabase
        .from('workflows')
        .select('*')
        .eq('slug', workflowSlug)
        .eq('status', 'active')
        .single();

      if (workflowError || !workflow) {
        throw new Error(`Workflow not found: ${workflowSlug}`);
      }

      // Create workflow instance
      const instanceData = {
        workflow_id: workflow.id,
        user_id: userId,
        status: 'in_progress',
        current_phase: 1,
        metadata: additionalData,
        started_at: new Date().toISOString()
      };

      const { data: instance, error: instanceError } = await this.supabase
        .from('workflow_instances')
        .insert(instanceData)
        .select()
        .single();

      if (instanceError) {
        throw new Error(`Failed to create workflow instance: ${instanceError.message}`);
      }

      return instance;
    } catch (error) {
      console.error('WorkflowService.startWorkflow error:', error);
      throw error;
    }
  }

  /**
   * Get workflow instance
   */
  async getWorkflowInstance(instanceId) {
    try {
      const { data, error } = await this.supabase
        .from('workflow_instances')
        .select(`
          *,
          workflow:workflows(*)
        `)
        .eq('id', instanceId)
        .single();

      if (error) {
        throw new Error(`Failed to fetch workflow instance: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('WorkflowService.getWorkflowInstance error:', error);
      throw error;
    }
  }

  /**
   * Validate workflow configuration
   */
  validateWorkflowConfig(config) {
    if (!config.name || !config.slug || !config.type) {
      throw new Error('Workflow must have name, slug, and type');
    }

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(config.slug)) {
      throw new Error('Slug must contain only lowercase letters, numbers, and hyphens');
    }

    // Validate type
    const validTypes = ['maritime_training', 'standard', 'quiz', 'assessment', 'certification'];
    if (!validTypes.includes(config.type)) {
      throw new Error(`Invalid workflow type. Must be one of: ${validTypes.join(', ')}`);
    }

    return true;
  }
}

// Export singleton instance
const workflowService = new WorkflowService();

module.exports = {
  workflowService,
  WorkflowService
};
