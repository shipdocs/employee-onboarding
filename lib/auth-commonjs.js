// lib/auth-commonjs.js - CommonJS wrapper for auth utilities
// This file provides a CommonJS-compatible interface for auth functions

const auth = require('./auth');

/**
 * Verify token and return decoded payload
 * This is a wrapper around verifyJWT for backward compatibility
 */
function verifyToken(token) {
  return auth.verifyJWT(token);
}

/**
 * Authenticate request and return user data
 * This is a wrapper around verifyAuth for backward compatibility
 */
async function authenticateRequest(req, res) {
  return await auth.verifyAuth(req, res);
}

// Export functions with expected names
module.exports = {
  verifyToken,
  authenticateRequest,
  // Re-export all original auth functions
  ...auth
};
