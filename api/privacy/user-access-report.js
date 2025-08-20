// API Route: /api/privacy/user-access-report.js
const { supabase } = require('../../lib/supabase');
const { requireAuth } = require('../../lib/auth');
const { wrapWithErrorHandling } = require('../../lib/apiHandler');
const { apiRateLimit } = require('../../lib/rateLimit');

async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = req.user.id;
  const userEmail = req.user.email;

  try {
    // Collect all user data from various tables
    const userData = {
      user_profile: null,
      training_sessions: [],
      quiz_results: [],
      workflow_access: [],
      audit_logs: [],
      data_exports: [],
      generated_at: new Date().toISOString(),
      user_id: userId,
      email: userEmail
    };

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      throw profileError;
    }
    userData.user_profile = profile;

    // Get training sessions
    const { data: trainingSessions } = await supabase
      .from('training_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    userData.training_sessions = trainingSessions || [];

    // Get quiz results
    const { data: quizResults } = await supabase
      .from('quiz_results')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    userData.quiz_results = quizResults || [];

    // Get workflow access
    const { data: workflowAccess } = await supabase
      .from('workflow_user_access')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    userData.workflow_access = workflowAccess || [];

    // Get audit logs related to this user (limited for privacy)
    const { data: auditLogs } = await supabase
      .from('audit_log')
      .select('event_type, created_at, details')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);
    userData.audit_logs = auditLogs || [];

    // Get data exports
    const { data: dataExports } = await supabase
      .from('data_exports')
      .select('id, status, created_at, updated_at, export_type')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    userData.data_exports = dataExports || [];

    // Log the access report generation
    await supabase
      .from('audit_log')
      .insert({
        event_type: 'privacy_access_report',
        user_id: userId,
        details: {
          user_email: userEmail,
          timestamp: new Date().toISOString(),
          data_categories: Object.keys(userData).filter(key =>
            Array.isArray(userData[key]) ? userData[key].length > 0 : userData[key] !== null
          )
        }
      });

    // Return as downloadable JSON
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="access-report-${userId}-${new Date().toISOString().split('T')[0]}.json"`);

    return res.status(200).json(userData);

  } catch (error) {
    console.error('Access report generation error:', error);
    return res.status(500).json({
      error: 'Failed to generate access report',
      details: error.message
    });
  }
}

module.exports = apiRateLimit(requireAuth(wrapWithErrorHandling(handler, {
  allowedMethods: ['POST'],
  requireAuth: true
})));
