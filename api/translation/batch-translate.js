/**
 * Translation API Endpoint - Batch Translate
 * Translates multiple texts to multiple target languages efficiently
 */

const AITranslationService = require('../../lib/aiTranslationService.js');
const { supabase } = require('../../lib/database-supabase-compat');
const { apiRateLimit } = require('../../lib/rateLimit');
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
  } catch (error) {

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
    const { texts, sourceLang, targetLangs, domain = 'maritime' } = req.body;

    // Validate required parameters
    if (!texts || !Array.isArray(texts) || texts.length === 0) {
      return res.status(400).json({
        error: 'Invalid texts parameter',
        message: 'texts must be a non-empty array'
      });
    }

    if (!sourceLang) {
      return res.status(400).json({
        error: 'Missing sourceLang parameter',
        message: 'sourceLang is required'
      });
    }

    if (!targetLangs || !Array.isArray(targetLangs) || targetLangs.length === 0) {
      return res.status(400).json({
        error: 'Invalid targetLangs parameter',
        message: 'targetLangs must be a non-empty array'
      });
    }

    // Validate limits
    if (texts.length > 100) {
      return res.status(400).json({
        error: 'Too many texts',
        message: 'Maximum 100 texts per batch request'
      });
    }

    if (targetLangs.length > 10) {
      return res.status(400).json({
        error: 'Too many target languages',
        message: 'Maximum 10 target languages per batch request'
      });
    }

    // Validate language codes
    const supportedLanguages = ['en', 'nl', 'de', 'fr', 'es', 'it', 'pt'];
    if (!supportedLanguages.includes(sourceLang)) {
      return res.status(400).json({
        error: 'Unsupported source language',
        message: `Supported languages: ${supportedLanguages.join(', ')}`
      });
    }

    const invalidTargetLangs = targetLangs.filter(lang => !supportedLanguages.includes(lang));
    if (invalidTargetLangs.length > 0) {
      return res.status(400).json({
        error: 'Unsupported target language(s)',
        message: `Invalid languages: ${invalidTargetLangs.join(', ')}. Supported: ${supportedLanguages.join(', ')}`
      });
    }

    // Remove source language from target languages
    const filteredTargetLangs = targetLangs.filter(lang => lang !== sourceLang);
    if (filteredTargetLangs.length === 0) {
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

    // Perform batch translation
    const startTime = Date.now();
    const results = await translationService.batchTranslate(texts, sourceLang, filteredTargetLangs, {
      domain
    });

    const endTime = Date.now();
    const processingTime = endTime - startTime;

    // Calculate statistics
    const totalTranslations = Object.values(results).reduce((sum, langResults) =>
      sum + langResults.length, 0
    );

    const successfulTranslations = Object.values(results).reduce((sum, langResults) =>
      sum + langResults.filter(r => !r.error).length, 0
    );

    const averageConfidence = Object.values(results).reduce((sum, langResults) => {
      const validResults = langResults.filter(r => !r.error && r.confidence);
      const langAvg = validResults.length > 0
        ? validResults.reduce((s, r) => s + r.confidence, 0) / validResults.length
        : 0;
      return sum + langAvg;
    }, 0) / filteredTargetLangs.length;

    // Return successful response
    res.status(200).json({
      results,
      metadata: {
        processed_at: new Date().toISOString(),
        processing_time_ms: processingTime,
        source_language: sourceLang,
        target_languages: filteredTargetLangs,
        total_texts: texts.length,
        total_translations: totalTranslations,
        successful_translations: successfulTranslations,
        success_rate: (successfulTranslations / totalTranslations) * 100,
        average_confidence: averageConfidence,
        domain
      }
    });

  } catch (error) {
    // console.error('Batch translation API error:', error);

    // Determine error type and response
    if (error.message.includes('Translation failed')) {
      return res.status(503).json({
        error: 'Translation service unavailable',
        message: 'Translation service is temporarily unavailable',
        details: error.message
      });
    }

    if (error.message.includes('No translation providers available')) {
      return res.status(503).json({
        error: 'No translation providers available',
        message: 'All translation services are currently unavailable'
      });
    }

    // Generic error response
    res.status(500).json({
      error: 'Batch translation failed',
      message: 'An unexpected error occurred during batch translation',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});
