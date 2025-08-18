// API Route: /api/privacy/user-data-export.js
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
    // Check for existing pending export
    const { data: existingExport } = await supabase
      .from('data_exports')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .single();

    if (existingExport) {
      return res.status(200).json(existingExport);
    }

    // Create new export request
    const { data: newExport, error } = await supabase
      .from('data_exports')
      .insert({
        user_id: userId,
        export_type: 'gdpr_full',
        status: 'pending',
        details: {
          user_email: userEmail,
          requested_at: new Date().toISOString(),
          format: 'json'
        }
      })
      .select()
      .single();

    if (error) throw error;

    // Log the export request
    await supabase
      .from('audit_log')
      .insert({
        event_type: 'privacy_data_export_requested',
        user_id: userId,
        details: {
          export_id: newExport.id,
          user_email: userEmail,
          timestamp: new Date().toISOString()
        }
      });

    // Simulate processing (in production, this would be a background job)
    setTimeout(async () => {
      try {
        await processDataExport(newExport.id, userId);
      } catch (error) {
        console.error('Background export processing failed:', error);
      }
    }, 2000);

    return res.status(200).json(newExport);

  } catch (error) {
    console.error('Data export request error:', error);
    return res.status(500).json({ 
      error: 'Failed to request data export',
      details: error.message 
    });
  }
}

async function processDataExport(exportId, userId) {
  try {
    // Collect comprehensive user data
    const exportData = {
      metadata: {
        export_id: exportId,
        user_id: userId,
        generated_at: new Date().toISOString(),
        format: 'GDPR_compliant_JSON'
      },
      personal_data: {},
      activity_data: {},
      system_data: {}
    };

    // Get all user data
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    exportData.personal_data.profile = profile;

    const { data: trainingSessions } = await supabase
      .from('training_sessions')
      .select('*')
      .eq('user_id', userId);
    exportData.activity_data.training_sessions = trainingSessions || [];

    const { data: quizResults } = await supabase
      .from('quiz_results')
      .select('*')
      .eq('user_id', userId);
    exportData.activity_data.quiz_results = quizResults || [];

    const { data: workflowAccess } = await supabase
      .from('workflow_user_access')
      .select('*')
      .eq('user_id', userId);
    exportData.system_data.workflow_access = workflowAccess || [];

    const { data: auditLogs } = await supabase
      .from('audit_log')
      .select('event_type, created_at, details')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    exportData.system_data.audit_logs = auditLogs || [];

    // Update export status to completed
    await supabase
      .from('data_exports')
      .update({
        status: 'completed',
        details: {
          export_id: exportId,
          user_id: userId,
          generated_at: new Date().toISOString(),
          file_size_bytes: JSON.stringify(exportData).length,
          records_count: {
            training_sessions: exportData.activity_data.training_sessions.length,
            quiz_results: exportData.activity_data.quiz_results.length,
            workflow_access: exportData.system_data.workflow_access.length,
            audit_logs: exportData.system_data.audit_logs.length
          }
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', exportId);

    // Log completion
    await supabase
      .from('audit_log')
      .insert({
        event_type: 'privacy_data_export_completed',
        user_id: userId,
        details: {
          export_id: exportId,
          timestamp: new Date().toISOString(),
          records_exported: Object.values(exportData.activity_data).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0)
        }
      });

  } catch (error) {
    console.error('Export processing error:', error);
    
    // Mark export as failed
    await supabase
      .from('data_exports')
      .update({
        status: 'failed',
        details: {
          error: error.message,
          failed_at: new Date().toISOString()
        }
      })
      .eq('id', exportId);
  }
}

module.exports = apiRateLimit(requireAuth(wrapWithErrorHandling(handler, {
  allowedMethods: ['POST'],
  requireAuth: true
})));
