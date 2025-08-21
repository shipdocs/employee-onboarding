// Staff Login for Admins and Managers (with MFA support)
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const { db } = require('../../lib/database');

// Create PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

module.exports = async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        error: 'Missing credentials',
        message: 'Email and password are required'
      });
    }

    // Check if JWT_SECRET is configured
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        error: 'Server configuration error',
        message: 'Authentication not configured'
      });
    }

    // Get user from database (only admin and manager roles)
    const result = await pool.query(
      'SELECT id, email, password_hash, role, first_name, last_name, position FROM users WHERE email = $1 AND role IN ($2, $3)',
      [email, 'admin', 'manager']
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Invalid email or password, or access denied'
      });
    }

    const user = result.rows[0];

    // Check password
    if (!user.password_hash) {
      return res.status(401).json({
        error: 'Account not configured',
        message: 'Please contact administrator'
      });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Invalid email or password'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Check if MFA is enabled for this user
    const mfaResult = await pool.query(
      'SELECT enabled FROM user_mfa_settings WHERE user_id = $1',
      [user.id]
    );

    const mfaEnabled = mfaResult.rows.length > 0 ? mfaResult.rows[0].enabled : false;
    const mfaRequired = ['admin', 'manager'].includes(user.role);
    const mfaSetupRequired = mfaRequired && !mfaEnabled;

    // Success response
    return res.json({
      success: true,
      token: token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        position: user.position,
        mfaEnabled: mfaEnabled
      },
      mfaSetupRequired: mfaSetupRequired,
      message: mfaSetupRequired ? 'Please set up multi-factor authentication to secure your account' : undefined
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Please try again later'
    });
  }
};
