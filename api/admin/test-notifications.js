// Vercel API Route: /api/admin/test-notifications.js - Test notification system
const db = require('../../lib/database-direct');
const { requireAdmin } = require('../../lib/auth');
const { notificationService } = require('../../lib/notificationService');
const { adminRateLimit } = require('../../lib/rateLimit');

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { testType, userId } = req.body;

    if (!testType) {
      return res.status(400).json({ error: 'testType is required (first_manager_login or first_user_login)' });
    }

    let testUser;

    if (userId) {
      // Use specific user
      const userResult = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
    const user = userResult.rows[0];
    const userError = !user;

      if (userError || !user) {
        return res.status(404).json({ error: 'User not found' });
      }

      testUser = user;
    } else {
      // Find a test user based on testType
      const role = testType === 'first_manager_login' ? 'manager' : 'crew';

      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*')
        .eq('role', role)
        .limit(1);

      if (usersError || !users || users.length === 0) {
        return res.status(404).json({ error: `No ${role} users found for testing` });
      }

      testUser = users[0];
    }

    console.log(`🧪 Testing ${testType} notification for user: ${testUser.email}`);

    // Temporarily clear first_login_at to simulate first login
    const originalFirstLogin = testUser.first_login_at;

    const { error: clearError } = await supabase
      .from('users')
      .update({ first_login_at: null })
      .eq('id', testUser.id);

    if (clearError) {
      return res.status(500).json({ error: 'Failed to prepare test user', details: clearError });
    }

    // Trigger the notification
    await notificationService.checkAndHandleFirstLogin({
      ...testUser,
      first_login_at: null // Simulate first login
    });

    // Restore original state
    await supabase
      .from('users')
      .update({ first_login_at: originalFirstLogin })
      .eq('id', testUser.id);

    // Get recent notifications to show what was created
    const { data: recentNotifications } = await supabase
      .from('system_notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    const { data: recentEmails } = await supabase
      .from('email_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    res.json({
      success: true,
      message: `Test ${testType} notification triggered successfully`,
      testUser: {
        id: testUser.id,
        email: testUser.email,
        name: `${testUser.first_name} ${testUser.last_name}`,
        role: testUser.role
      },
      recentNotifications: recentNotifications || [],
      recentEmails: recentEmails || [],
      timestamp: new Date().toISOString()
    });

  } catch (_error) {
    console.error('Test notification error:', _error);
    res.status(500).json({
      error: 'Test failed',
      message: _error.message,
      stack: process.env.NODE_ENV === 'development' ? _error.stack : undefined
    });
  }
}

module.exports = adminRateLimit(requireAdmin(handler));
