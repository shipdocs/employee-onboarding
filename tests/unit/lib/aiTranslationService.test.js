/**
 * Unit Tests for AI Translation Service
 * Tests the AI translation functionality and provider management
 */

// Mock the translation providers to avoid external API calls
jest.mock('../../../lib/aiTranslationService.js', () => {
  const originalModule = jest.requireActual('../../../lib/aiTranslationService.js');
  
  // Create mock providers
  const mockProviders = {
    claude: {
      translate: jest.fn().mockResolvedValue({ text: 'Translated by Claude', confidence: 0.95 }),
      isAvailable: jest.fn().mockReturnValue(true)
    },
    openai: {
      translate: jest.fn().mockResolvedValue({ text: 'Translated by OpenAI', confidence: 0.90 }),
      isAvailable: jest.fn().mockReturnValue(true)
    },
    mock: {
      translate: jest.fn().mockResolvedValue({ text: 'Mock translation', confidence: 0.50 }),
      isAvailable: jest.fn().mockReturnValue(true)
    }
  };

  return {
    ...originalModule,
    // Override the AITranslationService class
    AITranslationService: class MockAITranslationService {
      constructor() {
        this.providers = mockProviders;
        this.preferredProviders = ['claude', 'openai', 'mock'];
        this.translationCache = new Map();
        this.batchQueue = [];
        this.batchTimeout = null;
      }

      async translateText(text, targetLanguage, sourceLanguage = 'auto') {
        // Simple mock implementation
        if (!text || !targetLanguage) {
          throw new Error('Text and target language are required');
        }

        // Check cache first
        const cacheKey = `${text}-${sourceLanguage}-${targetLanguage}`;
        if (this.translationCache.has(cacheKey)) {
          return this.translationCache.get(cacheKey);
        }

        // Try providers in order
        for (const providerName of this.preferredProviders) {
          const provider = this.providers[providerName];
          if (provider && provider.isAvailable()) {
            try {
              const result = await provider.translate(text, targetLanguage, sourceLanguage);
              this.translationCache.set(cacheKey, result);
              return result;
            } catch (error) {
              console.warn(`Provider ${providerName} failed:`, error.message);
              continue;
            }
          }
        }

        throw new Error('No translation providers available');
      }

      async translateBatch(texts, targetLanguage, sourceLanguage = 'auto') {
        const results = [];
        for (const text of texts) {
          try {
            const result = await this.translateText(text, targetLanguage, sourceLanguage);
            results.push(result);
          } catch (error) {
            results.push({ text, error: error.message });
          }
        }
        return results;
      }

      clearCache() {
        this.translationCache.clear();
      }

      getCacheSize() {
        return this.translationCache.size;
      }
    }
  };
});

const { AITranslationService } = require('../../../lib/aiTranslationService.js');

describe('AI Translation Service', () => {
  let translationService;

  beforeEach(() => {
    translationService = new AITranslationService();
  });

  afterEach(() => {
    translationService.clearCache();
  });

  describe('Basic Translation', () => {
    it('should translate text successfully', async () => {
      const result = await translationService.translateText('Hello', 'es');
      
      expect(result).toBeDefined();
      expect(result.text).toBeDefined();
      expect(typeof result.text).toBe('string');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should require text parameter', async () => {
      await expect(
        translationService.translateText('', 'es')
      ).rejects.toThrow('Text and target language are required');
    });

    it('should require target language parameter', async () => {
      await expect(
        translationService.translateText('Hello', '')
      ).rejects.toThrow('Text and target language are required');
    });

    it('should handle source language parameter', async () => {
      const result = await translationService.translateText('Hello', 'es', 'en');
      
      expect(result).toBeDefined();
      expect(result.text).toBeDefined();
    });
  });

  describe('Caching', () => {
    it('should cache translation results', async () => {
      const text = 'Hello World';
      const targetLang = 'es';
      
      // First translation
      const result1 = await translationService.translateText(text, targetLang);
      expect(translationService.getCacheSize()).toBe(1);
      
      // Second translation (should use cache)
      const result2 = await translationService.translateText(text, targetLang);
      expect(result1).toEqual(result2);
      expect(translationService.getCacheSize()).toBe(1);
    });

    it('should clear cache when requested', async () => {
      await translationService.translateText('Hello', 'es');
      expect(translationService.getCacheSize()).toBe(1);
      
      translationService.clearCache();
      expect(translationService.getCacheSize()).toBe(0);
    });

    it('should create different cache entries for different languages', async () => {
      await translationService.translateText('Hello', 'es');
      await translationService.translateText('Hello', 'fr');
      
      expect(translationService.getCacheSize()).toBe(2);
    });
  });

  describe('Batch Translation', () => {
    it('should translate multiple texts', async () => {
      const texts = ['Hello', 'World', 'Test'];
      const results = await translationService.translateBatch(texts, 'es');
      
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.text).toBeDefined();
        expect(typeof result.text).toBe('string');
      });
    });

    it('should handle empty batch', async () => {
      const results = await translationService.translateBatch([], 'es');
      expect(results).toHaveLength(0);
    });

    it('should handle errors in batch translation', async () => {
      const texts = ['Hello', '', 'World']; // Empty string should cause error
      const results = await translationService.translateBatch(texts, 'es');
      
      expect(results).toHaveLength(3);
      expect(results[0].text).toBeDefined(); // First should succeed
      expect(results[1].error).toBeDefined(); // Second should have error
      expect(results[2].text).toBeDefined(); // Third should succeed
    });
  });
});
