// Vercel API Route: /api/auth/request-magic-link.js
const { supabase } = require('../../lib/supabase');
const { generateMagicToken } = require('../../lib/auth');
const { unifiedEmailService } = require('../../lib/unifiedEmailService');
const { authRateLimit } = require('../../lib/rateLimit');

// Helper function to log magic link request security events
async function logMagicLinkRequestEvent(email, ipAddress, userAgent, eventType, details = {}) {
  try {
    await supabase
      .from('security_events')
      .insert({
        type: `magic_link_request_${eventType}`,
        severity: eventType === 'rate_limited' || eventType === 'privileged_user' ? 'medium' : 'low',
        user_id: null,
        ip_address: ipAddress,
        user_agent: userAgent,
        details: {
          email: email,
          timestamp: new Date().toISOString(),
          ...details
        },
        threats: eventType === 'rate_limited' ? ['magic_link_abuse'] : []
      });
  } catch (_error) {
    console.error('Failed to log magic link request security event:', _error);
  }
}

// Rate limiting: Check recent magic link requests
async function checkRateLimit(email, ipAddress) {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  // Check requests by email (max 3 per 5 minutes)
  const { data: emailRequests } = await supabase
    .from('magic_links')
    .select('id')
    .eq('email', email)
    .gte('created_at', fiveMinutesAgo);

  // Check requests by IP (max 10 per 5 minutes)
  const { data: ipRequests } = await supabase
    .from('security_events')
    .select('id')
    .eq('type', 'magic_link_request_success')
    .eq('ip_address', ipAddress)
    .gte('created_at', fiveMinutesAgo);

  return {
    emailLimited: (emailRequests?.length || 0) >= 3,
    ipLimited: (ipRequests?.length || 0) >= 10
  };
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body;
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Please provide a valid email address' });
    }

    // Check rate limiting
    const rateLimitCheck = await checkRateLimit(email.toLowerCase(), clientIP);
    if (rateLimitCheck.emailLimited || rateLimitCheck.ipLimited) {
      await logMagicLinkRequestEvent(email, clientIP, userAgent, 'rate_limited', {
        reason: rateLimitCheck.emailLimited ? 'email_rate_limited' : 'ip_rate_limited'
      });

      return res.status(429).json({
        error: 'Too many requests. Please wait a few minutes before requesting another magic link.'
      });
    }

    // Check if user exists and is a crew member (managers must use Staff Login)
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (userError || !user) {
      // Don't reveal if user exists or not for security - return generic success message
      return res.status(200).json({
        message: 'If an account exists with this email address, a magic link has been sent. Please check your inbox.'
      });
    }

    // Block magic links for privileged users (admin/manager)
    if (['admin', 'manager'].includes(user.role)) {
      await logMagicLinkRequestEvent(email, clientIP, userAgent, 'privileged_user', {
        role: user.role,
        reason: 'Staff members must use password login'
      });

      return res.status(403).json({
        error: 'Staff members must use the Staff Login option with password and MFA. Magic links are only available for crew members.',
        code: 'STAFF_USE_PASSWORD_LOGIN'
      });
    }

    // Only allow crew members to use magic links
    if (user.role !== 'crew') {
      return res.status(403).json({
        error: 'Magic links are only available for crew members. Please contact your administrator.',
        code: 'MAGIC_LINK_NOT_ALLOWED'
      });
    }

    // Check if user is active (different checks for crew vs manager)
    // Crew members can log in if they're active or in progress states
    const allowedCrewStatuses = ['active', 'in_progress', 'forms_completed', 'training_completed', 'fully_completed'];
    if (user.role === 'crew' && !allowedCrewStatuses.includes(user.status)) {
      return res.status(403).json({
        error: `Your account is not active (status: ${user.status}). Please contact your manager.`
      });
    }

    if (user.role === 'manager' && !user.is_active) {
      return res.status(403).json({
        error: 'Your manager account is not active. Please contact your administrator.'
      });
    }

    // Generate new magic link
    const token = generateMagicToken();
    const expiresAt = new Date(Date.now() + 3 * 60 * 60 * 1000); // 3 hours

    const { error: linkError } = await supabase
      .from('magic_links')
      .insert({
        user_id: user.id,
        email: user.email,
        token,
        expires_at: expiresAt.toISOString()
      });

    if (linkError) {
      // console.error('Error creating magic link:', linkError);
      return res.status(500).json({ error: 'Failed to generate magic link' });
    }

    // Send magic link email using unified service
    try {

      if (user.role === 'manager') {
        // Use manager magic link email service
        await unifiedEmailService.sendManagerMagicLinkEmail(user.id, token);
      } else {
        // Use crew magic link email service
        await unifiedEmailService.sendCrewMagicLinkEmail(user.id, token);
      }

      // Log successful magic link request
      await logMagicLinkRequestEvent(email, clientIP, userAgent, 'success', {
        user_id: user.id,
        role: user.role
      });

      res.json({
        message: 'A new magic link has been sent to your email address. Please check your inbox.'
      });
    } catch (emailError) {
      // console.error('📧 [ERROR] Failed to send magic link:', emailError);
      res.status(500).json({
        error: 'Failed to send magic link. Please try again later or contact your administrator.'
      });
    }
  } catch (_error) {
    // console.error('Request magic link error:', _error);
    res.status(500).json({ error: 'Failed to process request' });
  }
}

module.exports = authRateLimit(handler);
