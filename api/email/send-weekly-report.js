// Vercel API Route: /api/email/send-weekly-report.js - Send weekly progress report to HR
const db = require('../../lib/database');
const { requireAuth } = require('../../lib/auth');
const { unifiedEmailService } = require('../../lib/unifiedEmailService');
const { emailTemplateGenerator } = require('../../lib/emailTemplateGenerator');
const { emailRateLimit } = require('../../lib/rateLimit');
async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { period, stats, recommendations } = req.body;

    if (!stats) {
      return res.status(400).json({ error: 'Statistics data is required' });
    }

    const subject = `📊 Weekly Training Progress Report - ${period}`;
    const hrEmail = process.env.HR_EMAIL || 'hr@shipdocs.app';

    // Format period object if it's just a string
    const periodObj = typeof period === 'string' ? {
      start: period.split(' - ')[0],
      end: period.split(' - ')[1] || period
    } : period;

    // Generate email content using template generator
    const htmlContent = await emailTemplateGenerator.generateWeeklyReportTemplate(
      periodObj,
      stats,
      recommendations,
      'en' // Weekly reports default to English
    );

    const result = await unifiedEmailService.factory.sendEmail({
      to: hrEmail,
      toName: 'HR Department',
      subject: subject,
      html: htmlContent,
      logType: 'weekly_report',
      userId: null
    });

    res.json({
      message: 'Weekly report sent successfully',
      messageId: result.messageId,
      recipient: hrEmail
    });

  } catch (error) {
    // console.error('Error sending weekly report:', error);
    res.status(500).json({ error: 'Failed to send weekly report' });
  }
}

module.exports = emailRateLimit(requireAuth(handler));
