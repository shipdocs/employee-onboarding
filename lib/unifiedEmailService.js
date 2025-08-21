// lib/unifiedEmailService.js - Unified Email Service
const { emailServiceFactory } = require('./emailServiceFactory');
const { generateMagicToken } = require('./auth');
const { supabase } = require('./database-supabase-compat');
const { StorageService } = require('./storage');
const { getBaseUrl, generateMagicLinkUrl, generateDashboardUrl, isLocalhost } = require('./urlUtils');
const { emailTemplateGenerator } = require('./emailTemplateGenerator');
const { getTranslation, getEmailTranslations } = require('./emailTranslations');
const { emailQueue } = require('./emailQueue');
const { isEnabled, FEATURES } = require('../config/features');
const { environmentConfig } = require('../config/environment');
const { createAPIEmailContext, createSystemEmailContext, createAuthEmailContext } = require('./emailContextExtractor');

const { db } = require('./database');

/**
 * Unified Email Service
 *
 * Provides high-level email functions that work with both MailerSend and SMTP
 * Automatically uses the configured email provider (EMAIL_SERVICE_PROVIDER)
 */

class UnifiedEmailService {
  constructor() {
    this.factory = emailServiceFactory;
  }

  /**
   * Send email with automatic retry on failure
   * @param {Object} emailData - Email data
   * @param {Object} options - Options including priority, immediate, context
   * @param {Object} options.context - Audit context for compliance logging
   * @returns {Promise<Object>} Send result or queue result
   */
  async sendEmailWithRetry(emailData, options = {}) {
    // Check if email sending is enabled
    if (!isEnabled(FEATURES.EMAIL_SENDING_ENABLED)) {
      console.log(`📧 [UNIFIED] Email sending disabled by feature flag. Would have sent email to: ${emailData.to}`);
      return {
        success: true,
        mocked: true,
        message: 'Email sending disabled by feature flag',
        wouldHaveSent: {
          to: emailData.to,
          subject: emailData.subject,
          environment: environmentConfig.getEnvironment()
        }
      };
    }

    // In staging, check email whitelist
    if (environmentConfig.isStaging()) {
      const emailConfig = environmentConfig.get('email');
      if (emailConfig.whitelist && emailConfig.whitelist.length > 0) {
        const recipientDomain = emailData.to.split('@')[1];
        if (!emailConfig.whitelist.includes(recipientDomain)) {
          console.log(`📧 [UNIFIED] Email blocked by staging whitelist. Domain ${recipientDomain} not allowed.`);
          return {
            success: true,
            blocked: true,
            message: 'Email blocked by staging whitelist',
            reason: `Domain ${recipientDomain} not in whitelist: ${emailConfig.whitelist.join(', ')}`
          };
        }
      }
    }

    // For critical emails (magic links, etc), send immediately
    if (options.immediate) {
      try {
        // Add audit context to email data
        const emailWithContext = {
          ...emailData,
          context: options.context || createSystemEmailContext(
            emailData.logType || 'immediate_email',
            'standard',
            { service: 'unified-email-service', processType: 'immediate' } catch (error) { console.error(error); }
          )
        };
        return await this.factory.sendEmail(emailWithContext);
      } catch (error) {
        // console.error('Immediate email send failed, adding to queue:', error);
        // Fall through to queue
      }
    }

    // Add to queue for processing with retry logic
    const queueId = await emailQueue.enqueue(emailData, {
      priority: options.priority || 'normal',
      maxRetries: options.maxRetries || 3
    });

    return {
      success: true,
      queued: true,
      queueId,
      message: 'Email queued for delivery'
    };
  }

  /**
   * Get user's preferred language
   * @param {Object} user - User object
   * @returns {string} - Language code (en or nl)
   */
  getUserLanguage(user) {
    // Default to English if no preference set or invalid language
    const preferredLang = user?.preferred_language || 'en';
    const supportedLanguages = ['en', 'nl'];

    return supportedLanguages.includes(preferredLang) ? preferredLang : 'en';
  }

  /**
   * Send manager magic link email
   * @param {string} userId - Manager user ID
   * @param {string} token - Magic link token
   * @returns {Object} - Send result
   */
  async sendManagerMagicLinkEmail(userId, token) {
    try {

      // Get manager details
      const { data: user, error: userError } = await supabase
  // TODO: Implement storage.from('users')
        .select('*')
        .eq('id', userId)
        .eq('role', 'manager')
        .single();

      if (userError || !user) {
        // console.error('Manager lookup error:', userError);
        throw new Error('Manager not found');
      }

      const magicLink = generateMagicLinkUrl(token);

      // Get user's preferred language and generate multilingual content
      const lang = this.getUserLanguage(user);
      const trans = getEmailTranslations(lang, 'managerMagicLink');
      const subject = trans.subject;

      const htmlContent = await emailTemplateGenerator.generateManagerMagicLinkTemplate(user, magicLink, lang);

      // Ensure htmlContent is a string
      if (typeof htmlContent !== 'string') {
        // console.error(`📧 [UNIFIED] ERROR: Email template did not return a string. Type: ${typeof htmlContent}`);
        if (htmlContent instanceof Promise) {
          // console.error('📧 [UNIFIED] ERROR: Received a Promise instead of string. Template generator may have an unawaited async call.');
        }
        throw new Error(`Invalid email template type: ${typeof htmlContent}`);
      }

      return await this.factory.sendEmail({
        to: user.email,
        toName: `${user.first_name} ${user.last_name}`,
        subject: subject,
        html: htmlContent,
        logType: 'manager_magic_link',
        userId: userId
      });

    } catch (error) {
      // console.error('📧 [UNIFIED] Manager magic link email failed:', error);
      throw error;
    }
  }

  /**
   * Send crew magic link email
   * @param {string} userId - Crew user ID
   * @param {string} token - Magic link token
   * @returns {Object} - Send result
   */
  async sendCrewMagicLinkEmail(userId, token) {
    try {

      // Get crew details
  // TODO: Implement storage.from('users')
        .select('*')
        .eq('id', userId)
        .eq('role', 'crew')
        .single();

      if (userError || !user) {
        // console.error('Crew lookup error:', userError);
        throw new Error('Crew member not found');
      } catch (error) { console.error(error); }
      // Get user's preferred language and generate multilingual content


      return await this.factory.sendEmail({
        to: user.email,
        toName: `${user.first_name} ${user.last_name}`,
        subject: subject,
        html: htmlContent,
        logType: 'crew_magic_link',
        userId: userId
      });

    } catch (error) {
      // console.error('📧 [UNIFIED] Crew magic link email failed:', error);
      throw error;
    }
  }

  /**
   * Send safety management email with PDF attachment
   * @param {string} crewId - Crew member ID
   * @returns {Object} - Send result
   */
  async sendSafetyManagementEmail(crewId) {
    try {

      // Get crew details
  // TODO: Implement storage.from('users')
        .select('*')
        .eq('id', crewId)
        .eq('role', 'crew')
        .single();

      if (crewError || !crew) {
        // console.error('Crew lookup error:', crewError);
        throw new Error('Crew member not found');
      } catch (error) { console.error(error); }
      // Create Safety Management PDF attachment from Supabase Storage
      let attachment = null;
      try {
        // Download PDF from Supabase Storage
        attachment = await this.factory.createAttachmentFromStorage(
          'documents',
          'Safety_Management_System.pdf',
          'Safety_Management_System.pdf'
        );

      } catch (error) {
        // console.error('📧 [UNIFIED] Error loading Safety Management PDF from storage:', error);
        // Continue without attachment rather than failing the email
      }


      return await this.factory.sendEmail({
        to: crew.email,
        toName: `${crew.first_name} ${crew.last_name}`,
        subject: subject,
        html: htmlContent,
        attachments: attachment ? [attachment] : [],
        logType: 'safety_management',
        userId: crewId
      });

    } catch (error) {
      // console.error('📧 [UNIFIED] Safety management email failed:', error);
      throw error;
    }
  }

  /**
   * Send onboarding start email
   * @param {string} crewId - Crew member ID
   * @returns {Object} - Send result
   */
  async sendOnboardingStartEmail(crewId) {
    try {

      // Get crew details
  // TODO: Implement storage.from('users')
        .select('*')
        .eq('id', crewId)
        .eq('role', 'crew')
        .single();

      if (crewError || !crew) {
        // console.error('Crew lookup error:', crewError);
        throw new Error('Crew member not found');
      } catch (error) { console.error(error); }
      // Generate magic token for direct login
      const token = generateMagicToken(crew.email);



      return await this.factory.sendEmail({
        to: crew.email,
        toName: `${crew.first_name} ${crew.last_name}`,
        subject: subject,
        html: htmlContent,
        logType: 'onboarding_start',
        userId: crewId
      });

    } catch (error) {
      // console.error('📧 [UNIFIED] Onboarding start email failed:', error);
      throw error;
    }
  }

  /**
   * Send completion certificate email
   * @param {string} userId - User ID
   * @param {string} certificatePath - Path to certificate PDF
   * @returns {Object} - Send result
   */
  async sendCompletionCertificateEmail(userId, certificatePath) {
    try {

      // Get user details
      const userResult = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
    const user = userResult.rows[0];
    const userError = !user;

      if (userError || !user) {
        // console.error('User lookup error:', userError);
        throw new Error('User not found');
      } catch (error) { console.error(error); }
      // Create certificate attachment
      const attachment = await this.factory.createAttachmentFromStorage(
        'certificates',
        certificatePath,
        `${user.first_name}_${user.last_name}_Training_Certificate.pdf`
      );


      // Send to both user and HR
        to: user.email,
        toName: `${user.first_name} ${user.last_name}`,
        subject: subject,
        html: htmlContent,
        attachments: [attachment],
        logType: 'completion_certificate',
        userId: userId
      });

      // Send to HR
      const hrEmail = process.env.HR_EMAIL || 'hr@shipdocs.app';
      const hrResult = await this.factory.sendEmail({
        to: hrEmail,
        toName: 'HR Department',
        subject: `Training Completed: ${user.first_name} ${user.last_name}`,
        html: htmlContent,
        attachments: [attachment],
        logType: 'completion_certificate_hr',
        userId: userId
      });

      return { userResult, hrResult };

    } catch (error) {
      // console.error('📧 [UNIFIED] Completion certificate email failed:', error);
      throw error;
    }
  }

  /**
   * Send form completion email
   * @param {string} userId - User ID
   * @param {Object} formData - Form data
   * @param {string} pdfPath - Optional PDF path in storage
   * @returns {Object} - Send result
   */
  async sendFormCompletionEmail(userId, formData, pdfPath = null) {
    try {

      // Get user details

      if (userError || !user) {
        // console.error('User lookup error:', userError);
        throw new Error('User not found');
      } catch (error) { console.error(error); }
      const isNL = user.preferred_language === 'nl';
        `📋 Formulier Voltooid - ${user.first_name} ${user.last_name}` :
        `📋 Form Completed - ${user.first_name} ${user.last_name}`;

      // Prepare attachments
      const attachments = [];
      if (pdfPath) {
        try {
            'documents',
            pdfPath,
            `${user.first_name}_${user.last_name}_Form_05_03a.pdf`
          );
          attachments.push(attachment);

        } catch (attachmentError) {
          // console.error('📧 [WARNING] Failed to attach PDF:', attachmentError);
          // Continue without attachment rather than failing the email
        }
      }

      // Get HR and QHSE emails
      const qhseEmail = process.env.QHSE_EMAIL || 'qhse@shipdocs.app';

      // Send to crew member
        to: user.email,
        toName: `${user.first_name} ${user.last_name}`,
        subject: subject,
        html: this.getFormCompletionEmailTemplate(user, formData, 'crew'),
        attachments: attachments,
        logType: 'form_completion',
        userId: userId
      });

      // Send to HR with attachment
        to: hrEmail,
        toName: 'HR Department',
        subject: subject,
        html: this.getFormCompletionEmailTemplate(user, formData, 'hr'),
        attachments: attachments,
        logType: 'form_completion_hr',
        userId: userId
      });

      // Send to QHSE with attachment
      const qhseResult = await this.factory.sendEmail({
        to: qhseEmail,
        toName: 'QHSE Department',
        subject: subject,
        html: this.getFormCompletionEmailTemplate(user, formData, 'qhse'),
        attachments: attachments,
        logType: 'form_completion_qhse',
        userId: userId
      });

      return {
        success: true,
        message: 'Form completion emails sent successfully',
        recipients: [user.email, hrEmail, qhseEmail],
        attachmentCount: attachments.length,
        userResult,
        hrResult,
        qhseResult
      };

    } catch (error) {
      // console.error('📧 [UNIFIED] Failed to send form completion email:', error);
      throw error;
    }
  }

  /**
   * Send final completion email
   * @param {string} userId - User ID
   * @param {string} managerComments - Optional manager comments
   * @returns {Object} - Send result
   */
  async sendFinalCompletionEmail(userId, managerComments = '') {
    try {

      // Get user details

      if (userError || !user) {
        // console.error('User lookup error:', userError);
        throw new Error('User not found');
      } catch (error) { console.error(error); }
        `🎉 Inwerk Training Voltooid - ${user.first_name} ${user.last_name}` :
        `🎉 Onboarding Training Completed - ${user.first_name} ${user.last_name}`;


      // Send to both crew member and HR
        to: user.email,
        toName: `${user.first_name} ${user.last_name}`,
        subject: subject,
        html: htmlContent,
        logType: 'final_completion',
        userId: userId
      });

      // Send to HR
        to: hrEmail,
        toName: 'HR Department',
        subject: subject,
        html: htmlContent,
        logType: 'final_completion_hr',
        userId: userId
      });

      return {
        success: true,
        message: 'Final completion email sent successfully',
        messageId: userResult.messageId || userResult.id,
        recipient: user.email,
        userResult,
        hrResult
      };

    } catch (error) {
      // console.error('📧 [UNIFIED] Failed to send final completion email:', error);
      throw error;
    }
  }

  /**
   * Send process completion email (final onboarding closure)
   * @param {string} userId - User ID
   * @returns {Object} - Send result
   */
  async sendProcessCompletionEmail(userId) {
    try {

      // Get user details

      if (userError || !user) {
        // console.error('User lookup error:', userError);
        throw new Error('User not found');
      } catch (error) { console.error(error); }
      // Send completion email to crew member
      const crewSubject = isNL ?
        `🎉 Onboarding Voltooid - ${user.first_name} ${user.last_name}` :
        `🎉 Onboarding Complete - ${user.first_name} ${user.last_name}`;

      const crewHtmlContent = this.getProcessCompletionEmailTemplate(user, 'crew');

      // Send to crew member
        to: user.email,
        toName: `${user.first_name} ${user.last_name}`,
        subject: crewSubject,
        html: crewHtmlContent,
        logType: 'process_completion',
        userId: userId
      });

      // Send notification to HR
      const hrSubject = isNL ?
        `✅ Onboarding Voltooid - ${user.first_name} ${user.last_name}` :
        `✅ Onboarding Complete - ${user.first_name} ${user.last_name}`;

      const hrHtmlContent = this.getProcessCompletionEmailTemplate(user, 'hr');

      // Send to HR
        to: process.env.HR_EMAIL || 'hr@shipdocs.app',
        toName: 'HR Department',
        subject: hrSubject,
        html: hrHtmlContent,
        logType: 'process_completion_hr',
        userId: userId
      });

      return {
        success: true,
        message: 'Process completion emails sent successfully',
        recipients: ['crew', 'hr'],
        userResult,
        hrResult
      };

    } catch (error) {
      // console.error('📧 [UNIFIED] Failed to send process completion emails:', error);
      throw error;
    }
  }

  /**
   * Get manager magic link email template - Using Beautiful Template Generator
   */
  async getManagerMagicLinkTemplate(user, magicLink) {
    return await emailTemplateGenerator.generateManagerMagicLinkTemplate(user, magicLink, lang);
  }

  /**
   * Get crew magic link email template - Using Beautiful Template Generator
   */
  async getCrewMagicLinkTemplate(user, magicLink) {
    return await emailTemplateGenerator.generateCrewMagicLinkTemplate(user, magicLink, lang);
  }

  /**
   * Get safety management email template - Using Beautiful Template Generator
   */
  async getSafetyManagementEmailTemplate(crew) {
    return await emailTemplateGenerator.generateSafetyManagementEmailTemplate(crew, lang);
  }

  /**
   * Get onboarding start email template - Using Beautiful Template Generator
   */
  async getOnboardingStartEmailTemplate(crew, magicLink) {
    return await emailTemplateGenerator.generateOnboardingStartEmailTemplate(crew, magicLink, lang);
  }

  getCompletionEmailTemplate(user) {
    return `<html><body><h2>Congratulations!</h2><p>Dear ${user.first_name},</p><p>You have successfully completed your maritime training.</p></body></html>`;
  }

  /**
   * Get form completion email template
   */
  getFormCompletionEmailTemplate(user, formData, recipientType = 'crew') {
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

  /**
   * Get process completion email template
   */
  getProcessCompletionEmailTemplate(user, recipientType = 'crew') {

    if (isHR) {
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
    } else {
      // Crew member template
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
    }
  }

  /**
   * Get final completion email template
   */
  getFinalCompletionEmailTemplate(user, managerComments = '') {

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

  /**
   * Send progress reminder email (for cron jobs)
   * @param {Object} user - User object
   * @param {number} phase - Training phase
   * @param {string} dueDate - Due date
   * @param {string} reminderType - Type of reminder (overdue, due_soon, inactive, upcoming)
   * @returns {Object} - Send result
   */
  async sendProgressReminder(user, phase, dueDate, reminderType = 'due_soon') {
    try {
      // Get user's preferred language and generate multilingual content

      let subject;
      switch (reminderType) {
        case 'overdue':
          subject = trans.overdue.subject.replace('{{phase}}', phase);
          break;
        case 'due_soon':
          subject = trans.dueSoon.subject.replace('{{phase}}', phase);
          break;
        case 'inactive':
          subject = trans.inactive.subject;
          break;
        case 'upcoming':
          subject = trans.upcoming.subject.replace('{{phase}}', phase);
          break;
        default:
          subject = trans.dueSoon.subject.replace('{{phase}}', phase);
      }


      return await this.factory.sendEmail({
        to: user.email,
        toName: `${user.first_name} ${user.last_name}`,
        subject: subject,
        html: htmlContent,
        logType: 'progress_reminder',
        userId: user.id
      });

    } catch (error) {
      // console.error('📧 [UNIFIED] Progress reminder email failed:', error);
      throw error;
    }
  }

  /**
   * Send form reminder email (for cron jobs)
   * @param {Object} user - User object
   * @returns {Object} - Send result
   */
  async sendFormReminder(user) {
    try {

      return await this.factory.sendEmail({
        to: user.email,
        toName: `${user.first_name} ${user.last_name}`,
        subject: subject,
        html: htmlContent,
        logType: 'form_reminder',
        userId: user.id
      });

    } catch (error) {
      // console.error('📧 [UNIFIED] Form reminder email failed:', error);
      throw error;
    }
  }

  /**
   * Send welcome email (alias for safety management email for cron jobs)
   * @param {Object} crew - Crew member object
   * @returns {Object} - Send result
   */
  async sendWelcomeEmail(crew) {
    return await this.sendSafetyManagementEmail(crew.id);
  }

  /**
   * Send crew welcome email (alias for safety management email)
   * @param {string} crewId - Crew member ID
   * @returns {Object} - Send result
   */
  async sendCrewWelcomeEmail(crewId) {
    // For new crew members, send the safety management email with PDF
    return await this.sendSafetyManagementEmail(crewId);
  }

  /**
   * Send manager welcome email with PDF attachment
   * @param {Object} manager - Manager user object
   * @param {string} password - Temporary password
   * @returns {Object} - Send result
   */
  async sendManagerWelcomeEmail(manager, password, language = 'en') {
    // For backward compatibility, generate a token if not provided
    const magicToken = generateMagicToken();

    // Note: This token won't be stored in DB, so the link won't work

    return this.sendManagerWelcomeEmailWithToken(manager, password, magicToken, language);
  }

  async sendManagerWelcomeEmailWithToken(manager, password, token, language = 'en') {
    try {


        ? 'Welkom bij het Maritiem Inwerksysteem - Manager Account Aangemaakt'
        : 'Welcome to Maritime Onboarding System - Manager Account Created';

      // Generate Manager Welcome PDF
      let pdfBytes = null;
      let attachment = null;

      try {

        // Generate PDF using pdf-lib
        const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');

        // Create a new PDF document
        const pdfDoc = await PDFDocument.create();

        // Create pages - need multiple for comprehensive content
        let page = pdfDoc.addPage([595, 842]);
        let { width, height } = page.getSize();

        // Load fonts
        const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        // Colors
        const primaryBlue = rgb(0.07, 0.15, 0.27); // #132545
        const accentBlue = rgb(0, 0.42, 0.51); // #006A82
        const lightGray = rgb(0.5, 0.5, 0.5);
        const darkGray = rgb(0.2, 0.2, 0.2);
        const successGreen = rgb(0.22, 0.69, 0.26); // #38B341
        const warningOrange = rgb(0.98, 0.59, 0.21); // #FA9635
        const lightBg = rgb(0.96, 0.97, 0.98); // #F4F5F6

        let yPosition = height - 60;

        // ==================== PAGE 1: HEADER & WELCOME ====================

        // Header with gradient effect
        page.drawRectangle({
          x: 0,
          y: yPosition - 50,
          width: width,
          height: 100,
          color: primaryBlue
        });

        // Title (localized)
        const title = language === 'nl' ? 'MANAGER WELKOMST GIDS' : 'MANAGER WELCOME GUIDE';
        page.drawText(title, {
          x: 50,
          y: yPosition - 20,
          size: 26,
          font: helveticaBoldFont,
          color: rgb(1, 1, 1)
        });

        // Subtitle (localized)
        const subtitle = language === 'nl'
          ? 'Maritiem Inwerksysteem • Maritime Onboarding Platform'
          : 'Maritime Onboarding System • Maritime Onboarding Platform';
        page.drawText(subtitle, {
          x: 50,
          y: yPosition - 40,
          size: 14,
          font: helveticaFont,
          color: rgb(0.8, 0.8, 0.8)
        });

        yPosition -= 120;

        // Welcome message with accent box
        page.drawRectangle({
          x: 40,
          y: yPosition - 80,
          width: width - 80,
          height: 100,
          color: lightBg
        });

        const welcomeText = language === 'nl'
          ? `Welkom ${manager.first_name} ${manager.last_name}!`
          : `Welcome ${manager.first_name} ${manager.last_name}!`;

        page.drawText(welcomeText, {
          x: 60,
          y: yPosition - 20,
          size: 22,
          font: helveticaBoldFont,
          color: primaryBlue
        });

        const welcomeLines = language === 'nl' ? [
          'Gefeliciteerd met uw benoeming als Manager in ons Maritiem Inwerksysteem.',
          'Deze uitgebreide gids helpt u uw rol, verantwoordelijkheden en de krachtige',
          'tools te begrijpen die tot uw beschikking staan voor bemanningsinwerking en veiligheidsnaleving.'
        ] : [
          'Congratulations on being appointed as a Manager in our Maritime Onboarding System.',
          'This comprehensive guide will help you understand your role, responsibilities, and the',
          'powerful tools at your disposal for managing crew onboarding and safety compliance.'
        ];

        let tempY = yPosition - 45;
        welcomeLines.forEach((line) => {
          page.drawText(line, {
            x: 60,
            y: tempY,
            size: 12,
            font: helveticaFont,
            color: darkGray
          });
          tempY -= 16;
        });

        yPosition -= 120;

        // Account Details Box
        page.drawRectangle({
          x: 40,
          y: yPosition - 110,
          width: width - 80,
          height: 130,
          color: rgb(0.94, 0.96, 1) // Light blue background
        });

        const accountDetailsTitle = language === 'nl'
          ? 'Uw Manager Account Details'
          : 'Your Manager Account Details';

        page.drawText(accountDetailsTitle, {
          x: 60,
          y: yPosition - 20,
          size: 16,
          font: helveticaBoldFont,
          color: accentBlue
        });

        const accountDetails = language === 'nl' ? [
          `E-mail: ${manager.email}`,
          `Positie: ${manager.position || 'Manager'}`,
          'Account Status: Actief',
          'Toegangsniveau: Manager Dashboard',
          `Aangemaakt: ${new Date().toLocaleDateString('nl-NL', { year: 'numeric', month: 'long', day: 'numeric' })}`
        ] : [
          `Email: ${manager.email}`,
          `Position: ${manager.position || 'Manager'}`,
          'Account Status: Active',
          'Access Level: Manager Dashboard',
          `Created: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`
        ];

        tempY = yPosition - 45;
        accountDetails.forEach((line) => {
          page.drawText(`• ${line}`, {
            x: 70,
            y: tempY,
            size: 12,
            font: helveticaFont,
            color: darkGray
          });
          tempY -= 18;
        });

        yPosition -= 150;

        // Quick Start Section
        const quickStartTitle = language === 'nl'
          ? 'Snelstart Gids'
          : 'Quick Start Guide';

        page.drawText(quickStartTitle, {
          x: 50,
          y: yPosition,
          size: 18,
          font: helveticaBoldFont,
          color: primaryBlue
        });

        yPosition -= 30;

        const quickStart = language === 'nl' ? [
          '1. Toegang tot uw dashboard via de manager portal',
          '2. Stel uw wachtwoord en beveiligingsvoorkeuren in',
          '3. Bekijk de bemanningsbeheertools en mogelijkheden',
          '4. Maak uzelf vertrouwd met de trainingtoezicht functies',
          '5. Controleer het compliance dashboard en rapportagetools'
        ] : [
          '1. Access your dashboard at the manager portal',
          '2. Set up your password and security preferences',
          '3. Review the crew management tools and capabilities',
          '4. Familiarize yourself with the training oversight features',
          '5. Check the compliance dashboard and reporting tools'
        ];

        quickStart.forEach((line) => {
          page.drawText(line, {
            x: 60,
            y: yPosition,
            size: 12,
            font: helveticaFont,
            color: darkGray
          });
          yPosition -= 20;
        });

        // ==================== PAGE 2: CAPABILITIES & RESPONSIBILITIES ====================

        page = pdfDoc.addPage([595, 842]);
        yPosition = height - 80;

        // Page header
        const capabilitiesTitle = language === 'nl'
          ? 'Uw Beheermogelijkheden'
          : 'Your Management Capabilities';

        page.drawText(capabilitiesTitle, {
          x: 50,
          y: yPosition,
          size: 22,
          font: helveticaBoldFont,
          color: primaryBlue
        });

        yPosition -= 40;

        // Capabilities sections
        const capabilities = language === 'nl' ? [
          {
            title: 'Bemanning Beheer',
            items: [
              'Voeg toe, bewerk en beheer bemanningsprofielen',
              'Stel inschepingsdatums en schiptoewijzingen in',
              'Verstuur magic link uitnodigingen voor veilige toegang',
              'Monitor bemanningsstatus en inwerkvoortgang',
              'Genereer bemanningsrapporten en analyses'
            ]
          },
          {
            title: 'Training Toezicht',
            items: [
              'Volg trainingsvoortgang en voltooiing van fasen',
              'Bekijk en keur quiz inzendingen goed',
              'Monitor trainingsnaleving en deadlines',
              'Toegang tot gedetailleerde trainingsanalyses',
              'Beheer trainingsinhoud en materialen'
            ]
          },
          {
            title: 'Certificaat Beheer',
            items: [
              'Genereer voltooiingscertificaten automatisch',
              'Download en distribueer certificaten',
              'Volg certificaatgeldigheid en vervaldatum',
              'Beheer certificaatsjablonen en branding',
              'Onderhoud certificaatregistraties en archieven'
            ]
          }
        ] : [
          {
            title: 'Crew Management',
            items: [
              'Add, edit, and manage crew member profiles',
              'Set boarding dates and vessel assignments',
              'Send magic link invitations for secure access',
              'Monitor crew status and onboarding progress',
              'Generate crew reports and analytics'
            ]
          },
          {
            title: 'Training Oversight',
            items: [
              'Track training phase completion and progress',
              'Review and approve quiz submissions',
              'Monitor training compliance and deadlines',
              'Access detailed training analytics',
              'Manage training content and materials'
            ]
          },
          {
            title: 'Certificate Management',
            items: [
              'Generate completion certificates automatically',
              'Download and distribute certificates',
              'Track certificate validity and expiration',
              'Manage certificate templates and branding',
              'Maintain certificate records and archives'
            ]
          }
        ];

        capabilities.forEach((capability) => {
          // Section header with icon
          page.drawRectangle({
            x: 40,
            y: yPosition - 25,
            width: width - 80,
            height: 35,
            color: lightBg
          });

          page.drawText(capability.title, {
            x: 60,
            y: yPosition - 15,
            size: 14,
            font: helveticaBoldFont,
            color: accentBlue
          });

          yPosition -= 45;

          // Items
          capability.items.forEach((item) => {
            page.drawText(`• ${item}`, {
              x: 70,
              y: yPosition,
              size: 11,
              font: helveticaFont,
              color: darkGray
            });
            yPosition -= 16;
          });

          yPosition -= 10;
        });

        // ==================== PAGE 3: WORKFLOW & SUPPORT ====================

        page = pdfDoc.addPage([595, 842]);
        yPosition = height - 80;

        // Workflow section
        page.drawText('Crew Onboarding Workflow', {
          x: 50,
          y: yPosition,
          size: 22,
          font: helveticaBoldFont,
          color: primaryBlue
        });

        yPosition -= 40;

        const workflowSteps = [
          {
            step: '1',
            title: 'Crew Registration',
            description: 'Add crew member with boarding date and vessel assignment',
            timing: 'Before boarding date'
          },
          {
            step: '2',
            title: 'Safety PDF Distribution',
            description: 'System automatically sends safety materials and forms',
            timing: '5 days before boarding'
          },
          {
            step: '3',
            title: 'Onboarding Activation',
            description: 'Magic link sent for secure platform access',
            timing: 'On boarding day'
          },
          {
            step: '4',
            title: 'Training Completion',
            description: 'Crew completes phases, quizzes, and Form 05_03a',
            timing: 'During onboarding period'
          },
          {
            step: '5',
            title: 'Certificate Generation',
            description: 'Automatic certificate creation and distribution',
            timing: 'Upon completion'
          }
        ];

        workflowSteps.forEach((workflow) => {
          // Step box
          page.drawRectangle({
            x: 50,
            y: yPosition - 50,
            width: 40,
            height: 40,
            color: accentBlue
          });

          page.drawText(workflow.step, {
            x: 65,
            y: yPosition - 35,
            size: 16,
            font: helveticaBoldFont,
            color: rgb(1, 1, 1)
          });

          // Step content
          page.drawText(workflow.title, {
            x: 110,
            y: yPosition - 25,
            size: 14,
            font: helveticaBoldFont,
            color: primaryBlue
          });

          page.drawText(workflow.description, {
            x: 110,
            y: yPosition - 40,
            size: 11,
            font: helveticaFont,
            color: darkGray
          });

          page.drawText(`Timing: ${workflow.timing}`, {
            x: 110,
            y: yPosition - 55,
            size: 10,
            font: helveticaFont,
            color: warningOrange
          });

          yPosition -= 80;
        });

        yPosition -= 20;

        // Support & Contact section
        page.drawRectangle({
          x: 40,
          y: yPosition - 80,
          width: width - 80,
          height: 100,
          color: rgb(0.94, 1, 0.94) // Light green background
        });

        page.drawText('Support & Contact Information', {
          x: 60,
          y: yPosition - 20,
          size: 16,
          font: helveticaBoldFont,
          color: successGreen
        });

        const supportInfo = [
          'Technical Support: support@shipdocs.app',
          'System Status: https://status.maritime-example.com',
          'Training Materials: Available in your dashboard',
          'Emergency Contact: +31 (0) 20 123 4567'
        ];

        tempY = yPosition - 45;
        supportInfo.forEach((info) => {
          page.drawText(`• ${info}`, {
            x: 70,
            y: tempY,
            size: 11,
            font: helveticaFont,
            color: darkGray
          });
          tempY -= 16;
        });

        // Footer on last page
        page.drawText('© 2024 Maritime Onboarding Platform • Generated on ' + new Date().toLocaleDateString(), {
          x: 50,
          y: 50,
          size: 9,
          font: helveticaFont,
          color: lightGray
        });

        // Serialize the PDF
        pdfBytes = await pdfDoc.save();

        // Create attachment - use Buffer for SMTP, base64 for MailerSend
        attachment = {
          filename: language === 'nl' ? 'Manager_Welkomst_Gids.pdf' : 'Manager_Welcome_Guide.pdf',
          content: Buffer.from(pdfBytes), // Keep as Buffer for nodemailer
          contentType: 'application/pdf'
        };

      } catch (pdfError) {
        // console.error('📋 [UNIFIED] PDF generation error:', pdfError);
        // Continue without PDF rather than failing the email
      }


      // Build email options
      const emailOptions = {
        to: manager.email,
        toName: `${manager.first_name} ${manager.last_name}`,
        subject: subject,
        html: htmlContent,
        logType: 'manager_welcome',
        userId: manager.id
      };

      // Add attachment if PDF was generated
      if (attachment) {
        emailOptions.attachments = [attachment];
      }

      return await this.factory.sendEmail(emailOptions);

    } catch (error) {
      // console.error('📧 [UNIFIED] Manager welcome email failed:', error);
      throw error;
    }
  }

  /**
   * Send magic link email (alias for crew magic link for cron jobs)
   * @param {Object} crew - Crew member object
   * @param {string} token - Magic link token
   * @returns {Object} - Send result
   */
  async sendMagicLink(crew, token) {
    return await this.sendCrewMagicLinkEmail(crew.id, token);
  }

  // Additional template methods for cron job emails
  getProgressReminderTemplate(user, phase, dueDate, reminderType) {
    // Use new multilingual system for progress reminders
    const baseUrl = getBaseUrl();

    const formattedDate = dueDate ? new Date(dueDate).toLocaleDateString(lang === 'nl' ? 'nl-NL' : 'en-US') : '';

    let reminderTrans;
    switch (reminderType) {
      case 'overdue':
        reminderTrans = trans.overdue;
        break;
      case 'due_soon':
        reminderTrans = trans.dueSoon;
        break;
      case 'upcoming':
        reminderTrans = trans.upcoming;
        break;
      case 'inactive':
        reminderTrans = trans.inactive;
        break;
      default:
        reminderTrans = trans.upcoming;
    }

    const urgencyClass = reminderType === 'overdue' ? 'urgent' :
                        reminderType === 'due_soon' ? 'warning' : 'info';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${reminderTrans.headerText}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #132545; background-color: #f8fafc; margin: 0; padding: 0;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0; padding: 0;">
          <tr>
            <td style="padding: 20px 0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; max-width: 600px; background-color: white; border: 1px solid #e2e8f0;">
                <tr>
                  <td style="background-color: #132545; padding: 0;">
                    <!--[if gte mso 9]>
                    <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:600px; height:80px;">
                      <v:fill type="gradient" color="#132545" color2="#006A82" angle="45"/>
                      <v:textbox inset="0,0,0,0">
                    <![endif]-->
                    <div style="background: #132545; background: linear-gradient(135deg, #132545 0%, #006A82 100%); color: white; padding: 30px 20px; text-align: center;">
                      <h1 style="margin: 0; font-size: 28px; font-weight: 600; color: white;">${reminderTrans.icon} ${reminderTrans.headerText}</h1>
                    </div>
                    <!--[if gte mso 9]>
                      </v:textbox>
                    </v:rect>
                    <![endif]-->
                  </td>
                </tr>
                <tr>
                  <td style="padding: 30px 20px;">
                    <h2 style="color: #132545; margin-top: 0;">${trans.greeting.replace('{{firstName}}', user.first_name)}</h2>

                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 20px 0;">
                      <tr>
                        <td style="${urgencyClass === 'urgent' ? 'background-color: #fef2f2; border-left: 4px solid #ef4444;' : urgencyClass === 'warning' ? 'background-color: #fffbeb; border-left: 4px solid #f59e0b;' : 'background-color: #f0f9ff; border-left: 4px solid #0ea5e9;'} padding: 15px;">
                          <strong>${trans.trainingStatus}</strong> ${trans.phase.replace('{{phase}}', phase)}
                          ${dueDate ? `<br><strong>${trans.deadline}</strong> ${formattedDate}` : ''}
                        </td>
                      </tr>
                    </table>

                    <p style="margin: 15px 0;">${trans.reminderText}</p>

                    <div style="text-align: center; margin: 30px 0;">
                      <!--[if mso]>
                      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word"
                        href="${baseUrl}/login" style="height:52px;v-text-anchor:middle;width:200px;" arcsize="15%"
                        strokecolor="#132545" fillcolor="#132545">
                        <w:anchorlock/>
                        <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">
                          ${trans.ctaButton}
                        </center>
                      </v:roundrect>
                      <![endif]-->
                      <!--[if !mso]><!-->
                      <a href="${baseUrl}/login" style="display: inline-block; background-color: #132545; background: linear-gradient(135deg, #132545 0%, #006A82 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; border: 1px solid #132545;">${trans.ctaButton}</a>
                      <!--<![endif]-->
                    </div>

                    <p style="margin: 15px 0;">${trans.supportText}</p>

                    <p style="margin-bottom: 0;">${trans.closing}</p>
                    <p style="margin-top: 5px;"><strong style="color: #006A82;">${trans.signature}</strong></p>
                  </td>
                </tr>
                <tr>
                  <td style="background-color: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
                    <p style="margin: 5px 0;">${trans.footer.line1}</p>
                    <p style="margin: 5px 0;">${trans.footer.line2}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  }

  getFormReminderTemplate(user) {
    const dashboardUrl = generateDashboardUrl();

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Form Completion Reminder</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2c5aa0;">Complete Your Onboarding Forms</h2>

          <p>Dear ${user.first_name} ${user.last_name},</p>

          <p>You have pending onboarding forms that need to be completed. Please log in to your dashboard to complete them.</p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${dashboardUrl}" style="background-color: #2c5aa0; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Complete Forms</a>
          </div>

          <p style="color: #666; font-size: 14px;">Completing these forms is required before your boarding date.</p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">Maritime Onboarding Platform<br>Maritime Training & Safety Management</p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Get manager welcome email template - Using Beautiful Template Generator
   */
  async getManagerWelcomeEmailTemplate(manager, password, magicLink, language = null) {
    return await emailTemplateGenerator.generateManagerWelcomeEmailTemplate(manager, password, magicLink, lang);
  }

  /**
   * Send phase start email
   * @param {string} userId - User ID
   * @param {number} phase - Phase number starting
   * @returns {Object} - Send result
   */
  async sendPhaseStartEmail(userId, phase) {
    try {

      // Get user details

      if (userError || !user) {
        // console.error('User lookup error:', userError);
        throw new Error('User not found');
      } catch (error) { console.error(error); }
      // Get user's preferred language and generate multilingual content
        ? `🚀 Fase ${phase} Gestart - Maritime Training`
        : `🚀 Phase ${phase} Started - Maritime Training`;


      return await this.factory.sendEmail({
        to: user.email,
        toName: `${user.first_name} ${user.last_name}`,
        subject: subject,
        html: htmlContent,
        logType: 'phase_start',
        userId: user.id
      });

    } catch (error) {
      // console.error('📧 [UNIFIED] Failed to send phase start email:', error);
      throw error;
    }
  }

  /**
   * Send phase completion notification email
   * @param {string} userId - User ID of crew member who completed the phase
   * @param {number} phase - Phase number that was completed
   * @returns {Object} - Send result
   */
  async sendPhaseCompletionEmail(userId, phase) {
    try {

      // Get user details

      if (userError || !user) {
        // console.error('User lookup error:', userError);
        throw new Error('User not found');
      } catch (error) { console.error(error); }
      // Get user's preferred language and generate multilingual content


      return await this.factory.sendEmail({
        to: user.email,
        toName: `${user.first_name} ${user.last_name}`,
        subject: subject,
        html: htmlContent,
        logType: 'phase_completion',
        userId: user.id
      });

    } catch (error) {
      // console.error('📧 [UNIFIED] Failed to send phase completion email:', error);
      throw error;
    }
  }

  /**
   * Get phase start email template
   * @param {Object} user - User object
   * @param {number} phase - Phase number starting
   * @returns {string} - HTML email template
   */
  getPhaseStartTemplate(user, phase) {

    if (isNL) {
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Fase ${phase} Gestart</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #132545; background-color: #f8fafc; margin: 0; padding: 0;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0; padding: 0;">
            <tr>
              <td style="padding: 20px 0;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; max-width: 600px; background-color: white; border: 1px solid #e2e8f0;">
                  <tr>
                    <td style="background-color: #18AA9D; padding: 0;">
                      <div style="background: #18AA9D; background: linear-gradient(135deg, #18AA9D 0%, #006A82 100%); color: white; padding: 30px 20px; text-align: center;">
                        <h1 style="margin: 0; font-size: 28px; font-weight: 600; color: white;">🚀 Laten we beginnen!</h1>
                        <p style="margin: 10px 0 0 0; font-size: 18px; color: white;">Fase ${phase} is nu gestart</p>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 30px 20px;">
                      <h2 style="color: #132545; margin-top: 0;">Beste ${user.first_name} ${user.last_name},</h2>

                      <p style="margin: 15px 0; font-size: 16px;">Je bent klaar om te beginnen met <strong>Fase ${phase}</strong> van je maritime veiligheidstraining!</p>

                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 25px 0;">
                        <tr>
                          <td style="background-color: #eff6ff; padding: 20px; border: 1px solid #bfdbfe;">
                            <h3 style="margin-top: 0; color: #006A82;">📚 Wat je kunt verwachten</h3>
                            <ul style="margin: 0; padding-left: 20px;">
                              <li style="margin: 8px 0; color: #475569;">Interactieve trainingsmodules</li>
                              <li style="margin: 8px 0; color: #475569;">Praktische oefeningen</li>
                              <li style="margin: 8px 0; color: #475569;">Veiligheidsprocedures</li>
                              <li style="margin: 8px 0; color: #475569;">Voortgangscontroles</li>
                            </ul>
                          </td>
                        </tr>
                      </table>

                      <div style="text-align: center; margin: 30px 0;">
                        <a href="${dashboardUrl}" style="display: inline-block; background-color: #18AA9D; background: linear-gradient(135deg, #18AA9D 0%, #006A82 100%); color: white; padding: 15px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; border: 1px solid #18AA9D;">🎯 Start Training</a>
                      </div>

                      <p style="margin: 15px 0;">Log in op je dashboard om direct te beginnen met de training. Veel succes!</p>

                      <p style="margin-bottom: 0;">Met vriendelijke groet,</p>
                      <p style="margin-top: 5px;"><strong style="color: #006A82;">Maritime Onboarding Platform Training Team</strong></p>
                    </td>
                  </tr>
                  <tr>
                    <td style="background-color: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
                      <p style="margin: 5px 0;">Dit bericht is verzonden vanuit het Maritime Onboarding Platform Training Systeem</p>
                      <p style="margin: 5px 0;">© 2024 Maritime Onboarding Platform. Alle rechten voorbehouden.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;
    } else {
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Phase ${phase} Started</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #132545; background-color: #f8fafc; margin: 0; padding: 0;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0; padding: 0;">
            <tr>
              <td style="padding: 20px 0;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; max-width: 600px; background-color: white; border: 1px solid #e2e8f0;">
                  <tr>
                    <td style="background-color: #18AA9D; padding: 0;">
                      <div style="background: #18AA9D; background: linear-gradient(135deg, #18AA9D 0%, #006A82 100%); color: white; padding: 30px 20px; text-align: center;">
                        <h1 style="margin: 0; font-size: 28px; font-weight: 600; color: white;">🚀 Let's Get Started!</h1>
                        <p style="margin: 10px 0 0 0; font-size: 18px; color: white;">Phase ${phase} is Now Active</p>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 30px 20px;">
                      <h2 style="color: #132545; margin-top: 0;">Dear ${user.first_name} ${user.last_name},</h2>

                      <p style="margin: 15px 0; font-size: 16px;">You're ready to begin <strong>Phase ${phase}</strong> of your maritime safety training!</p>

                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 25px 0;">
                        <tr>
                          <td style="background-color: #eff6ff; padding: 20px; border: 1px solid #bfdbfe;">
                            <h3 style="margin-top: 0; color: #006A82;">📚 What to Expect</h3>
                            <ul style="margin: 0; padding-left: 20px;">
                              <li style="margin: 8px 0; color: #475569;">Interactive training modules</li>
                              <li style="margin: 8px 0; color: #475569;">Practical exercises</li>
                              <li style="margin: 8px 0; color: #475569;">Safety procedures</li>
                              <li style="margin: 8px 0; color: #475569;">Progress checkpoints</li>
                            </ul>
                          </td>
                        </tr>
                      </table>

                      <div style="text-align: center; margin: 30px 0;">
                        <a href="${dashboardUrl}" style="display: inline-block; background-color: #18AA9D; background: linear-gradient(135deg, #18AA9D 0%, #006A82 100%); color: white; padding: 15px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; border: 1px solid #18AA9D;">🎯 Start Training</a>
                      </div>

                      <p style="margin: 15px 0;">Log into your dashboard to begin the training immediately. Good luck!</p>

                      <p style="margin-bottom: 0;">Best regards,</p>
                      <p style="margin-top: 5px;"><strong style="color: #006A82;">Maritime Onboarding Platform Training Team</strong></p>
                    </td>
                  </tr>
                  <tr>
                    <td style="background-color: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
                      <p style="margin: 5px 0;">This email was sent from the Maritime Onboarding Platform Training System</p>
                      <p style="margin: 5px 0;">© 2024 Maritime Onboarding Platform. All rights reserved.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;
    }
  }

  /**
   * Get phase completion email template
   * @param {Object} user - User object
   * @param {number} phase - Phase number completed
   * @returns {string} - HTML email template
   */
  getPhaseCompletionTemplate(user, phase) {

    if (isNL) {
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Fase ${phase} Voltooid</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #132545; background-color: #f8fafc; margin: 0; padding: 0;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0; padding: 0;">
            <tr>
              <td style="padding: 20px 0;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; max-width: 600px; background-color: white; border: 1px solid #e2e8f0;">
                  <tr>
                    <td style="background-color: #18AA9D; padding: 0;">
                      <!--[if gte mso 9]>
                      <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:600px; height:100px;">
                        <v:fill type="gradient" color="#18AA9D" color2="#006A82" angle="45"/>
                        <v:textbox inset="0,0,0,0">
                      <![endif]-->
                      <div style="background: #18AA9D; background: linear-gradient(135deg, #18AA9D 0%, #006A82 100%); color: white; padding: 30px 20px; text-align: center;">
                        <h1 style="margin: 0; font-size: 28px; font-weight: 600; color: white;">🎉 Gefeliciteerd!</h1>
                        <p style="margin: 10px 0 0 0; font-size: 18px; color: white;">Fase ${phase} Succesvol Voltooid</p>
                      </div>
                      <!--[if gte mso 9]>
                        </v:textbox>
                      </v:rect>
                      <![endif]-->
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 30px 20px;">
                      <h2 style="color: #132545; margin-top: 0;">Beste ${user.first_name} ${user.last_name},</h2>
  
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 25px 0;">
                        <tr>
                          <td style="background-color: #f0fdf4; padding: 25px; text-align: center; border: 2px solid #18AA9D;">
                            <h3 style="margin-top: 0; color: #18AA9D;">🚢 Uitstekend Werk!</h3>
                            <p style="margin: 10px 0; font-size: 16px;">Je hebt <strong>Fase ${phase}</strong> van je maritime veiligheidstraining succesvol afgerond.</p>
                            <p style="margin: 10px 0; color: #065f46;">Je toewijding aan veiligheid en professionele ontwikkeling is prijzenswaardig.</p>
                          </td>
                        </tr>
                      </table>
  
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 20px 0;">
                        <tr>
                          <td style="background-color: #eff6ff; padding: 20px; border: 1px solid #bfdbfe;">
                            <h3 style="margin-top: 0; color: #006A82;">📚 Volgende Stappen</h3>
                            <ul style="margin: 0; padding-left: 20px;">
                              <li style="margin: 8px 0; color: #475569;">Bekijk je voortgang in het dashboard</li>
                              <li style="margin: 8px 0; color: #475569;">Start de volgende trainingsfase indien beschikbaar</li>
                              <li style="margin: 8px 0; color: #475569;">Raadpleeg trainingsmateriaal wanneer nodig</li>
                              <li style="margin: 8px 0; color: #475569;">Neem contact op met je manager bij vragen</li>
                            </ul>
                          </td>
                        </tr>
                      </table>
  
                      <div style="text-align: center; margin: 30px 0;">
                        <!--[if mso]>
                        <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word"
                          href="${dashboardUrl}" style="height:52px;v-text-anchor:middle;width:200px;" arcsize="15%"
                          strokecolor="#18AA9D" fillcolor="#18AA9D">
                          <w:anchorlock/>
                          <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">
                            📊 Bekijk Dashboard
                          </center>
                        </v:roundrect>
                        <![endif]-->
                        <!--[if !mso]><!-->
                        <a href="${dashboardUrl}" style="display: inline-block; background-color: #18AA9D; background: linear-gradient(135deg, #18AA9D 0%, #006A82 100%); color: white; padding: 15px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; border: 1px solid #18AA9D;">📊 Bekijk Dashboard</a>
                        <!--<![endif]-->
                      </div>
  
                      <p style="margin: 15px 0;">Je voortgang wordt automatisch bijgehouden in het systeem. Blijf gefocust op je training en professionele ontwikkeling.</p>
  
                      <p style="margin-bottom: 0;">Veel succes met je verdere training!</p>
                      <p style="margin-top: 5px;"><strong style="color: #006A82;">Maritime Onboarding Platform Training Team</strong></p>
                    </td>
                  </tr>
                  <tr>
                    <td style="background-color: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
                      <p style="margin: 5px 0;">Dit bericht is verzonden vanuit het Maritime Onboarding Platform Training Systeem</p>
                      <p style="margin: 5px 0;">© 2024 Maritime Onboarding Platform. Alle rechten voorbehouden.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;
    } else {
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Phase ${phase} Completed</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #132545; background-color: #f8fafc; margin: 0; padding: 0;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0; padding: 0;">
            <tr>
              <td style="padding: 20px 0;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; max-width: 600px; background-color: white; border: 1px solid #e2e8f0;">
                  <tr>
                    <td style="background-color: #18AA9D; padding: 0;">
                      <!--[if gte mso 9]>
                      <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:600px; height:100px;">
                        <v:fill type="gradient" color="#18AA9D" color2="#006A82" angle="45"/>
                        <v:textbox inset="0,0,0,0">
                      <![endif]-->
                      <div style="background: #18AA9D; background: linear-gradient(135deg, #18AA9D 0%, #006A82 100%); color: white; padding: 30px 20px; text-align: center;">
                        <h1 style="margin: 0; font-size: 28px; font-weight: 600; color: white;">🎉 Congratulations!</h1>
                        <p style="margin: 10px 0 0 0; font-size: 18px; color: white;">Phase ${phase} Successfully Completed</p>
                      </div>
                      <!--[if gte mso 9]>
                        </v:textbox>
                      </v:rect>
                      <![endif]-->
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 30px 20px;">
                      <h2 style="color: #132545; margin-top: 0;">Dear ${user.first_name} ${user.last_name},</h2>
  
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 25px 0;">
                        <tr>
                          <td style="background-color: #f0fdf4; padding: 25px; text-align: center; border: 2px solid #18AA9D;">
                            <h3 style="margin-top: 0; color: #18AA9D;">🚢 Excellent Work!</h3>
                            <p style="margin: 10px 0; font-size: 16px;">You have successfully completed <strong>Phase ${phase}</strong> of your maritime safety training.</p>
                            <p style="margin: 10px 0; color: #065f46;">Your dedication to safety and professional development is commendable.</p>
                          </td>
                        </tr>
                      </table>
  
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 20px 0;">
                        <tr>
                          <td style="background-color: #eff6ff; padding: 20px; border: 1px solid #bfdbfe;">
                            <h3 style="margin-top: 0; color: #006A82;">📚 Next Steps</h3>
                            <ul style="margin: 0; padding-left: 20px;">
                              <li style="margin: 8px 0; color: #475569;">Review your progress in the dashboard</li>
                              <li style="margin: 8px 0; color: #475569;">Continue to the next training phase if available</li>
                              <li style="margin: 8px 0; color: #475569;">Access training materials for reference</li>
                              <li style="margin: 8px 0; color: #475569;">Contact your manager with any questions</li>
                            </ul>
                          </td>
                        </tr>
                      </table>
  
                      <div style="text-align: center; margin: 30px 0;">
                        <!--[if mso]>
                        <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word"
                          href="${dashboardUrl}" style="height:52px;v-text-anchor:middle;width:180px;" arcsize="15%"
                          strokecolor="#18AA9D" fillcolor="#18AA9D">
                          <w:anchorlock/>
                          <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">
                            📊 View Dashboard
                          </center>
                        </v:roundrect>
                        <![endif]-->
                        <!--[if !mso]><!-->
                        <a href="${dashboardUrl}" style="display: inline-block; background-color: #18AA9D; background: linear-gradient(135deg, #18AA9D 0%, #006A82 100%); color: white; padding: 15px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; border: 1px solid #18AA9D;">📊 View Dashboard</a>
                        <!--<![endif]-->
                      </div>
  
                      <p style="margin: 15px 0;">Your progress has been automatically recorded in the system. Keep up the excellent work as you continue your training journey.</p>
  
                      <p style="margin-bottom: 0;">Best of luck with your continued training!</p>
                      <p style="margin-top: 5px;"><strong style="color: #006A82;">Maritime Onboarding Platform Training Team</strong></p>
                    </td>
                  </tr>
                  <tr>
                    <td style="background-color: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
                      <p style="margin: 5px 0;">This email was sent from the Maritime Onboarding Platform Training System</p>
                      <p style="margin: 5px 0;">© 2024 Maritime Onboarding Platform. All rights reserved.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;
    }
  }
}

// Export singleton instance
const unifiedEmailService = new UnifiedEmailService();
module.exports = { unifiedEmailService, UnifiedEmailService };
module.exports.default = unifiedEmailService;
