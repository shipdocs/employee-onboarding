// utils/auth.js - Authentication utilities for Next.js pages
// This provides auth utilities for the pages directory

const jwt = require('jsonwebtoken');

/**
 * Verify JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 */
function verifyToken(token) {
  try {
    if (!token) {
      throw new Error('No token provided');
    }

    // Remove 'Bearer ' prefix if present
    const cleanToken = token.replace(/^Bearer\s+/, '');
    
    // Use Supabase JWT secret for verification
    const secret = process.env.SUPABASE_JWT_SECRET;
    if (!secret) {
      throw new Error('SUPABASE_JWT_SECRET not configured');
    }

    const decoded = jwt.verify(cleanToken, secret);
    return decoded;
  } catch (error) {
    throw new Error(`Token verification failed: ${error.message}`);
  }
}

/**
 * Extract token from request headers
 * @param {Object} req - Request object
 * @returns {string|null} Token or null if not found
 */
function extractToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

/**
 * Middleware to verify authentication for API routes
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Object} User data if authenticated
 */
function requireAuth(req, res) {
  try {
    const token = extractToken(req);
    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
      return null;
    }

    const user = verifyToken(token);
    req.user = user;
    return user;
  } catch (error) {
    res.status(401).json({ error: 'Invalid authentication token' });
    return null;
  }
}

module.exports = {
  verifyToken,
  extractToken,
  requireAuth
};
