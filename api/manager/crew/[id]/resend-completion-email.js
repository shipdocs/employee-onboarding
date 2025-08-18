// Vercel API Route: /api/manager/crew/[id]/resend-completion-email.js - Resend completion email
const { supabase } = require('../../../../lib/supabase');
const { requireManager } = require('../../../../lib/auth');
const { unifiedEmailService } = require('../../../../lib/unifiedEmailService');
const { adminRateLimit } = require('../../../../lib/rateLimit');

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;
    const { comments } = req.body || {};

    if (!id) {
      return res.status(400).json({ error: 'Crew member ID is required' });
    }

    // Get crew member details
    const { data: crew, error: crewError } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .eq('role', 'crew')
      .single();

    if (crewError || !crew) {
      return res.status(404).json({ error: 'Crew member not found' });
    }

    // Check if crew member has completed training
    if (crew.status !== 'fully_completed') {
      return res.status(400).json({
        error: 'Crew member has not completed training yet',
        currentStatus: crew.status
      });
    }

    // Send final completion email

    try {
      // Try to get the certificate path first
      const { data: certificate, error: certError } = await supabase
        .from('certificates')
        .select('certificate_path')
        .eq('user_id', crew.id)
        .eq('certificate_type', 'completion')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      let result;
      if (certError || !certificate) {
        // If no certificate found, send a simple completion notification email

        // Use phase completion email as fallback (it's a completion notification)
        result = await unifiedEmailService.sendPhaseCompletionEmail(crew.id, 'Final');
      } else {
        // Use existing certificate
        result = await unifiedEmailService.sendCompletionCertificateEmail(crew.id, certificate.certificate_path);
      }

      // Log the resend action
      await supabase
        .from('email_notifications')
        .insert({
          user_id: crew.id,
          email_type: 'completion_resent',
          subject: 'Final Completion Email Resent',
          status: 'sent',
          details: {
            resent_by: req.user.userId,
            resent_at: new Date().toISOString(),
            comments: comments
          }
        });

      res.json({
        success: true,
        message: 'Completion email resent successfully',
        recipient: crew.email,
        messageId: result.messageId
      });

    } catch (emailError) {
      // console.error('📧 [ERROR] Failed to resend completion email:', emailError);

      // Log the failure
      await supabase
        .from('email_notifications')
        .insert({
          user_id: crew.id,
          email_type: 'completion_resent',
          subject: 'Final Completion Email Resend Failed',
          status: 'failed',
          details: {
            resent_by: req.user.userId,
            resent_at: new Date().toISOString(),
            error: emailError.message,
            comments: comments
          }
        });

      res.status(500).json({
        error: 'Failed to resend completion email',
        details: emailError.message
      });
    }

  } catch (_error) {
    // console.error('Error in resend-completion-email:', _error);
    res.status(500).json({ error: 'Failed to resend completion email' });
  }
}

module.exports = adminRateLimit(requireManager(handler));
