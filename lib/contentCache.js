/**
 * Content Caching System
 * Provides intelligent caching for training content with automatic invalidation
 */

class ContentCache {
  constructor() {
    this.cache = new Map();
    this.cacheTimestamps = new Map();
    this.cacheTTL = 5 * 60 * 1000; // 5 minutes default TTL
    this.maxCacheSize = 100; // Maximum number of cached items
  }

  /**
   * Generate cache key
   */
  generateKey(type, identifier, params = {}) {
    const paramString = Object.keys(params)
      .sort()
      .map(key => key + ':' + params[key])
      .join('|');
    return type + ':' + identifier + (paramString ? ':' + paramString : '');
  }

  /**
   * Check if cache entry is valid
   */
  isValid(key) {
    if (!this.cache.has(key)) {
      return false;
    }

    const timestamp = this.cacheTimestamps.get(key);
    const now = Date.now();
    
    return (now - timestamp) < this.cacheTTL;
  }

  /**
   * Get item from cache
   */
  get(type, identifier, params = {}) {
    const key = this.generateKey(type, identifier, params);
    
    if (!this.isValid(key)) {
      this.delete(key);
      return null;
    }

    const item = this.cache.get(key);
    
    return item;
  }

  /**
   * Set item in cache
   */
  set(type, identifier, data, params = {}, ttl = null) {
    const key = this.generateKey(type, identifier, params);
    
    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.maxCacheSize) {
      this.evictOldest();
    }

    this.cache.set(key, data);
    this.cacheTimestamps.set(key, Date.now());
    
    // Set custom TTL if provided
    if (ttl) {
      setTimeout(() => {
        this.delete(key);
      }, ttl);
    }

    return data;
  }

  /**
   * Delete item from cache
   */
  delete(key) {
    const deleted = this.cache.delete(key);
    this.cacheTimestamps.delete(key);
    
    if (deleted) {
      
    }
    
    return deleted;
  }

  /**
   * Invalidate cache entries by pattern
   */
  invalidatePattern(pattern) {
    const regex = new RegExp(pattern);
    let deletedCount = 0;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.delete(key);
        deletedCount++;
      }
    }

    return deletedCount;
  }

  /**
   * Invalidate all cache entries for a specific phase
   */
  invalidatePhase(phaseId) {
    return this.invalidatePattern('^(phase|training):' + phaseId);
  }

  /**
   * Invalidate all training content cache
   */
  invalidateAllTraining() {
    return this.invalidatePattern('^(phase|training|quiz):');
  }

  /**
   * Evict oldest cache entry
   */
  evictOldest() {
    let oldestKey = null;
    let oldestTime = Date.now();

    for (const [key, timestamp] of this.cacheTimestamps.entries()) {
      if (timestamp < oldestTime) {
        oldestTime = timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.delete(oldestKey);
    }
  }

  /**
   * Clear all cache
   */
  clear() {
    const size = this.cache.size;
    this.cache.clear();
    this.cacheTimestamps.clear();
    return size;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;

    for (const [key, timestamp] of this.cacheTimestamps.entries()) {
      if ((now - timestamp) < this.cacheTTL) {
        validEntries++;
      } else {
        expiredEntries++;
      }
    }

    return {
      totalEntries: this.cache.size,
      validEntries,
      expiredEntries,
      maxSize: this.maxCacheSize,
      ttl: this.cacheTTL
    };
  }

  /**
   * Cleanup expired entries
   */
  cleanup() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, timestamp] of this.cacheTimestamps.entries()) {
      if ((now - timestamp) >= this.cacheTTL) {
        this.delete(key);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }
}

// Create singleton instance
const contentCache = new ContentCache();

// Cleanup expired entries every 5 minutes
setInterval(() => {
  contentCache.cleanup();
}, 5 * 60 * 1000);

/**
 * Cache wrapper for training phase data
 */
async function getCachedPhaseInfo(phaseNumber, fetchFunction) {
  const cached = contentCache.get('phase', phaseNumber);
  if (cached) {
    return cached;
  }

  try {
    const data = await fetchFunction();
    if (data) {
      // Cache for 10 minutes for published content, 1 minute for drafts
      const ttl = data.status === 'published' ? 10 * 60 * 1000 : 1 * 60 * 1000;
      return contentCache.set('phase', phaseNumber, data, {}, ttl);
    }
    return data;
  } catch (error) {
    // console.error('Error fetching phase info:', error);
    throw error;
  }
}

/**
 * Cache wrapper for training items
 */
async function getCachedTrainingItems(sessionId, fetchFunction) {
  const cached = contentCache.get('training', sessionId);
  if (cached) {
    return cached;
  }

  try {
    const data = await fetchFunction();
    if (data) {
      // Cache training items for 2 minutes (they change frequently)
      return contentCache.set('training', sessionId, data, {}, 2 * 60 * 1000);
    }
    return data;
  } catch (error) {
    // console.error('Error fetching training items:', error);
    throw error;
  }
}

/**
 * Cache wrapper for quiz content
 */
async function getCachedQuizContent(phaseNumber, fetchFunction) {
  const cached = contentCache.get('quiz', phaseNumber);
  if (cached) {
    return cached;
  }

  try {
    const data = await fetchFunction();
    if (data) {
      // Cache quiz content for 30 minutes (rarely changes)
      return contentCache.set('quiz', phaseNumber, data, {}, 30 * 60 * 1000);
    }
    return data;
  } catch (error) {
    // console.error('Error fetching quiz content:', error);
    throw error;
  }
}

/**
 * Invalidate cache when content is updated
 */
function invalidateContentCache(type, identifier) {
  switch (type) {
    case 'phase':
      contentCache.invalidatePhase(identifier);
      break;
    case 'training':
      contentCache.invalidatePattern('^training:' + identifier);
      break;
    case 'quiz':
      contentCache.invalidatePattern('^quiz:' + identifier);
      break;
    case 'all':
      contentCache.invalidateAllTraining();
      break;
    default:
      // Unknown type, do nothing
      break;
  }
}

/**
 * Preload frequently accessed content
 */
async function preloadContent(supabase) {
  try {

    // Preload published training phases
    const { data: phases, error } = await supabase
      .from('training_phases')
      .select('*')
      .eq('status', 'published')
      .order('phase_number');

    if (!error && phases) {
      phases.forEach(phase => {
        const phaseInfo = {
          title: phase.title,
          description: phase.description,
          duration: phase.time_limit + ' hours',
          objectives: phase.items?.flatMap(item => item.content?.objectives || []) || [],
          passingScore: phase.passing_score ?? 80,
          items: phase.items || [],
          mediaFiles: phase.media_attachments || []
        };
        
        contentCache.set('phase', phase.phase_number, phaseInfo, {}, 10 * 60 * 1000);
      });

    }

    // Preload quiz content
    const { data: quizzes, error: quizError } = await supabase
      .from('quiz_content')
      .select('*')
      .eq('status', 'published');

    if (!quizError && quizzes) {
      quizzes.forEach(quiz => {
        contentCache.set('quiz', quiz.phase, quiz, {}, 30 * 60 * 1000);
      });

    }

  } catch (error) {
    // console.error('Error preloading content:', error);
  }
}

module.exports = {
  contentCache,
  getCachedPhaseInfo,
  getCachedTrainingItems,
  getCachedQuizContent,
  invalidateContentCache,
  preloadContent
};
