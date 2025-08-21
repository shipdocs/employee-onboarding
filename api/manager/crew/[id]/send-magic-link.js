// Vercel API Route: /api/manager/crew/[id]/send-magic-link.js - Send magic link to crew member
const { supabase } = require('../../../../lib/database-supabase-compat');
const { requireManager, generateMagicToken } = require('../../../../lib/auth');
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
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .eq('role', 'crew')
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'Crew member not found' });
    }

    // Generate magic link token
    const token = generateMagicToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 3); // 3 hours from now

    // Store magic link in database
    const { data: magicLink, error: linkError } = await supabase
      .from('magic_links')
      .insert({
        user_id: user.id,
        email: user.email,
        token,
        expires_at: expiresAt.toISOString(),
        used: false
      })
      .select()
      .single();

    if (linkError) {
      // console.error('Error creating magic link:', linkError);
      return res.status(500).json({ error: 'Failed to create magic link' });
    }

    // Send email with magic link using unified service
    try {

      await unifiedEmailService.sendCrewMagicLinkEmail(user.id, token);

    } catch (emailError) {
      // console.error('📧 [ERROR] Failed to send crew magic link email:', emailError);
      // Don't fail the request if email fails, but log it
    }

    // Log email notification
    await supabase
      .from('email_notifications')
      .insert({
        user_id: user.id,
        email_type: 'magic_link',
        subject: 'Begin Your Onboarding Training - Secure Access Link',
        status: 'sent'
      });

    res.json({
      message: 'Magic link sent successfully',
      magicLink: {
        id: magicLink.id,
        token: token,
        expiresAt: expiresAt.toISOString(),
        // Include the actual link for development/testing
        link: `${process.env.BASE_URL || 'http://localhost:3001'}/login?token=${token}`
      },
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name
      }
    });

  } catch (_error) {
    // console.error('Error sending magic link:', _error);
    res.status(500).json({ error: 'Failed to send magic link' });
  }
}

module.exports = adminRateLimit(requireManager(handler));
