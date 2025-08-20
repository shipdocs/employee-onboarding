// Cache Configuration
export interface CacheConfig {
  DEFAULT_TTL: number;
  MAX_CACHE_SIZE: number;
  CLEANUP_INTERVAL: number;
}

// Cache Statistics
export interface CacheStats {
  totalEntries: number;
  activeEntries: number;
  expiredEntries: number;
  cacheHitRate: number;
}

// Cache Entry Class
export declare class CacheEntry<T = any> {
  data: T;
  expiresAt: number;

  constructor(data: T, ttl: number);
  isExpired(): boolean;
}

// Cache Functions
export declare function get<T = any>(key: string): T | null;
export declare function set<T = any>(key: string, data: T, ttl?: number): void;
export declare function del(key: string): void;
export declare function clear(): void;
export declare function clearPattern(pattern: string | RegExp): void;
export declare function getStats(): CacheStats;

// Async Query Wrapper
export declare function withCache<T = any>(
  queryFn: () => Promise<T>,
  cacheKey: string,
  ttl?: number
): Promise<T>;

// Invalidation Patterns
export declare const invalidatePatterns: {
  user: (userId: string) => void;
  training: (userId: string) => void;
  manager: (managerId: string) => void;
  stats: () => void;
  all: () => void;
};

// Export Configuration
export declare const CACHE_CONFIG: CacheConfig;
