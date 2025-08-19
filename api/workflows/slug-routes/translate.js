/**
 * Workflow Translation API Endpoint
 * Translate an entire workflow structure including all phases and items
 */

const AITranslationService = require('../../../lib/aiTranslationService');
const { supabase } = require('../../../lib/supabase');
const { authenticate } = require('../../../lib/auth');
const { apiRateLimit } = require('../../../lib/rateLimit');

// Initialize translation service
const translationService = new AITranslationService();

// Load system settings for translation
async function loadTranslationSettings() {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .eq('category', 'translation');

    if (error) {

      return null;
    }

    // Convert to nested object structure
    const settings = { translation: {} };
    data.forEach(setting => {
      settings.translation[setting.key] = {
        value: setting.value,
        type: setting.type
      };
    });

    return settings;
  } catch (_error) {

    return null;
  }
}

module.exports = apiRateLimit(async function handler(req, res) {;
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
      message: 'Only POST requests are allowed'
    });
  }

  try {
    // Authenticate user
    const { user, error: authError } = await authenticate(req);
    if (authError) {
      return res.status(401).json({ error: 'Authentication required', message: authError });
    }

    const { slug } = req.query;
    const {
      targetLanguages,
      translationMethod = 'ai',
      includePhases = true,
      includeItems = true
    } = req.body;

    // Validate parameters
    if (!slug) {
      return res.status(400).json({
        error: 'Missing workflow slug',
        message: 'Workflow slug is required'
      });
    }

    if (!targetLanguages || !Array.isArray(targetLanguages) || targetLanguages.length === 0) {
      return res.status(400).json({
        error: 'Invalid targetLanguages',
        message: 'targetLanguages must be a non-empty array'
      });
    }

    // Get workflow from database
    const { data: workflow, error: workflowError } = await supabase
      .from('workflows')
      .select(`
        *,
        phases:workflow_phases(
          *,
          items:workflow_phase_items(*)
        )
      `)
      .eq('slug', slug)
      .single();

    if (workflowError) {
      return res.status(404).json({
        error: 'Workflow not found',
        message: `No workflow found with slug: ${slug}`
      });
    }

    // Check user permissions
    if (user.role !== 'admin' && user.role !== 'manager') {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: 'Only admins and managers can translate workflows'
      });
    }

    // Load translation settings from system settings
    const settings = await loadTranslationSettings();
    if (settings) {
      translationService.updateFromSettings(settings);
    }

    // Initialize translation service
    if (!translationService.initialized) {
      await translationService.initialize();
      translationService.initialized = true;
    }

    // Create translation job
    const { data: translationJob, error: jobError } = await supabase
      .from('translation_jobs')
      .insert({
        job_type: 'workflow',
        target_id: workflow.id,
        target_table: 'workflows',
        source_language: workflow.source_language || 'en',
        target_languages: targetLanguages,
        status: 'processing',
        started_by: user.userId,
        total_items: 1 + (includePhases ? workflow.phases?.length || 0 : 0) +
                     (includeItems ? workflow.phases?.reduce((sum, p) => sum + (p.items?.length || 0), 0) || 0 : 0)
      })
      .select()
      .single();

    if (jobError) {
      // console.error('Error creating translation job:', jobError);
    }

    const sourceLang = workflow.source_language || 'en';
    let completedItems = 0;

    try {
      // Translate workflow structure
      const translatedWorkflow = await translationService.translateWorkflowStructure(
        workflow,
        sourceLang,
        targetLanguages
      );

      completedItems++;

      // Update workflow in database
      const { error: updateError } = await supabase
        .from('workflows')
        .update({
          content_languages: translatedWorkflow.title?.content || {},
          source_language: sourceLang,
          supported_languages: [sourceLang, ...targetLanguages],
          translation_status: 'complete',
          last_translated_at: new Date().toISOString()
        })
        .eq('id', workflow.id);

      if (updateError) {
        // console.error('Error updating workflow:', updateError);
      }

      // Update translation job progress
      if (translationJob) {
        await supabase
          .from('translation_jobs')
          .update({
            progress_percentage: Math.round((completedItems / translationJob.total_items) * 100),
            completed_items: completedItems,
            status: completedItems === translationJob.total_items ? 'completed' : 'processing',
            completed_at: completedItems === translationJob.total_items ? new Date().toISOString() : null
          })
          .eq('id', translationJob.id);
      }

      // Return successful response
      res.status(200).json({
        success: true,
        workflow: {
          id: workflow.id,
          slug: workflow.slug,
          title: translatedWorkflow.title,
          description: translatedWorkflow.description,
          source_language: sourceLang,
          supported_languages: [sourceLang, ...targetLanguages],
          translation_status: 'complete',
          last_translated_at: new Date().toISOString()
        },
        languages_added: targetLanguages,
        translation_job_id: translationJob?.id,
        metadata: {
          method: translationMethod,
          phases_translated: includePhases,
          items_translated: includeItems,
          total_items: translationJob?.total_items || 1,
          completed_items: completedItems,
          processed_at: new Date().toISOString()
        }
      });

    } catch (translationError) {
      // console.error('Translation error:', translationError);

      // Update translation job with error
      if (translationJob) {
        await supabase
          .from('translation_jobs')
          .update({
            status: 'failed',
            error_messages: [translationError.message],
            completed_at: new Date().toISOString()
          })
          .eq('id', translationJob.id);
      }

      throw translationError;
    }

  } catch (_error) {
    // console.error('Workflow translation API error:', _error);

    // Determine error type and response
    if (_error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Workflow not found',
        message: _error.message
      });
    }

    if (_error.message.includes('Translation failed')) {
      return res.status(503).json({
        error: 'Translation service unavailable',
        message: 'Translation service is temporarily unavailable',
        details: _error.message
      });
    }

    // Generic error response
    res.status(500).json({
      error: 'Workflow translation failed',
      message: 'An unexpected error occurred during workflow translation',
      details: process.env.NODE_ENV === 'development' ? _error.message : undefined
    });
  }
});
