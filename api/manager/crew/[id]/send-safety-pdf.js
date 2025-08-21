// Vercel API Route: /api/manager/crew/[id]/send-safety-pdf.js - Manually send Safety Management PDF
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

    // Send Safety Management PDF email

    try {
      await unifiedEmailService.sendSafetyManagementEmail(crew.id);

      res.json({
        success: true,
        message: 'Safety Management PDF sent successfully',
        recipient: crew.email
      });
    } catch (emailError) {
      // console.error('📧 [ERROR] Failed to send Safety Management PDF:', emailError);
      res.status(500).json({
        error: 'Failed to send Safety Management PDF',
        details: emailError.message
      });
    }

  } catch (error) {
    // console.error('Error in send-safety-pdf:', error);
    res.status(500).json({ error: 'Failed to send Safety Management PDF' });
  }
}

module.exports = adminRateLimit(requireManager(handler));
