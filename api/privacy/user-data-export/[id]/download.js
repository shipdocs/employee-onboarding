// API Route: /api/privacy/user-data-export/[id]/download.js
const { supabase } = require('../../../../lib/database-supabase-compat');
const { requireAuth } = require('../../../../lib/auth');
const { wrapWithErrorHandling } = require('../../../../lib/apiHandler');
const { apiRateLimit } = require('../../../../lib/rateLimit');

async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id: exportId } = req.query;
  const userId = req.user.id;

  try {
    // Verify export belongs to user and is completed
    const { data: exportRecord, error } = await supabase
      .from('data_exports')
      .select('*')
      .eq('id', exportId)
      .eq('user_id', userId)
      .eq('status', 'completed')
      .single();

    if (error || !exportRecord) {
      return res.status(404).json({ error: 'Export not found or not ready' });
    }

    // Generate fresh export data
    const exportData = await generateExportData(userId);

    // Log the download
    await supabase
      .from('audit_log')
      .insert({
        event_type: 'privacy_data_export_downloaded',
        user_id: userId,
        details: {
          export_id: exportId,
          timestamp: new Date().toISOString(),
          download_ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress
        }
      });

    // Return as downloadable JSON file
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="data-export-${userId}-${new Date().toISOString().split('T')[0]}.json"`);

    return res.status(200).json(exportData);

  } catch (error) {
    console.error('Export download error:', error);
    return res.status(500).json({
      error: 'Failed to download export',
      details: error.message
    });
  }
}

async function generateExportData(userId) {
  const exportData = {
    metadata: {
      user_id: userId,
      generated_at: new Date().toISOString(),
      format: 'GDPR_compliant_JSON',
      version: '1.0'
    },
    personal_data: {},
    activity_data: {},
    system_data: {}
  };

  try {
    // Get user profile
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    exportData.personal_data.profile = profile;

    // Get training sessions
    const { data: trainingSessions } = await supabase
      .from('training_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    exportData.activity_data.training_sessions = trainingSessions || [];

    // Get quiz results
    const { data: quizResults } = await supabase
      .from('quiz_results')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    exportData.activity_data.quiz_results = quizResults || [];

    // Get workflow access
    const { data: workflowAccess } = await supabase
      .from('workflow_user_access')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    exportData.system_data.workflow_access = workflowAccess || [];

    // Get audit logs (limited to user's own actions)
    const { data: auditLogs } = await supabase
      .from('audit_log')
      .select('event_type, created_at, details')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(500);
    exportData.system_data.audit_logs = auditLogs || [];

    // Get data exports history
    const { data: dataExports } = await supabase
      .from('data_exports')
      .select('id, status, created_at, export_type')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    exportData.system_data.data_exports = dataExports || [];

  } catch (error) {
    console.error('Error generating export data:', error);
    // Return partial data if some queries fail
  }

  return exportData;
}

module.exports = apiRateLimit(requireAuth(wrapWithErrorHandling(handler, {
  allowedMethods: ['GET'],
  requireAuth: true
})));
