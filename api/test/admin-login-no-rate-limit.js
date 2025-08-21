// Test admin login without rate limiting to isolate the issue
const db = require('../../lib/database');
const { generateJWT } = require('../../lib/auth');
const bcrypt = require('bcrypt');
const { apiRateLimit } = require('../../lib/rateLimit');

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const normalizedEmail = email.toLowerCase();

    // Step 1: Test account lockout check
    console.log('Testing account lockout...');
    try {
      const { data: lockoutData, error: lockoutError } = await supabase.rpc('is_account_locked', {
        user_email: normalizedEmail
      });

      if (lockoutError) {
        console.error('Lockout RPC error:', lockoutError);
        return res.status(500).json({
          error: 'Lockout check failed',
          details: lockoutError.message,
          step: 'lockout_check'
        });
      }

      console.log('Lockout check result:', lockoutData);

      if (lockoutData === true) {
        return res.status(423).json({
          error: 'Account is locked',
          step: 'lockout_check'
        });
      }
    } catch (lockoutError) {
      console.error('Lockout check exception:', lockoutError);
      return res.status(500).json({
        error: 'Lockout check exception',
        details: lockoutError.message,
        step: 'lockout_check'
      });
    }

    // Step 2: Get user
    console.log('Getting user...');
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', normalizedEmail)
      .eq('role', 'admin')
      .eq('is_active', true)
      .single();

    if (userError || !user) {
      return res.status(404).json({
        error: 'Admin user not found',
        step: 'user_lookup'
      });
    }

    // Step 3: Verify password
    console.log('Verifying password...');
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Invalid password',
        step: 'password_verification'
      });
    }

    // Step 4: Generate JWT
    console.log('Generating JWT...');
    const jwtToken = generateJWT(user);

    // Step 5: Success
    return res.status(200).json({
      success: true,
      message: 'Admin login successful (no rate limit)',
      token: jwtToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status
      }
    });

  } catch (error) {
    console.error('Admin login error:', error);
    return res.status(500).json({
      error: 'Login failed',
      details: error.message,
      step: 'unknown'
    });
  }
}

module.exports = apiRateLimit(handler);
