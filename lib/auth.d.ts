/**
 * Type declarations for auth.js
 */

import { NextApiHandler, NextApiRequest, NextApiResponse } from 'next';
import { User } from '../types/database';

export interface JWTPayload {
  userId: string;
  email: string;
  role: 'crew' | 'manager' | 'admin';
  firstName?: string;
  lastName?: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends NextApiRequest {
  user?: JWTPayload;
  correlation_id?: string;
}

export interface TokenGenerationOptions {
  expiresIn?: string;
}

export interface AuthResult {
  success: boolean;
  error?: string;
  user?: JWTPayload;
}

export interface VerifyAuthUser extends JWTPayload {
  id: string;
  permissions: string[];
}

/**
 * Generate a magic link token
 */
export function generateMagicToken(): string;

/**
 * Generate a JWT token
 */
export function generateJWT(user: { 
  id: string; 
  email: string; 
  role: string; 
  first_name?: string; 
  last_name?: string 
}): string;

/**
 * Verify and decode a JWT token
 */
export function verifyJWT(token: string): JWTPayload | null;

/**
 * Alias for verifyJWT for backward compatibility
 */
export { verifyJWT as verifyToken };

/**
 * Extract user from request
 */
export function authenticateRequest(req: NextApiRequest): Promise<JWTPayload | null>;

/**
 * Authenticate token and return result object
 */
export function authenticateToken(req: NextApiRequest): Promise<AuthResult>;

/**
 * Middleware to require authentication
 */
export function requireAuth<T = any>(
  handler: (req: AuthenticatedRequest, res: NextApiResponse<T>) => void | Promise<void>
): NextApiHandler<T>;

/**
 * Middleware to require manager role
 */
export function requireManager<T = any>(
  handler: (req: AuthenticatedRequest, res: NextApiResponse<T>) => void | Promise<void>
): NextApiHandler<T>;

/**
 * Middleware to require crew role
 */
export function requireCrew<T = any>(
  handler: (req: AuthenticatedRequest, res: NextApiResponse<T>) => void | Promise<void>
): NextApiHandler<T>;

/**
 * Middleware to require admin role
 */
export function requireAdmin<T = any>(
  handler: (req: AuthenticatedRequest, res: NextApiResponse<T>) => void | Promise<void>
): NextApiHandler<T>;

/**
 * Middleware to require admin or manager role
 */
export function requireManagerOrAdmin<T = any>(
  handler: (req: AuthenticatedRequest, res: NextApiResponse<T>) => void | Promise<void>
): NextApiHandler<T>;

/**
 * Role hierarchy checker
 */
export function hasRoleAccess(userRole: string, requiredRole: string): boolean;

/**
 * Higher-order function for hierarchical role checking
 */
export function requireRoleLevel<T = any>(
  minimumRole: string
): (handler: (req: AuthenticatedRequest, res: NextApiResponse<T>) => void | Promise<void>) => NextApiHandler<T>;

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string): boolean;

/**
 * Get token expiration time
 */
export function getTokenExpirationTime(token: string): number | null;

/**
 * Check if token is expiring soon
 */
export function isTokenExpiringSoon(token: string, minutesThreshold?: number): boolean;

/**
 * Verify authentication and return user with permissions
 */
export function verifyAuth(req: NextApiRequest, res: NextApiResponse): Promise<VerifyAuthUser | null>;