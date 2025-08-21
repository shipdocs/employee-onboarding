/**
 * Quiz Translation API Endpoint
 * Manages translations for quiz content including questions and answers
 */

const { requireAuth } = require('../../../../lib/auth');
const { supabase } = require('../lib/database-supabase-compat');
const AITranslationService = require('../../../../lib/aiTranslationService');
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

      // Get all quiz content for this phase with translations
      const { data: quizContent, error: contentError } = await supabase
        .schema('admin_views')
        .from('quiz_content_detailed')
        .select('*')
        .eq('quiz_phase', phase)
        .order('question_index', { ascending: true });

      if (contentError) {
        // console.error('❌ [GET] Failed to fetch quiz content:', contentError);
        return res.status(500).json({
          error: 'Failed to fetch quiz content',
          details: contentError.message
        });
      }

      // Get translation status for this phase
      const translationStatusResult = await db.query('SELECT * FROM quiz_translation_status WHERE quiz_phase = $1', [phase]);
    const translationStatus = translationStatusResult.rows;
    const statusError = false;

      if (statusError) {

      }

      // Structure the response for frontend consumption
      const structuredQuizData = {
        phase: phase,
        translation_status: translationStatus?.[0] || null,
        questions: quizContent.map(content => ({
          question_index: content.question_index,
          content_languages: content.content_languages,
          translation_metadata: content.translation_metadata,
          quiz_metadata: content.quiz_metadata,
          answer_options: content.answer_options || [],
          created_at: content.created_at,
          updated_at: content.updated_at
        }))
      };

      return res.status(200).json(structuredQuizData);
    }

    if (req.method === 'POST') {

      // Only admins and managers can create/update translations
      if (!['admin', 'manager'].includes(user.role)) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          message: 'Only admins and managers can manage quiz translations'
        });
      }

      const {
        question_index,
        content_type = 'question', // 'question', 'instructions', 'feedback'
        target_language,
        translated_content,
        answer_translations = [], // Array of {answer_index, translated_text, translated_explanation}
        translation_method = 'manual',
        auto_save = false
      } = req.body;

      // Validate required fields
      if (question_index === undefined || !target_language) {
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'question_index and target_language are required'
        });
      }

      // Load translation settings from system settings
      const settings = await loadTranslationSettings();
      if (settings) {
        translationService.updateFromSettings(settings);
      }

      // Initialize translation service if not already done
      if (!translationService.initialized) {
        await translationService.initialize();
        translationService.initialized = true;
      }

      try {
        // Start a transaction for atomic updates
        const updates = [];

        // Update question content if provided
        if (translated_content) {
          const { data: existingContent, error: fetchError } = await supabase
            .from('quiz_content_multilingual')
            .select('content_languages, translation_metadata')
            .eq('quiz_phase', phase)
            .eq('question_index', question_index)
            .eq('content_type', content_type)
            .single();

          if (fetchError && fetchError.code !== 'PGRST116') {
            throw new Error(`Failed to fetch existing content: ${fetchError.message}`);
          }

          // Prepare updated content languages
          const updatedContentLanguages = {
            ...(existingContent?.content_languages || {}),
            [target_language]: translated_content
          };

          const updatedTranslationMetadata = {
            ...(existingContent?.translation_metadata || {}),
            [target_language]: {
              confidence: 0.95,
              method: translation_method,
              translated_at: new Date().toISOString(),
              human_reviewed: translation_method === 'manual',
              reviewed_by: translation_method === 'manual' ? user.id : null,
              reviewed_at: translation_method === 'manual' ? new Date().toISOString() : null
            }
          };

          // Upsert quiz content
          const { error: contentUpdateError } = await supabase
            .from('quiz_content_multilingual')
            .upsert({
              quiz_phase: phase,
              question_index: parseInt(question_index),
              content_type: content_type,
              source_language: 'en', // Default source language
              content_languages: updatedContentLanguages,
              translation_metadata: updatedTranslationMetadata,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'quiz_phase,question_index,content_type'
            });

          if (contentUpdateError) {
            throw new Error(`Failed to update quiz content: ${contentUpdateError.message}`);
          }

          updates.push('question_content');
        }

        // Update answer translations if provided
        if (answer_translations && answer_translations.length > 0) {
          for (const answerTranslation of answer_translations) {
            const { answer_index, translated_text, translated_explanation } = answerTranslation;

            if (answer_index !== undefined && translated_text) {
              // Get existing answer option
              const { data: existingAnswer, error: fetchAnswerError } = await supabase
                .from('quiz_answer_options_multilingual')
                .select('content_languages, explanation_languages')
                .eq('quiz_phase', phase)
                .eq('question_index', question_index)
                .eq('answer_index', answer_index)
                .single();

              if (fetchAnswerError && fetchAnswerError.code !== 'PGRST116') {

                continue;
              }

              // Update answer content
              const updatedAnswerLanguages = {
                ...(existingAnswer?.content_languages || {}),
                [target_language]: translated_text
              };

              const updatedExplanationLanguages = {
                ...(existingAnswer?.explanation_languages || {}),
                ...(translated_explanation ? { [target_language]: translated_explanation } : {})
              };

              const { error: answerUpdateError } = await supabase
                .from('quiz_answer_options_multilingual')
                .update({
                  content_languages: updatedAnswerLanguages,
                  explanation_languages: updatedExplanationLanguages,
                  updated_at: new Date().toISOString()
                })
                .eq('quiz_phase', phase)
                .eq('question_index', question_index)
                .eq('answer_index', answer_index);

              if (answerUpdateError) {
                // console.error(`Failed to update answer ${answer_index}:`, answerUpdateError);
              } else {
                updates.push(`answer_${answer_index}`);
              }
            }
          }
        }

        return res.status(200).json({
          success: true,
          phase: phase,
          question_index: question_index,
          target_language: target_language,
          updates_applied: updates,
          translation_method: translation_method,
          timestamp: new Date().toISOString()
        });

      } catch (updateError) {
        // console.error('❌ [POST] Failed to update quiz translations:', updateError);
        return res.status(500).json({
          error: 'Failed to save quiz translations',
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

      const { question_index, target_language, content_type = 'question' } = req.body;

      if (question_index === undefined || !target_language) {
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'question_index and target_language are required'
        });
      }

      // Remove translation from quiz content
      const { data: existingContent, error: fetchError } = await supabase
        .from('quiz_content_multilingual')
        .select('content_languages, translation_metadata')
        .eq('quiz_phase', phase)
        .eq('question_index', question_index)
        .eq('content_type', content_type)
        .single();

      if (fetchError) {
        return res.status(404).json({ error: 'Quiz content not found' });
      }

      // Remove target language from content
      const updatedContentLanguages = { ...existingContent.content_languages };
      const updatedTranslationMetadata = { ...existingContent.translation_metadata };
      delete updatedContentLanguages[target_language];
      delete updatedTranslationMetadata[target_language];

      const { error: deleteError } = await supabase
        .from('quiz_content_multilingual')
        .update({
          content_languages: updatedContentLanguages,
          translation_metadata: updatedTranslationMetadata,
          updated_at: new Date().toISOString()
        })
        .eq('quiz_phase', phase)
        .eq('question_index', question_index)
        .eq('content_type', content_type);

      if (deleteError) {
        // console.error('❌ [DELETE] Failed to delete quiz translation:', deleteError);
        return res.status(500).json({
          error: 'Failed to delete translation',
          details: deleteError.message
        });
      }

      return res.status(200).json({
        success: true,
        message: `Translation removed for ${target_language}`
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (_error) {
    // console.error('❌ [ERROR] Quiz translations API error:', _error);
    return res.status(500).json({
      error: 'Internal server error',
      details: _error.message
    });
  }
}

module.exports = trainingRateLimit(requireAuth(handler));
