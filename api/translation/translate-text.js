/**
 * Translation API Endpoint - Translate Text
 * Translates a single text string using AI translation services
 */

const AITranslationService = require('../../lib/aiTranslationService.js');
const { supabase } = require('../../lib/database-supabase-compat');
const { ErrorHandler, createServiceError, createValidationError } = require('../../lib/errorHandler.js');
const { asyncHandler, requestIdMiddleware } = require('../../lib/middleware/errorMiddleware.js');
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

const handler = asyncHandler(async (req, res) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    throw createValidationError('VALIDATION_INVALID_METHOD', 'Method not allowed', {
      allowedMethods: ['POST'],
      requestedMethod: req.method
    });
  }

  try {
    const { text, sourceLang, targetLang, domain = 'maritime', forceRefresh = false } = req.body;

    // Validate required parameters
    if (!text) {
      throw createValidationError('VALIDATION_REQUIRED_FIELD', 'Text parameter is required', {
        missingFields: ['text']
      });
    }

    if (!sourceLang || !targetLang) {
      throw createValidationError('VALIDATION_REQUIRED_FIELD', 'Both sourceLang and targetLang are required', {
        missingFields: [
          ...(!sourceLang ? ['sourceLang'] : []),
          ...(!targetLang ? ['targetLang'] : [])
        ]
      });
    }

    // Validate language codes (basic check)
    const supportedLanguages = ['en', 'nl', 'de', 'fr', 'es', 'it', 'pt'];
    if (!supportedLanguages.includes(sourceLang) || !supportedLanguages.includes(targetLang)) {
      throw createValidationError('VALIDATION_UNSUPPORTED_LANGUAGE', `Supported languages: ${supportedLanguages.join(', ')}`, {
        supportedLanguages,
        requestedSourceLang: sourceLang,
        requestedTargetLang: targetLang
      });
    }

    if (sourceLang === targetLang) {
      throw createValidationError('VALIDATION_INVALID_LANGUAGE_PAIR', 'Source and target languages cannot be the same', {
        sourceLang,
        targetLang
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

    // Perform translation
    const result = await translationService.translateText(text, sourceLang, targetLang, {
      forceRefresh,
      domain
    });

    // Return successful response
    res.status(200).json({
      translation: result.translation,
      confidence: result.confidence,
      provider: result.provider,
      maritimeEnhanced: result.maritimeEnhanced || false,
      humanReviewed: result.humanReviewed || false,
      source: result.source || 'ai',
      timestamp: result.timestamp || new Date().toISOString(),
      originalText: text,
      sourceLang,
      targetLang,
      domain
    });

  } catch (error) {
    // If it's already an APIError, re-throw it to be handled by middleware
    if (error.name === 'APIError' || error.name === 'ValidationError' || error.name === 'ServiceError') {
      throw error;
    }

    // console.error('Translation API error:', error);

    // Determine error type and response
    if (error.message.includes('Translation failed')) {
      throw createServiceError('SERVICE_TRANSLATION_UNAVAILABLE', 'Translation service is temporarily unavailable', {
        originalError: error.message,
        service: 'translation'
      });
    }

    if (error.message.includes('No translation providers available')) {
      throw createServiceError('SERVICE_TRANSLATION_UNAVAILABLE', 'All translation services are currently unavailable', {
        reason: 'No providers available',
        service: 'translation'
      });
    }

    // Generic error response
    throw createServiceError('SERVICE_TRANSLATION_ERROR', 'An unexpected error occurred during translation', {
      originalError: error.message,
      service: 'translation'
    });
  }
});

// Export with error handling
const wrappedHandler = (req, res) => {
  // Add request ID middleware
  requestIdMiddleware(req, res, () => {
    // Handle the request with error middleware
    handler(req, res).catch(error => {
      ErrorHandler.handle(error, req, res);
    });
  });
};

module.exports = apiRateLimit(wrappedHandler);
