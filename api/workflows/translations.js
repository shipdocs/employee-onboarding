const { requireAuth } = require('../../lib/auth.js');
const { supabase } = require('../../lib/database-supabase-compat');
const { apiRateLimit } = require('../../lib/rateLimit');

async function handler(req, res) {
  try {

    const user = req.user;
    const { workflow_id: workflowId } = req.query;

    if (!workflowId) {
      return res.status(400).json({ error: 'workflow_id query parameter is required' });
    }

    if (req.method === 'GET') {

      // Verify workflow exists and user has access
      const workflowResult = await db.query('SELECT id, name, slug FROM workflows WHERE id = $1', [workflowId]);
    const workflow = workflowResult.rows[0];
    const workflowError = !workflow;

      if (workflowError || !workflow) {
        // console.error('❌ [GET] Workflow not found:', workflowError);
        return res.status(404).json({ error: 'Workflow not found' });
      }

      // Fetch all translations for this workflow
      const { data: translations, error } = await supabase
        .from('workflow_translations')
        .select(`
          id,
          field_name,
          source_language,
          target_language,
          source_text,
          translated_text,
          confidence_score,
          translation_method,
          human_reviewed,
          reviewed_by,
          reviewed_at,
          created_at,
          updated_at
        `)
        .eq('workflow_id', workflowId)
        .order('field_name', { ascending: true })
        .order('target_language', { ascending: true });

      if (error) {
        // console.error('❌ [GET] Failed to fetch workflow translations:', _error);
        return res.status(500).json({
          error: 'Failed to fetch translations',
          details: _error.message
        });
      }

      // Group translations by field and language
      const groupedTranslations = {};
      translations.forEach(translation => {
        if (!groupedTranslations[translation.field_name]) {
          groupedTranslations[translation.field_name] = {};
        }
        groupedTranslations[translation.field_name][translation.target_language] = {
          id: translation.id,
          translated_text: translation.translated_text,
          confidence_score: parseFloat(translation.confidence_score),
          translation_method: translation.translation_method,
          human_reviewed: translation.human_reviewed,
          reviewed_by: translation.reviewed_by,
          reviewed_at: translation.reviewed_at,
          created_at: translation.created_at,
          updated_at: translation.updated_at
        };
      });

      return res.status(200).json({
        workflow: {
          id: workflow.id,
          name: workflow.name,
          slug: workflow.slug
        },
        translations: groupedTranslations
      });
    }

    if (req.method === 'POST') {

      // Only admins and managers can create/update translations
      if (!['admin', 'manager'].includes(user.role)) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          message: 'Only admins and managers can manage translations'
        });
      }

      const {
        field_name,
        source_language = 'en',
        target_language,
        source_text,
        translated_text,
        confidence_score = 0.95,
        translation_method = 'manual',
        human_reviewed = true
      } = req.body;

      // Validate required fields
      if (!field_name || !target_language || !source_text || !translated_text) {
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'field_name, target_language, source_text, and translated_text are required'
        });
      }

      // Verify workflow exists
      const workflowResult = await db.query('SELECT id FROM workflows WHERE id = $1', [workflowId]);
    const workflow = workflowResult.rows[0];
    const workflowError = !workflow;

      if (workflowError || !workflow) {
        return res.status(404).json({ error: 'Workflow not found' });
      }

      // Upsert translation
      const { data: translation, error } = await supabase
        .from('workflow_translations')
        .upsert({
          workflow_id: workflowId,
          field_name,
          source_language,
          target_language,
          source_text,
          translated_text,
          confidence_score,
          translation_method,
          human_reviewed,
          reviewed_by: human_reviewed ? user.userId : null,
          reviewed_at: human_reviewed ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'workflow_id,field_name,target_language'
        })
        .select()
        .single();

      if (error) {
        // console.error('❌ [POST] Failed to create/update translation:', _error);
        return res.status(500).json({
          error: 'Failed to save translation',
          details: _error.message
        });
      }

      return res.status(200).json(translation);
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (_error) {
    // console.error('❌ [ERROR] Workflow translations API error:', _error);
    return res.status(500).json({
      error: 'Internal server error',
      details: _error.message
    });
  }
}

module.exports = apiRateLimit(requireAuth(handler));
