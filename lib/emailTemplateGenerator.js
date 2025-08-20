// lib/emailTemplateGenerator.js - Email Template Generator
const { getEmailTranslations, getCommonTranslations, getTranslation } = require('./emailTranslations');
const { getBaseUrl, generateMagicLinkUrl, generateDashboardUrl } = require('./urlUtils');
const { settingsService } = require('./settingsService');

/**
 * Email Template Generator
 * 
 * Generates HTML email templates using translation data
 * Supports both English and Dutch languages
 */

class EmailTemplateGenerator {
  /**
   * Get company logo URL from settings
   * @returns {Promise<string|null>} Logo URL or null if not configured
   */
  async getCompanyLogo() {
    try {
      const logoUrl = await settingsService.getSetting('application', 'company_logo_url', '');
      return logoUrl && logoUrl.trim() !== '' ? logoUrl.replace(/"/g, '') : null;
    } catch (error) {
      
      return null;
    }
  }

  /**
   * Generate logo HTML if logo is configured
   * @returns {Promise<string>} Logo HTML or empty string
   */
  async generateLogoHtml() {
    const logoUrl = await this.getCompanyLogo();
    if (!logoUrl) return '';

    return `
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 20px;">
        <tr>
          <td style="text-align: center; padding: 15px 0;">
            <div style="display: inline-block; background-color: white; padding: 10px 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); border: 1px solid rgba(255,255,255,0.2);">
              <img src="${logoUrl}" alt="Company Logo" style="max-height: 50px; max-width: 180px; height: auto; width: auto; display: block;" />
            </div>
          </td>
        </tr>
      </table>
    `;
  }

  /**
   * Generate base email HTML structure
   * @param {string} lang - Language code (en or nl)
   * @param {Object} options - Template options
   * @returns {Promise<string>} - HTML email template
   */
  async generateBaseTemplate(lang, { header, content, footer = null }) {
    const commonTrans = getCommonTranslations(lang);
    const logoHtml = await this.generateLogoHtml();
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${header}</title>
      </head>
      <body style="font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #132545; background-color: #f8fafc; margin: 0; padding: 0; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0; padding: 0;">
          <tr>
            <td style="padding: 20px 0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; max-width: 600px; background-color: white; border: 1px solid #e2e8f0;">
                <!-- Header -->
                <tr>
                  <td style="background-color: #132545; padding: 0;">
                    <!--[if gte mso 9]>
                    <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:600px; height:110px;">
                      <v:fill type="gradient" color="#132545" color2="#006A82" angle="45"/>
                      <v:textbox inset="0,0,0,0">
                    <![endif]-->
                    <div style="background: #132545; color: white; padding: 20px 20px 30px 20px; text-align: center;">
                      ${logoHtml}
                      <h1 style="margin: 0; font-size: 28px; font-weight: 600; color: white; font-family: Arial, Helvetica, sans-serif;">${header}</h1>
                    </div>
                    <!--[if gte mso 9]>
                      </v:textbox>
                    </v:rect>
                    <![endif]-->
                  </td>
                </tr>
                <!-- Content -->
                <tr>
                  <td style="padding: 30px 20px;">
                    ${content}
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; font-family: Arial, Helvetica, sans-serif;">
                    ${footer || this.getDefaultFooter(lang)}
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

  /**
   * Get default footer content
   */
  getDefaultFooter(lang) {
    const commonTrans = getCommonTranslations(lang);
    return `
      <p style="margin: 5px 0;">© 2024 Maritime Onboarding Platform. ${getTranslation(lang, 'managerMagicLink.footer.line2', {})}</p>
    `;
  }

  /**
   * Generate button HTML
   */
  generateButton(text, url, style = 'primary') {
    const colors = {
      primary: { bg: '#132545', bg2: '#006A82' },
      secondary: { bg: '#18AA9D', bg2: '#006A82' }
    };

    const buttonColor = colors[style] || colors.primary;

    return `
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 30px 0;">
        <tr>
          <td style="text-align: center;">
            <!--[if mso]>
            <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word"
              href="${url}" style="height:52px;v-text-anchor:middle;width:200px;" arcsize="15%"
              strokecolor="${buttonColor.bg}" fillcolor="${buttonColor.bg}">
              <w:anchorlock/>
              <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">
                ${text}
              </center>
            </v:roundrect>
            <![endif]-->
            <!--[if !mso]><!-->
            <a href="${url}" style="display: inline-block; background-color: ${buttonColor.bg}; color: white !important; padding: 16px 32px; text-decoration: none; font-weight: 600; font-size: 16px; font-family: Arial, Helvetica, sans-serif; border: 2px solid ${buttonColor.bg};">${text}</a>
            <!--<![endif]-->
          </td>
        </tr>
      </table>
    `;
  }

  /**
   * Generate info box HTML
   */
  generateInfoBox(content, type = 'info') {
    const boxStyles = {
      info: 'background-color: #eff6ff; border: 1px solid #bfdbfe; color: #132545;',
      success: 'background-color: #f0fdf4; border: 2px solid #18AA9D; color: #132545;',
      warning: 'background-color: #fffbeb; border-left: 4px solid #f59e0b; color: #132545;',
      error: 'background-color: #fef2f2; border-left: 4px solid #ef4444; color: #132545;'
    };

    // Outlook doesn't support border-radius, so we'll use a table approach
    return `
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 20px 0;">
        <tr>
          <td>
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="${boxStyles[type]}">
              <tr>
                <td style="padding: 20px;">
                  ${content}
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    `;
  }

  /**
   * Generate list HTML
   */
  generateList(items, ordered = false) {
    const listItems = items.map(item =>
      `<tr><td style="padding: 4px 0;"><p style="margin: 0; color: #475569; font-family: Arial, Helvetica, sans-serif; font-size: 14px;">${ordered ? '' : '• '}${item}</p></td></tr>`
    ).join('');

    return `
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        ${listItems}
      </table>
    `;
  }

  /**
   * Generate manager magic link email template
   */
  async generateManagerMagicLinkTemplate(user, magicLink, lang = 'en') {
    const trans = getEmailTranslations(lang, 'managerMagicLink');
    const common = getCommonTranslations(lang);

    const capabilities = [
      trans.capabilities.crew,
      trans.capabilities.training,
      trans.capabilities.certificates,
      trans.capabilities.compliance,
      trans.capabilities.communication
    ];

    const content = `
      <h2 style="color: #132545; margin-top: 0; margin-bottom: 20px; font-family: Arial, Helvetica, sans-serif; font-size: 24px; font-weight: 600;">${trans.greeting.replace('{{firstName}}', user.first_name)}</h2>

      <p style="margin: 15px 0; color: #132545; font-family: Arial, Helvetica, sans-serif; font-size: 16px; line-height: 1.6;">${trans.intro}</p>

      ${this.generateButton(trans.ctaButton, magicLink)}

      ${this.generateInfoBox(`
        <p style="margin: 0; color: #132545; font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.5;">
          <strong style="color: #ef4444;">${trans.securityNotice}</strong> ${trans.securityText}
        </p>
      `, 'error')}

      ${this.generateInfoBox(`
        <h3 style="margin-top: 0; margin-bottom: 15px; color: #132545; font-family: Arial, Helvetica, sans-serif; font-size: 18px; font-weight: 600;">${trans.capabilitiesTitle}</h3>
        ${this.generateList(capabilities)}
      `)}

      <p style="margin: 15px 0; color: #132545; font-family: Arial, Helvetica, sans-serif; font-size: 16px; line-height: 1.6;">${trans.supportText}</p>

      <p style="margin: 15px 0; color: #132545; font-family: Arial, Helvetica, sans-serif; font-size: 16px; line-height: 1.6;">${trans.helpText}</p>

      ${this.generateInfoBox(`
        <p style="margin: 0; font-size: 14px; color: #64748b; font-family: Arial, Helvetica, sans-serif; text-align: center;">
          ${trans.linkExpired}
          <a href="${getBaseUrl()}/request-access" style="color: #006A82; text-decoration: none; font-weight: 600;">${trans.requestNewLink}</a>
        </p>
      `)}

      <p style="margin-bottom: 0; color: #132545; font-family: Arial, Helvetica, sans-serif; font-size: 16px;">${trans.closing}</p>
      <p style="margin-top: 5px; margin-bottom: 0;"><strong style="color: #006A82; font-family: Arial, Helvetica, sans-serif; font-size: 16px;">${trans.signature}</strong></p>
    `;

    const footer = `
      <p style="margin: 5px 0;">${trans.footer.line1}</p>
      <p style="margin: 5px 0;">${trans.footer.line2}</p>
    `;

    return await this.generateBaseTemplate(lang, {
      header: trans.header,
      content,
      footer
    });
  }

  /**
   * Generate crew magic link email template
   */
  async generateCrewMagicLinkTemplate(user, magicLink, lang = 'en') {
    const trans = getEmailTranslations(lang, 'crewMagicLink');
    const common = getCommonTranslations(lang);
    
    const boardingDate = user.expected_boarding_date ? 
      new Date(user.expected_boarding_date).toLocaleDateString(lang === 'nl' ? 'nl-NL' : 'en-US') : 
      common.toBeConfirmed;

    const trainingPhases = [
      trans.trainingPhases.phase1,
      trans.trainingPhases.phase2,
      trans.trainingPhases.phase3
    ];

    const content = `
      ${this.generateInfoBox(`
        <h2 style="margin: 0; color: #18AA9D; font-size: 24px; font-family: Arial, Helvetica, sans-serif; font-weight: 600; text-align: center;">${trans.welcomeBanner}</h2>
        <p style="margin: 10px 0 0 0; font-size: 16px; color: #132545; font-family: Arial, Helvetica, sans-serif; text-align: center;">${trans.welcomeSubtext}</p>
      `, 'success')}

      <h2 style="color: #132545; margin-top: 0; margin-bottom: 20px; font-family: Arial, Helvetica, sans-serif; font-size: 24px; font-weight: 600;">${trans.greeting.replace('{{firstName}}', user.first_name)}</h2>

      <p style="margin: 15px 0; color: #132545; font-family: Arial, Helvetica, sans-serif; font-size: 16px; line-height: 1.6;">${trans.intro}</p>

      ${this.generateInfoBox(`
        <h3 style="margin-top: 0; margin-bottom: 15px; color: #006A82; font-family: Arial, Helvetica, sans-serif; font-size: 18px; font-weight: 600;">${trans.assignmentTitle}</h3>
        <p style="margin: 5px 0; color: #132545; font-family: Arial, Helvetica, sans-serif; font-size: 16px;"><strong>${trans.position}</strong> ${user.position || common.crewMember}</p>
        <p style="margin: 5px 0; color: #132545; font-family: Arial, Helvetica, sans-serif; font-size: 16px;"><strong>${trans.vessel}</strong> ${user.vessel_assignment || common.toBeAssigned}</p>
        <p style="margin: 5px 0; color: #132545; font-family: Arial, Helvetica, sans-serif; font-size: 16px;"><strong>${trans.boardingDate}</strong> ${boardingDate}</p>
      `, 'info')}

      ${this.generateButton(trans.ctaButton, magicLink, 'secondary')}

      ${this.generateInfoBox(`
        <h3 style="margin-top: 0; margin-bottom: 15px; color: #132545; font-family: Arial, Helvetica, sans-serif; font-size: 18px; font-weight: 600;">${trans.trainingTitle}</h3>
        ${this.generateList(trainingPhases)}
        <p style="margin: 15px 0 0 0; font-size: 14px; color: #64748b; font-family: Arial, Helvetica, sans-serif;">${trans.trainingNote}</p>
      `)}

      ${this.generateInfoBox(`
        <p style="margin: 0; color: #132545; font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.5;">
          <strong style="color: #ef4444;">${trans.securityNotice}</strong> ${trans.securityText}
        </p>
      `, 'error')}

      <p style="margin: 15px 0; color: #132545; font-family: Arial, Helvetica, sans-serif; font-size: 16px; line-height: 1.6;">${trans.progressNote}</p>

      ${this.generateInfoBox(`
        <p style="margin: 0; font-size: 14px; color: #64748b; font-family: Arial, Helvetica, sans-serif; text-align: center;">
          ${trans.linkExpired}
          <a href="${getBaseUrl()}/request-access" style="color: #006A82; text-decoration: none; font-weight: 600;">${trans.requestNewLink}</a>
        </p>
      `)}

      <p style="margin: 15px 0; color: #132545; font-family: Arial, Helvetica, sans-serif; font-size: 16px; line-height: 1.6;">${trans.welcomeMessage}</p>

      <p style="margin-bottom: 0; color: #132545; font-family: Arial, Helvetica, sans-serif; font-size: 16px;">${trans.closing}</p>
      <p style="margin-top: 5px; margin-bottom: 0;"><strong style="color: #006A82; font-family: Arial, Helvetica, sans-serif; font-size: 16px;">${trans.signature}</strong></p>
    `;

    const footer = `
      <p style="margin: 5px 0;">${trans.footer.line1}</p>
      <p style="margin: 5px 0;">${trans.footer.line2}</p>
    `;

    // Use crew-specific header gradient
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${trans.header}</title>
      </head>
      <body style="font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #132545; background-color: #f8fafc; margin: 0; padding: 0; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0; padding: 0;">
          <tr>
            <td style="padding: 20px 0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; max-width: 600px; background-color: white; border: 1px solid #e2e8f0;">
                <!-- Header -->
                <tr>
                  <td style="background-color: #18AA9D; padding: 0;">
                    <!--[if gte mso 9]>
                    <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:600px; height:110px;">
                      <v:fill type="gradient" color="#18AA9D" color2="#006A82" angle="45"/>
                      <v:textbox inset="0,0,0,0">
                    <![endif]-->
                    <div style="background: #18AA9D; color: white; padding: 20px 20px 30px 20px; text-align: center;">
                      ${await this.generateLogoHtml()}
                      <h1 style="margin: 0; font-size: 28px; font-weight: 600; color: white; font-family: Arial, Helvetica, sans-serif;">${trans.header}</h1>
                    </div>
                    <!--[if gte mso 9]>
                      </v:textbox>
                    </v:rect>
                    <![endif]-->
                  </td>
                </tr>
                <!-- Content -->
                <tr>
                  <td style="padding: 30px 20px;">
                    ${content}
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; font-family: Arial, Helvetica, sans-serif;">
                    ${footer}
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

  /**
   * Generate phase completion email template
   */
  async generatePhaseCompletionTemplate(user, phase, lang = 'en') {
    const trans = getEmailTranslations(lang, 'phaseCompletion');
    const dashboardUrl = generateDashboardUrl('crew');

    const nextSteps = [
      trans.nextSteps.review,
      trans.nextSteps.continue,
      trans.nextSteps.access,
      trans.nextSteps.contact
    ];

    const content = `
      ${this.generateInfoBox(`
        <h3 style="margin-top: 0; color: #18AA9D;">${trans.banner}</h3>
        <p style="margin: 10px 0; font-size: 16px;">${trans.achievement.replace('{{phase}}', phase)}</p>
        <p style="margin: 10px 0; color: #065f46;">${trans.recognition}</p>
      `, 'success')}

      <h2 style="color: #132545; margin-top: 0;">${trans.greeting.replace('{{firstName}}', user.first_name).replace('{{lastName}}', user.last_name)}</h2>

      ${this.generateInfoBox(`
        <h3 style="margin-top: 0; color: #006A82;">${trans.nextStepsTitle}</h3>
        ${this.generateList(nextSteps)}
      `, 'info')}

      ${this.generateButton(trans.ctaButton, dashboardUrl, 'secondary')}

      <p style="margin: 15px 0;">${trans.progressNote}</p>
      <p style="margin-bottom: 0;">${trans.closing}</p>
      <p style="margin-top: 5px;"><strong style="color: #006A82;">${trans.signature}</strong></p>
    `;

    const footer = `
      <p style="margin: 5px 0;">${trans.footer.line1}</p>
      <p style="margin: 5px 0;">${trans.footer.line2}</p>
    `;

    // Use success-oriented header gradient
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${trans.header}</title>
      </head>
      <body style="font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #132545; background-color: #f8fafc; margin: 0; padding: 0;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0; padding: 0;">
          <tr>
            <td style="padding: 20px 0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; max-width: 600px; background-color: white; border: 1px solid #e2e8f0;">
                <tr>
                  <td style="background-color: #18AA9D; padding: 0;">
                    <!--[if gte mso 9]>
                    <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:600px; height:120px;">
                      <v:fill type="gradient" color="#18AA9D" color2="#006A82" angle="45"/>
                      <v:textbox inset="0,0,0,0">
                    <![endif]-->
                    <div style="background: #18AA9D; color: white; padding: 20px 20px 30px 20px; text-align: center;">
                      ${await this.generateLogoHtml()}
                      <h1 style="margin: 0; font-size: 28px; font-weight: 600; color: white; font-family: Arial, Helvetica, sans-serif;">${trans.header}</h1>
                      <p style="margin: 10px 0 0 0; font-size: 18px; color: white; font-family: Arial, Helvetica, sans-serif;">${trans.subheader.replace('{{phase}}', phase)}</p>
                    </div>
                    <!--[if gte mso 9]>
                      </v:textbox>
                    </v:rect>
                    <![endif]-->
                  </td>
                </tr>
                <tr>
                  <td style="padding: 30px 20px;">
                    ${content}
                  </td>
                </tr>
                <tr>
                  <td style="background-color: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
                    ${footer}
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

  /**
   * Generate welcome email template
   */
  async generateWelcomeEmailTemplate(user, lang = 'en') {
    const trans = getEmailTranslations(lang, 'welcome');
    const common = getCommonTranslations(lang);

    const boardingDate = user.expected_boarding_date ?
      new Date(user.expected_boarding_date).toLocaleDateString(lang === 'nl' ? 'nl-NL' : 'en-US') :
      common.toBeConfirmed;

    const content = `
      ${this.generateInfoBox(`
        <h2 style="margin: 0; color: #18AA9D; font-size: 24px; font-family: Arial, Helvetica, sans-serif; font-weight: 600; text-align: center;">${trans.welcomeBanner}</h2>
        <p style="margin: 10px 0 0 0; font-size: 16px; color: #132545; font-family: Arial, Helvetica, sans-serif; text-align: center;">${trans.welcomeSubtext}</p>
      `, 'success')}

      <h2 style="color: #132545; margin-top: 0; margin-bottom: 20px; font-family: Arial, Helvetica, sans-serif; font-size: 24px; font-weight: 600;">${trans.greeting.replace('{{firstName}}', user.first_name)}</h2>

      <p style="margin: 15px 0; color: #132545; font-family: Arial, Helvetica, sans-serif; font-size: 16px; line-height: 1.6;">${trans.intro}</p>

      ${this.generateInfoBox(`
        <h3 style="margin-top: 0; margin-bottom: 15px; color: #006A82; font-family: Arial, Helvetica, sans-serif; font-size: 18px; font-weight: 600;">${trans.assignmentTitle}</h3>
        <p style="margin: 5px 0; color: #132545; font-family: Arial, Helvetica, sans-serif; font-size: 16px;"><strong>${trans.position}</strong> ${user.position || common.crewMember}</p>
        <p style="margin: 5px 0; color: #132545; font-family: Arial, Helvetica, sans-serif; font-size: 16px;"><strong>${trans.vessel}</strong> ${user.vessel_assignment || common.toBeAssigned}</p>
        <p style="margin: 5px 0; color: #132545; font-family: Arial, Helvetica, sans-serif; font-size: 16px;"><strong>${trans.boardingDate}</strong> ${boardingDate}</p>
      `, 'info')}

      <p style="margin: 15px 0; color: #132545; font-family: Arial, Helvetica, sans-serif; font-size: 16px; line-height: 1.6;">${trans.nextSteps}</p>

      <p style="margin-bottom: 0; color: #132545; font-family: Arial, Helvetica, sans-serif; font-size: 16px;">${trans.closing}</p>
      <p style="margin-top: 5px; margin-bottom: 0;"><strong style="color: #006A82; font-family: Arial, Helvetica, sans-serif; font-size: 16px;">${trans.signature}</strong></p>
    `;

    const footer = `
      <p style="margin: 5px 0;">${trans.footer.line1}</p>
      <p style="margin: 5px 0;">${trans.footer.line2}</p>
    `;

    return await this.generateBaseTemplate(lang, {
      header: trans.header,
      content,
      footer
    });
  }

  /**
   * Generate safety management email template
   */
  async generateSafetyManagementEmailTemplate(crew, lang = 'en') {
    const trans = getEmailTranslations(lang, 'safetyManagement');
    const common = getCommonTranslations(lang);

    const boardingDate = crew.expected_boarding_date ?
      new Date(crew.expected_boarding_date).toLocaleDateString(lang === 'nl' ? 'nl-NL' : 'en-US') :
      common.toBeConfirmed;

    const safetyTopics = [
      trans.safetyTopics.emergency,
      trans.safetyTopics.equipment,
      trans.safetyTopics.procedures,
      trans.safetyTopics.compliance
    ];

    const content = `
      ${this.generateInfoBox(`
        <h2 style="margin: 0; color: #ef4444; font-size: 24px; font-family: Arial, Helvetica, sans-serif; font-weight: 600; text-align: center;">${trans.safetyBanner}</h2>
        <p style="margin: 10px 0 0 0; font-size: 16px; color: #132545; font-family: Arial, Helvetica, sans-serif; text-align: center;">${trans.safetySubtext}</p>
      `, 'error')}

      <h2 style="color: #132545; margin-top: 0; margin-bottom: 20px; font-family: Arial, Helvetica, sans-serif; font-size: 24px; font-weight: 600;">${trans.greeting.replace('{{firstName}}', crew.first_name)}</h2>

      <p style="margin: 15px 0; color: #132545; font-family: Arial, Helvetica, sans-serif; font-size: 16px; line-height: 1.6;">${trans.intro}</p>

      ${this.generateInfoBox(`
        <h3 style="margin-top: 0; margin-bottom: 15px; color: #ef4444; font-family: Arial, Helvetica, sans-serif; font-size: 18px; font-weight: 600;">${trans.documentTitle}</h3>
        <p style="margin: 5px 0; color: #132545; font-family: Arial, Helvetica, sans-serif; font-size: 16px;">${trans.documentDescription}</p>
        <p style="margin: 5px 0; color: #132545; font-family: Arial, Helvetica, sans-serif; font-size: 16px;"><strong>${trans.boardingDate}</strong> ${boardingDate}</p>
      `, 'error')}

      ${this.generateInfoBox(`
        <h3 style="margin-top: 0; margin-bottom: 15px; color: #132545; font-family: Arial, Helvetica, sans-serif; font-size: 18px; font-weight: 600;">${trans.safetyTopicsTitle}</h3>
        ${this.generateList(safetyTopics)}
      `)}

      <p style="margin: 15px 0; color: #132545; font-family: Arial, Helvetica, sans-serif; font-size: 16px; line-height: 1.6;">${trans.importance}</p>

      <p style="margin-bottom: 0; color: #132545; font-family: Arial, Helvetica, sans-serif; font-size: 16px;">${trans.closing}</p>
      <p style="margin-top: 5px; margin-bottom: 0;"><strong style="color: #006A82; font-family: Arial, Helvetica, sans-serif; font-size: 16px;">${trans.signature}</strong></p>
    `;

    const footer = `
      <p style="margin: 5px 0;">${trans.footer.line1}</p>
      <p style="margin: 5px 0;">${trans.footer.line2}</p>
    `;

    return await this.generateBaseTemplate(lang, {
      header: trans.header,
      content,
      footer
    });
  }

  /**
   * Generate onboarding start email template
   */
  async generateOnboardingStartEmailTemplate(crew, magicLink, lang = 'en') {
    const trans = getEmailTranslations(lang, 'onboardingStart');
    const common = getCommonTranslations(lang);

    const boardingDate = crew.expected_boarding_date ?
      new Date(crew.expected_boarding_date).toLocaleDateString(lang === 'nl' ? 'nl-NL' : 'en-US') :
      common.toBeConfirmed;

    const content = `
      ${this.generateInfoBox(`
        <h2 style="margin: 0; color: #18AA9D; font-size: 24px; font-family: Arial, Helvetica, sans-serif; font-weight: 600; text-align: center;">${trans.welcomeBanner}</h2>
        <p style="margin: 10px 0 0 0; font-size: 16px; color: #132545; font-family: Arial, Helvetica, sans-serif; text-align: center;">${trans.welcomeSubtext}</p>
      `, 'success')}

      <h2 style="color: #132545; margin-top: 0; margin-bottom: 20px; font-family: Arial, Helvetica, sans-serif; font-size: 24px; font-weight: 600;">${trans.greeting.replace('{{firstName}}', crew.first_name)}</h2>

      <p style="margin: 15px 0; color: #132545; font-family: Arial, Helvetica, sans-serif; font-size: 16px; line-height: 1.6;">${trans.intro.replace('{{vessel}}', crew.vessel_assignment || common.toBeAssigned)}</p>

      ${this.generateButton(trans.ctaButton, magicLink, 'secondary')}

      ${this.generateInfoBox(`
        <p style="margin: 0; color: #132545; font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.5;">
          <strong style="color: #ef4444;">${trans.securityNotice}</strong> ${trans.securityText}
        </p>
      `, 'error')}

      <p style="margin: 15px 0; color: #132545; font-family: Arial, Helvetica, sans-serif; font-size: 16px; line-height: 1.6;">${trans.importance}</p>

      <p style="margin-bottom: 0; color: #132545; font-family: Arial, Helvetica, sans-serif; font-size: 16px;">${trans.closing}</p>
      <p style="margin-top: 5px; margin-bottom: 0;"><strong style="color: #006A82; font-family: Arial, Helvetica, sans-serif; font-size: 16px;">${trans.signature}</strong></p>
    `;

    const footer = `
      <p style="margin: 5px 0;">${trans.footer.line1}</p>
      <p style="margin: 5px 0;">${trans.footer.line2}</p>
    `;

    return await this.generateBaseTemplate(lang, {
      header: trans.header,
      content,
      footer
    });
  }

  /**
   * Generate manager welcome email template
   */
  async generateManagerWelcomeEmailTemplate(manager, password, magicLink, lang = 'en') {
    const trans = getEmailTranslations(lang, 'managerWelcome');
    const common = getCommonTranslations(lang);

    const content = `
      ${this.generateInfoBox(`
        <h2 style="margin: 0; color: #18AA9D; font-size: 24px; font-family: Arial, Helvetica, sans-serif; font-weight: 600; text-align: center;">${trans.header}</h2>
        <p style="margin: 10px 0 0 0; font-size: 16px; color: #132545; font-family: Arial, Helvetica, sans-serif; text-align: center;">${trans.quickAccessTitle}</p>
      `, 'success')}

      <h2 style="color: #132545; margin-top: 0; margin-bottom: 20px; font-family: Arial, Helvetica, sans-serif; font-size: 24px; font-weight: 600;">${trans.greeting.replace('{{firstName}}', manager.first_name || '').replace('{{lastName}}', manager.last_name || '')}</h2>

      <p style="margin: 15px 0; color: #132545; font-family: Arial, Helvetica, sans-serif; font-size: 16px; line-height: 1.6;">${trans.intro}</p>

      ${this.generateInfoBox(`
        <h3 style="margin-top: 0; margin-bottom: 15px; color: #006A82; font-family: Arial, Helvetica, sans-serif; font-size: 18px; font-weight: 600;">${trans.alternativeTitle}</h3>
        <p style="margin: 5px 0; color: #132545; font-family: Arial, Helvetica, sans-serif; font-size: 16px;"><strong>${trans.email}</strong> ${manager.email || 'Not provided'}</p>
        <p style="margin: 5px 0; color: #132545; font-family: Arial, Helvetica, sans-serif; font-size: 16px;"><strong>${trans.password}</strong> ${password || 'Not provided'}</p>
      `, 'info')}

      ${this.generateButton(trans.ctaButton, magicLink)}

      ${this.generateInfoBox(`
        <p style="margin: 0; color: #132545; font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.5;">
          <strong style="color: #ef4444;">${trans.passwordWarning}</strong> ${trans.linkNote}
        </p>
      `, 'error')}

      <p style="margin: 15px 0; color: #132545; font-family: Arial, Helvetica, sans-serif; font-size: 16px; line-height: 1.6;">${trans.roleText}</p>

      <p style="margin-bottom: 0; color: #132545; font-family: Arial, Helvetica, sans-serif; font-size: 16px;">${trans.closing}</p>
      <p style="margin-top: 5px; margin-bottom: 0;"><strong style="color: #006A82; font-family: Arial, Helvetica, sans-serif; font-size: 16px;">${trans.signature}</strong></p>
    `;

    const footer = `
      <p style="margin: 5px 0;">${trans.footer.line1}</p>
      <p style="margin: 5px 0;">${trans.footer.line2}</p>
    `;

    return await this.generateBaseTemplate(lang, {
      header: trans.header,
      content,
      footer
    });
  }

  /**
   * Generate system alert email template
   */
  async generateSystemAlertTemplate(type, message, details, severity = 'warning', lang = 'en') {
    const severityConfig = {
      info: { color: '#0ea5e9', icon: 'ℹ️', title: 'Information' },
      warning: { color: '#f59e0b', icon: '⚠️', title: 'Warning' },
      error: { color: '#ef4444', icon: '❌', title: 'Error' },
      success: { color: '#18AA9D', icon: '✅', title: 'Success' }
    };

    const config = severityConfig[severity] || severityConfig.warning;
    const isNL = lang === 'nl';

    const content = `
      ${this.generateInfoBox(`
        <h3 style="margin-top: 0; color: ${config.color};">${config.icon} ${config.title}</h3>
        <p style="margin: 10px 0; font-size: 16px;"><strong>${isNL ? 'Type:' : 'Type:'}</strong> ${type}</p>
        <p style="margin: 10px 0; font-size: 16px;">${message}</p>
      `, severity)}

      ${details ? `
        ${this.generateInfoBox(`
          <h3 style="margin-top: 0; color: #132545;">${isNL ? 'Details' : 'Details'}</h3>
          <pre style="margin: 10px 0; font-family: monospace; font-size: 14px; overflow-x: auto; background-color: #f1f5f9; padding: 10px; border-radius: 4px;">${details}</pre>
        `, 'info')}
      ` : ''}

      <p style="margin: 15px 0; color: #64748b; font-size: 14px;">
        ${isNL ? 'Dit is een geautomatiseerd systeembericht.' : 'This is an automated system message.'}
      </p>
    `;

    return await this.generateBaseTemplate(lang, {
      header: `System Alert: ${type}`,
      content
    });
  }

  /**
   * Generate quiz rejection email template
   */
  async generateQuizRejectionTemplate(user, phase, quizResult, comments, lang = 'en') {
    const isNL = lang === 'nl';
    const dashboardUrl = generateDashboardUrl('crew');

    const content = `
      ${this.generateInfoBox(`
        <h3 style="margin-top: 0; color: #ef4444;">
          ${isNL ? '❌ Quiz Niet Geslaagd' : '❌ Quiz Not Passed'}
        </h3>
        <p style="margin: 10px 0; font-size: 16px;">
          ${isNL ? `Je hebt de quiz voor Fase ${phase} niet gehaald.` : `You did not pass the quiz for Phase ${phase}.`}
        </p>
      `, 'error')}

      <h2 style="color: #132545; margin-top: 0;">
        ${isNL ? `Beste ${user.first_name}` : `Dear ${user.first_name}`},
      </h2>

      <p style="margin: 15px 0;">
        ${isNL ? 
          `We hebben je quiz voor Fase ${phase} beoordeeld. Helaas heb je niet de vereiste score behaald om door te gaan.` :
          `We have reviewed your quiz submission for Phase ${phase}. Unfortunately, you did not achieve the required score to proceed.`
        }
      </p>

      ${this.generateInfoBox(`
        <h3 style="margin-top: 0; color: #132545;">${isNL ? 'Quiz Resultaat' : 'Quiz Result'}</h3>
        <p style="margin: 5px 0;"><strong>${isNL ? 'Score' : 'Score'}:</strong> ${quizResult.score}/${quizResult.total_questions}</p>
        <p style="margin: 5px 0;"><strong>${isNL ? 'Vereist' : 'Required'}:</strong> 80%</p>
        <p style="margin: 5px 0;"><strong>${isNL ? 'Status' : 'Status'}:</strong> <span style="color: #ef4444;">${isNL ? 'Niet Geslaagd' : 'Not Passed'}</span></p>
      `, 'info')}

      ${comments ? `
        ${this.generateInfoBox(`
          <h3 style="margin-top: 0; color: #132545;">${isNL ? 'Feedback' : 'Feedback'}</h3>
          <p style="margin: 0;">${comments}</p>
        `, 'warning')}
      ` : ''}

      ${this.generateInfoBox(`
        <h3 style="margin-top: 0; color: #006A82;">${isNL ? 'Volgende Stappen' : 'Next Steps'}</h3>
        ${this.generateList([
          isNL ? 'Bekijk je trainingsmateriaal opnieuw' : 'Review your training materials again',
          isNL ? 'Neem contact op met je manager als je vragen hebt' : 'Contact your manager if you have questions',
          isNL ? 'Probeer de quiz opnieuw wanneer je klaar bent' : 'Retake the quiz when you are ready'
        ])}
      `)}

      ${this.generateButton(
        isNL ? '📚 Naar Dashboard' : '📚 Go to Dashboard',
        dashboardUrl,
        'primary'
      )}

      <p style="margin: 15px 0;">
        ${isNL ? 
          'Blijf gefocust en aarzel niet om hulp te vragen als je die nodig hebt.' :
          'Stay focused and don\'t hesitate to ask for help if you need it.'
        }
      </p>

      <p style="margin-bottom: 0;">${isNL ? 'Met vriendelijke groet,' : 'Best regards,'}</p>
      <p style="margin-top: 5px;"><strong style="color: #006A82;">Maritime Onboarding Platform Training Team</strong></p>
    `;

    return await this.generateBaseTemplate(lang, {
      header: isNL ? `Fase ${phase} Quiz - Actie Vereist` : `Phase ${phase} Quiz - Action Required`,
      content
    });
  }

  /**
   * Generate weekly report email template
   */
  async generateWeeklyReportTemplate(period, stats, recommendations, lang = 'en') {
    const isNL = lang === 'nl';
    const dashboardUrl = generateDashboardUrl('manager');

    const content = `
      ${this.generateInfoBox(`
        <h3 style="margin-top: 0; color: #18AA9D;">
          ${isNL ? '📊 Weekoverzicht' : '📊 Weekly Overview'}
        </h3>
        <p style="margin: 10px 0; font-size: 16px;">
          ${period.start} - ${period.end}
        </p>
      `, 'success')}

      <h2 style="color: #132545; margin-top: 0;">
        ${isNL ? 'Trainingsvoortgang Samenvatting' : 'Training Progress Summary'}
      </h2>

      ${this.generateInfoBox(`
        <h3 style="margin-top: 0; color: #132545;">${isNL ? 'Statistieken' : 'Statistics'}</h3>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
              <strong>${isNL ? 'Actieve Bemanning' : 'Active Crew'}:</strong>
            </td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; text-align: right;">
              ${stats.activeCrew}
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
              <strong>${isNL ? 'Training Voltooid' : 'Training Completed'}:</strong>
            </td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; text-align: right;">
              ${stats.completedTraining}
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
              <strong>${isNL ? 'In Uitvoering' : 'In Progress'}:</strong>
            </td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; text-align: right;">
              ${stats.inProgress}
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0;">
              <strong>${isNL ? 'Overtijd' : 'Overdue'}:</strong>
            </td>
            <td style="padding: 8px 0; text-align: right; color: #ef4444;">
              ${stats.overdue}
            </td>
          </tr>
        </table>
      `, 'info')}

      ${recommendations && recommendations.length > 0 ? `
        ${this.generateInfoBox(`
          <h3 style="margin-top: 0; color: #f59e0b;">${isNL ? '⚠️ Aanbevelingen' : '⚠️ Recommendations'}</h3>
          ${this.generateList(recommendations)}
        `, 'warning')}
      ` : ''}

      ${this.generateButton(
        isNL ? '📈 Volledig Rapport Bekijken' : '📈 View Full Report',
        dashboardUrl,
        'primary'
      )}

      <p style="margin: 15px 0; color: #64748b; font-size: 14px;">
        ${isNL ? 
          'Dit is een geautomatiseerd wekelijks rapport. Voor gedetailleerde informatie, log in op uw dashboard.' :
          'This is an automated weekly report. For detailed information, please log into your dashboard.'
        }
      </p>
    `;

    return await this.generateBaseTemplate(lang, {
      header: isNL ? 'Wekelijks Trainingsrapport' : 'Weekly Training Report',
      content
    });
  }

  /**
   * Generate first login notification email template
   */
  async generateFirstLoginNotificationTemplate(type, adminUser, targetUser, lang = 'en') {
    const isNL = lang === 'nl';
    const isManager = type === 'manager';
    const dashboardUrl = generateDashboardUrl('admin');

    const content = `
      ${this.generateInfoBox(`
        <h3 style="margin-top: 0; color: #18AA9D;">
          ${isNL ? '🔐 Eerste Inlog Gedetecteerd' : '🔐 First Login Detected'}
        </h3>
        <p style="margin: 10px 0; font-size: 16px;">
          ${isManager ? 
            (isNL ? 'Een nieuwe manager heeft voor het eerst ingelogd' : 'A new manager has logged in for the first time') :
            (isNL ? 'Een bemanningslid heeft voor het eerst ingelogd' : 'A crew member has logged in for the first time')
          }
        </p>
      `, 'success')}

      <h2 style="color: #132545; margin-top: 0;">
        ${isNL ? `Beste ${adminUser.first_name}` : `Dear ${adminUser.first_name}`},
      </h2>

      ${this.generateInfoBox(`
        <h3 style="margin-top: 0; color: #132545;">${isNL ? 'Gebruikersdetails' : 'User Details'}</h3>
        <p style="margin: 5px 0;"><strong>${isNL ? 'Naam' : 'Name'}:</strong> ${targetUser.first_name} ${targetUser.last_name}</p>
        <p style="margin: 5px 0;"><strong>${isNL ? 'E-mail' : 'Email'}:</strong> ${targetUser.email}</p>
        <p style="margin: 5px 0;"><strong>${isNL ? 'Rol' : 'Role'}:</strong> ${targetUser.role}</p>
        <p style="margin: 5px 0;"><strong>${isNL ? 'Positie' : 'Position'}:</strong> ${targetUser.position || 'N/A'}</p>
        <p style="margin: 5px 0;"><strong>${isNL ? 'Inlogtijd' : 'Login Time'}:</strong> ${new Date().toLocaleString(isNL ? 'nl-NL' : 'en-US')}</p>
      `, 'info')}

      <p style="margin: 15px 0;">
        ${isNL ? 
          'Dit is een automatische melding om u te informeren dat de gebruiker succesvol toegang heeft gekregen tot het systeem.' :
          'This is an automated notification to inform you that the user has successfully accessed the system.'
        }
      </p>

      ${this.generateButton(
        isNL ? '👤 Gebruiker Bekijken' : '👤 View User',
        dashboardUrl,
        'primary'
      )}

      <p style="margin: 15px 0; color: #64748b; font-size: 14px;">
        ${isNL ? 
          'Als u deze inlog niet verwachtte, neem dan contact op met de systeembeheerder.' :
          'If you did not expect this login, please contact the system administrator.'
        }
      </p>
    `;

    return await this.generateBaseTemplate(lang, {
      header: isNL ? 'Eerste Inlog Melding' : 'First Login Notification',
      content
    });
  }
}

// Export singleton instance
const emailTemplateGenerator = new EmailTemplateGenerator();
module.exports = { emailTemplateGenerator, EmailTemplateGenerator };