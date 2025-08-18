/**
 * Query Cache Utility
 * Provides in-memory caching for database queries to improve performance
 */

const cache = new Map();

/**
 * Cache configuration
 */
const CACHE_CONFIG = {
  DEFAULT_TTL: 300, // 5 minutes in seconds
  MAX_CACHE_SIZE: 1000, // Maximum number of cached items
  CLEANUP_INTERVAL: 600000 // 10 minutes in milliseconds
};

/**
 * Cache entry structure
 */
class CacheEntry {
  constructor(data, ttl) {
    this.data = data;
    this.expiresAt = Date.now() + (ttl * 1000);
  }

  isExpired() {
    return Date.now() > this.expiresAt;
  }
}

/**
 * Get item from cache
 * @param {string} key - Cache key
 * @returns {any|null} Cached data or null if not found/expired
 */
function get(key) {
  const entry = cache.get(key);
  
  if (!entry) {
    return null;
  }

  if (entry.isExpired()) {
    cache.delete(key);
    return null;
  }

  return entry.data;
}

/**
 * Set item in cache
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 * @param {number} [ttl] - Time to live in seconds
 */
function set(key, data, ttl = CACHE_CONFIG.DEFAULT_TTL) {
  // Check cache size limit
  if (cache.size >= CACHE_CONFIG.MAX_CACHE_SIZE) {
    // Remove oldest entries (simple FIFO)
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }

  cache.set(key, new CacheEntry(data, ttl));
}

/**
 * Delete item from cache
 * @param {string} key - Cache key
 */
function del(key) {
  cache.delete(key);
}

/**
 * Clear all cache entries
 */
function clear() {
  cache.clear();
}

/**
 * Clear cache entries matching a pattern
 * @param {string|RegExp} pattern - Pattern to match keys
 */
function clearPattern(pattern) {
  const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
  
  for (const key of cache.keys()) {
    if (regex.test(key)) {
      cache.delete(key);
    }
  }
}

/**
 * Get cache statistics
 * @returns {Object} Cache statistics
 */
function getStats() {
  let expired = 0;
  let active = 0;
  
  for (const [key, entry] of cache.entries()) {
    if (entry.isExpired()) {
      expired++;
    } else {
      active++;
    }
  }

  return {
    totalEntries: cache.size,
    activeEntries: active,
    expiredEntries: expired,
    cacheHitRate: 0 // Would need to track hits/misses for this
  };
}

/**
 * Clean up expired entries
 */
function cleanup() {
  let cleaned = 0;
  
  for (const [key, entry] of cache.entries()) {
    if (entry.isExpired()) {
      cache.delete(key);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    
  }
}

/**
 * Wrap a query function with caching
 * @param {Function} queryFn - Query function to wrap
 * @param {string} cacheKey - Cache key
 * @param {number} [ttl] - Time to live in seconds
 * @returns {Promise<any>} Query result
 */
async function withCache(queryFn, cacheKey, ttl = CACHE_CONFIG.DEFAULT_TTL) {
  // Check cache first
  const cached = get(cacheKey);
  if (cached !== null) {
    
    return cached;
  }

  try {
    // Execute query
    const result = await queryFn();
    
    // Cache the result
    set(cacheKey, result, ttl);
    
    return result;
  } catch (error) {
    // console.error(`[QueryCache] Error executing query for key ${cacheKey}:`, error);
    throw error;
  }
}

/**
 * Invalidate cache for specific patterns
 * Useful for invalidating related cache entries after mutations
 */
const invalidatePatterns = {
  user: (userId) => clearPattern(`user.*${userId}`),
  training: (userId) => clearPattern(`training.*${userId}`),
  manager: (managerId) => clearPattern(`manager.*${managerId}`),
  stats: () => clearPattern(`.*stats.*`),
  all: () => clear()
};

// Set up periodic cleanup
setInterval(cleanup, CACHE_CONFIG.CLEANUP_INTERVAL);

// Export cache utilities
module.exports = {
  get,
  set,
  del,
  clear,
  clearPattern,
  getStats,
  withCache,
  invalidatePatterns,
  CACHE_CONFIG
};