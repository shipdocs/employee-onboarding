/**
 * AI Translation Service Architecture
 * Comprehensive multilingual translation system with maritime terminology support
 */

const { supabase } = require('./supabase');

// Utility function to clean translation output
function cleanTranslationOutput(translation) {
  if (!translation || typeof translation !== 'string') {
    return translation;
  }
  
  // Remove surrounding quotes if present
  let cleaned = translation.trim();
  
  // Remove quotes at start and end if they match
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) ||
      (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  
  // Remove quotes around the entire text if they were added by AI
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) ||
      (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  
  return cleaned;
}

// Base Translation Provider Interface
class TranslationProvider {
  constructor(config = {}) {
    this.config = config;
    this.name = 'base';
    this.supportedLanguages = [];
  }

  async isAvailable() {
    return false;
  }

  async translateText(text, sourceLang, targetLang) {
    throw new Error('translateText method must be implemented');
  }

  async batchTranslate(texts, sourceLang, targetLang) {
    const results = [];
    for (const text of texts) {
      try {
        const result = await this.translateText(text, sourceLang, targetLang);
        results.push(result);
      } catch (error) {
        results.push({ 
          text, 
          translation: text, 
          confidence: 0, 
          error: error.message 
        });
      }
    }
    return results;
  }

  async detectLanguage(text) {
    // Default implementation - override in providers that support detection
    return { language: 'en', confidence: 0.5 };
  }
}

// Claude (Anthropic) Translation Provider
class ClaudeTranslationProvider extends TranslationProvider {
  constructor(config = {}) {
    super(config);
    this.name = 'claude';
    this.supportedLanguages = ['en', 'nl', 'de', 'fr', 'es', 'it', 'pt', 'da', 'sv', 'no'];
    this.apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY;
    this.apiUrl = 'https://api.anthropic.com/v1/messages';
  }

  async isAvailable() {
    return !!this.apiKey;
  }

  async translateText(text, sourceLang, targetLang) {
    if (!text || text.trim().length === 0) {
      return { translation: text, confidence: 1.0, provider: this.name };
    }

    if (sourceLang === targetLang) {
      return { translation: text, confidence: 1.0, provider: this.name };
    }

    try {
      const languageNames = {
        en: 'English', nl: 'Dutch', de: 'German', fr: 'French', 
        es: 'Spanish', it: 'Italian', pt: 'Portuguese',
        da: 'Danish', sv: 'Swedish', no: 'Norwegian'
      };

      const prompt = `Translate the following maritime/shipping industry text from ${languageNames[sourceLang]} to ${languageNames[targetLang]}. 
      
Maintain professional maritime terminology and context. Provide only the translation, nothing else.

Text to translate: "${text}"`;

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: prompt
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`Claude API error: ${response.status}`);
      }

      const data = await response.json();
      const rawTranslation = data.content[0].text.trim();
      const translation = cleanTranslationOutput(rawTranslation);

      return {
        translation,
        confidence: 0.98,
        provider: this.name,
        originalText: text,
        maritimeEnhanced: true
      };
    } catch (error) {
      // console.error('Claude translation error:', error);
      throw new Error(`Claude translation failed: ${error.message}`);
    }
  }
}

// OpenAI Translation Provider
class OpenAITranslationProvider extends TranslationProvider {
  constructor(config = {}) {
    super(config);
    this.name = 'openai';
    this.supportedLanguages = ['en', 'nl', 'de', 'fr', 'es', 'it', 'pt', 'da', 'sv', 'no'];
    this.apiKey = config.apiKey || process.env.OPENAI_API_KEY;
    this.apiUrl = 'https://api.openai.com/v1/chat/completions';
  }

  async isAvailable() {
    return !!this.apiKey;
  }

  async translateText(text, sourceLang, targetLang) {
    if (!text || text.trim().length === 0) {
      return { translation: text, confidence: 1.0, provider: this.name };
    }

    if (sourceLang === targetLang) {
      return { translation: text, confidence: 1.0, provider: this.name };
    }

    try {
      const languageNames = {
        en: 'English', nl: 'Dutch', de: 'German', fr: 'French', 
        es: 'Spanish', it: 'Italian', pt: 'Portuguese',
        da: 'Danish', sv: 'Swedish', no: 'Norwegian'
      };

      const prompt = `Translate the following maritime/shipping industry text from ${languageNames[sourceLang]} to ${languageNames[targetLang]}. 
      
Maintain professional maritime terminology and context. Provide only the translation, nothing else.

Text to translate: "${text}"`;

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [{
            role: 'user',
            content: prompt
          }],
          max_tokens: 1000,
          temperature: 0.3
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const rawTranslation = data.choices[0].message.content.trim();
      const translation = cleanTranslationOutput(rawTranslation);

      return {
        translation,
        confidence: 0.97,
        provider: this.name,
        originalText: text,
        maritimeEnhanced: true
      };
    } catch (error) {
      // console.error('OpenAI translation error:', error);
      throw new Error(`OpenAI translation failed: ${error.message}`);
    }
  }
}

// Mock Translation Provider for Testing
class MockTranslationProvider extends TranslationProvider {
  constructor(config = {}) {
    super(config);
    this.name = 'mock-translator';
    this.supportedLanguages = ['en', 'nl', 'de', 'fr', 'es', 'it', 'pt'];
  }

  async isAvailable() {
    return true; // Always available for testing
  }

  async translateText(text, sourceLang, targetLang) {
    if (!text || text.trim().length === 0) {
      return { translation: text, confidence: 1.0, provider: this.name };
    }

    if (sourceLang === targetLang) {
      return { translation: text, confidence: 1.0, provider: this.name };
    }

    // Comprehensive mock translations for testing with maritime focus
    const mockTranslations = {
      'en->nl': {
        'test description': 'test beschrijving',
        'Welcome to our maritime training program': 'Welkom bij ons maritieme trainingsprogramma',
        'Safety Training': 'Veiligheidstraining',
        'Safety training is mandatory for all crew members': 'Veiligheidstraining is verplicht voor alle bemanningsleden',
        'Emergency procedures must be followed at all times': 'Noodprocedures moeten te allen tijde worden gevolgd',
        'Life jacket inspection completed successfully': 'Reddingsvest inspectie succesvol voltooid',
        'Navigation equipment check required': 'Navigatieapparatuur controle vereist',
        'Fire drill scheduled for tomorrow morning': 'Brandoefening gepland voor morgenochtend',
        'Phase 1': 'Fase 1',
        'Onboarding flow for new captains in the Burando Atlantic fleet': 'Onboarding-proces voor nieuwe kapiteins in de Burando Atlantic vloot'
      },
      'en->de': {
        'test description': 'Test Beschreibung',
        'Welcome to our maritime training program': 'Willkommen zu unserem maritimen Trainingsprogramm',
        'Safety Training': 'Sicherheitstraining',
        'Safety training is mandatory for all crew members': 'Sicherheitsschulung ist für alle Besatzungsmitglieder obligatorisch',
        'Emergency procedures must be followed at all times': 'Notfallverfahren müssen jederzeit befolgt werden',
        'Life jacket inspection completed successfully': 'Schwimmwesten-Inspektion erfolgreich abgeschlossen',
        'Navigation equipment check required': 'Überprüfung der Navigationsausrüstung erforderlich',
        'Fire drill scheduled for tomorrow morning': 'Feuerübung für morgen früh geplant',
        'Phase 1': 'Phase 1',
        'Onboarding flow for new captains in the Burando Atlantic fleet': 'Onboarding-Ablauf für neue Kapitäne in der Burando Atlantic Flotte'
      },
      'en->fr': {
        'test description': 'description du test',
        'Welcome to our maritime training program': 'Bienvenue dans notre programme de formation maritime',
        'Safety Training': 'Formation à la sécurité',
        'Safety training is mandatory for all crew members': 'La formation à la sécurité est obligatoire pour tous les membres d\'équipage',
        'Emergency procedures must be followed at all times': 'Les procédures d\'urgence doivent être suivies en tout temps',
        'Life jacket inspection completed successfully': 'Inspection du gilet de sauvetage terminée avec succès',
        'Navigation equipment check required': 'Vérification de l\'équipement de navigation requise',
        'Fire drill scheduled for tomorrow morning': 'Exercice d\'incendie prévu demain matin',
        'Phase 1': 'Phase 1',
        'Onboarding flow for new captains in the Burando Atlantic fleet': 'Processus d\'intégration pour les nouveaux capitaines de la flotte Burando Atlantic'
      },
      'en->es': {
        'test description': 'descripción de prueba',
        'Welcome to our maritime training program': 'Bienvenido a nuestro programa de entrenamiento marítimo',
        'Safety Training': 'Entrenamiento de Seguridad',
        'Safety training is mandatory for all crew members': 'El entrenamiento de seguridad es obligatorio para todos los miembros de la tripulación',
        'Emergency procedures must be followed at all times': 'Los procedimientos de emergencia deben seguirse en todo momento',
        'Life jacket inspection completed successfully': 'Inspección del chaleco salvavidas completada exitosamente',
        'Navigation equipment check required': 'Se requiere verificación del equipo de navegación',
        'Fire drill scheduled for tomorrow morning': 'Simulacro de incendio programado para mañana por la mañana',
        'Phase 1': 'Fase 1',
        'Onboarding flow for new captains in the Burando Atlantic fleet': 'Proceso de incorporación para nuevos capitanes en la flota Burando Atlantic'
      }
    };

    const translationKey = `${sourceLang}->${targetLang}`;
    const translations = mockTranslations[translationKey] || {};

    // Try exact match first
    let translation = translations[text];
    let confidence = 0.95;

    // If no exact match, try partial matches for common maritime terms
    if (!translation) {
      const lowerText = text.toLowerCase();
      for (const [key, value] of Object.entries(translations)) {
        if (lowerText.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerText)) {
          translation = value;
          confidence = 0.85; // Lower confidence for partial matches
          break;
        }
      }
    }

    // Final fallback with language prefix
    if (!translation) {
      translation = `[${targetLang.toUpperCase()}] ${text}`;
      confidence = 0.3; // Low confidence for untranslated text
    }

    return {
      translation,
      confidence,
      provider: this.name,
      originalText: text,
      maritimeEnhanced: translation !== `[${targetLang.toUpperCase()}] ${text}`
    };
  }
}

// Cloud LibreTranslate Provider (Vercel-Compatible)
class CloudLibreTranslateProvider extends TranslationProvider {
  constructor(config = {}) {
    super(config);
    this.name = 'cloud-libretranslate';
    this.supportedLanguages = ['en', 'nl', 'de', 'fr', 'es', 'it', 'pt', 'ru'];
    // Public LibreTranslate instances that work with Vercel
    this.publicInstances = [
      'https://libretranslate.com',
      'https://translate.argosopentech.com',
      'https://translate.astian.org',
      'https://translate.mentality.rip'
    ];
    this.currentInstance = this.publicInstances[0];
  }

  async isAvailable() {
    // Try each public instance
    for (const instance of this.publicInstances) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(`${instance}/languages`, {
          method: 'GET',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          this.currentInstance = instance;
          
          return true;
        }
      } catch (error) {
        
      }
    }
    return false;
  }

  async translateText(text, sourceLang, targetLang) {
    if (!text || text.trim().length === 0) {
      return { translation: text, confidence: 1.0, provider: this.name };
    }

    if (sourceLang === targetLang) {
      return { translation: text, confidence: 1.0, provider: this.name };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const requestBody = {
        q: text,
        source: sourceLang,
        target: targetLang,
        format: 'text'
      };

      const response = await fetch(`${this.currentInstance}/translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Try next instance if current one fails
        const nextInstanceIndex = (this.publicInstances.indexOf(this.currentInstance) + 1) % this.publicInstances.length;
        this.currentInstance = this.publicInstances[nextInstanceIndex];
        throw new Error(`LibreTranslate API error: ${response.status}, trying next instance`);
      }

      const data = await response.json();
      
      return {
        translation: data.translatedText,
        confidence: this.calculateConfidence(text, data.translatedText),
        provider: this.name,
        originalText: text,
        instance: this.currentInstance
      };
    } catch (error) {
      // console.error('Cloud LibreTranslate translation error:', error);
      throw new Error(`Translation failed: ${error.message}`);
    }
  }

  async detectLanguage(text) {
    try {
      const requestBody = { q: text };
      if (this.apiKey) {
        requestBody.api_key = this.apiKey;
      }

      const response = await fetch(`${this.baseUrl}/detect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`Detection API error: ${response.status}`);
      }

      const data = await response.json();
      return {
        language: data[0].language,
        confidence: data[0].confidence
      };
    } catch (error) {
      
      return { language: 'en', confidence: 0.5 };
    }
  }

  calculateConfidence(originalText, translatedText) {
    // Basic confidence calculation based on text characteristics
    if (originalText === translatedText) return 0.3; // Likely untranslated
    if (translatedText.length < originalText.length * 0.3) return 0.4; // Suspiciously short
    if (translatedText.length > originalText.length * 3) return 0.5; // Suspiciously long
    
    // Check for preserved formatting and structure
    const hasPreservedNumbers = this.preservesNumbers(originalText, translatedText);
    const hasPreservedPunctuation = this.preservesPunctuation(originalText, translatedText);
    
    let confidence = 0.85; // Base confidence for LibreTranslate
    if (hasPreservedNumbers) confidence += 0.05;
    if (hasPreservedPunctuation) confidence += 0.05;
    
    return Math.min(confidence, 0.95);
  }

  preservesNumbers(original, translated) {
    const originalNumbers = original.match(/\d+/g) || [];
    const translatedNumbers = translated.match(/\d+/g) || [];
    return originalNumbers.length === translatedNumbers.length;
  }

  preservesPunctuation(original, translated) {
    const originalPunct = original.match(/[.!?:;]/g) || [];
    const translatedPunct = translated.match(/[.!?:;]/g) || [];
    return Math.abs(originalPunct.length - translatedPunct.length) <= 1;
  }

  async batchTranslate(texts, sourceLang, targetLang) {
    // Optimize batch requests for LibreTranslate
    const batchSize = 10; // Process in chunks to avoid overwhelming the service
    const results = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchPromises = batch.map(text => 
        this.translateText(text, sourceLang, targetLang)
          .catch(error => ({ 
            translation: text, 
            confidence: 0, 
            error: error.message,
            provider: this.name
          }))
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Small delay between batches to be respectful
      if (i + batchSize < texts.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return results;
  }
}

// Browser Translation Provider (Fallback - Free)
class BrowserTranslateProvider extends TranslationProvider {
  constructor(config = {}) {
    super(config);
    this.name = 'browser';
    this.supportedLanguages = ['en', 'nl', 'de', 'fr', 'es', 'it', 'pt'];
  }

  async isAvailable() {
    // Check if browser supports translation APIs
    return typeof window !== 'undefined' && 
           (window.translation || window.chrome?.i18n);
  }

  async translateText(text, sourceLang, targetLang) {
    if (typeof window === 'undefined') {
      throw new Error('Browser translation only available in browser environment');
    }

    // Placeholder for browser-based translation
    // This would integrate with browser translation APIs when available
    return {
      translation: text, // Fallback to original
      confidence: 0.6,
      provider: this.name,
      note: 'Browser translation not yet implemented'
    };
  }
}

// Microsoft Translator Provider (Vercel-Compatible, Free Tier)
class MicrosoftTranslatorProvider extends TranslationProvider {
  constructor(config = {}) {
    super(config);
    this.name = 'microsoft';
    this.apiKey = config.apiKey || process.env.MICROSOFT_TRANSLATOR_KEY;
    this.region = config.region || process.env.MICROSOFT_TRANSLATOR_REGION || 'global';
    this.endpoint = 'https://api.cognitive.microsofttranslator.com';
    this.supportedLanguages = ['en', 'nl', 'de', 'fr', 'es', 'it', 'pt', 'ru', 'ja', 'ko', 'zh'];
  }

  async isAvailable() {
    return !!this.apiKey;
  }

  async translateText(text, sourceLang, targetLang) {
    if (!this.apiKey) {
      throw new Error('Microsoft Translator API key not configured');
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${this.endpoint}/translate?api-version=3.0&from=${sourceLang}&to=${targetLang}`, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': this.apiKey,
          'Ocp-Apim-Subscription-Region': this.region,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([{ Text: text }]),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Microsoft Translator API error: ${response.status}`);
      }

      const data = await response.json();
      
      return {
        translation: data[0].translations[0].text,
        confidence: data[0].translations[0].confidence || 0.9,
        provider: this.name,
        originalText: text
      };
    } catch (error) {
      // console.error('Microsoft Translator error:', error);
      throw new Error(`Microsoft translation failed: ${error.message}`);
    }
  }

  async detectLanguage(text) {
    if (!this.apiKey) {
      return { language: 'en', confidence: 0.5 };
    }

    try {
      const response = await fetch(`${this.endpoint}/detect?api-version=3.0`, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': this.apiKey,
          'Ocp-Apim-Subscription-Region': this.region,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([{ Text: text }])
      });

      if (!response.ok) {
        throw new Error(`Detection API error: ${response.status}`);
      }

      const data = await response.json();
      return {
        language: data[0].language,
        confidence: data[0].score
      };
    } catch (error) {
      
      return { language: 'en', confidence: 0.5 };
    }
  }
}

// Google Translate Provider (Premium option)
class GoogleTranslateProvider extends TranslationProvider {
  constructor(config = {}) {
    super(config);
    this.name = 'google';
    this.apiKey = config.apiKey || process.env.GOOGLE_TRANSLATE_API_KEY;
    this.projectId = config.projectId || process.env.GOOGLE_CLOUD_PROJECT_ID;
    this.supportedLanguages = ['en', 'nl', 'de', 'fr', 'es', 'it', 'pt', 'ru', 'ja', 'ko', 'zh'];
  }

  async isAvailable() {
    return !!this.apiKey;
  }

  async translateText(text, sourceLang, targetLang) {
    if (!this.apiKey) {
      throw new Error('Google Translate API key not configured');
    }

    try {
      const url = `https://translation.googleapis.com/language/translate/v2?key=${this.apiKey}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: text,
          source: sourceLang,
          target: targetLang,
          format: 'text'
        })
      });

      if (!response.ok) {
        throw new Error(`Google Translate API error: ${response.status}`);
      }

      const data = await response.json();
      
      return {
        translation: data.data.translations[0].translatedText,
        confidence: 0.95, // Google Translate generally high quality
        provider: this.name,
        originalText: text
      };
    } catch (error) {
      // console.error('Google Translate error:', error);
      throw new Error(`Google translation failed: ${error.message}`);
    }
  }
}

// Maritime Terminology Enhancer
class MaritimeTerminologyEnhancer {
  constructor() {
    this.terminologyCache = new Map();
    this.loadTerminology();
  }

  async loadTerminology() {
    try {
      const { data: terminology, error } = await supabase
        .from('maritime_terminology')
        .select('*');

      if (error) throw error;

      // Build terminology cache - group by term_key and source_language
      const termGroups = new Map();

      terminology.forEach(term => {
        const key = `${term.term_key}:${term.source_language}`;
        if (!termGroups.has(key)) {
          termGroups.set(key, {
            term_key: term.term_key,
            source_language: term.source_language,
            source_term: term.source_term,
            translations: {},
            confidence_scores: {},
            human_verified: term.verified,
            category: term.category
          });
        }

        const group = termGroups.get(key);
        group.translations[term.target_language] = term.target_term;
        group.confidence_scores[term.target_language] = term.confidence_score;
      });

      // Store grouped terms in cache
      for (const [key, termData] of termGroups) {
        this.terminologyCache.set(key, termData);
      }

    } catch (error) {
      // console.error('Failed to load maritime terminology:', error);
      // Don't throw error, just continue without maritime enhancement
    }
  }

  enhanceTranslation(text, translation, sourceLang, targetLang) {
    // Apply maritime-specific terminology corrections
    let enhancedTranslation = translation;
    let confidenceBoost = 0;

    // Check for known maritime terms
    for (const [key, term] of this.terminologyCache) {
      const [termKey, termSourceLang] = key.split(':');
      
      if (termSourceLang === sourceLang && 
          text.toLowerCase().includes(termKey.toLowerCase().replace('_', ' '))) {
        
        const maritimeTranslation = term.translations[targetLang];
        if (maritimeTranslation) {
          // Replace generic translation with maritime-specific term
          const genericTerm = termKey.replace('_', ' ');
          const regex = new RegExp(genericTerm, 'gi');
          enhancedTranslation = enhancedTranslation.replace(regex, maritimeTranslation);
          
          if (term.human_verified) {
            confidenceBoost += 0.1; // Boost confidence for verified terms
          }
        }
      }
    }

    return {
      translation: enhancedTranslation,
      confidenceBoost,
      maritimeTermsFound: confidenceBoost > 0
    };
  }

  async addTerm(termKey, sourceLang, translations, category = 'general') {
    try {
      const { data, error } = await supabase
        .from('maritime_terminology')
        .insert({
          term_key: termKey,
          source_language: sourceLang,
          translations,
          category,
          human_verified: false
        })
        .select()
        .single();

      if (error) throw error;

      // Update cache
      const key = `${termKey}:${sourceLang}`;
      this.terminologyCache.set(key, data);

      return data;
    } catch (error) {
      // console.error('Failed to add maritime term:', error);
      throw error;
    }
  }
}

// Main AI Translation Service
class AITranslationService {
  constructor() {
    this.providers = {
      'claude': new ClaudeTranslationProvider(),
      'openai': new OpenAITranslationProvider(),
      'microsoft': new MicrosoftTranslatorProvider(),
      'google': new GoogleTranslateProvider(),
      'cloud-libretranslate': new CloudLibreTranslateProvider(),
      'browser': new BrowserTranslateProvider(),
      'mock': new MockTranslationProvider()
    };
    
    // Priority order: AI models first (best quality), then traditional services, mock as fallback
    this.preferredProviders = ['claude', 'openai', 'microsoft', 'google', 'cloud-libretranslate', 'browser', 'mock'];
    this.maritimeEnhancer = new MaritimeTerminologyEnhancer();
    this.translationCache = new Map();
    this.batchQueue = [];
    this.batchTimeout = null;
  }

  async initialize() {
    // Check provider availability
    for (const [name, provider] of Object.entries(this.providers)) {
      const available = await provider.isAvailable();
      
    }
  }

  // Update API keys from system settings
  updateFromSettings(settings) {
    if (!settings || !settings.translation) return;

    const translationSettings = settings.translation;

    // Update Claude API key
    if (translationSettings.anthropic_api_key?.value) {
      this.providers.claude.apiKey = translationSettings.anthropic_api_key.value;
    }

    // Update OpenAI API key
    if (translationSettings.openai_api_key?.value) {
      this.providers.openai.apiKey = translationSettings.openai_api_key.value;
    }

    // Update Microsoft API key
    if (translationSettings.microsoft_translator_key?.value) {
      this.providers.microsoft.apiKey = translationSettings.microsoft_translator_key.value;
    }

    // Update Google API key
    if (translationSettings.google_translate_key?.value) {
      this.providers.google.apiKey = translationSettings.google_translate_key.value;
    }

  }

  async getAvailableProvider() {
    for (const providerName of this.preferredProviders) {
      const provider = this.providers[providerName];
      if (await provider.isAvailable()) {
        return provider;
      }
    }
    throw new Error('No translation providers available');
  }

  async translateText(text, sourceLang, targetLang, options = {}) {
    // Check cache first
    const cacheKey = `${text}:${sourceLang}:${targetLang}`;
    if (this.translationCache.has(cacheKey) && !options.forceRefresh) {
      return this.translationCache.get(cacheKey);
    }

    // Check translation memory
    const memoryResult = await this.getFromTranslationMemory(text, sourceLang, targetLang);
    if (memoryResult) {
      this.translationCache.set(cacheKey, memoryResult);
      return memoryResult;
    }

    try {
      const provider = await this.getAvailableProvider();
      let result = await provider.translateText(text, sourceLang, targetLang);

      // Enhance with maritime terminology
      const enhancement = this.maritimeEnhancer.enhanceTranslation(
        text, result.translation, sourceLang, targetLang
      );

      result = {
        ...result,
        translation: enhancement.translation,
        confidence: Math.min(result.confidence + enhancement.confidenceBoost, 0.98),
        maritimeEnhanced: enhancement.maritimeTermsFound,
        timestamp: new Date().toISOString()
      };

      // Store in cache and memory
      this.translationCache.set(cacheKey, result);
      await this.storeInTranslationMemory(text, sourceLang, targetLang, result);

      return result;
    } catch (error) {
      // console.error('Translation failed:', error);
      
      // Return fallback response
      return {
        translation: text,
        confidence: 0,
        provider: 'fallback',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async batchTranslate(texts, sourceLang, targetLangs, options = {}) {
    const results = {};
    
    for (const targetLang of targetLangs) {
      try {
        const provider = await this.getAvailableProvider();
        const translations = await provider.batchTranslate(texts, sourceLang, targetLang);
        
        // Enhance each translation with maritime terminology
        const enhancedTranslations = translations.map(translation => {
          if (translation.error) return translation;
          
          const enhancement = this.maritimeEnhancer.enhanceTranslation(
            translation.originalText || translation.text,
            translation.translation,
            sourceLang,
            targetLang
          );

          return {
            ...translation,
            translation: enhancement.translation,
            confidence: Math.min(translation.confidence + enhancement.confidenceBoost, 0.98),
            maritimeEnhanced: enhancement.maritimeTermsFound
          };
        });

        results[targetLang] = enhancedTranslations;

        // Store successful translations in memory
        for (let i = 0; i < texts.length; i++) {
          if (enhancedTranslations[i] && !enhancedTranslations[i].error) {
            await this.storeInTranslationMemory(
              texts[i], 
              sourceLang, 
              targetLang, 
              enhancedTranslations[i]
            );
          }
        }
      } catch (error) {
        // console.error(`Batch translation failed for ${targetLang}:`, error);
        results[targetLang] = texts.map(text => ({
          translation: text,
          confidence: 0,
          error: error.message,
          provider: 'fallback'
        }));
      }
    }

    return results;
  }

  async translateWorkflowStructure(workflow, sourceLang, targetLangs) {
    const fieldsToTranslate = ['title', 'description'];
    
    for (const field of fieldsToTranslate) {
      if (workflow[field]) {
        const sourceText = typeof workflow[field] === 'string' 
          ? workflow[field] 
          : workflow[field].content?.[sourceLang] || workflow[field];

        if (sourceText) {
          const translations = await this.batchTranslate(
            [sourceText], 
            sourceLang, 
            targetLangs
          );

          // Structure the result as multilingual content
          workflow[field] = {
            source_lang: sourceLang,
            content: {
              [sourceLang]: sourceText,
              ...Object.fromEntries(
                Object.entries(translations).map(([lang, results]) => [
                  lang, 
                  results[0]?.translation || sourceText
                ])
              )
            },
            ai_metadata: Object.fromEntries(
              Object.entries(translations).map(([lang, results]) => [
                lang,
                {
                  confidence: results[0]?.confidence || 0,
                  method: results[0]?.provider || 'unknown',
                  translated_at: new Date().toISOString(),
                  human_reviewed: false,
                  maritime_enhanced: results[0]?.maritimeEnhanced || false
                }
              ])
            )
          };
        }
      }
    }

    // Translate phases
    if (workflow.phases) {
      for (const phase of workflow.phases) {
        await this.translatePhaseStructure(phase, sourceLang, targetLangs, workflow.id);
      }
    }

    return workflow;
  }

  async translatePhaseStructure(phase, sourceLang, targetLangs, workflowId = null) {
    const fieldsToTranslate = ['name', 'description', 'instructions']; // Use 'name' instead of 'title'

    for (const field of fieldsToTranslate) {
      const sourceText = phase[field];

      if (sourceText && typeof sourceText === 'string') {
        // console.log(`Translating ${field}: ${sourceText.substring(0, 50)}${sourceText.length > 50 ? '...' : ''}`);

        const translations = await this.batchTranslate(
          [sourceText],
          sourceLang,
          targetLangs
        );

        // Store phase translations in workflow_translations table
        if (workflowId && phase.id) {
          for (const [targetLang, results] of Object.entries(translations)) {
            const result = results[0];
            if (result && !result.error) {
              try {
                await this.storePhaseTranslation(
                  workflowId,
                  phase.id,
                  field,
                  sourceLang,
                  targetLang,
                  sourceText,
                  result.translation,
                  result.confidence,
                  result.provider
                );
              } catch (error) {
                // console.error(`❌ [PHASE-TRANSLATION] Failed to store phase translation:`, error);
              }
            }
          }
        }

        // Update phase object structure for in-memory use
        phase[field] = {
          source_lang: sourceLang,
          content: {
            [sourceLang]: sourceText,
            ...Object.fromEntries(
              Object.entries(translations).map(([lang, results]) => [
                lang,
                results[0]?.translation || sourceText
              ])
            )
          },
          ai_metadata: Object.fromEntries(
            Object.entries(translations).map(([lang, results]) => [
              lang,
              {
                confidence: results[0]?.confidence || 0,
                method: results[0]?.provider || 'unknown',
                translated_at: new Date().toISOString(),
                human_reviewed: false,
                maritime_enhanced: results[0]?.maritimeEnhanced || false
              }
            ])
          )
        };
      }
    }

    // Translate phase items
    if (phase.items) {
      for (const item of phase.items) {
        await this.translateItemStructure(item, sourceLang, targetLangs, workflowId, phase.id);
      }
    }
  }

  async translateItemStructure(item, sourceLang, targetLangs, workflowId = null, phaseId = null) {
    const fieldsToTranslate = ['title', 'description', 'instructions', 'quiz_question'];
    
    for (const field of fieldsToTranslate) {
      if (item[field]) {
        const sourceText = typeof item[field] === 'string' 
          ? item[field] 
          : item[field].content?.[sourceLang] || item[field];

        if (sourceText) {
          const translations = await this.batchTranslate(
            [sourceText], 
            sourceLang, 
            targetLangs
          );

          item[field] = {
            source_lang: sourceLang,
            content: {
              [sourceLang]: sourceText,
              ...Object.fromEntries(
                Object.entries(translations).map(([lang, results]) => [
                  lang, 
                  results[0]?.translation || sourceText
                ])
              )
            },
            ai_metadata: Object.fromEntries(
              Object.entries(translations).map(([lang, results]) => [
                lang,
                {
                  confidence: results[0]?.confidence || 0,
                  method: results[0]?.provider || 'unknown',
                  translated_at: new Date().toISOString(),
                  human_reviewed: false,
                  maritime_enhanced: results[0]?.maritimeEnhanced || false
                }
              ])
            )
          };
        }
      }
    }
  }

  async getFromTranslationMemory(sourceText, sourceLang, targetLang) {
    try {
      const { data, error } = await supabase
        .from('translation_memory')
        .select('translated_text, confidence_score, human_reviewed, translation_method')
        .eq('source_text', sourceText)
        .eq('source_language', sourceLang)
        .eq('target_language', targetLang)
        .single();

      if (error) return null;

      // Update usage count
      await supabase
        .from('translation_memory')
        .update({ 
          usage_count: supabase.sql`usage_count + 1`,
          updated_at: new Date().toISOString()
        })
        .eq('source_text', sourceText)
        .eq('source_language', sourceLang)
        .eq('target_language', targetLang);

      return {
        translation: data.translated_text,
        confidence: data.confidence_score,
        provider: data.translation_method,
        humanReviewed: data.human_reviewed,
        source: 'memory',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      // console.error('Error retrieving from translation memory:', error);
      return null;
    }
  }

  async storeInTranslationMemory(sourceText, sourceLang, targetLang, result) {
    try {
      await supabase
        .from('translation_memory')
        .upsert({
          source_text: sourceText,
          source_language: sourceLang,
          target_language: targetLang,
          translated_text: result.translation,
          translation_method: result.provider,
          confidence_score: result.confidence,
          domain: 'maritime'
        }, {
          onConflict: 'source_text,source_language,target_language'
        });
    } catch (error) {
      // console.error('Error storing in translation memory:', error);
    }
  }

  async storePhaseTranslation(workflowId, phaseId, fieldName, sourceLang, targetLang, sourceText, translatedText, confidence, method) {
    try {

      const fieldKey = `phase_${phaseId}_${fieldName}`;

      await supabase
        .from('workflow_translations')
        .upsert({
          workflow_id: workflowId,
          field_name: fieldKey,
          source_language: sourceLang,
          target_language: targetLang,
          source_text: sourceText,
          translated_text: translatedText,
          confidence_score: confidence,
          translation_method: method,
          human_reviewed: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'workflow_id,field_name,target_language'
        });

    } catch (error) {
      // console.error('❌ [PHASE-TRANSLATION] Error storing phase translation:', error);
      throw error;
    }
  }

  async detectLanguage(text) {
    try {
      const provider = await this.getAvailableProvider();
      return await provider.detectLanguage(text);
    } catch (error) {
      // console.error('Language detection failed:', error);
      return { language: 'en', confidence: 0.5 };
    }
  }

  // Quality and metrics methods
  async getTranslationQualityMetrics(languagePair, dateRange) {
    try {
      const { data, error } = await supabase
        .from('translation_quality_metrics')
        .select('*')
        .eq('language_pair', languagePair)
        .gte('metric_date', dateRange.start)
        .lte('metric_date', dateRange.end)
        .order('metric_date');

      if (error) throw error;
      return data;
    } catch (error) {
      // console.error('Error fetching quality metrics:', error);
      return [];
    }
  }

  async updateTranslationReview(sourceText, sourceLang, targetLang, isApproved, feedback = null) {
    try {
      await supabase
        .from('translation_memory')
        .update({
          human_reviewed: true,
          reviewed_by: supabase.auth.user()?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('source_text', sourceText)
        .eq('source_language', sourceLang)
        .eq('target_language', targetLang);

      // Log the review activity
      await supabase
        .from('user_translation_activity')
        .insert({
          user_id: supabase.auth.user()?.id,
          activity_type: isApproved ? 'approve' : 'reject',
          source_language: sourceLang,
          target_language: targetLang,
          feedback
        });

      return true;
    } catch (error) {
      // console.error('Error updating translation review:', error);
      return false;
    }
  }
}

// Export the service and providers
module.exports = AITranslationService;
module.exports.CloudLibreTranslateProvider = CloudLibreTranslateProvider;
module.exports.MicrosoftTranslatorProvider = MicrosoftTranslatorProvider;
module.exports.GoogleTranslateProvider = GoogleTranslateProvider;
module.exports.BrowserTranslateProvider = BrowserTranslateProvider;
module.exports.MaritimeTerminologyEnhancer = MaritimeTerminologyEnhancer;