// Test endpoint to debug admin login issues
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

    // Step 1: Check if user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('role', 'admin')
      .eq('is_active', true)
      .single();

    if (userError) {
      return res.status(500).json({
        error: 'Database error',
        details: userError.message,
        step: 'user_lookup'
      });
    }

    if (!user) {
      return res.status(404).json({
        error: 'Admin user not found',
        step: 'user_lookup'
      });
    }

    // Step 2: Check password hash
    if (!user.password_hash) {
      return res.status(500).json({
        error: 'No password hash found',
        step: 'password_check'
      });
    }

    // Step 3: Verify password (temporarily skip bcrypt for testing)
    let isValidPassword = false;
    try {
      console.log('Starting bcrypt compare...');
      isValidPassword = await bcrypt.compare(password, user.password_hash);
      console.log('Bcrypt compare completed:', isValidPassword);
    } catch (bcryptError) {
      console.error('Bcrypt error:', bcryptError);
      return res.status(500).json({
        error: 'Bcrypt error',
        details: bcryptError.message,
        step: 'bcrypt_compare'
      });
    }

    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Invalid password',
        step: 'password_verification',
        passwordLength: password.length,
        hashLength: user.password_hash.length
      });
    }

    // Step 4: Test JWT generation
    let jwtToken;
    try {
      console.log('Generating JWT...');
      jwtToken = generateJWT(user);
      console.log('JWT generated successfully');
    } catch (jwtError) {
      console.error('JWT generation error:', jwtError);
      return res.status(500).json({
        error: 'JWT generation failed',
        details: jwtError.message,
        step: 'jwt_generation'
      });
    }

    // Step 5: Test audit log insertion
    try {
      console.log('Inserting audit log...');
      await supabase
        .from('audit_log')
        .insert({
          user_id: user.id,
          action: 'admin_login_test',
          resource_type: 'authentication',
          details: {
            test: true,
            ip_address: req.headers['x-forwarded-for'] || 'unknown'
          }
        });
      console.log('Audit log inserted successfully');
    } catch (auditError) {
      console.error('Audit log error:', auditError);
      return res.status(500).json({
        error: 'Audit log failed',
        details: auditError.message,
        step: 'audit_log'
      });
    }

    // Step 6: Success
    return res.status(200).json({
      success: true,
      message: 'Admin login test successful (with JWT and audit)',
      token: jwtToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status
      }
    });

  } catch (error) {
    console.error('Admin login test error:', error);
    return res.status(500).json({
      error: 'Test failed',
      details: error.message,
      step: 'unknown'
    });
  }
}

module.exports = apiRateLimit(handler);
