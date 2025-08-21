/**
 * Phase Translation API Endpoint
 * Enhanced endpoint for managing phase content translations
 */

const { requireAuth } = require('../../../../lib/auth.js');
const { supabase } = require('../lib/database-supabase-compat');
const AITranslationService = require('../../../../lib/aiTranslationService.js');
const { trainingRateLimit } = require('../../../../lib/rateLimit');
// Supabase client is already initialized from the import above

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

async function handler(req, res) {
  try {

    const user = req.user;
    const { phase } = req.query;

    if (!phase) {
      return res.status(400).json({ error: 'Phase parameter is required' });
    }

    if (req.method === 'GET') {

      // Get phase data with translations from workflow system
      const { data: phaseData, error: phaseError } = await supabase
        .from('workflow_phases')
        .select(`
          id,
          phase_number,
          title,
          description,
          content_languages,
          source_language,
          translation_confidence,
          workflow_id,
          workflows!inner(id, name, slug)
        `)
        .eq('phase_number', phase)
        .single();

      if (phaseError) {
        // console.error('❌ [GET] Failed to fetch phase data:', phaseError);
        return res.status(404).json({
          error: 'Phase not found',
          details: phaseError.message
        });
      }

      // Get phase items with translations
      const { data: phaseItems, error: itemsError } = await supabase
        .from('workflow_phase_items')
        .select(`
          id,
          item_number,
          title,
          description,
          content,
          content_languages,
          source_language,
          translation_confidence
        `)
        .eq('phase_id', phaseData.id)
        .order('item_number', { ascending: true });

      if (itemsError) {

      }

      // Get workflow-level translations for this phase
      const { data: workflowTranslations, error: translationsError } = await supabase
        .from('workflow_translations')
        .select('*')
        .eq('workflow_id', phaseData.workflow_id)
        .like('field_name', `phase_${phaseData.id}_%`);

      if (translationsError) {

      }

      // Structure the response
      const phaseTranslations = {
        phase_info: {
          id: phaseData.id,
          phase_number: phaseData.phase_number,
          workflow: phaseData.workflows,
          source_language: phaseData.source_language || 'en'
        },
        phase_content: {
          title: {
            source_text: phaseData.title,
            content_languages: phaseData.content_languages || {},
            translation_confidence: phaseData.translation_confidence || {}
          },
          description: {
            source_text: phaseData.description,
            content_languages: phaseData.content_languages || {},
            translation_confidence: phaseData.translation_confidence || {}
          }
        },
        phase_items: phaseItems?.map(item => ({
          id: item.id,
          item_number: item.item_number,
          title: {
            source_text: item.title,
            content_languages: item.content_languages || {},
            translation_confidence: item.translation_confidence || {}
          },
          description: {
            source_text: item.description,
            content_languages: item.content_languages || {},
            translation_confidence: item.translation_confidence || {}
          },
          content: {
            source_text: item.content,
            content_languages: item.content_languages || {},
            translation_confidence: item.translation_confidence || {}
          }
        })) || [],
        workflow_translations: workflowTranslations?.reduce((acc, trans) => {
          const fieldKey = trans.field_name.replace(`phase_${phaseData.id}_`, '');
          if (!acc[fieldKey]) acc[fieldKey] = {};
          acc[fieldKey][trans.target_language] = {
            id: trans.id,
            translated_text: trans.translated_text,
            confidence_score: parseFloat(trans.confidence_score),
            translation_method: trans.translation_method,
            human_reviewed: trans.human_reviewed,
            reviewed_by: trans.reviewed_by,
            reviewed_at: trans.reviewed_at,
            created_at: trans.created_at,
            updated_at: trans.updated_at
          };
          return acc;
        }, {}) || {}
      };

      return res.status(200).json(phaseTranslations);
    }

    if (req.method === 'POST') {

      // Only admins and managers can create/update translations
      if (!['admin', 'manager'].includes(user.role)) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          message: 'Only admins and managers can manage phase translations'
        });
      }

      const {
        field_name, // 'title', 'description', 'item_title', 'item_description', 'item_content'
        item_id = null, // Required for item-level translations
        target_language,
        translated_text,
        translation_method = 'manual',
        confidence_score = 0.95
      } = req.body;

      // Validate required fields
      if (!field_name || !target_language || !translated_text) {
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'field_name, target_language, and translated_text are required'
        });
      }

      // Get phase data to determine workflow_id
      const phaseDataResult = await db.query('SELECT id, workflow_id, content_languages, translation_confidence FROM workflow_phases WHERE phase_number = $1', [phase]);
    const phaseData = phaseDataResult.rows[0];
    const phaseError = !phaseData;

      if (phaseError) {
        return res.status(404).json({ error: 'Phase not found' });
      }

      try {
        // Handle different types of translations
        if (field_name.startsWith('item_') && item_id) {
          // Item-level translation
          const itemField = field_name.replace('item_', '');

          // Get existing item data
          const itemDataResult = await db.query('SELECT content_languages, translation_confidence FROM workflow_phase_items WHERE id = $1', [item_id]);
    const itemData = itemDataResult.rows[0];
    const itemError = !itemData;

          if (itemError) {
            return res.status(404).json({ error: 'Phase item not found' });
          }

          // Update item content languages
          const updatedContentLanguages = {
            ...(itemData.content_languages || {}),
            [target_language]: translated_text
          };

          const updatedTranslationConfidence = {
            ...(itemData.translation_confidence || {}),
            [target_language]: {
              confidence: confidence_score,
              method: translation_method,
              translated_at: new Date().toISOString(),
              human_reviewed: translation_method === 'manual',
              reviewed_by: translation_method === 'manual' ? user.id : null,
              reviewed_at: translation_method === 'manual' ? new Date().toISOString() : null
            }
          };

          // Update the item
          const { error: updateError } = await supabase
            .from('workflow_phase_items')
            .update({
              content_languages: updatedContentLanguages,
              translation_confidence: updatedTranslationConfidence,
              updated_at: new Date().toISOString()
            })
            .eq('id', item_id);

          if (updateError) {
            throw new Error(`Failed to update phase item: ${updateError.message}`);
          }

        } else {
          // Phase-level translation (title, description)
          const updatedContentLanguages = {
            ...(phaseData.content_languages || {}),
            [target_language]: translated_text
          };

          const updatedTranslationConfidence = {
            ...(phaseData.translation_confidence || {}),
            [target_language]: {
              confidence: confidence_score,
              method: translation_method,
              translated_at: new Date().toISOString(),
              human_reviewed: translation_method === 'manual',
              reviewed_by: translation_method === 'manual' ? user.id : null,
              reviewed_at: translation_method === 'manual' ? new Date().toISOString() : null
            }
          };

          // Update the phase
          const { error: updateError } = await supabase
            .from('workflow_phases')
            .update({
              content_languages: updatedContentLanguages,
              translation_confidence: updatedTranslationConfidence,
              updated_at: new Date().toISOString()
            })
            .eq('id', phaseData.id);

          if (updateError) {
            throw new Error(`Failed to update phase: ${updateError.message}`);
          }
        }

        // Also store in workflow_translations table for consistency
        const workflowFieldName = item_id
          ? `phase_${phaseData.id}_item_${item_id}_${field_name.replace('item_', '')}`
          : `phase_${phaseData.id}_${field_name}`;

        const { error: workflowTranslationError } = await supabase
          .from('workflow_translations')
          .upsert({
            workflow_id: phaseData.workflow_id,
            field_name: workflowFieldName,
            source_language: 'en', // Default source language
            target_language: target_language,
            source_text: translated_text, // We don't have the original source text here
            translated_text: translated_text,
            confidence_score: confidence_score,
            translation_method: translation_method,
            human_reviewed: translation_method === 'manual',
            reviewed_by: translation_method === 'manual' ? user.id : null,
            reviewed_at: translation_method === 'manual' ? new Date().toISOString() : null,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'workflow_id,field_name,target_language'
          });

        if (workflowTranslationError) {

        }

        return res.status(200).json({
          success: true,
          phase: phase,
          field_name: field_name,
          target_language: target_language,
          translation_method: translation_method,
          item_id: item_id,
          timestamp: new Date().toISOString()
        });

      } catch (updateError) {
        // console.error('❌ [POST] Failed to update phase translation:', updateError);
        return res.status(500).json({
          error: 'Failed to save phase translation',
          details: updateError.message
        });
      }
    }

    if (req.method === 'DELETE') {

      // Only admins can delete translations
      if (user.role !== 'admin') {
        return res.status(403).json({
          error: 'Insufficient permissions',
          message: 'Only admins can delete translations'
        });
      }

      const { field_name, item_id = null, target_language } = req.body;

      if (!field_name || !target_language) {
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'field_name and target_language are required'
        });
      }

      // Get phase data
      const phaseDataResult = await db.query('SELECT id, workflow_id FROM workflow_phases WHERE phase_number = $1', [phase]);
    const phaseData = phaseDataResult.rows[0];
    const phaseError = !phaseData;

      if (phaseError) {
        return res.status(404).json({ error: 'Phase not found' });
      }

      try {
        // Remove from appropriate table
        if (field_name.startsWith('item_') && item_id) {
          // Remove from item
          const itemDataResult = await db.query('SELECT content_languages, translation_confidence FROM workflow_phase_items WHERE id = $1', [item_id]);
    const itemData = itemDataResult.rows[0];
    const itemError = !itemData;

          if (itemError) {
            return res.status(404).json({ error: 'Phase item not found' });
          }

          const updatedContentLanguages = { ...itemData.content_languages };
          const updatedTranslationConfidence = { ...itemData.translation_confidence };
          delete updatedContentLanguages[target_language];
          delete updatedTranslationConfidence[target_language];

          await supabase
            .from('workflow_phase_items')
            .update({
              content_languages: updatedContentLanguages,
              translation_confidence: updatedTranslationConfidence,
              updated_at: new Date().toISOString()
            })
            .eq('id', item_id);

        } else {
          // Remove from phase
          const updatedContentLanguages = { ...phaseData.content_languages };
          const updatedTranslationConfidence = { ...phaseData.translation_confidence };
          delete updatedContentLanguages[target_language];
          delete updatedTranslationConfidence[target_language];

          await supabase
            .from('workflow_phases')
            .update({
              content_languages: updatedContentLanguages,
              translation_confidence: updatedTranslationConfidence,
              updated_at: new Date().toISOString()
            })
            .eq('id', phaseData.id);
        }

        // Also remove from workflow_translations table
        const workflowFieldName = item_id
          ? `phase_${phaseData.id}_item_${item_id}_${field_name.replace('item_', '')}`
          : `phase_${phaseData.id}_${field_name}`;

        await supabase
          .from('workflow_translations')
          .delete()
          .eq('workflow_id', phaseData.workflow_id)
          .eq('field_name', workflowFieldName)
          .eq('target_language', target_language);

        return res.status(200).json({
          success: true,
          message: `Translation removed for ${target_language}`
        });

      } catch (deleteError) {
        // console.error('❌ [DELETE] Failed to delete phase translation:', deleteError);
        return res.status(500).json({
          error: 'Failed to delete translation',
          details: deleteError.message
        });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (_error) {
    // console.error('❌ [ERROR] Phase translations API error:', _error);
    return res.status(500).json({
      error: 'Internal server error',
      details: _error.message
    });
  }
}

module.exports = trainingRateLimit(requireAuth(handler));
