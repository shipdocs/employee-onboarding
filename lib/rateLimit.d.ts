import { NextApiRequest, NextApiResponse, NextApiHandler } from 'next';

// Rate Limit Options
export interface RateLimitOptions {
  windowMs?: number;
  max?: number;
  keyGenerator?: (req: NextApiRequest) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

// Rate Limit Data
export interface RateLimitData {
  count: number;
  resetTime: number;
  firstRequest: number;
}

// Extended Request with Rate Limit Info
export interface RateLimitRequest extends NextApiRequest {
  rateLimit?: RateLimitData;
}

// Rate Limiter Function Type
export type RateLimiter = (
  req: NextApiRequest,
  res: NextApiResponse,
  next?: () => void | Promise<void>
) => Promise<RateLimitData | null | void>;

// Main Functions
export declare function rateLimit(options?: RateLimitOptions): RateLimiter;

export declare function withRateLimit<T = any>(
  handler: NextApiHandler<T>,
  options?: RateLimitOptions
): NextApiHandler<T>;

// Predefined Rate Limiters
export declare function authRateLimit<T = any>(
  handler: NextApiHandler<T>
): NextApiHandler<T>;

export declare function uploadRateLimit<T = any>(
  handler: NextApiHandler<T>
): NextApiHandler<T>;

export declare function apiRateLimit<T = any>(
  handler: NextApiHandler<T>
): NextApiHandler<T>;

export declare function adminRateLimit<T = any>(
  handler: NextApiHandler<T>
): NextApiHandler<T>;

// Utility Functions
export declare function clearRateLimit(key: string): void;
export declare function getRateLimitStatus(key: string): RateLimitData | null;
