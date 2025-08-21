// API Route: /api/privacy/delete-user-account.js
const db = require('../../lib/database-direct');
const { requireAuth } = require('../../lib/auth');
const { wrapWithErrorHandling } = require('../../lib/apiHandler');
const { apiRateLimit } = require('../../lib/rateLimit');

async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { confirmation } = req.body;
  const userId = req.user.id;
  const userEmail = req.user.email;

  try {
    // Validate confirmation
    if (confirmation !== 'DELETE MY ACCOUNT') {
      return res.status(400).json({
        error: 'Invalid confirmation. Please type "DELETE MY ACCOUNT" exactly.'
      });
    }

    // Log the deletion request before deleting
    await supabase
      .from('audit_log')
      .insert({
        event_type: 'account_deletion_requested',
        user_id: userId,
        details: {
          user_email: userEmail,
          timestamp: new Date().toISOString(),
          confirmation_provided: confirmation
        }
      });

    // Delete user data in correct order (respecting foreign key constraints)

    // 1. Delete quiz results
    await supabase
      .from('quiz_results')
      .delete()
      .eq('user_id', userId);

    // 2. Delete training sessions
    await supabase
      .from('training_sessions')
      .delete()
      .eq('user_id', userId);

    // 3. Delete workflow access
    await supabase
      .from('workflow_user_access')
      .delete()
      .eq('user_id', userId);

    // 4. Delete data exports
    await supabase
      .from('data_exports')
      .delete()
      .eq('user_id', userId);

    // 5. Delete audit logs (keep some for compliance)
    // Note: In production, you might want to anonymize rather than delete audit logs
    await supabase
      .from('audit_log')
      .delete()
      .eq('user_id', userId);

    // 6. Finally delete the user record
    const { error: userDeleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (userDeleteError) {
      throw userDeleteError;
    }

    // Log successful deletion (this will be the last audit log for this user)
    await supabase
      .from('audit_log')
      .insert({
        event_type: 'account_deleted',
        user_id: null, // User no longer exists
        details: {
          deleted_user_id: userId,
          deleted_user_email: userEmail,
          timestamp: new Date().toISOString(),
          deletion_method: 'user_requested'
        }
      });

    return res.status(200).json({
      message: 'Account successfully deleted',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Account deletion error:', error);

    // Log the failed deletion attempt
    try {
      await supabase
        .from('audit_log')
        .insert({
          event_type: 'account_deletion_failed',
          user_id: userId,
          details: {
            user_email: userEmail,
            error: error.message,
            timestamp: new Date().toISOString()
          }
        });
    } catch (logError) {
      console.error('Failed to log deletion error:', logError);
    }

    return res.status(500).json({
      error: 'Failed to delete account',
      details: error.message
    });
  }
}

module.exports = apiRateLimit(requireAuth(wrapWithErrorHandling(handler, {
  allowedMethods: ['POST'],
  requireAuth: true
})));
