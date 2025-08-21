// test-email-config.js - Check email configuration
require('dotenv').config();

console.log('EMAIL CONFIGURATION CHECK');
console.log('========================\n');

// Check environment variables
console.log('Environment Variables:');
console.log('NODE_ENV:', process.env.NODE_ENV || 'NOT SET');
console.log('BASE_URL:', process.env.BASE_URL || 'NOT SET');
console.log('ENABLE_REAL_EMAILS:', process.env.ENABLE_REAL_EMAILS || 'NOT SET');
console.log('EMAIL_SERVICE_PROVIDER:', process.env.EMAIL_SERVICE_PROVIDER || 'NOT SET');
console.log('');

// Check SMTP configuration
console.log('SMTP Configuration:');
console.log('SMTP_HOST:', process.env.SMTP_HOST || 'NOT SET');
console.log('SMTP_PORT:', process.env.SMTP_PORT || 'NOT SET');
console.log('SMTP_USER:', process.env.SMTP_USER || 'NOT SET');
console.log('SMTP_PASS:', process.env.SMTP_PASS ? '***SET***' : 'NOT SET');
console.log('');

// Check MailerSend configuration
console.log('MailerSend Configuration:');
console.log('MAILERSEND_API_KEY:', process.env.MAILERSEND_API_KEY ? '***SET***' : 'NOT SET');
console.log('');

// Check Supabase configuration
console.log('Supabase Configuration:');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL || 'NOT SET');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '***SET***' : 'NOT SET');
console.log('');

// Check what would happen with email service
const { unifiedEmailService: EmailService } = require('../../lib/unifiedEmailService');
console.log('Email Service Status:');
console.log('isInitialized:', EmailService.isInitialized);
console.log('isEmailConfigured:', EmailService.isEmailConfigured);
console.log('emailConfig:', EmailService.emailConfig);