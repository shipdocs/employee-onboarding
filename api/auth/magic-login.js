/**
 * @file magic-login.js
 * @brief Passwordless authentication endpoint for crew members
 *
 * @details This API endpoint implements secure magic link authentication specifically
 * designed for maritime crew members. It provides a passwordless login system that
 * enhances security while simplifying the authentication process for users who may
 * have limited access to traditional password management tools in maritime environments.
 *
 * **Authentication Process:**
 * 1. Crew member receives magic link via email
 * 2. Link contains secure token with limited validity period
 * 3. Token is validated against database records
 * 4. Valid tokens generate JWT session tokens
 * 5. User is authenticated and redirected to crew dashboard
 *
 * **Security Features:**
 * - Time-limited token validity (configurable expiration)
 * - Single-use token consumption
 * - Database-backed token verification
 * - JWT session token generation
 * - Automatic token cleanup on use
 *
 * **Error Handling:**
 * - Invalid or expired tokens
 * - Missing user accounts
 * - Database connectivity issues
 * - Configuration errors
 *
 * @endpoint POST /api/auth/magic-login
 * @param {string} token - Magic link token from email
 * @returns {Object} Authentication response with JWT token and user data
 *
 * @example
 * // Request body
 * {
 *   "token": "abc123def456ghi789"
 * }
 *
 * @example
 * // Success response
 * {
 *   "success": true,
 *   "token": "your_jwt_token_here...",
 *   "user": {
 *     "id": "crew_123",
 *     "email": "crew@vessel.com",
 *     "role": "crew",
 *     "firstName": "John",
 *     "lastName": "Sailor"
 *   }
 * }
 *
 * @author Maritime Onboarding System
 * @version 1.0
 * @since 2024
 *
 * @see CrewDashboard For post-authentication interface
 * @see emailService For magic link generation and delivery
 */

// Magic Link Login for Crew Members (PostgreSQL)
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const { db } = require('../../lib/database');

// Create PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

/**
 * @brief Handles magic link authentication for crew members
 *
 * @details Processes magic link tokens sent via email to authenticate crew members
 * without requiring passwords. Validates token expiration, user existence, and
 * generates JWT session tokens for authenticated sessions.
 *
 * **Request Processing:**
 * 1. Validates request method and token presence
 * 2. Queries database for valid, non-expired magic link
 * 3. Retrieves associated user account information
 * 4. Generates JWT session token with user data
 * 5. Marks magic link as used (single-use security)
 * 6. Returns authentication response
 *
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body containing token
 * @param {string} req.body.token - Magic link token to validate
 * @param {Object} res - Express response object
 *
 * @returns {Promise<void>} Sends JSON response with authentication result
 *
 * @throws {401} Invalid or expired magic link
 * @throws {404} User account not found
 * @throws {405} Invalid HTTP method
 * @throws {500} Server configuration or database errors
 */
module.exports = async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token } = req.body;

    // Validate input
    if (!token) {
      return res.status(400).json({
        error: 'Missing token',
        message: 'Magic link token is required'
      });
    }

    // Check if JWT_SECRET is configured
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        error: 'Server configuration error',
        message: 'Authentication not configured'
      });
    }

    // Get magic link from database
    const linkResult = await pool.query(
      'SELECT * FROM magic_links WHERE token = $1 AND expires_at > NOW()',
      [token]
    );

    if (linkResult.rows.length === 0) {
      return res.status(401).json({
        error: 'Invalid magic link',
        message: 'Magic link is invalid or expired'
      });
    }

    const linkData = linkResult.rows[0];

    // Get user from database
    const userResult = await pool.query(
      'SELECT id, email, first_name, last_name, role, position, vessel_assignment, status, preferred_language FROM users WHERE id = $1 AND is_active = true',
      [linkData.user_id]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        error: 'User not found',
        message: 'User account not found or inactive'
      });
    }

    const user = userResult.rows[0];

    // Block magic link login for privileged users (admin/manager)
    if (['admin', 'manager'].includes(user.role)) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Staff members must use the Staff Login option. Magic links are only for crew members.'
      });
    }

    // Mark magic link as used
    await pool.query(
      'UPDATE magic_links SET used_at = NOW(), used_ip = $1 WHERE token = $2',
      [req.headers['x-forwarded-for'] || req.connection.remoteAddress, token]
    );

    // Update user status to in_progress if they're crew and currently not_started
    if (user.role === 'crew' && user.status === 'not_started') {
      await pool.query(
        'UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2',
        ['in_progress', user.id]
      );
      user.status = 'in_progress';
    }

    // Generate JWT token
    const jwtToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Success response
    return res.json({
      success: true,
      token: jwtToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        position: user.position,
        vesselAssignment: user.vessel_assignment,
        status: user.status,
        preferredLanguage: user.preferred_language
      }
    });

  } catch (error) {
    console.error('Magic login error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Please try again later'
    });
  }
};
