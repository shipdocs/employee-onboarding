/**
 * @file emailService.js
 * @brief Unified email service for the Maritime Onboarding System
 *
 * @details This service provides comprehensive email functionality for the maritime
 * onboarding system, supporting multiple deployment environments and email providers.
 * It handles all email communications including magic links, notifications, certificates,
 * and system alerts with intelligent environment detection and routing.
 *
 * **Key Features:**
 * - Multi-environment deployment support (localhost, testing, preview, production)
 * - Automatic environment detection and URL generation
 * - Smart email domain transformation for safe testing
 * - Magic link generation and delivery
 * - Certificate delivery and notifications
 * - Template-based email generation
 * - Attachment support for certificates and documents
 * - Email logging and audit trail
 * - Rate limiting and security features
 *
 * **Deployment Workflow Support:**
 * 1. **LOCALHOST**: Development environment with safe email testing
 * 2. **TESTING**: Team review environment with full email functionality
 * 3. **PREVIEW**: Final approval environment with production-like behavior
 * 4. **PRODUCTION**: Live system with full email delivery
 *
 * **Email Providers:**
 * - **MailerSend**: Primary email service provider
 * - **SMTP**: Fallback email delivery method
 * - **Mock Mode**: Development and testing email simulation
 *
 * **Security Features:**
 * - Email domain validation and transformation
 * - Rate limiting and abuse prevention
 * - Secure token generation and validation
 * - Email content sanitization
 * - Attachment security scanning
 *
 * **Environment Configuration:**
 * - MAILERSEND_API_KEY: API key for MailerSend service
 * - EMAIL_FROM: Sender email address
 * - EMAIL_FROM_NAME: Sender display name
 * - ENABLE_REAL_EMAILS: Emergency override for email delivery
 *
 * @author Maritime Onboarding System
 * @version 1.0
 * @since 2024
 *
 * @see emailTemplateGenerator For email template generation
 * @see auth For magic token generation
 * @see StorageService For attachment handling
 */

// lib/emailService.js - Centralized email service with 4-stage workflow automation
//
// 4-STAGE DEPLOYMENT WORKFLOW:
// 1. LOCALHOST → 2. TESTING → 3. PREVIEW → 4. PRODUCTION
//
// AUTOMATIC ENVIRONMENT DETECTION:
// 1. LOCALHOST: No VERCEL_URL/VERCEL_ENV → http://localhost:3000
// 2. TESTING: testing branch → https://new-onboarding-2025-git-testing-shipdocs-projects.vercel.app
// 3. PREVIEW: preview branch → https://new-onboarding-2025-git-preview-shipdocs-projects.vercel.app
// 4. PRODUCTION: main branch → https://maritime-onboarding.example.com
//
// SMART EMAIL HANDLING:
// - LOCALHOST: Email domains transformed to @shipdocs.app for safe testing
//   * Example: 'test123@example.com' → 'test123@shipdocs.app'
//   * Example: 'manager@company.com' → 'manager@shipdocs.app'
// - DEPLOYED (testing/preview/production): Original email addresses unchanged
//
// MAGIC LINK URLS:
// - Automatically match the environment where email was triggered
// - LOCALHOST: http://localhost:3000/login?token=...
// - TESTING: https://new-onboarding-2025-git-testing-shipdocs-projects.vercel.app/login?token=...
// - PREVIEW: https://new-onboarding-2025-git-preview-shipdocs-projects.vercel.app/login?token=...
// - PRODUCTION: https://maritime-onboarding.example.com/login?token=...
//
// CONFIGURATION:
// - MAILERSEND_API_KEY: Required for real email sending
// - EMAIL_FROM: Required sender email address
// - EMAIL_FROM_NAME: Optional sender name (defaults to 'Maritime Onboarding Platform')
// - ENABLE_REAL_EMAILS: Emergency override (defaults to enabled)
//   * 'false' or '0': Force mock mode (emergency use only)
//   * undefined/other: Real emails enabled (default behavior)
//
// BENEFITS:
// - Zero configuration - automatic environment detection
// - Safe localhost testing with real email delivery
// - Magic links always point to correct environment
// - Seamless workflow progression through all 4 stages
//
const { MailerSend, EmailParams, Sender, Recipient, Attachment } = require('mailersend');
const { supabase } = require('./database-supabase-compat');
const { StorageService } = require('./storage');
const { generateMagicToken } = require('./auth');
const { emailTemplateGenerator } = require('./emailTemplateGenerator');
const { safeReadFile } = require('./security/pathSecurity');
const { emailSecurity } = require('./email-security');
const { emailInterceptor } = require('./email-interceptor');
const fs = require('fs/promises');
const path = require('path');

const mailerSend = new MailerSend({
  apiKey: process.env.MAILERSEND_API_KEY
});

const sender = new Sender(
  process.env.EMAIL_FROM || 'noreply@shipdocs.app',
  process.env.EMAIL_FROM_NAME || 'Maritime Onboarding Platform'
);

// Helper to get user email from userId
async function getUserEmail(userId) {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('email')
      .eq('id', userId)
      .single();
    return user?.email || 'unknown@example.com';
  } catch {
    return 'unknown@example.com';
  }
}

// Helper to get user language preference
function getUserLanguage(user) {
  return user?.preferred_language === 'nl' ? 'nl' : 'en';
}

// Log email sending attempts
async function logEmail(recipientEmail, subject, body, status = 'sent') {
  try {
    const { error } = await supabase
      .from('email_notifications')
      .insert({
        recipient_email: recipientEmail,
        subject: subject,
        body: body || `Status: ${status}`,
        sent_at: new Date().toISOString()
      });

    if (error) {
      // console.error('Error logging email to Supabase:', error);
    }
  } catch (err) {
    // console.error('Error logging email:', err);
  }
}

// Check if email service is configured
function isEmailConfigured() {
  return process.env.MAILERSEND_API_KEY && process.env.MAILERSEND_API_KEY !== 'your-api-key';
}

// Get the base URL with automatic environment detection for 4-stage workflow
function getBaseUrl() {

  // PRIORITY 1: Force localhost when VERCEL_URL contains localhost
  // This handles the case where Vercel dev sets VERCEL_URL=localhost:3000
  if (process.env.VERCEL_URL?.includes('localhost') || process.env.VERCEL_URL?.includes('127.0.0.1')) {
    // Extract port from VERCEL_URL if available, otherwise default to 3000
    let port = '3000'; // Default development server port
    if (process.env.VERCEL_URL?.includes(':')) {
      const urlPort = process.env.VERCEL_URL.split(':')[1];
      if (urlPort && !isNaN(urlPort)) {
        port = urlPort;
      }
    }
    const baseUrl = `http://localhost:${port}`;

    return baseUrl;
  }

  // PRIORITY 2: Local development (no Vercel environment)
  if (!process.env.VERCEL_URL && !process.env.VERCEL_ENV) {
    const baseUrl = 'http://localhost:3000'; // Standard development server port

    return baseUrl;
  }

  // 2-4. VERCEL ENVIRONMENTS: Auto-detect based on git branch and VERCEL_URL
  const vercelUrl = process.env.VERCEL_URL;
  const vercelGitCommitRef = process.env.VERCEL_GIT_COMMIT_REF; // Git branch name

  // Determine environment based on branch and URL patterns
  let environment = 'UNKNOWN';
  let baseUrl = '';

  if (vercelGitCommitRef === 'main' || vercelUrl?.includes('maritime-onboarding.example.com')) {
    // 4. PRODUCTION: main branch or production domain
    environment = 'PRODUCTION';
    baseUrl = 'https://maritime-onboarding.example.com';
  } else if (vercelGitCommitRef === 'preview' || vercelUrl?.includes('git-preview')) {
    // 3. PREVIEW: preview branch
    environment = 'PREVIEW';
    baseUrl = 'https://new-onboarding-2025-git-preview-shipdocs-projects.vercel.app';
  } else if (vercelGitCommitRef === 'testing' || vercelUrl?.includes('git-testing')) {
    // 2. TESTING: testing branch
    environment = 'TESTING';
    baseUrl = 'https://new-onboarding-2025-git-testing-shipdocs-projects.vercel.app';
  } else {
    // Fallback: use VERCEL_URL with https prefix
    environment = 'VERCEL_FALLBACK';
    baseUrl = `https://${vercelUrl}`;
  }

  return baseUrl;
}

// Detect if running in localhost environment
function isLocalhostEnvironment() {
  const baseUrl = getBaseUrl();
  return baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1') || baseUrl.includes('0.0.0.0');
}

// Email domain rewriting functionality removed - emails sent to actual recipients

// Check if real email sending should be enabled (now defaults to true)
function isRealEmailEnabled() {
  // Check for explicit override (for emergency mock mode)
  const enableRealEmails = process.env.ENABLE_REAL_EMAILS;
  if (enableRealEmails === 'false' || enableRealEmails === '0') {
    return false; // Explicit mock mode override
  }

  // Default behavior: enable real emails if MailerSend is configured
  return isEmailConfigured();
}

// Helper function to create attachment from file path
async function createAttachmentFromFile(filePath, fileName = null) {
  try {
    // Use secure file reading with comprehensive path validation
    const fileBuffer = await safeReadFile(filePath, 'uploads', {
      allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx', '.txt'],
      maxFileSize: 10 * 1024 * 1024 // 10MB limit
    });

    const base64Content = fileBuffer.toString('base64');
    const attachmentFileName = fileName || path.basename(filePath);

    return new Attachment(base64Content, attachmentFileName, 'attachment');
  } catch (error) {
    // console.error('Error creating attachment from file:', error);
    throw new Error(`Failed to create attachment from file: ${error.message}`);
  }
}

// Helper function to create attachment from Supabase Storage
async function createAttachmentFromStorage(bucket, path, fileName = null) {
  try {
    const fileData = await StorageService.downloadFile(bucket, path);
    const fileBuffer = await fileData.arrayBuffer();
    const base64Content = Buffer.from(fileBuffer).toString('base64');
    const attachmentFileName = fileName || path.split('/').pop();

    return new Attachment(base64Content, attachmentFileName, 'attachment');
  } catch (error) {
    // console.error('Error creating attachment from storage:', error);
    throw new Error(`Failed to create attachment from storage: ${bucket}/${path}`);
  }
}

// Helper function to create attachment from buffer
function createAttachmentFromBuffer(buffer, fileName, mimeType = 'application/octet-stream') {
  try {
    const base64Content = buffer.toString('base64');
    return new Attachment(base64Content, fileName, 'attachment');
  } catch (error) {
    // console.error('Error creating attachment from buffer:', error);
    throw new Error(`Failed to create attachment from buffer: ${fileName}`);
  }
}

// Generic function to send email with optional attachments
async function sendEmailWithAttachments(options) {
  const {
    recipientEmail,
    recipientName,
    subject,
    htmlContent,
    attachments = [],
    logType = 'generic',
    userId = null,
    securityOptions = {}
  } = options;

  try {
    // Perform comprehensive security check
    const securityCheck = await emailSecurity.performSecurityCheck({
      to: recipientEmail,
      subject: subject,
      html: htmlContent,
      attachments: attachments,
      options: securityOptions
    });

    if (!securityCheck.allowed) {
      console.error('Email blocked by security check:', securityCheck.errors);
      await logEmail(recipientEmail, subject, `Blocked: ${securityCheck.errors.join(', ')}`, 'blocked');
      throw new Error(`Email blocked: ${securityCheck.errors.join(', ')}`);
    }

    // Apply security modifications
    let finalRecipientEmail = securityCheck.modifications.to || recipientEmail;
    let finalSubject = securityCheck.modifications.subject || subject;
    let finalHtmlContent = securityCheck.modifications.html || htmlContent;
    const finalAttachments = securityCheck.modifications.attachments || attachments;

    // Apply email interception for non-production environments
    const interceptedEmail = await emailInterceptor.interceptEmail({
      to: finalRecipientEmail,
      subject: finalSubject,
      html: finalHtmlContent,
      text: null // We don't use text in this system
    });

    if (interceptedEmail.intercepted) {
      finalRecipientEmail = interceptedEmail.to;
      finalSubject = interceptedEmail.subject;
      finalHtmlContent = interceptedEmail.html;
      console.log(`📧 Email intercepted: ${interceptedEmail.originalRecipient} → ${interceptedEmail.to}`);
    }

    const isLocalhost = isLocalhostEnvironment();

    // Check if real email sending is enabled
    if (!isRealEmailEnabled()) {
      // Log email in mock mode
      await logEmail(finalRecipientEmail, subject, `Mock mode - Email with ${attachments.length} attachments`, 'mock');

      return {
        success: true,
        message: 'Email with attachments logged (mock mode)',
        messageId: 'mock-mode-' + Date.now(),
        recipient: recipientEmail
      };
    }

    // Validate email configuration
    if (!process.env.EMAIL_FROM) {
      throw new Error('EMAIL_FROM environment variable not configured');
    }

    const emailParams = new EmailParams()
      .setFrom(sender)
      .setTo([new Recipient(finalRecipientEmail, recipientName)])
      .setSubject(finalSubject)
      .setHtml(finalHtmlContent);

    // Add attachments if provided
    if (finalAttachments.length > 0) {
      emailParams.setAttachments(finalAttachments);

    }

    // Disable click tracking for localhost to prevent MailerSend wrapping
    if (isLocalhost) {
      emailParams.setSettings({
        track_clicks: false,
        track_opens: false
      });

    }

    const result = await mailerSend.email.send(emailParams);

    // Log successful email with security info
    const logMessage = `Email sent with ${finalAttachments.length} attachments${securityCheck.warnings.length > 0 ? ` (Warnings: ${securityCheck.warnings.join(', ')})` : ''}`;
    await logEmail(finalRecipientEmail, finalSubject, logMessage, 'sent');

    if (isLocalhost) {

    }

    return {
      success: true,
      message: 'Email with attachments sent successfully',
      messageId: result.messageId || result.id,
      recipient: recipientEmail
    };

  } catch (error) {
    // console.error('📧 [ERROR] Failed to send email with attachments:', error);

    // Log failed email with detailed error
    if (userId) {
      await logEmail(userId, logType, subject, 'failed',
        `${error.message} - ${JSON.stringify(error.response?.data || {})}`);
    }

    throw error;
  }
}

// Send manager magic link email
async function sendManagerMagicLinkEmail(userId, token) {
  try {

    // Get manager details
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .eq('role', 'manager')
      .single();

    if (userError || !user) {
      // console.error('Manager lookup error:', userError);
      throw new Error('Manager not found');
    }

    const baseUrl = getBaseUrl();
    const magicLink = `${baseUrl}/login?token=${token}`;
    const subject = 'Manager Portal Access - Secure Login Link';

    // Use actual email address
    const recipientEmail = user.email;
    const isLocalhost = isLocalhostEnvironment();

    // Check if real email sending is enabled
    if (!isRealEmailEnabled()) {

      // Log email in mock mode
      await logEmail(recipientEmail, subject, `Mock mode - Magic link: ${magicLink}`, 'mock');

      return {
        success: true,
        message: 'Manager magic link email logged (mock mode)',
        magicLink: magicLink,
        messageId: 'mock-mode-' + Date.now()
      };
    }

    // Validate email configuration
    if (!process.env.EMAIL_FROM) {
      throw new Error('EMAIL_FROM environment variable not configured');
    }

    const emailParams = new EmailParams()
      .setFrom(sender)
      .setTo([new Recipient(recipientEmail, `${user.first_name} ${user.last_name}`)])
      .setSubject(subject)
      .setHtml(emailTemplateGenerator.generateManagerMagicLinkTemplate(user, magicLink, getUserLanguage(user)));

    // Disable click tracking for localhost to prevent MailerSend wrapping
    if (isLocalhost) {
      emailParams.setSettings({
        track_clicks: false,
        track_opens: false
      });

    }

    const result = await mailerSend.email.send(emailParams);

    // Log successful email
    await logEmail(recipientEmail, subject, magicLink, 'sent');

    if (isLocalhost) {

    }

    return {
      success: true,
      message: 'Manager magic link email sent successfully',
      messageId: result.messageId || result.id,
      recipient: user.email
    };

  } catch (error) {
    // console.error('📧 [ERROR] Failed to send manager magic link email:', error);

    // Log failed email with detailed error
    if (userId) {
      await logEmail(userId, 'manager_magic_link', 'Manager Magic Link Email', 'failed',
        `${error.message} - ${JSON.stringify(error.response?.data || {})}`);
    }

    throw error;
  }
}

// Send manager welcome email
async function sendManagerWelcomeEmail(manager, password) {
  try {

    const subject = 'Welcome to Maritime Onboarding System - Manager Account Created';

    // Use actual email address
    const recipientEmail = manager.email;
    const isLocalhost = isLocalhostEnvironment();

    // Check if real email sending is enabled
    if (!isRealEmailEnabled()) {

      // Log email in mock mode
      await logEmail(recipientEmail, subject, 'Mock mode - Manager welcome email', 'mock');

      return {
        success: true,
        message: 'Manager welcome email logged (mock mode)',
        messageId: 'mock-mode-' + Date.now()
      };
    }

    // Validate email configuration
    if (!process.env.EMAIL_FROM) {
      throw new Error('EMAIL_FROM environment variable not configured');
    }

    const emailParams = new EmailParams()
      .setFrom(sender)
      .setTo([new Recipient(recipientEmail, `${manager.first_name} ${manager.last_name}`)])
      .setSubject(subject)
      .setHtml(emailTemplateGenerator.generateManagerWelcomeEmailTemplate(manager, password, null, getUserLanguage(manager)));

    // Disable click tracking for localhost
    if (isLocalhost) {
      emailParams.setSettings({
        track_clicks: false,
        track_opens: false
      });

    }

    const result = await mailerSend.email.send(emailParams);

    // Log successful email
    await logEmail(recipientEmail, subject, 'Manager welcome email sent', 'sent');

    if (isLocalhost) {

    }

    return {
      success: true,
      message: 'Manager welcome email sent successfully',
      messageId: result.messageId || result.id,
      recipient: manager.email
    };

  } catch (error) {
    // console.error('📧 [ERROR] Failed to send manager welcome email:', error);

    // Log failed email with detailed error
    await logEmail(manager.email, 'manager_welcome', 'Manager Welcome Email', 'failed',
      `${error.message} - ${JSON.stringify(error.response?.data || {})}`);

    throw error;
  }
}

// Send crew magic link email
async function sendCrewMagicLinkEmail(userId, token) {
  try {

    // Get user details
    const userResult = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
    const user = userResult.rows[0];
    const userError = !user;

    if (userError || !user) {
      // console.error('User lookup error:', userError);
      throw new Error('User not found');
    }

    const baseUrl = getBaseUrl();
    const magicLink = `${baseUrl}/login?token=${token}`;
    const subject = user.preferred_language === 'nl'
      ? 'Begin je inwerk training - Beveiligde toegangslink'
      : 'Begin Your Onboarding Training - Secure Access Link';

    // Use actual email address
    const recipientEmail = user.email;
    const isLocalhost = isLocalhostEnvironment();

    // Check if real email sending is enabled
    if (!isRealEmailEnabled()) {

      // Log email in mock mode
      await logEmail(recipientEmail, subject, `Mock mode - Magic link: ${magicLink}`, 'mock');

      return {
        success: true,
        message: 'Crew magic link email logged (mock mode)',
        magicLink: magicLink,
        messageId: 'mock-mode-' + Date.now()
      };
    }

    // Validate email configuration
    if (!process.env.EMAIL_FROM) {
      throw new Error('EMAIL_FROM environment variable not configured');
    }

    const emailParams = new EmailParams()
      .setFrom(sender)
      .setTo([new Recipient(recipientEmail, `${user.first_name} ${user.last_name}`)])
      .setSubject(subject)
      .setHtml(emailTemplateGenerator.generateCrewMagicLinkTemplate(user, magicLink, getUserLanguage(user)));

    // Disable click tracking for localhost to prevent MailerSend wrapping
    if (isLocalhost) {
      emailParams.setSettings({
        track_clicks: false,
        track_opens: false
      });

    }

    const result = await mailerSend.email.send(emailParams);

    // Log successful email
    await logEmail(recipientEmail, subject, magicLink, 'sent');

    if (isLocalhost) {

    }

    return {
      success: true,
      message: 'Crew magic link email sent successfully',
      messageId: result.messageId || result.id,
      recipient: user.email
    };

  } catch (error) {
    // console.error('📧 [ERROR] Failed to send crew magic link email:', error);

    // Log failed email with detailed error
    if (userId) {
      await logEmail(userId, 'magic_link', 'Crew Magic Link Email', 'failed',
        `${error.message} - ${JSON.stringify(error.response?.data || {})}`);
    }

    throw error;
  }
}

// Manager welcome email template - Now using beautiful emailTemplateGenerator

// Manager magic link email template - Now using beautiful emailTemplateGenerator

// Send welcome email
async function sendWelcomeEmail(userId) {
  try {

    // Get user details
    const userResult = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
    const user = userResult.rows[0];
    const userError = !user;

    if (userError || !user) {
      // console.error('User lookup error:', userError);
      throw new Error('User not found');
    }

    const subject = user.preferred_language === 'nl'
      ? 'Welkom bij Maritime Onboarding Platform - Inwerk Training'
      : 'Welcome to Maritime Onboarding Platform - Onboarding Training';

    // Use actual email address
    const recipientEmail = user.email;
    const isLocalhost = isLocalhostEnvironment();

    // Check if real email sending is enabled
    if (!isRealEmailEnabled()) {

      // Log email in mock mode
      await logEmail(recipientEmail, subject, 'Mock mode - Welcome email', 'mock');

      return {
        success: true,
        message: 'Welcome email logged (mock mode)',
        messageId: 'mock-mode-' + Date.now()
      };
    }

    // Validate email configuration
    if (!process.env.EMAIL_FROM) {
      throw new Error('EMAIL_FROM environment variable not configured');
    }

    const emailParams = new EmailParams()
      .setFrom(sender)
      .setTo([new Recipient(recipientEmail, `${user.first_name} ${user.last_name}`)])
      .setSubject(subject)
      .setHtml(emailTemplateGenerator.generateWelcomeEmailTemplate(user, getUserLanguage(user)));

    const result = await mailerSend.email.send(emailParams);

    // Log successful email
    await logEmail(recipientEmail, subject, 'Welcome email sent', 'sent');

    if (isLocalhost) {

    }

    return {
      success: true,
      message: 'Welcome email sent successfully',
      messageId: result.messageId || result.id,
      recipient: user.email
    };

  } catch (error) {
    // console.error('📧 [ERROR] Failed to send welcome email:', error);

    // Log failed email with detailed error
    if (userId) {
      await logEmail(userId, 'welcome', 'Welcome Email', 'failed',
        `${error.message} - ${JSON.stringify(error.response?.data || {})}`);
    }

    throw error;
  }
}

// Crew magic link email template - Now using beautiful emailTemplateGenerator

// Send progress reminder email
async function sendProgressReminderEmail(userId, phase, dueDate, reminderType) {
  try {

    // Get user details
    const userResult = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
    const user = userResult.rows[0];
    const userError = !user;

    if (userError || !user) {
      // console.error('User lookup error:', userError);
      throw new Error('User not found');
    }

    const isNL = user.preferred_language === 'nl';
    let subject;

    switch (reminderType) {
      case 'overdue':
        subject = isNL ?
          `⚠️ Achterstallige Training - Fase ${phase}` :
          `⚠️ Overdue Training - Phase ${phase}`;
        break;
      case 'due_soon':
        subject = isNL ?
          `⏰ Training Deadline Nadert - Fase ${phase}` :
          `⏰ Training Deadline Approaching - Phase ${phase}`;
        break;
      case 'upcoming':
        subject = isNL ?
          `📅 Wekelijkse Training Herinnering - Fase ${phase}` :
          `📅 Weekly Training Reminder - Phase ${phase}`;
        break;
      case 'inactive':
        subject = isNL ?
          '🔔 Training Herinnering - Hervat je Voortgang' :
          '🔔 Training Reminder - Resume Your Progress';
        break;
      default:
        subject = isNL ?
          '📚 Training Herinnering' :
          '📚 Training Reminder';
    }

    // Check if real email sending is enabled
    if (!isRealEmailEnabled()) {

      // Log email in mock mode
      await logEmail(user.email, subject, 'Mock mode - Progress reminder', 'mock');

      return {
        success: true,
        message: 'Progress reminder email logged (mock mode)',
        messageId: 'mock-mode-' + Date.now()
      };
    }

    // Validate email configuration
    if (!process.env.EMAIL_FROM) {
      throw new Error('EMAIL_FROM environment variable not configured');
    }

    const emailParams = new EmailParams()
      .setFrom(sender)
      .setTo([new Recipient(user.email, `${user.first_name} ${user.last_name}`)])
      .setSubject(subject)
      .setHtml(getProgressReminderTemplate(user, phase, dueDate, reminderType));

    const result = await mailerSend.email.send(emailParams);

    // Log successful email
    await logEmail(user.email, subject, 'Progress reminder email sent', 'sent');

    return {
      success: true,
      message: 'Progress reminder email sent successfully',
      messageId: result.messageId || result.id,
      recipient: user.email
    };

  } catch (error) {
    // console.error('📧 [ERROR] Failed to send progress reminder email:', error);

    // Log failed email with detailed error
    if (userId) {
      await logEmail(userId, 'progress_reminder', 'Progress Reminder Email', 'failed',
        `${error.message} - ${JSON.stringify(error.response?.data || {})}`);
    }

    throw error;
  }
}

// Send phase completion email
async function sendPhaseCompletionEmail(userId, phase) {
  try {

    // Get user details
    const userResult = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
    const user = userResult.rows[0];
    const userError = !user;

    if (userError || !user) {
      // console.error('User lookup error:', userError);
      throw new Error('User not found');
    }

    const isNL = user.preferred_language === 'nl';
    const subject = isNL ?
      `🎉 Fase ${phase} Voltooid - Gefeliciteerd!` :
      `🎉 Phase ${phase} Completed - Congratulations!`;

    // Check if real email sending is enabled
    if (!isRealEmailEnabled()) {

      // Log email in mock mode
      await logEmail(user.email, subject, 'Mock mode - Phase completion', 'mock');

      return {
        success: true,
        message: 'Phase completion email logged (mock mode)',
        messageId: 'mock-mode-' + Date.now()
      };
    }

    // Validate email configuration
    if (!process.env.EMAIL_FROM) {
      throw new Error('EMAIL_FROM environment variable not configured');
    }

    const emailParams = new EmailParams()
      .setFrom(sender)
      .setTo([new Recipient(user.email, `${user.first_name} ${user.last_name}`)])
      .setSubject(subject)
      .setHtml(getPhaseCompletionTemplate(user, phase));

    const result = await mailerSend.email.send(emailParams);

    // Log successful email
    await logEmail(user.email, subject, 'Phase completion email sent', 'sent');

    return {
      success: true,
      message: 'Phase completion email sent successfully',
      messageId: result.messageId || result.id,
      recipient: user.email
    };

  } catch (error) {
    // console.error('📧 [ERROR] Failed to send phase completion email:', error);

    // Log failed email with detailed error
    if (userId) {
      await logEmail(userId, 'phase_completion', 'Phase Completion Email', 'failed',
        `${error.message} - ${JSON.stringify(error.response?.data || {})}`);
    }

    throw error;
  }
}

// Send form completion email with PDF attachment
async function sendFormCompletionEmail(userId, formData, pdfPath = null) {
  try {

    // Get user details
    const userResult = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
    const user = userResult.rows[0];
    const userError = !user;

    if (userError || !user) {
      // console.error('User lookup error:', userError);
      throw new Error('User not found');
    }

    const isNL = user.preferred_language === 'nl';
    const subject = isNL ?
      `📋 Formulier Voltooid - ${user.first_name} ${user.last_name}` :
      `📋 Form Completed - ${user.first_name} ${user.last_name}`;

    // Prepare attachments
    const attachments = [];
    if (pdfPath) {
      try {
        const attachment = await createAttachmentFromFile(
          pdfPath,
          `${user.first_name}_${user.last_name}_Form_05_03a.pdf`
        );
        attachments.push(attachment);

      } catch (attachmentError) {
        // console.error('📧 [WARNING] Failed to attach PDF:', attachmentError);
        // Continue without attachment rather than failing the email
      }
    }

    // Get HR email
    const hrEmail = process.env.HR_EMAIL || 'hr@shipdocs.app';
    const qhseEmail = process.env.QHSE_EMAIL || 'qhse@shipdocs.app';

    // Send to crew member
    await sendEmailWithAttachments({
      recipientEmail: user.email,
      recipientName: `${user.first_name} ${user.last_name}`,
      subject: subject,
      htmlContent: getFormCompletionTemplate(user, formData, 'crew'),
      attachments: attachments,
      logType: 'form_completion',
      userId: userId
    });

    // Send to HR with attachment
    await sendEmailWithAttachments({
      recipientEmail: hrEmail,
      recipientName: 'HR Department',
      subject: subject,
      htmlContent: getFormCompletionTemplate(user, formData, 'hr'),
      attachments: attachments,
      logType: 'form_completion_hr',
      userId: userId
    });

    // Send to QHSE with attachment
    await sendEmailWithAttachments({
      recipientEmail: qhseEmail,
      recipientName: 'QHSE Department',
      subject: subject,
      htmlContent: getFormCompletionTemplate(user, formData, 'qhse'),
      attachments: attachments,
      logType: 'form_completion_qhse',
      userId: userId
    });

    return {
      success: true,
      message: 'Form completion emails sent successfully',
      recipients: [user.email, hrEmail, qhseEmail],
      attachmentCount: attachments.length
    };

  } catch (error) {
    // console.error('📧 [ERROR] Failed to send form completion email:', error);

    // Log failed email with detailed error
    if (userId) {
      await logEmail(userId, 'form_completion', 'Form Completion Email', 'failed',
        `${error.message} - ${JSON.stringify(error.response?.data || {})}`);
    }

    throw error;
  }
}

// Send certificate email with PDF attachment
async function sendCertificateEmail(userId, certificatePath, certificateType = 'training') {
  try {

    // Get user details
    const userResult = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
    const user = userResult.rows[0];
    const userError = !user;

    if (userError || !user) {
      // console.error('User lookup error:', userError);
      throw new Error('User not found');
    }

    const isNL = user.preferred_language === 'nl';
    const subject = isNL ?
      `🎓 Certificaat - ${user.first_name} ${user.last_name}` :
      `🎓 Certificate - ${user.first_name} ${user.last_name}`;

    // Create PDF attachment
    const attachment = await createAttachmentFromFile(
      certificatePath,
      `${user.first_name}_${user.last_name}_${certificateType}_Certificate.pdf`
    );

    // Get HR email
    const hrEmail = process.env.HR_EMAIL || 'hr@shipdocs.app';

    // Send to crew member
    await sendEmailWithAttachments({
      recipientEmail: user.email,
      recipientName: `${user.first_name} ${user.last_name}`,
      subject: subject,
      htmlContent: getCertificateEmailTemplate(user, certificateType),
      attachments: [attachment],
      logType: 'certificate',
      userId: userId
    });

    // Send to HR
    await sendEmailWithAttachments({
      recipientEmail: hrEmail,
      recipientName: 'HR Department',
      subject: subject,
      htmlContent: getCertificateEmailTemplate(user, certificateType, 'hr'),
      attachments: [attachment],
      logType: 'certificate_hr',
      userId: userId
    });

    return {
      success: true,
      message: 'Certificate emails sent successfully',
      recipients: [user.email, hrEmail]
    };

  } catch (error) {
    // console.error('📧 [ERROR] Failed to send certificate email:', error);

    // Log failed email with detailed error
    if (userId) {
      await logEmail(userId, 'certificate', 'Certificate Email', 'failed',
        `${error.message} - ${JSON.stringify(error.response?.data || {})}`);
    }

    throw error;
  }
}

// Send form completion reminder email (72-hour follow-up)
async function sendFormReminderEmail(userId) {
  try {

    // Get user details
    const userResult = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
    const user = userResult.rows[0];
    const userError = !user;

    if (userError || !user) {
      // console.error('User lookup error:', userError);
      throw new Error('User not found');
    }

    const isNL = user.preferred_language === 'nl';
    const subject = isNL ?
      `📋 Herinnering: Formulier 05_03a - ${user.first_name} ${user.last_name}` :
      `📋 Reminder: Form 05_03a - ${user.first_name} ${user.last_name}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Inter', system-ui, sans-serif; line-height: 1.6; color: #132545; background-color: #f8fafc; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 10px 15px -3px rgba(19, 37, 69, 0.1); }
          .header { background: linear-gradient(135deg, #132545 0%, #006A82 100%); color: white; padding: 30px 20px; text-align: center; }
          .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
          .content { padding: 30px 20px; }
          .footer { background-color: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
          .reminder-box { background-color: #fef3c7; padding: 20px; border-left: 4px solid #f59e0b; margin: 20px 0; border-radius: 4px; }
          .cta-button { background-color: #006A82; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📋 ${isNL ? 'Formulier Herinnering' : 'Form Reminder'}</h1>
          </div>
          <div class="content">
            <h2 style="color: #132545; margin-top: 0;">${isNL ? 'Hallo' : 'Hello'} ${user.first_name}!</h2>

            <div class="reminder-box">
              <strong>⏰ ${isNL ? 'Vriendelijke herinnering' : 'Friendly reminder'}</strong>
              <br><br>
              ${isNL ?
                'Het is nu 72 uur geleden dat je je account hebt aangemaakt. We willen je eraan herinneren dat je nog steeds je onboarding formulier 05_03a moet invullen.' :
                'It has been 72 hours since you created your account. We want to remind you that you still need to complete your onboarding form 05_03a.'
              }
            </div>

            <p>${isNL ?
              'Het invullen van dit formulier is een belangrijk onderdeel van je onboarding proces bij Maritime Onboarding Platform. Het helpt ons ervoor te zorgen dat je veilig en effectief kunt werken aan boord.' :
              'Completing this form is an important part of your onboarding process at Maritime Onboarding Platform. It helps us ensure you can work safely and effectively on board.'
            }</p>

            <p><strong>${isNL ? 'Wat moet je doen:' : 'What you need to do:'}</strong></p>
            <ul>
              <li>${isNL ? 'Log in op je account' : 'Log into your account'}</li>
              <li>${isNL ? 'Vul je persoonlijke gegevens in' : 'Complete your personal information'}</li>
              <li>${isNL ? 'Voeg je medische informatie toe' : 'Add your medical information'}</li>
              <li>${isNL ? 'Verstrek noodcontact gegevens' : 'Provide emergency contact details'}</li>
            </ul>

            <div style="text-align: center;">
              <a href="${getBaseUrl()}/login" class="cta-button">
                ${isNL ? '📝 Formulier Invullen' : '📝 Complete Form'}
              </a>
            </div>

            <p style="font-size: 14px; color: #64748b;">
              ${isNL ?
                'Heb je vragen? Neem contact op met HR op hr@shipdocs.app of je manager.' :
                'Have questions? Contact HR at hr@shipdocs.app or your manager.'
              }
            </p>

            <p style="margin-bottom: 0;">${isNL ? 'Met vriendelijke groet,' : 'Best regards,'}</p>
            <p style="margin-top: 5px;"><strong style="color: #006A82;">Maritime Onboarding Platform</strong></p>
          </div>
          <div class="footer">
            <p>${isNL ?
              'Deze herinnering is verzonden vanuit het Maritime Onboarding Platform Onboarding Systeem' :
              'This reminder was sent from the Maritime Onboarding Platform Onboarding System'
            }</p>
            <p style="margin: 5px 0;">© 2024 Maritime Onboarding Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await sendEmailWithAttachments({
      recipientEmail: user.email,
      recipientName: `${user.first_name} ${user.last_name}`,
      subject: subject,
      htmlContent: htmlContent,
      attachments: [],
      logType: 'form_reminder',
      userId: userId
    });

    return {
      success: true,
      message: 'Form reminder email sent successfully',
      recipient: user.email
    };

  } catch (error) {
    // console.error('📧 [ERROR] Failed to send form reminder email:', error);

    // Log failed email with detailed error
    if (userId) {
      await logEmail(userId, 'form_reminder', 'Form Reminder Email', 'failed',
        `${error.message} - ${JSON.stringify(error.response?.data || {})}`);
    }

    throw error;
  }
}

// Send process completion email (final onboarding closure)
async function sendProcessCompletionEmail(userId) {
  try {

    // Get user details
    const userResult = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
    const user = userResult.rows[0];
    const userError = !user;

    if (userError || !user) {
      // console.error('User lookup error:', userError);
      throw new Error('User not found');
    }

    const isNL = user.preferred_language === 'nl';

    // Send completion email to crew member
    const crewSubject = isNL ?
      `🎉 Onboarding Voltooid - ${user.first_name} ${user.last_name}` :
      `🎉 Onboarding Complete - ${user.first_name} ${user.last_name}`;

    const crewHtmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Inter', system-ui, sans-serif; line-height: 1.6; color: #132545; background-color: #f8fafc; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 10px 15px -3px rgba(19, 37, 69, 0.1); }
          .header { background: linear-gradient(135deg, #132545 0%, #006A82 100%); color: white; padding: 30px 20px; text-align: center; }
          .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
          .content { padding: 30px 20px; }
          .footer { background-color: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
          .success-box { background-color: #dcfce7; padding: 20px; border-left: 4px solid #16a34a; margin: 20px 0; border-radius: 4px; }
          .next-steps { background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 ${isNL ? 'Gefeliciteerd!' : 'Congratulations!'}</h1>
          </div>
          <div class="content">
            <h2 style="color: #132545; margin-top: 0;">${isNL ? 'Hallo' : 'Hello'} ${user.first_name}!</h2>

            <div class="success-box">
              <strong>✅ ${isNL ? 'Onboarding Voltooid!' : 'Onboarding Complete!'}</strong>
              <br><br>
              ${isNL ?
                'Je hebt succesvol alle stappen van het onboarding proces bij Maritime Onboarding Platform voltooid!' :
                'You have successfully completed all steps of the onboarding process at Maritime Onboarding Platform!'
              }
            </div>

            <p>${isNL ?
              'Je hebt de volgende stappen voltooid:' :
              'You have completed the following steps:'
            }</p>
            <ul>
              <li>✅ ${isNL ? 'Account aangemaakt en geactiveerd' : 'Account created and activated'}</li>
              <li>✅ ${isNL ? 'Profiel informatie bijgewerkt' : 'Profile information updated'}</li>
              <li>✅ ${isNL ? 'Formulier 05_03a ingevuld' : 'Form 05_03a completed'}</li>
              <li>✅ ${isNL ? 'Alle vereiste documenten verstrekt' : 'All required documents provided'}</li>
            </ul>

            <div class="next-steps">
              <h3 style="margin-top: 0; color: #006A82;">${isNL ? 'Volgende Stappen:' : 'Next Steps:'}</h3>
              <ul style="margin-bottom: 0;">
                <li>${isNL ? 'HR zal contact met je opnemen voor verdere instructies' : 'HR will contact you for further instructions'}</li>
                <li>${isNL ? 'Je ontvangt binnenkort je scheepstoewijzing' : 'You will receive your vessel assignment soon'}</li>
                <li>${isNL ? 'Bewaar deze e-mail voor je administratie' : 'Keep this email for your records'}</li>
              </ul>
            </div>

            <p>${isNL ?
              'Welkom bij het Maritime Onboarding Platform team! We kijken ernaar uit om met je te werken.' :
              'Welcome to the Maritime Onboarding Platform team! We look forward to working with you.'
            }</p>

            <p style="margin-bottom: 0;">${isNL ? 'Met vriendelijke groet,' : 'Best regards,'}</p>
            <p style="margin-top: 5px;"><strong style="color: #006A82;">Maritime Onboarding Platform</strong></p>
          </div>
          <div class="footer">
            <p>${isNL ?
              'Deze bevestiging is verzonden vanuit het Maritime Onboarding Platform Onboarding Systeem' :
              'This confirmation was sent from the Maritime Onboarding Platform Onboarding System'
            }</p>
            <p style="margin: 5px 0;">© 2024 Maritime Onboarding Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send to crew member
    await sendEmailWithAttachments({
      recipientEmail: user.email,
      recipientName: `${user.first_name} ${user.last_name}`,
      subject: crewSubject,
      htmlContent: crewHtmlContent,
      attachments: [],
      logType: 'process_completion',
      userId: userId
    });

    // Send notification to HR
    const hrSubject = isNL ?
      `✅ Onboarding Voltooid - ${user.first_name} ${user.last_name}` :
      `✅ Onboarding Complete - ${user.first_name} ${user.last_name}`;

    const hrHtmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Inter', system-ui, sans-serif; line-height: 1.6; color: #132545; background-color: #f8fafc; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 10px 15px -3px rgba(19, 37, 69, 0.1); }
          .header { background: linear-gradient(135deg, #132545 0%, #006A82 100%); color: white; padding: 30px 20px; text-align: center; }
          .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
          .content { padding: 30px 20px; }
          .footer { background-color: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
          .info-box { background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0ea5e9; }
          .success-box { background-color: #dcfce7; padding: 20px; border-left: 4px solid #16a34a; margin: 20px 0; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ ${isNL ? 'Onboarding Voltooid' : 'Onboarding Complete'}</h1>
          </div>
          <div class="content">
            <h2 style="color: #132545; margin-top: 0;">${isNL ? 'Bemanningslid heeft onboarding voltooid' : 'Crew Member Completed Onboarding'}</h2>

            <div class="success-box">
              <strong>${isNL ? 'Proces Status: VOLTOOID' : 'Process Status: COMPLETE'}</strong>
              <br><br>
              ${isNL ?
                'Het volledige onboarding proces is succesvol afgerond.' :
                'The complete onboarding process has been successfully finished.'
              }
            </div>

            <div class="info-box">
              <strong>${isNL ? 'Bemanningslid:' : 'Crew Member:'}</strong> ${user.first_name} ${user.last_name}<br>
              <strong>${isNL ? 'E-mail:' : 'Email:'}</strong> ${user.email}<br>
              <strong>${isNL ? 'Positie:' : 'Position:'}</strong> ${user.position || 'N/A'}<br>
              <strong>${isNL ? 'Vaartuig:' : 'Vessel:'}</strong> ${user.vessel_assignment || 'Nog niet toegewezen'}<br>
              <strong>${isNL ? 'Voltooid op:' : 'Completed on:'}</strong> ${new Date().toLocaleString(isNL ? 'nl-NL' : 'en-US')}
            </div>

            <p><strong>${isNL ? 'Voltooide stappen:' : 'Completed steps:'}</strong></p>
            <ul>
              <li>✅ ${isNL ? 'Profiel informatie bijgewerkt' : 'Profile information updated'}</li>
              <li>✅ ${isNL ? 'Formulier 05_03a ingevuld en gedistribueerd' : 'Form 05_03a completed and distributed'}</li>
              <li>✅ ${isNL ? 'Alle vereiste documenten ontvangen' : 'All required documents received'}</li>
              <li>✅ ${isNL ? 'Onboarding proces afgesloten' : 'Onboarding process closed'}</li>
            </ul>

            <p>${isNL ?
              'Het bemanningslid is nu klaar voor scheepstoewijzing en kan worden ingepland voor de volgende beschikbare positie.' :
              'The crew member is now ready for vessel assignment and can be scheduled for the next available position.'
            }</p>

            <p style="margin-bottom: 0;">${isNL ? 'Met vriendelijke groet,' : 'Best regards,'}</p>
            <p style="margin-top: 5px;"><strong style="color: #006A82;">Maritime Onboarding Platform</strong></p>
          </div>
          <div class="footer">
            <p>${isNL ?
              'Deze notificatie is verzonden vanuit het Maritime Onboarding Platform Onboarding Systeem' :
              'This notification was sent from the Maritime Onboarding Platform Onboarding System'
            }</p>
            <p style="margin: 5px 0;">© 2024 Maritime Onboarding Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send to HR
    await sendEmailWithAttachments({
      recipientEmail: process.env.HR_EMAIL || 'hr@shipdocs.app',
      recipientName: 'HR Department',
      subject: hrSubject,
      htmlContent: hrHtmlContent,
      attachments: [],
      logType: 'process_completion_hr',
      userId: userId
    });

    return {
      success: true,
      message: 'Process completion emails sent successfully',
      recipients: ['crew', 'hr']
    };

  } catch (error) {
    // console.error('📧 [ERROR] Failed to send process completion emails:', error);

    // Log failed email with detailed error
    if (userId) {
      await logEmail(userId, 'process_completion', 'Process Completion Email', 'failed',
        `${error.message} - ${JSON.stringify(error.response?.data || {})}`);
    }

    throw error;
  }
}

// Send final completion email
async function sendFinalCompletionEmail(userId, managerComments = '') {
  try {

    // Get user details
    const userResult = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
    const user = userResult.rows[0];
    const userError = !user;

    if (userError || !user) {
      // console.error('User lookup error:', userError);
      throw new Error('User not found');
    }

    const isNL = user.preferred_language === 'nl';
    const subject = isNL ?
      `🎉 Inwerk Training Voltooid - ${user.first_name} ${user.last_name}` :
      `🎉 Onboarding Training Completed - ${user.first_name} ${user.last_name}`;

    // Use actual email addresses
    const recipientEmail = user.email;
    const hrEmail = process.env.HR_EMAIL || 'hr@shipdocs.app';
    const isLocalhost = isLocalhostEnvironment();

    // Check if real email sending is enabled
    if (!isRealEmailEnabled()) {

      // Log email in mock mode
      await logEmail(user.email, subject, 'Mock mode - Final completion', 'mock');

      return {
        success: true,
        message: 'Final completion email logged (mock mode)',
        messageId: 'mock-mode-' + Date.now()
      };
    }

    // Validate email configuration
    if (!process.env.EMAIL_FROM) {
      throw new Error('EMAIL_FROM environment variable not configured');
    }

    // Send to both crew member and HR (with transformed emails for localhost)
    const recipients = [
      new Recipient(recipientEmail, `${user.first_name} ${user.last_name}`),
      new Recipient(hrEmail, 'HR Department')
    ];

    const emailParams = new EmailParams()
      .setFrom(sender)
      .setTo(recipients)
      .setSubject(subject)
      .setHtml(getFinalCompletionTemplate(user, managerComments));

    const result = await mailerSend.email.send(emailParams);

    // Log successful email
    await logEmail(user.email, subject, 'Final completion email sent', 'sent');

    if (isLocalhost) {

    }

    return {
      success: true,
      message: 'Final completion email sent successfully',
      messageId: result.messageId || result.id,
      recipient: user.email
    };

  } catch (error) {
    // console.error('📧 [ERROR] Failed to send final completion email:', error);

    // Log failed email with detailed error
    if (userId) {
      await logEmail(userId, 'final_completion', 'Final Completion Email', 'failed',
        `${error.message} - ${JSON.stringify(error.response?.data || {})}`);
    }

    throw error;
  }
}

// Welcome email template - Now using beautiful emailTemplateGenerator

// Email template for progress reminder
function getProgressReminderTemplate(user, phase, dueDate, reminderType) {
  const isNL = user.preferred_language === 'nl';
  const formattedDate = new Date(dueDate).toLocaleDateString(isNL ? 'nl-NL' : 'en-US');

  let headerText, urgencyClass, urgencyIcon;

  switch (reminderType) {
    case 'overdue':
      headerText = isNL ? 'Achterstallige Training' : 'Overdue Training';
      urgencyClass = 'urgent';
      urgencyIcon = '⚠️';
      break;
    case 'due_soon':
      headerText = isNL ? 'Training Deadline Nadert' : 'Training Deadline Approaching';
      urgencyClass = 'warning';
      urgencyIcon = '⏰';
      break;
    case 'upcoming':
      headerText = isNL ? 'Training Herinnering' : 'Training Reminder';
      urgencyClass = 'info';
      urgencyIcon = '📅';
      break;
    case 'inactive':
      headerText = isNL ? 'Hervat je Training' : 'Resume Your Training';
      urgencyClass = 'info';
      urgencyIcon = '🔔';
      break;
    default:
      headerText = isNL ? 'Training Herinnering' : 'Training Reminder';
      urgencyClass = 'info';
      urgencyIcon = '📚';
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Inter', system-ui, sans-serif; line-height: 1.6; color: #132545; background-color: #f8fafc; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 10px 15px -3px rgba(19, 37, 69, 0.1); }
        .header { background: linear-gradient(135deg, #132545 0%, #006A82 100%); color: white; padding: 30px 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
        .content { padding: 30px 20px; }
        .footer { background-color: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
        .cta-button {
          display: inline-block;
          background: linear-gradient(135deg, #132545 0%, #006A82 100%);
          color: white;
          padding: 16px 32px;
          text-decoration: none;
          border-radius: 8px;
          margin: 25px 0;
          font-weight: 600;
          font-size: 16px;
          box-shadow: 0 4px 6px -1px rgba(19, 37, 69, 0.3);
        }
        .urgent { background-color: #fef2f2; padding: 15px; border-left: 4px solid #ef4444; margin: 20px 0; border-radius: 4px; }
        .warning { background-color: #fffbeb; padding: 15px; border-left: 4px solid #f59e0b; margin: 20px 0; border-radius: 4px; }
        .info { background-color: #f0f9ff; padding: 15px; border-left: 4px solid #0ea5e9; margin: 20px 0; border-radius: 4px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${urgencyIcon} ${headerText}</h1>
        </div>
        <div class="content">
          <h2 style="color: #132545; margin-top: 0;">${isNL ? 'Hallo' : 'Hello'} ${user.first_name},</h2>

          <div class="${urgencyClass}">
            <strong>${isNL ? 'Training Status:' : 'Training Status:'}</strong> ${isNL ? `Fase ${phase}` : `Phase ${phase}`}
            ${dueDate ? `<br><strong>${isNL ? 'Deadline:' : 'Deadline:'}</strong> ${formattedDate}` : ''}
          </div>

          <p>${isNL ?
            'Dit is een herinnering om je inwerk training voort te zetten. Het is belangrijk dat je alle modules voltooit voordat je aan boord gaat.' :
            'This is a reminder to continue your onboarding training. It\'s important that you complete all modules before boarding.'
          }</p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${getBaseUrl()}/login" class="cta-button">🎯 ${isNL ? 'Ga naar Training' : 'Continue Training'}</a>
          </div>

          <p>${isNL ?
            'Als je vragen hebt over de training, neem dan contact op met je manager of ons ondersteuningsteam.' :
            'If you have any questions about the training, please contact your manager or our support team.'
          }</p>

          <p style="margin-bottom: 0;">${isNL ? 'Bedankt voor je toewijding aan veiligheid!' : 'Thank you for your commitment to safety!'}</p>
          <p style="margin-top: 5px;"><strong style="color: #006A82;">Maritime Onboarding Platform</strong></p>
        </div>
        <div class="footer">
          <p>${isNL ?
            'Deze e-mail is verzonden vanuit het Maritime Onboarding Platform Training Systeem' :
            'This email was sent from the Maritime Onboarding Platform Training System'
          }</p>
          <p style="margin: 5px 0;">© 2024 Maritime Onboarding Platform. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Email template for phase completion
function getPhaseCompletionTemplate(user, phase) {
  const isNL = user.preferred_language === 'nl';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Inter', system-ui, sans-serif; line-height: 1.6; color: #132545; background-color: #f8fafc; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 10px 15px -3px rgba(19, 37, 69, 0.1); }
        .header { background: linear-gradient(135deg, #132545 0%, #006A82 100%); color: white; padding: 30px 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
        .content { padding: 30px 20px; }
        .footer { background-color: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
        .cta-button {
          display: inline-block;
          background: linear-gradient(135deg, #132545 0%, #006A82 100%);
          color: white;
          padding: 16px 32px;
          text-decoration: none;
          border-radius: 8px;
          margin: 25px 0;
          font-weight: 600;
          font-size: 16px;
          box-shadow: 0 4px 6px -1px rgba(19, 37, 69, 0.3);
        }
        .success-box { background-color: #f0fdf4; padding: 20px; border-left: 4px solid #22c55e; margin: 20px 0; border-radius: 4px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 ${isNL ? 'Fase Voltooid!' : 'Phase Completed!'}</h1>
        </div>
        <div class="content">
          <h2 style="color: #132545; margin-top: 0;">${isNL ? 'Gefeliciteerd' : 'Congratulations'} ${user.first_name}!</h2>

          <div class="success-box">
            <strong>✅ ${isNL ? `Fase ${phase} succesvol voltooid!` : `Phase ${phase} successfully completed!`}</strong>
          </div>

          <p>${isNL ?
            'Uitstekend werk! Je hebt een belangrijke mijlpaal bereikt in je inwerk training. Je toewijding aan veiligheid en professionele ontwikkeling wordt zeer gewaardeerd.' :
            'Excellent work! You have reached an important milestone in your onboarding training. Your commitment to safety and professional development is greatly appreciated.'
          }</p>

          <p>${isNL ?
            'Je kunt nu doorgaan naar de volgende fase van je training. Blijf gemotiveerd en zet je goede werk voort!' :
            'You can now proceed to the next phase of your training. Stay motivated and keep up the great work!'
          }</p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${getBaseUrl()}/login" class="cta-button">🚀 ${isNL ? 'Ga verder met Training' : 'Continue Training'}</a>
          </div>

          <p>${isNL ?
            'Als je vragen hebt over de volgende stappen, neem dan contact op met je manager.' :
            'If you have any questions about the next steps, please contact your manager.'
          }</p>

          <p style="margin-bottom: 0;">${isNL ? 'Blijf veilig en professioneel!' : 'Stay safe and professional!'}</p>
          <p style="margin-top: 5px;"><strong style="color: #006A82;">Maritime Onboarding Platform</strong></p>
        </div>
        <div class="footer">
          <p>${isNL ?
            'Deze e-mail is verzonden vanuit het Maritime Onboarding Platform Training Systeem' :
            'This email was sent from the Maritime Onboarding Platform Training System'
          }</p>
          <p style="margin: 5px 0;">© 2024 Maritime Onboarding Platform. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Email template for final completion
function getFinalCompletionTemplate(user, managerComments) {
  const isNL = user.preferred_language === 'nl';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Inter', system-ui, sans-serif; line-height: 1.6; color: #132545; background-color: #f8fafc; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 10px 15px -3px rgba(19, 37, 69, 0.1); }
        .header { background: linear-gradient(135deg, #132545 0%, #006A82 100%); color: white; padding: 30px 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
        .content { padding: 30px 20px; }
        .footer { background-color: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
        .success-box { background-color: #f0fdf4; padding: 20px; border-left: 4px solid #22c55e; margin: 20px 0; border-radius: 4px; }
        .info-box { background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0ea5e9; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🏆 ${isNL ? 'Training Voltooid!' : 'Training Completed!'}</h1>
        </div>
        <div class="content">
          <h2 style="color: #132545; margin-top: 0;">${isNL ? 'Uitstekend werk' : 'Excellent work'} ${user.first_name}!</h2>

          <div class="success-box">
            <strong>🎯 ${isNL ? 'Alle inwerk training succesvol voltooid!' : 'All onboarding training successfully completed!'}</strong>
            <br><br>
            <strong>${isNL ? 'Crew Member:' : 'Crew Member:'}</strong> ${user.first_name} ${user.last_name}<br>
            <strong>${isNL ? 'E-mail:' : 'Email:'}</strong> ${user.email}<br>
            <strong>${isNL ? 'Voltooid op:' : 'Completed on:'}</strong> ${new Date().toLocaleDateString(isNL ? 'nl-NL' : 'en-US')}
          </div>

          <p>${isNL ?
            'Gefeliciteerd! Je hebt alle fasen van de inwerk training succesvol voltooid. Je bent nu volledig gecertificeerd en klaar om aan boord te gaan.' :
            'Congratulations! You have successfully completed all phases of the onboarding training. You are now fully certified and ready to board.'
          }</p>

          ${managerComments ? `
          <div class="info-box">
            <h3 style="margin-top: 0; color: #132545;">${isNL ? 'Manager Opmerkingen:' : 'Manager Comments:'}</h3>
            <p style="margin-bottom: 0;">${managerComments}</p>
          </div>
          ` : ''}

          <p>${isNL ?
            'Je certificaat zal binnenkort worden uitgereikt. Bewaar dit document zorgvuldig voor je records.' :
            'Your certificate will be issued shortly. Please keep this document carefully for your records.'
          }</p>

          <p>${isNL ?
            'Namens het hele team van Maritime Onboarding Platform willen we je bedanken voor je toewijding en professionaliteit tijdens de training.' :
            'On behalf of the entire Maritime Onboarding Platform team, we want to thank you for your dedication and professionalism during the training.'
          }</p>

          <p style="margin-bottom: 0;">${isNL ? 'Welkom aan boord en veel succes!' : 'Welcome aboard and good luck!'}</p>
          <p style="margin-top: 5px;"><strong style="color: #006A82;">Maritime Onboarding Platform</strong></p>
        </div>
        <div class="footer">
          <p>${isNL ?
            'Deze e-mail is verzonden vanuit het Maritime Onboarding Platform Certificering Systeem' :
            'This email was sent from the Maritime Onboarding Platform Certification System'
          }</p>
          <p style="margin: 5px 0;">© 2024 Maritime Onboarding Platform. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Email template for form completion
function getFormCompletionTemplate(user, formData, recipientType = 'crew') {
  const isNL = user.preferred_language === 'nl';
  const isHR = recipientType === 'hr';
  const isQHSE = recipientType === 'qhse';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Inter', system-ui, sans-serif; line-height: 1.6; color: #132545; background-color: #f8fafc; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 10px 15px -3px rgba(19, 37, 69, 0.1); }
        .header { background: linear-gradient(135deg, #132545 0%, #006A82 100%); color: white; padding: 30px 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
        .content { padding: 30px 20px; }
        .footer { background-color: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
        .success-box { background-color: #f0fdf4; padding: 20px; border-left: 4px solid #22c55e; margin: 20px 0; border-radius: 4px; }
        .info-box { background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0ea5e9; }
        .attachment-note { background-color: #fef3c7; padding: 15px; border-left: 4px solid #f59e0b; margin: 20px 0; border-radius: 4px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📋 ${isNL ? 'Formulier Voltooid' : 'Form Completed'}</h1>
        </div>
        <div class="content">
          ${isHR || isQHSE ? `
            <h2 style="color: #132545; margin-top: 0;">${isNL ? 'Formulier Ontvangen' : 'Form Received'}</h2>

            <div class="success-box">
              <strong>📋 ${isNL ? 'Nieuw ingevuld formulier ontvangen' : 'New completed form received'}</strong>
              <br><br>
              <strong>${isNL ? 'Crew Member:' : 'Crew Member:'}</strong> ${user.first_name} ${user.last_name}<br>
              <strong>${isNL ? 'E-mail:' : 'Email:'}</strong> ${user.email}<br>
              <strong>${isNL ? 'Voltooid op:' : 'Completed on:'}</strong> ${new Date().toLocaleDateString(isNL ? 'nl-NL' : 'en-US')}<br>
              <strong>${isNL ? 'Formulier Type:' : 'Form Type:'}</strong> 05_03a - ${isNL ? 'Inwerk Formulier' : 'Onboarding Form'}
            </div>

            <div class="attachment-note">
              <strong>📎 ${isNL ? 'Bijlage:' : 'Attachment:'}</strong> ${isNL ?
                'Het ingevulde formulier is als PDF bijgevoegd bij deze e-mail.' :
                'The completed form is attached as a PDF to this email.'
              }
            </div>

            <p>${isNL ?
              'Het formulier is succesvol ingevuld door het bemanningslid en vereist mogelijk verdere actie van uw kant.' :
              'The form has been successfully completed by the crew member and may require further action from your department.'
            }</p>

            ${isQHSE ? `
            <div class="info-box">
              <h3 style="margin-top: 0; color: #132545;">${isNL ? 'QHSE Actie Vereist:' : 'QHSE Action Required:'}</h3>
              <p style="margin-bottom: 0;">${isNL ?
                'Gelieve het formulier te beoordelen voor compliance en veiligheidsaspecten.' :
                'Please review the form for compliance and safety aspects.'
              }</p>
            </div>
            ` : ''}
          ` : `
            <h2 style="color: #132545; margin-top: 0;">${isNL ? 'Bedankt' : 'Thank you'} ${user.first_name}!</h2>

            <div class="success-box">
              <strong>✅ ${isNL ? 'Formulier succesvol verzonden!' : 'Form successfully submitted!'}</strong>
            </div>

            <p>${isNL ?
              'Je formulier is succesvol ingevuld en verzonden. Een kopie is bijgevoegd voor je eigen administratie.' :
              'Your form has been successfully completed and submitted. A copy is attached for your own records.'
            }</p>

            <div class="attachment-note">
              <strong>📎 ${isNL ? 'Bijlage:' : 'Attachment:'}</strong> ${isNL ?
                'Een PDF kopie van je ingevulde formulier is bijgevoegd.' :
                'A PDF copy of your completed form is attached.'
              }
            </div>

            <p>${isNL ?
              'HR en QHSE hebben automatisch een kopie ontvangen voor verdere verwerking.' :
              'HR and QHSE have automatically received a copy for further processing.'
            }</p>
          `}

          <p style="margin-bottom: 0;">${isNL ? 'Met vriendelijke groet,' : 'Best regards,'}</p>
          <p style="margin-top: 5px;"><strong style="color: #006A82;">Maritime Onboarding Platform</strong></p>
        </div>
        <div class="footer">
          <p>${isNL ?
            'Deze e-mail is verzonden vanuit het Maritime Onboarding Platform Formulier Systeem' :
            'This email was sent from the Maritime Onboarding Platform Form System'
          }</p>
          <p style="margin: 5px 0;">© 2024 Maritime Onboarding Platform. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Email template for certificate emails
function getCertificateEmailTemplate(user, certificateType = 'training', recipientType = 'crew') {
  const isNL = user.preferred_language === 'nl';
  const isHR = recipientType === 'hr';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Inter', system-ui, sans-serif; line-height: 1.6; color: #132545; background-color: #f8fafc; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 10px 15px -3px rgba(19, 37, 69, 0.1); }
        .header { background: linear-gradient(135deg, #132545 0%, #006A82 100%); color: white; padding: 30px 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
        .content { padding: 30px 20px; }
        .footer { background-color: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
        .success-box { background-color: #f0fdf4; padding: 20px; border-left: 4px solid #22c55e; margin: 20px 0; border-radius: 4px; }
        .attachment-note { background-color: #fef3c7; padding: 15px; border-left: 4px solid #f59e0b; margin: 20px 0; border-radius: 4px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎓 ${isNL ? 'Certificaat Uitgereikt' : 'Certificate Issued'}</h1>
        </div>
        <div class="content">
          ${isHR ? `
            <h2 style="color: #132545; margin-top: 0;">${isNL ? 'Certificaat Uitgereikt' : 'Certificate Issued'}</h2>

            <div class="success-box">
              <strong>🎓 ${isNL ? 'Nieuw certificaat uitgereikt' : 'New certificate issued'}</strong>
              <br><br>
              <strong>${isNL ? 'Crew Member:' : 'Crew Member:'}</strong> ${user.first_name} ${user.last_name}<br>
              <strong>${isNL ? 'E-mail:' : 'Email:'}</strong> ${user.email}<br>
              <strong>${isNL ? 'Uitgereikt op:' : 'Issued on:'}</strong> ${new Date().toLocaleDateString(isNL ? 'nl-NL' : 'en-US')}<br>
              <strong>${isNL ? 'Certificaat Type:' : 'Certificate Type:'}</strong> ${certificateType}
            </div>
          ` : `
            <h2 style="color: #132545; margin-top: 0;">${isNL ? 'Gefeliciteerd' : 'Congratulations'} ${user.first_name}!</h2>

            <div class="success-box">
              <strong>🏆 ${isNL ? 'Je certificaat is klaar!' : 'Your certificate is ready!'}</strong>
            </div>

            <p>${isNL ?
              'Gefeliciteerd met het succesvol voltooien van je training! Je certificaat is bijgevoegd bij deze e-mail.' :
              'Congratulations on successfully completing your training! Your certificate is attached to this email.'
            }</p>
          `}

          <div class="attachment-note">
            <strong>📎 ${isNL ? 'Bijlage:' : 'Attachment:'}</strong> ${isNL ?
              'Je officiële certificaat is als PDF bijgevoegd.' :
              'Your official certificate is attached as a PDF.'
            }
          </div>

          <p>${isNL ?
            'Bewaar dit certificaat zorgvuldig voor je persoonlijke administratie en toekomstige referentie.' :
            'Please keep this certificate carefully for your personal records and future reference.'
          }</p>

          <p style="margin-bottom: 0;">${isNL ? 'Nogmaals gefeliciteerd!' : 'Congratulations again!'}</p>
          <p style="margin-top: 5px;"><strong style="color: #006A82;">Maritime Onboarding Platform</strong></p>
        </div>
        <div class="footer">
          <p>${isNL ?
            'Deze e-mail is verzonden vanuit het Maritime Onboarding Platform Certificering Systeem' :
            'This email was sent from the Maritime Onboarding Platform Certification System'
          }</p>
          <p style="margin: 5px 0;">© 2024 Maritime Onboarding Platform. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Send Safety Management PDF to crew member (5 days before boarding)
async function sendSafetyManagementPDF(crew) {
  try {

    const subject = 'Safety Management System - Pre-boarding Review Required';

    // Use actual email address
    const recipientEmail = crew.email;
    const isLocalhost = isLocalhostEnvironment();

    // Check if real email sending is enabled
    if (!isRealEmailEnabled()) {

      // Log email in mock mode
      await logEmail(recipientEmail, subject, 'Mock mode - Safety Management PDF', 'mock');

      return {
        success: true,
        message: 'Safety Management PDF email logged (mock mode)',
        messageId: 'mock-mode-' + Date.now()
      };
    }

    // Validate email configuration
    if (!process.env.EMAIL_FROM) {
      throw new Error('EMAIL_FROM environment variable not configured');
    }

    // Create Safety Management PDF attachment from Supabase Storage
    const attachment = await createAttachmentFromStorage(
      'documents',
      'Safety_Management_System.pdf',
      'Safety_Management_System.pdf'
    );

    const emailParams = new EmailParams()
      .setFrom(sender)
      .setTo([new Recipient(recipientEmail, `${crew.first_name} ${crew.last_name}`)])
      .setSubject(subject)
      .setHtml(emailTemplateGenerator.generateSafetyManagementEmailTemplate(crew, getUserLanguage(crew)))
      .setAttachments([attachment]);

    // Disable click tracking for localhost
    if (isLocalhost) {
      emailParams.setSettings({
        track_clicks: false,
        track_opens: false
      });

    }

    const result = await mailerSend.email.send(emailParams);

    // Log successful email
    await logEmail(recipientEmail, subject, 'Safety Management PDF sent', 'sent');

    if (isLocalhost) {

    }

    return {
      success: true,
      message: 'Safety Management PDF sent successfully',
      messageId: result.messageId || result.id,
      recipient: crew.email
    };

  } catch (error) {
    // console.error('📧 [ERROR] Failed to send Safety Management PDF:', error);

    // Log failed email with detailed error
    await logEmail(crew.email, 'safety_management_pdf', 'Safety Management PDF', 'failed',
      `${error.message} - ${JSON.stringify(error.response?.data || {})}`);

    throw error;
  }
}

// Send onboarding start email to crew member (on boarding day)
async function sendOnboardingStartEmail(crew) {
  try {

    const subject = 'Welcome Aboard! Start Your Onboarding Training Today';

    // Generate magic link for immediate access
    const token = generateMagicToken();
    const expiresAt = new Date(Date.now() + 3 * 60 * 60 * 1000); // 3 hours

    // Store magic link in database
    const { error: linkError } = await supabase
      .from('magic_links')
      .insert({
        user_id: crew.id,
        email: crew.email,
        token,
        expires_at: expiresAt.toISOString()
      });

    if (linkError) {
      // console.error('Error creating magic link for onboarding email:', linkError);
      throw new Error('Failed to create magic link');
    }

    const baseUrl = getBaseUrl();
    const magicLink = `${baseUrl}/login?token=${token}`;

    // Use actual email address
    const recipientEmail = crew.email;
    const isLocalhost = isLocalhostEnvironment();

    // Check if real email sending is enabled
    if (!isRealEmailEnabled()) {

      // Log email in mock mode
      await logEmail(recipientEmail, subject, 'Mock mode - Onboarding start email', 'mock');

      return {
        success: true,
        message: 'Onboarding start email logged (mock mode)',
        messageId: 'mock-mode-' + Date.now()
      };
    }

    // Validate email configuration
    if (!process.env.EMAIL_FROM) {
      throw new Error('EMAIL_FROM environment variable not configured');
    }

    const emailParams = new EmailParams()
      .setFrom(sender)
      .setTo([new Recipient(recipientEmail, `${crew.first_name} ${crew.last_name}`)])
      .setSubject(subject)
      .setHtml(emailTemplateGenerator.generateOnboardingStartEmailTemplate(crew, magicLink, getUserLanguage(crew)));

    // Disable click tracking for localhost
    if (isLocalhost) {
      emailParams.setSettings({
        track_clicks: false,
        track_opens: false
      });

    }

    const result = await mailerSend.email.send(emailParams);

    // Log successful email
    await logEmail(recipientEmail, subject, 'Onboarding start email sent', 'sent');

    if (isLocalhost) {

    }

    return {
      success: true,
      message: 'Onboarding start email sent successfully',
      messageId: result.messageId || result.id,
      recipient: crew.email
    };

  } catch (error) {
    // console.error('📧 [ERROR] Failed to send onboarding start email:', error);

    // Log failed email with detailed error
    await logEmail(crew.email, 'onboarding_start', 'Onboarding Start Email', 'failed',
      `${error.message} - ${JSON.stringify(error.response?.data || {})}`);

    throw error;
  }
}

// Safety management email template - Now using beautiful emailTemplateGenerator

// Onboarding start email template - Now using beautiful emailTemplateGenerator

module.exports = {
  sendEmailWithAttachments,
  sendManagerMagicLinkEmail,
  sendManagerWelcomeEmail,
  sendCrewMagicLinkEmail,
  sendWelcomeEmail,
  sendProgressReminderEmail,
  sendPhaseCompletionEmail,
  sendFormCompletionEmail,
  sendCertificateEmail,
  sendFormReminderEmail,
  sendProcessCompletionEmail,
  sendFinalCompletionEmail,
  sendSafetyManagementPDF,
  sendOnboardingStartEmail
};
