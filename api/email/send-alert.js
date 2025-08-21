// Vercel API Route: /api/email/send-alert.js - Send alert email
const db = require('../../lib/database-direct');
const { requireAuth } = require('../../lib/auth');
const { unifiedEmailService } = require('../../lib/unifiedEmailService');
const { emailTemplateGenerator } = require('../../lib/emailTemplateGenerator');
const { emailRateLimit } = require('../../lib/rateLimit');
async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { type, message, details, severity = 'medium' } = req.body;

    if (!type || !message) {
      return res.status(400).json({ error: 'Alert type and message are required' });
    }

    const hrEmail = process.env.HR_EMAIL || 'hr@shipdocs.app';
    const subject = `🚨 System Alert: ${type.replace('_', ' ').toUpperCase()}`;

    // Map severity levels to template severity
    const templateSeverity = severity === 'high' ? 'error' : severity === 'medium' ? 'warning' : 'info';

    // Format details for display
    const formattedDetails = details ? JSON.stringify(details, null, 2) : null;

    // Generate email content using template generator
    const htmlContent = await emailTemplateGenerator.generateSystemAlertTemplate(
      type.replace('_', ' ').toUpperCase(),
      message,
      formattedDetails,
      templateSeverity,
      'en' // System alerts default to English
    );

    // Send alert email
    const result = await unifiedEmailService.factory.sendEmail({
      to: hrEmail,
      toName: 'HR Department',
      subject: subject,
      html: htmlContent,
      logType: 'system_alert',
      userId: null
    });

    res.json({
      message: 'Alert email sent successfully',
      messageId: result.messageId,
      recipient: hrEmail,
      alertType: type,
      severity: severity
    });

  } catch (_error) {
    // console.error('📧 [ERROR] Failed to send alert email:', _error);
    res.status(500).json({
      error: 'Failed to send alert email',
      details: _error.message
    });
  }
}

module.exports = emailRateLimit(requireAuth(handler));
