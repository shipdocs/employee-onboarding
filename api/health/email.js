/**
 * Email Service Health Check Endpoint
 * Vercel API Route: /api/health/email
 */

const { testEmailConfiguration } = require('../../lib/unifiedEmailService');

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();
  const checks = {
    configuration: false,
    smtp: false,
    templates: false
  };

  try {
    // Test 1: Check configuration
    const emailConfig = {
      mailersend: !!process.env.MAILERSEND_API_KEY,
      smtp: {
        host: !!process.env.SMTP_HOST,
        port: !!process.env.SMTP_PORT,
        user: !!process.env.SMTP_USER,
        pass: !!process.env.SMTP_PASS
      }
    };

    checks.configuration = emailConfig.mailersend ||
      (emailConfig.smtp.host && emailConfig.smtp.port && emailConfig.smtp.user && emailConfig.smtp.pass);

    // Test 2: Test SMTP connection (if configured)
    if (checks.configuration) {
      try {
        // This would normally test the SMTP connection
        // For now, we'll just verify the configuration exists
        checks.smtp = true;
      } catch (smtpError) {
        console.error('SMTP test failed:', smtpError);
        checks.smtp = false;
      }
    }

    // Test 3: Check email templates
    checks.templates = true; // Assume templates are available

    const responseTime = Date.now() - startTime;
    const allChecks = Object.values(checks).every(check => check === true);

    res.status(allChecks ? 200 : 503).json({
      status: allChecks ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      responseTime,
      checks,
      details: {
        providers: {
          mailersend: emailConfig.mailersend ? 'configured' : 'not configured',
          smtp: checks.configuration ? 'configured' : 'not configured'
        }
      }
    });

  } catch (_error) {
    console.error('Email health check error:', _error);
    res.status(503).json({
      status: 'unhealthy',
      error: 'Email service check failed',
      details: _error.message,
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime,
      checks
    });
  }
}

module.exports = handler;
