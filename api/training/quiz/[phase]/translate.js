/**
 * Quiz Batch Translation API Endpoint
 * Automatically translates entire quiz content to target languages using AI
 */

const { requireAuth } = require('../../../../lib/auth');
const { createClient } = require('@supabase/supabase-js');
const AITranslationService = require('../../../../lib/aiTranslationService');
const { trainingRateLimit } = require('../../../../lib/rateLimit');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
      message: 'Only POST requests are allowed'
    });
  }

  try {

    const user = req.user;
    const { phase } = req.query;

    if (!phase) {
      return res.status(400).json({ error: 'Phase parameter is required' });
    }

    // Only admins and managers can perform batch translations
    if (!['admin', 'manager'].includes(user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: 'Only admins and managers can perform batch translations'
      });
    }

    const {
      target_languages = [],
      source_language = 'en',
      translation_method = 'ai',
      overwrite_existing = false,
      include_answers = true,
      include_explanations = true
    } = req.body;

    // Validate parameters
    if (!target_languages || !Array.isArray(target_languages) || target_languages.length === 0) {
      return res.status(400).json({
        error: 'Invalid target_languages',
        message: 'target_languages must be a non-empty array'
      });
    }

    // Validate language codes
    const supportedLanguages = ['en', 'nl', 'de', 'fr', 'es', 'it', 'pt'];
    const invalidLanguages = target_languages.filter(lang => !supportedLanguages.includes(lang));
    if (invalidLanguages.length > 0) {
      return res.status(400).json({
        error: 'Unsupported languages',
        message: `Invalid languages: ${invalidLanguages.join(', ')}. Supported: ${supportedLanguages.join(', ')}`
      });
    }

    // Remove source language from target languages
    const filteredTargetLanguages = target_languages.filter(lang => lang !== source_language);
    if (filteredTargetLanguages.length === 0) {
      return res.status(400).json({
        error: 'No valid target languages',
        message: 'Target languages cannot be the same as source language'
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

    // Get all quiz content for this phase
    const { data: quizContent, error: contentError } = await supabase
      .schema('admin_views')
      .from('quiz_content_detailed')
      .select('*')
      .eq('quiz_phase', phase)
      .order('question_index', { ascending: true });

    if (contentError) {
      // console.error('❌ [TRANSLATE] Failed to fetch quiz content:', contentError);
      return res.status(500).json({
        error: 'Failed to fetch quiz content',
        details: contentError.message
      });
    }

    if (!quizContent || quizContent.length === 0) {
      return res.status(404).json({
        error: 'No quiz content found',
        message: `No quiz content found for phase: ${phase}`
      });
    }

    // Create translation job record
    const { data: translationJob, error: jobError } = await supabase
      .from('translation_jobs')
      .insert({
        job_type: 'quiz',
        target_id: phase, // Using phase as identifier since we don't have a quiz ID
        target_table: 'quiz_content_multilingual',
        source_language: source_language,
        target_languages: filteredTargetLanguages,
        status: 'processing',
        started_by: user.id,
        total_items: quizContent.length * filteredTargetLanguages.length
      })
      .select()
      .single();

    if (jobError) {
      // console.error('❌ [TRANSLATE] Error creating translation job:', jobError);
    }

    const startTime = Date.now();
    let translatedQuestions = 0;
    let translationErrors = [];
    const translationResults = [];

    try {
      // Process each question
      for (const question of quizContent) {
        const questionResult = {
          question_index: question.question_index,
          languages: {},
          errors: []
        };

        // Get source text for question
        const sourceQuestionText = question.content_languages[source_language];
        if (!sourceQuestionText) {

          questionResult.errors.push(`No source text in ${source_language}`);
          translationResults.push(questionResult);
          continue;
        }

        // Translate question to each target language
        for (const targetLang of filteredTargetLanguages) {
          try {
            // Check if translation already exists and should be skipped
            if (!overwrite_existing && question.content_languages[targetLang]) {

              questionResult.languages[targetLang] = { skipped: true, reason: 'already_exists' };
              continue;
            }

            // Translate question text
            const questionTranslation = await translationService.translateText(
              sourceQuestionText,
              source_language,
              targetLang,
              { domain: 'maritime', forceRefresh: overwrite_existing }
            );

            // Prepare updated content languages
            const updatedContentLanguages = {
              ...question.content_languages,
              [targetLang]: questionTranslation.translation
            };

            const updatedTranslationMetadata = {
              ...(question.translation_metadata || {}),
              [targetLang]: {
                confidence: questionTranslation.confidence || 0.95,
                method: translation_method,
                translated_at: new Date().toISOString(),
                human_reviewed: false,
                provider: questionTranslation.provider || 'ai'
              }
            };

            // Update quiz content
            const { error: updateError } = await supabase
              .from('quiz_content_multilingual')
              .update({
                content_languages: updatedContentLanguages,
                translation_metadata: updatedTranslationMetadata,
                updated_at: new Date().toISOString()
              })
              .eq('quiz_phase', phase)
              .eq('question_index', question.question_index)
              .eq('content_type', 'question');

            if (updateError) {
              throw new Error(`Failed to update question: ${updateError.message}`);
            }

            // Translate answer options if enabled
            const answerTranslations = [];
            if (include_answers && question.answer_options) {
              for (const answer of question.answer_options) {
                const sourceAnswerText = answer.content_languages[source_language];
                if (sourceAnswerText) {
                  try {
                    const answerTranslation = await translationService.translateText(
                      sourceAnswerText,
                      source_language,
                      targetLang,
                      { domain: 'maritime', forceRefresh: overwrite_existing }
                    );

                    // Prepare answer translation
                    const updatedAnswerLanguages = {
                      ...answer.content_languages,
                      [targetLang]: answerTranslation.translation
                    };

                    let updatedExplanationLanguages = { ...answer.explanation_languages };

                    // Translate explanation if it exists and include_explanations is true
                    if (include_explanations && answer.explanation_languages[source_language]) {
                      const explanationTranslation = await translationService.translateText(
                        answer.explanation_languages[source_language],
                        source_language,
                        targetLang,
                        { domain: 'maritime', forceRefresh: overwrite_existing }
                      );
                      updatedExplanationLanguages[targetLang] = explanationTranslation.translation;
                    }

                    // Update answer option
                    const { error: answerUpdateError } = await supabase
                      .from('quiz_answer_options_multilingual')
                      .update({
                        content_languages: updatedAnswerLanguages,
                        explanation_languages: updatedExplanationLanguages,
                        updated_at: new Date().toISOString()
                      })
                      .eq('quiz_phase', phase)
                      .eq('question_index', question.question_index)
                      .eq('answer_index', answer.answer_index);

                    if (answerUpdateError) {
                      // console.error(`❌ [TRANSLATE] Failed to update answer ${answer.answer_index}:`, answerUpdateError);
                    } else {
                      answerTranslations.push({
                        answer_index: answer.answer_index,
                        translated: true,
                        confidence: answerTranslation.confidence
                      });
                    }
                  } catch (answerError) {
                    // console.error(`❌ [TRANSLATE] Failed to translate answer ${answer.answer_index}:`, answerError);
                    answerTranslations.push({
                      answer_index: answer.answer_index,
                      translated: false,
                      error: answerError.message
                    });
                  }
                }
              }
            }

            questionResult.languages[targetLang] = {
              translated: true,
              confidence: questionTranslation.confidence,
              answer_translations: answerTranslations
            };

          } catch (translationError) {
            // console.error(`❌ [TRANSLATE] Failed to translate question ${question.question_index} to ${targetLang}:`, translationError);
            questionResult.errors.push(`${targetLang}: ${translationError.message}`);
            translationErrors.push({
              question_index: question.question_index,
              target_language: targetLang,
              error: translationError.message
            });
          }
        }

        translationResults.push(questionResult);
        translatedQuestions++;

        // Update job progress
        if (translationJob) {
          const progress = Math.round((translatedQuestions / quizContent.length) * 100);
          await supabase
            .from('translation_jobs')
            .update({
              progress_percentage: progress,
              completed_items: translatedQuestions,
              failed_items: translationErrors.length
            })
            .eq('id', translationJob.id);
        }
      }

      // Update final job status
      if (translationJob) {
        await supabase
          .from('translation_jobs')
          .update({
            status: translationErrors.length === 0 ? 'completed' : 'completed_with_errors',
            progress_percentage: 100,
            completed_items: translatedQuestions,
            failed_items: translationErrors.length,
            error_messages: translationErrors.length > 0 ? translationErrors : null,
            completed_at: new Date().toISOString()
          })
          .eq('id', translationJob.id);
      }

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Return success response
      return res.status(200).json({
        success: true,
        phase: phase,
        source_language: source_language,
        target_languages: filteredTargetLanguages,
        results: {
          total_questions: quizContent.length,
          translated_questions: translatedQuestions,
          failed_translations: translationErrors.length,
          processing_time_ms: processingTime,
          translation_results: translationResults
        },
        translation_job_id: translationJob?.id,
        metadata: {
          method: translation_method,
          include_answers: include_answers,
          include_explanations: include_explanations,
          overwrite_existing: overwrite_existing,
          processed_at: new Date().toISOString()
        },
        errors: translationErrors.length > 0 ? translationErrors : undefined
      });

    } catch (_error) {
      // console.error('❌ [TRANSLATE] Batch translation failed:', _error);

      // Update translation job with error
      if (translationJob) {
        await supabase
          .from('translation_jobs')
          .update({
            status: 'failed',
            error_messages: [_error.message],
            completed_at: new Date().toISOString()
          })
          .eq('id', translationJob.id);
      }

      return res.status(500).json({
        error: 'Batch translation failed',
        message: _error.message,
        phase: phase,
        translation_job_id: translationJob?.id
      });
    }

  } catch (_error) {
    // console.error('❌ [ERROR] Quiz batch translation API error:', _error);

    // Determine error type and response
    if (_error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Quiz not found',
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
    return res.status(500).json({
      error: 'Quiz translation failed',
      message: 'An unexpected error occurred during quiz translation',
      details: process.env.NODE_ENV === 'development' ? _error.message : undefined
    });
  }
}

module.exports = trainingRateLimit(requireAuth(handler));
