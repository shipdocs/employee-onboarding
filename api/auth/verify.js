// Vercel API Route: /api/auth/verify.js
const { requireAuth } = require('../../lib/auth');
const { supabase } = require('../../lib/supabase');
const { authRateLimit } = require('../../lib/rateLimit');

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const userId = req.user.userId;

    // Get fresh user data from database
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Check if user can access the system (not suspended or not_started)
    if (user.status === 'suspended' || user.status === 'not_started') {
      return res.status(401).json({ error: 'Account access not available' });
    }

    // Fetch manager permissions if user is a manager
    let permissions = [];
    if (user.role === 'manager') {
      const { data: permissionData, error: permissionError } = await supabase
        .from('manager_permissions')
        .select('permission_key')
        .eq('manager_id', user.id)
        .eq('permission_value', true);

      if (!permissionError && permissionData) {
        permissions = permissionData.map(p => p.permission_key);
      }
    }

    res.json({
      valid: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        position: user.position,
        vesselAssignment: user.vessel_assignment,
        status: user.status,
        preferredLanguage: user.preferred_language,
        permissions: permissions
      }
    });

  } catch (_error) {
    // console.error('Token verification error:', _error);
    res.status(500).json({ error: 'Token verification failed' });
  }
}

module.exports = authRateLimit(requireAuth(handler));
