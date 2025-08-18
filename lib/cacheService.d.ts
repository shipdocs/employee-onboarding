// Cache TTL constants (in milliseconds)
export declare const CACHE_TTL: {
  HEALTH: number;
  USER_SESSION: number;
  USER_PROFILE: number;
  CREW_LIST: number;
  ADMIN_STATS: number;
  TRAINING_DATA: number;
  SYSTEM_SETTINGS: number;
  STATIC_DATA: number;
  LONG_TERM: number;
};

// Cache Configuration
export interface CacheConfig {
  maxSize?: number;
  defaultTTL?: number;
  cleanupInterval?: number;
  enableStats?: boolean;
}

// Cache Entry
export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
  lastAccessed: number;
}

// Cache Statistics
export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  evictions: number;
}

// Cache Statistics with Memory
export interface CacheStatsWithMemory extends CacheStats {
  hitRatio: number;
  totalEntries: number;
  memoryUsage: number;
  oldestEntry: number;
  newestEntry: number;
}

// Cache Service Class
export declare class CacheService {
  constructor(config?: CacheConfig);
  
  // Core methods
  get<T = any>(key: string): T | null;
  set<T = any>(key: string, data: T, ttl?: number): void;
  delete(key: string): boolean;
  has(key: string): boolean;
  clear(): void;
  
  // Pattern-based operations
  invalidatePattern(pattern: string | RegExp): number;
  
  // Statistics and monitoring
  getStats(): CacheStatsWithMemory;
  resetStats(): void;
  
  // Internal methods
  isExpired(entry: CacheEntry): boolean;
  evictLRU(): void;
  estimateMemoryUsage(): number;
  startCleanupTimer(): void;
  cleanup(): void;
  destroy(): void;
}

// Global cache instance
export declare const globalCache: CacheService;

// Default export
declare const _default: CacheService;
export default _default;