// Vercel API Route: /api/manager/crew/[id]/send-onboarding-start.js - Manually send Onboarding Start email
const { supabase } = require('../../../../lib/database-supabase-compat');
const { requireManager } = require('../../../../lib/auth');
const { unifiedEmailService } = require('../../../../lib/unifiedEmailService');
const { adminRateLimit } = require('../../../../lib/rateLimit');

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;

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

    // Send Onboarding Start email

    try {
      await unifiedEmailService.sendOnboardingStartEmail(crew.id);

      res.json({
        success: true,
        message: 'Onboarding Start email sent successfully',
        recipient: crew.email
      });
    } catch (emailError) {
      // console.error('📧 [ERROR] Failed to send Onboarding Start email:', emailError);
      res.status(500).json({
        error: 'Failed to send Onboarding Start email',
        details: emailError.message
      });
    }

  } catch (error) {
    // console.error('Error in send-onboarding-start:', error);
    res.status(500).json({ error: 'Failed to send Onboarding Start email' });
  }
}

module.exports = adminRateLimit(requireManager(handler));
