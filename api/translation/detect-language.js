/**
 * Translation API Endpoint - Detect Language
 * Automatically detect the language of provided text
 */

const AITranslationService = require('../../lib/aiTranslationService.js');
const { apiRateLimit } = require('../../lib/rateLimit');
// Initialize translation service
const translationService = new AITranslationService();

module.exports = apiRateLimit(async function handler(req, res) {;
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
      message: 'Only POST requests are supported'
    });
  }

  try {
    const { text } = req.body;

    // Validate required parameters
    if (!text) {
      return res.status(400).json({
        error: 'Missing required parameter',
        message: 'Text parameter is required'
      });
    }

    if (typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({
        error: 'Invalid text parameter',
        message: 'Text must be a non-empty string'
      });
    }

    // Initialize translation service if not already done
    if (!translationService.initialized) {
      await translationService.initialize();
      translationService.initialized = true;
    }

    // Perform language detection
    const result = await translationService.detectLanguage(text);

    // Return the detection result
    res.json({
      language: result.language,
      confidence: result.confidence,
      alternatives: result.alternatives || [],
      timestamp: new Date().toISOString()
    });

  } catch (_error) {
    // console.error('Language detection API error:', _error);

    // Determine error type and response
    if (_error.message.includes('No translation providers available')) {
      return res.status(503).json({
        error: 'No language detection providers available',
        message: 'All language detection services are currently unavailable'
      });
    }

    // Generic error response with fallback
    res.status(200).json({
      language: 'en', // Default fallback
      confidence: 0.5,
      alternatives: [],
      error: 'Language detection failed, defaulting to English',
      timestamp: new Date().toISOString()
    });
  }
});
