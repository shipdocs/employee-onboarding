// lib/email.js - Email service wrapper for backward compatibility
// This file provides a unified interface for email functionality

const { unifiedEmailService } = require('./unifiedEmailService');
// const emailService = require('./emailService'); // DEPRECATED - Use unifiedEmailService

/**
 * EmailService class for backward compatibility
 * Wraps the unified email service and legacy email functions
 */
class EmailService {
  /**
   * Send completion certificate email
   * @param {Object} user - User data
   * @param {string} certificatePath - Path to certificate file
   */
  static async sendCompletionCertificate(user, certificatePath) {
    try {
      // Use the unified email service for sending completion certificates
      return await unifiedEmailService.sendCompletionCertificate(user, certificatePath);
    } catch (error) {
      console.error('Error sending completion certificate:', error);
      throw error;
    }
  }

  /**
   * Send email with attachments
   * @param {Object} emailData - Email data
   */
  static async sendEmailWithAttachments(emailData) {
    console.warn('⚠️  sendEmailWithAttachments is deprecated. Use unifiedEmailService.factory.sendEmail() instead.');
    return await unifiedEmailService.factory.sendEmail(emailData);
  }

  /**
   * Send manager magic link email
   * @param {Object} emailData - Email data
   */
  static async sendManagerMagicLinkEmail(emailData) {
    console.warn('⚠️  sendManagerMagicLinkEmail is deprecated. Use unifiedEmailService.sendManagerMagicLinkEmail() instead.');
    return await unifiedEmailService.sendManagerMagicLinkEmail(emailData.userId, emailData.token);
  }

  /**
   * Send crew magic link email
   * @param {Object} emailData - Email data
   */
  static async sendCrewMagicLinkEmail(emailData) {
    console.warn('⚠️  sendCrewMagicLinkEmail is deprecated. Use unifiedEmailService.sendCrewMagicLinkEmail() instead.');
    return await unifiedEmailService.sendCrewMagicLinkEmail(emailData.userId, emailData.token);
  }

  /**
   * Send welcome email
   * @param {Object} emailData - Email data
   */
  static async sendWelcomeEmail(emailData) {
    console.warn('⚠️  sendWelcomeEmail is deprecated. Use unifiedEmailService.sendWelcomeEmail() instead.');
    return await unifiedEmailService.sendWelcomeEmail(emailData);
  }

  /**
   * Generic send email method
   * @param {Object} emailData - Email data
   */
  static async sendEmail(emailData) {
    return await unifiedEmailService.sendEmail(emailData);
  }
}

module.exports = { EmailService };
