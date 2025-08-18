// Vercel API Route: /api/email/resend.js - Resend any type of email
const { supabase } = require('../../lib/supabase');
const { requireAuth } = require('../../lib/auth');
const { unifiedEmailService } = require('../../lib/unifiedEmailService');
const { emailRateLimit } = require('../../lib/rateLimit');
async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, emailType, comments, phase } = req.body;

    if (!userId || !emailType) {
      return res.status(400).json({ error: 'User ID and email type are required' });
    }

    // Get user details to verify they exist
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let result;
    let subject;

    // Handle different email types
    switch (emailType) {
      case 'final_completion':
        result = await unifiedEmailService.sendFinalCompletionEmail(userId, comments);
        subject = 'Final Completion Email Resent';
        break;

      case 'completion_certificate':
        result = await unifiedEmailService.sendCompletionCertificateEmail(userId);
        subject = 'Completion Certificate Email Resent';
        break;

      case 'phase_completion':
        if (!phase) {
          return res.status(400).json({ error: 'Phase number is required for phase completion emails' });
        }
        result = await unifiedEmailService.sendPhaseCompletionEmail(userId, phase);
        subject = `Phase ${phase} Completion Email Resent`;
        break;

      case 'phase_start':
        if (!phase) {
          return res.status(400).json({ error: 'Phase number is required for phase start emails' });
        }
        result = await unifiedEmailService.sendPhaseStartEmail(userId, phase);
        subject = `Phase ${phase} Start Email Resent`;
        break;

      case 'onboarding_start':
        result = await unifiedEmailService.sendOnboardingStartEmail(userId);
        subject = 'Onboarding Start Email Resent';
        break;

      case 'safety_management':
        result = await unifiedEmailService.sendSafetyManagementEmail(userId);
        subject = 'Safety Management Email Resent';
        break;

      default:
        return res.status(400).json({ error: `Unsupported email type: ${emailType}` });
    }

    // Log the resend action
    await supabase
      .from('email_notifications')
      .insert({
        user_id: userId,
        email_type: `${emailType}_resent`,
        subject: subject,
        status: 'sent',
        details: {
          resent_by: req.user.userId,
          resent_at: new Date().toISOString(),
          comments: comments,
          phase: phase
        }
      });

    res.json({
      message: `${emailType} email resent successfully`,
      messageId: result.messageId || result.userResult?.messageId,
      recipient: user.email,
      emailType: emailType
    });

  } catch (_error) {
    // console.error(`📧 [ERROR] Failed to resend ${req.body.emailType} email:`, _error);

    // Log the failure
    try {
      await supabase
        .from('email_notifications')
        .insert({
          user_id: req.body.userId,
          email_type: `${req.body.emailType}_resent`,
          subject: `${req.body.emailType} Email Resend Failed`,
          status: 'failed',
          details: {
            resent_by: req.user.userId,
            resent_at: new Date().toISOString(),
            error: _error.message,
            comments: req.body.comments,
            phase: req.body.phase
          }
        });
    } catch (logError) {
      // console.error('Failed to log email failure:', logError);
    }

    res.status(500).json({
      error: `Failed to resend ${req.body.emailType} email`,
      details: _error.message
    });
  }
}

module.exports = emailRateLimit(requireAuth(handler));
