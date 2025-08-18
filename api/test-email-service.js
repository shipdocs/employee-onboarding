// API endpoint to test email service restoration
const { emailServiceFactory } = require('../lib/emailServiceFactory');
const { apiRateLimit } = require('../lib/rateLimit');

module.exports = apiRateLimit(async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Initialize email service
    await emailServiceFactory.ensureInitialized();

    const status = {
      provider: emailServiceFactory.provider,
      isConfigured: emailServiceFactory.isConfigured,
      isInitialized: emailServiceFactory.isInitialized,
      shouldEnableEmails: emailServiceFactory.shouldEnableEmails(),
      isRealEmailEnabled: emailServiceFactory.isRealEmailEnabled(),
      environment: {
        NODE_ENV: process.env.NODE_ENV || 'development',
        EMAIL_ENABLED: process.env.EMAIL_ENABLED || 'not set',
        EMAIL_SERVICE_PROVIDER: process.env.EMAIL_SERVICE_PROVIDER || 'not set',
        MAILERSEND_API_KEY: process.env.MAILERSEND_API_KEY ? 'set' : 'not set',
        EMAIL_FROM: process.env.EMAIL_FROM || 'not set',
        ENABLE_REAL_EMAILS: process.env.ENABLE_REAL_EMAILS || 'not set',
        BASE_URL: process.env.BASE_URL || 'not set',
        VERCEL_ENV: process.env.VERCEL_ENV || 'not set'
      }
    };

    // Test email send (dry run)
    if (req.query.testSend === 'true') {
      try {
        const result = await emailServiceFactory.sendEmail({
          to: 'test@example.com',
          toName: 'Test User',
          subject: 'Email Service Test',
          html: '<h1>Test Email</h1><p>Testing restored email service.</p>'
        });
        status.testSendResult = result;
      } catch (_error) {
        status.testSendError = {
          message: _error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        };
      }
    }

    res.json({
      success: true,
      message: 'Email service status',
      status
    });

  } catch (_error) {
    console.error('Email service test error:', _error);
    res.status(500).json({
      success: false,
      error: _error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});
