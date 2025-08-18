// Vercel API Route: /api/email/send-quiz-rejection.js - Send quiz rejection notification
const { supabase } = require('../../lib/supabase');
const { requireAuth } = require('../../lib/auth');
const { unifiedEmailService } = require('../../lib/unifiedEmailService');
const { emailTemplateGenerator } = require('../../lib/emailTemplateGenerator');
const { emailRateLimit } = require('../../lib/rateLimit');
async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, phase, comments } = req.body;

    if (!userId || !phase) {
      return res.status(400).json({ error: 'User ID and phase are required' });
    }

    // Get user details
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get quiz result details
    const { data: quizResult, error: quizError } = await supabase
      .from('quiz_results')
      .select('*')
      .eq('user_id', userId)
      .eq('phase', phase)
      .order('completed_at', { ascending: false })
      .limit(1)
      .single();

    if (quizError || !quizResult) {
      return res.status(404).json({ error: 'Quiz result not found' });
    }

    const subject = user.preferred_language === 'nl'
      ? `Quiz Fase ${phase} Afgekeurd - Herhaling Vereist`
      : `Quiz Phase ${phase} Rejected - Retake Required`;

    // Generate email content using template generator
    const htmlContent = await emailTemplateGenerator.generateQuizRejectionTemplate(
      user,
      phase,
      quizResult,
      comments,
      user.preferred_language || 'en'
    );

    const result = await unifiedEmailService.factory.sendEmail({
      to: user.email,
      toName: `${user.first_name} ${user.last_name}`,
      subject: subject,
      html: htmlContent,
      logType: 'quiz_rejection',
      userId: userId
    });

    res.json({
      message: 'Quiz rejection email sent successfully',
      messageId: result.messageId,
      recipient: user.email
    });

  } catch (_error) {
    // console.error('Error sending quiz rejection email:', _error);
    res.status(500).json({ error: 'Failed to send quiz rejection email' });
  }
}

module.exports = emailRateLimit(requireAuth(handler));
