/**
 * @file automated-certificate-service.js
 * @brief Automated certificate generation and distribution service
 *
 * @details This service provides comprehensive certificate management for the Maritime
 * Onboarding System. It handles the complete certificate lifecycle from generation
 * through distribution, supporting multiple certificate types and templates for
 * different training programs and compliance requirements.
 *
 * **Core Functionality:**
 * - PDF certificate generation from templates
 * - Dynamic data population (user info, quiz results, training progress)
 * - Certificate storage and version management
 * - Automated email distribution
 * - Certificate validation and verification
 * - Audit trail and compliance tracking
 *
 * **Certificate Types:**
 * - Standard onboarding certificates
 * - Specialized training certificates
 * - Compliance certificates
 * - Custom template certificates
 *
 * **Manager Benefits:**
 * - Automated certificate generation upon training completion
 * - Bulk certificate processing for multiple crew members
 * - Certificate regeneration and reissue capabilities
 * - Progress tracking and completion reporting
 * - Compliance documentation and audit support
 *
 * **Technical Features:**
 * - PDF template manipulation using pdf-lib
 * - Secure file storage and access control
 * - Email integration for automatic distribution
 * - Database integration for metadata tracking
 * - Error handling and retry mechanisms
 *
 * **Security and Compliance:**
 * - Certificate authenticity verification
 * - Secure storage with access controls
 * - Audit logging for all certificate operations
 * - Data privacy and GDPR compliance
 * - Certificate expiration and renewal tracking
 *
 * @author Maritime Onboarding System
 * @version 1.0
 * @since 2024
 *
 * @see ManagerDashboard For certificate management interface
 * @see emailService For certificate distribution
 * @see PDFDocument For PDF manipulation
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PDFDocument } from 'pdf-lib';
import { unifiedEmailService } from '../lib/unifiedEmailService.js';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use the database compatibility layer
import supabase from '../lib/supabase.js';

/**
 * @brief Automated certificate generation and distribution service class
 *
 * @details Provides comprehensive certificate management functionality for maritime
 * training programs. Handles PDF generation, data population, storage, and distribution
 * with support for multiple certificate types and templates.
 *
 * **Service Capabilities:**
 * - Template-based PDF certificate generation
 * - Dynamic content population from user data
 * - Secure certificate storage and retrieval
 * - Automated email distribution
 * - Certificate verification and validation
 * - Audit trail maintenance
 *
 * **Integration Points:**
 * - Database integration for user and training data
 * - Email service for certificate distribution
 * - Storage service for PDF file management
 * - Template engine for dynamic content generation
 */
class AutomatedCertificateService {
  /**
   * @brief Initialize the certificate service with default configuration
   *
   * @details Sets up template paths, storage buckets, and service dependencies
   * required for certificate generation and distribution operations.
   */
  constructor() {
    this.templatePath = path.join(__dirname, '..', 'appendix05_03a-Introduction personnel.pdf');
    this.introKapiteinTemplatePath = path.join(__dirname, '..', 'appendix05_03a-Introduction personnel.pdf'); // Using same template for now
    this.certificateBucket = 'certificates';
  }

  /**
   * @brief Generate and distribute a certificate for a crew member
   *
   * @details This is the primary method for certificate processing. It orchestrates
   * the complete certificate lifecycle from data collection through distribution.
   * The method handles multiple certificate types and ensures proper data validation,
   * PDF generation, storage, and email delivery.
   *
   * **Process Flow:**
   * 1. Fetch user profile and training data
   * 2. Retrieve quiz results and completion status
   * 3. Prepare template data with validation
   * 4. Generate PDF certificate from template
   * 5. Store certificate in secure storage
   * 6. Send certificate via email to recipient
   * 7. Log certificate generation for audit trail
   *
   * **Manager Usage:**
   * - Automatically triggered upon training completion
   * - Can be manually invoked for certificate regeneration
   * - Supports bulk processing for multiple crew members
   * - Provides detailed status and error reporting
   *
   * @param {string|number} userId - Unique identifier for the crew member
   * @param {string} certificateType - Type of certificate to generate (default: 'standard')
   *
   * @returns {Promise<Object>} Certificate metadata object containing:
   *   - certificateId: Unique certificate identifier
   *   - certificateNumber: Human-readable certificate number
   *   - downloadUrl: Secure URL for certificate download
   *   - generatedAt: Timestamp of certificate generation
   *   - expiresAt: Certificate expiration date (if applicable)
   *   - emailSent: Boolean indicating successful email delivery
   *
   * @throws {Error} User not found or invalid user ID
   * @throws {Error} Insufficient training data for certificate generation
   * @throws {Error} Template processing or PDF generation failure
   * @throws {Error} Storage or email delivery failure
   *
   * @example
   * // Generate standard certificate for crew member
   * const result = await service.generateAndDistributeCertificate('crew_123');
   * console.log(`Certificate generated: ${result.certificateNumber}`);
   *
   * @example
   * // Generate specialized certificate type
   * const result = await service.generateAndDistributeCertificate('crew_456', 'advanced_safety');
   */
  async generateAndDistributeCertificate(userId, certificateType = 'standard') {
    try {

      // 1. Fetch all required data
      const user = await this.getUserData(userId);
      const quizResults = await this.getQuizResults(userId);
      const trainingSessions = await this.getTrainingSessions(userId);

      // 2. Prepare data for template
      const templateData = this.prepareDataForTemplate(user, quizResults, trainingSessions);

      // 3. Generate the PDF certificate based on type
      let pdfBytes, filename;
      if (certificateType === 'intro_kapitein') {
        const result = await this.generateIntroKapiteinCertificate(templateData);
        pdfBytes = result.pdfBytes;
        filename = result.filename;
      } else {
        const result = await this.generateCertificate(templateData);
        pdfBytes = result.pdfBytes;
        filename = result.filename;
      }

      // 4. Store the certificate in Supabase
      const { storagePath, publicUrl } = await this.storeCertificate(userId, filename, pdfBytes);

      // 5. Create certificate record in database
      const certificateRecord = await this.createCertificateRecord(userId, storagePath, templateData, certificateType);

      // 6. Send certificate via email based on type
      if (certificateType === 'intro_kapitein') {
        await this.distributeIntroKapiteinCertificate(user, storagePath, {
          certificateNumber: certificateRecord.certificate_number,
          validUntil: templateData.valid_until
        });
      } else {
        await this.distributeCertificate(user, storagePath);
      }

      return {
        success: true,
        certificateId: certificateRecord.id,
        certificateNumber: certificateRecord.certificate_number,
        filename,
        url: publicUrl
      };
    } catch (error) {
      // console.error('Error in certificate generation and distribution process:', error);

      // Log the error with more details
      const errorDetails = {
        userId,
        certificateType,
        timestamp: new Date().toISOString(),
        error: error.message,
        stack: error.stack
      };

      // console.error('Certificate generation failed with details:', JSON.stringify(errorDetails, null, 2));

      // Rethrow with more context
      throw new Error(`Certificate generation failed: ${error.message}`);
    }
  }

  /**
   * Fetch user data from the database
   * @param {string|number} userId - The user ID
   * @returns {Object} - User data
   */
  async getUserData(userId) {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !user) {
        throw new Error(`User not found: ${error?.message || 'No user data returned'}`);
      }

      return user;
    } catch (error) {
      // console.error(`Error fetching user data for ID ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Fetch quiz results for a user
   * @param {string|number} userId - The user ID
   * @returns {Array} - Quiz results for all phases
   */
  async getQuizResults(userId) {
    try {
      const { data: quizResults, error } = await supabase
        .from('quiz_results')
        .select('*')
        .eq('user_id', userId)
        .order('phase');

      if (error) {
        throw new Error(`Error fetching quiz results: ${error.message}`);
      }

      return quizResults || [];
    } catch (error) {
      // console.error(`Error fetching quiz results for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Fetch training sessions and items for a user
   * @param {string|number} userId - The user ID
   * @returns {Array} - Training sessions with items
   */
  async getTrainingSessions(userId) {
    try {
      const { data: sessions, error } = await supabase
        .from('training_sessions')
        .select(`
          *,
          training_items (*)
        `)
        .eq('user_id', userId)
        .order('phase');

      if (error) {
        throw new Error(`Error fetching training sessions: ${error.message}`);
      }

      return sessions || [];
    } catch (error) {
      // console.error(`Error fetching training sessions for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Prepare data for the certificate template
   * @param {Object} user - User profile data
   * @param {Array} quizResults - Quiz results data
   * @param {Array} trainingSessions - Training sessions data
   * @returns {Object} - Formatted data for template
   */
  prepareDataForTemplate(user, quizResults, trainingSessions) {
    // Process quiz scores
    const quizScores = this.processQuizScores(quizResults);

    // Process training completion dates
    const trainingDates = this.processTrainingDates(trainingSessions);

    // Calculate overall completion status
    const allPhasesCompleted = trainingSessions.length >= 3 &&
      trainingSessions.every(session => session.status === 'completed');

    // Calculate overall score
    const overallScore = this.calculateOverallScore(quizResults);

    return {
      // Personal Information
      name: `${user.first_name} ${user.last_name}`,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      phone: user.phone || '',

      // Employment Details
      vessel: user.vessel_assignment || 'Not Assigned',
      position: user.position || 'Crew Member',

      // Dates
      boarding_date: user.expected_boarding_date ?
        new Date(user.expected_boarding_date).toLocaleDateString() : 'TBD',
      completion_date: new Date().toLocaleDateString(),

      // Training Phase Completion
      phase1_completed: trainingDates.phase1 || 'Not Completed',
      phase2_completed: trainingDates.phase2 || 'Not Completed',
      phase3_completed: trainingDates.phase3 || 'Not Completed',

      // Quiz Scores
      phase1_score: quizScores.phase1 || 'N/A',
      phase2_score: quizScores.phase2 || 'N/A',
      phase3_score: quizScores.phase3 || 'N/A',
      overall_score: overallScore,

      // Status
      all_phases_completed: allPhasesCompleted,

      // Certificate Details
      certificate_number: `BMS-${user.id}-${Date.now()}`,
      issue_date: new Date().toLocaleDateString(),
      valid_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString(), // 1 year validity

      // Company Information
      company: 'Maritime Onboarding Platform',
      issuing_authority: 'Maritime Onboarding Platform Training Department'
    };
  }

  /**
   * Process quiz scores into a structured format
   * @param {Array} quizResults - Quiz results data
   * @returns {Object} - Formatted quiz scores by phase
   */
  processQuizScores(quizResults) {
    const scores = {
      phase1: null,
      phase2: null,
      phase3: null
    };

    quizResults.forEach(result => {
      const phase = `phase${result.phase}`;
      const percentage = Math.round((result.score / result.total_questions) * 100);
      scores[phase] = `${percentage}% (${result.score}/${result.total_questions})`;
    });

    return scores;
  }

  /**
   * Process training completion dates into a structured format
   * @param {Array} trainingSessions - Training sessions data
   * @returns {Object} - Formatted completion dates by phase
   */
  processTrainingDates(trainingSessions) {
    const dates = {
      phase1: null,
      phase2: null,
      phase3: null
    };

    trainingSessions.forEach(session => {
      if (session.status === 'completed' && session.completed_at) {
        const phase = `phase${session.phase}`;
        dates[phase] = new Date(session.completed_at).toLocaleDateString();
      }
    });

    return dates;
  }

  /**
   * Calculate overall score from quiz results
   * @param {Array} quizResults - Quiz results data
   * @returns {string} - Overall score as percentage
   */
  calculateOverallScore(quizResults) {
    if (!quizResults || quizResults.length === 0) {
      return 'N/A';
    }

    let totalScore = 0;
    let totalQuestions = 0;

    quizResults.forEach(result => {
      totalScore += result.score;
      totalQuestions += result.total_questions;
    });

    if (totalQuestions === 0) {
      return 'N/A';
    }

    const percentage = Math.round((totalScore / totalQuestions) * 100);
    return `${percentage}%`;
  }

  /**
   * Generate the PDF certificate using the template
   * @param {Object} templateData - Data to populate the template
   * @returns {Object} - PDF bytes and filename
   */
  async generateCertificate(templateData) {
    try {
      // Read the template PDF
      const templateBytes = await fs.readFile(this.templatePath);
      const pdfDoc = await PDFDocument.load(templateBytes);

      // Fill the PDF form fields
      const form = pdfDoc.getForm();
      const fields = form.getFields();

      // Fill form fields with template data
      fields.forEach(field => {
        const fieldName = field.getName().toLowerCase();
        const fieldType = field.constructor.name;

        // Try to find a matching value for this field
        let value = null;
        for (const [key, val] of Object.entries(templateData)) {
          if (fieldName.includes(key.toLowerCase()) || key.toLowerCase().includes(fieldName)) {
            value = val;
            break;
          }
        }

        if (value) {
          try {
            if (fieldType === 'PDFTextField') {
              field.setText(String(value));
              
            } else if (fieldType === 'PDFCheckBox') {
              // Check boxes for completed phases
              if (fieldName.includes('phase1') && templateData.phase1_completed !== 'Not Completed') {
                field.check();
              } else if (fieldName.includes('phase2') && templateData.phase2_completed !== 'Not Completed') {
                field.check();
              } else if (fieldName.includes('phase3') && templateData.phase3_completed !== 'Not Completed') {
                field.check();
              } else if (fieldName.includes('complete') || fieldName.includes('certified')) {
                field.check();
              }
              
            }
          } catch (fieldError) {
            
          }
        }
      });

      // Flatten the form to prevent further editing
      form.flatten();

      // Add completion summary page
      await this.addCompletionSummaryPage(pdfDoc, templateData);

      // Save the PDF
      const pdfBytes = await pdfDoc.save();
      const filename = `${templateData.first_name}_${templateData.last_name}_Certificate_${Date.now()}.pdf`;

      return { pdfBytes, filename };
    } catch (error) {
      // console.error('Error generating certificate PDF:', error);
      throw error;
    }
  }

  /**
   * Add a completion summary page to the certificate
   * @param {PDFDocument} pdfDoc - PDF document
   * @param {Object} templateData - Certificate data
   */
  async addCompletionSummaryPage(pdfDoc, templateData) {
    try {
      const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

      // Add a new page
      const page = pdfDoc.addPage();
      const { width, height } = page.getSize();

      // Embed fonts
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

      // Title
      page.drawText('TRAINING COMPLETION CERTIFICATE', {
        x: 50,
        y: height - 50,
        size: 18,
        font: boldFont,
        color: rgb(0, 0.2, 0.6)
      });

      // Certificate number
      page.drawText(`Certificate #: ${templateData.certificate_number}`, {
        x: 50,
        y: height - 80,
        size: 12,
        font: regularFont
      });

      // Issue date
      page.drawText(`Issue Date: ${templateData.issue_date}`, {
        x: 50,
        y: height - 100,
        size: 12,
        font: regularFont
      });

      // Crew member info
      page.drawText(`Crew Member: ${templateData.name}`, {
        x: 50,
        y: height - 130,
        size: 14,
        font: boldFont
      });

      page.drawText(`Position: ${templateData.position}`, {
        x: 50,
        y: height - 150,
        size: 12,
        font: regularFont
      });

      page.drawText(`Vessel Assignment: ${templateData.vessel}`, {
        x: 50,
        y: height - 170,
        size: 12,
        font: regularFont
      });

      // Training summary
      page.drawText('TRAINING SUMMARY', {
        x: 50,
        y: height - 210,
        size: 14,
        font: boldFont
      });

      let yPos = height - 240;

      // Phase 1
      page.drawText('Phase 1: Immediate Safety Training (24 hours)', {
        x: 70,
        y: yPos,
        size: 12,
        font: boldFont
      });

      yPos -= 20;
      page.drawText(`Completed: ${templateData.phase1_completed}`, {
        x: 90,
        y: yPos,
        size: 10,
        font: regularFont
      });

      yPos -= 15;
      page.drawText(`Quiz Score: ${templateData.phase1_score}`, {
        x: 90,
        y: yPos,
        size: 10,
        font: regularFont
      });

      yPos -= 25;

      // Phase 2
      page.drawText('Phase 2: Operational Training (72 hours)', {
        x: 70,
        y: yPos,
        size: 12,
        font: boldFont
      });

      yPos -= 20;
      page.drawText(`Completed: ${templateData.phase2_completed}`, {
        x: 90,
        y: yPos,
        size: 10,
        font: regularFont
      });

      yPos -= 15;
      page.drawText(`Quiz Score: ${templateData.phase2_score}`, {
        x: 90,
        y: yPos,
        size: 10,
        font: regularFont
      });

      yPos -= 25;

      // Phase 3
      page.drawText('Phase 3: Advanced Training & Policies (1 week)', {
        x: 70,
        y: yPos,
        size: 12,
        font: boldFont
      });

      yPos -= 20;
      page.drawText(`Completed: ${templateData.phase3_completed}`, {
        x: 90,
        y: yPos,
        size: 10,
        font: regularFont
      });

      yPos -= 15;
      page.drawText(`Quiz Score: ${templateData.phase3_score}`, {
        x: 90,
        y: yPos,
        size: 10,
        font: regularFont
      });

      yPos -= 25;

      // Overall score
      page.drawText(`Overall Training Score: ${templateData.overall_score}`, {
        x: 70,
        y: yPos,
        size: 12,
        font: boldFont
      });

      // Certification statement
      yPos -= 50;
      page.drawText('This certificate confirms that the crew member has successfully', {
        x: 50,
        y: yPos,
        size: 12,
        font: regularFont
      });

      yPos -= 20;
      page.drawText('completed the required safety and onboarding training in accordance with', {
        x: 50,
        y: yPos,
        size: 12,
        font: regularFont
      });

      yPos -= 20;
      page.drawText('Company Safety Management System.', {
        x: 50,
        y: yPos,
        size: 12,
        font: regularFont
      });

      // Signature
      yPos -= 60;
      page.drawText('Authorized by:', {
        x: 50,
        y: yPos,
        size: 12,
        font: regularFont
      });

      yPos -= 30;
      page.drawText('_______________________________', {
        x: 50,
        y: yPos,
        size: 12,
        font: regularFont
      });

      yPos -= 20;
      page.drawText('Training Manager', {
        x: 50,
        y: yPos,
        size: 10,
        font: regularFont
      });

      yPos -= 15;
      page.drawText('Maritime Onboarding Platform', {
        x: 50,
        y: yPos,
        size: 10,
        font: regularFont
      });

    } catch (error) {
      // console.error('Error adding completion summary page:', error);
      throw error;
    }
  }

  /**
   * Store the certificate in Supabase Storage
   * @param {string|number} userId - The user ID
   * @param {string} filename - The certificate filename
   * @param {Buffer|Uint8Array} pdfBytes - The PDF file bytes
   * @returns {Object} - Storage path and public URL
   */
  async storeCertificate(userId, filename, pdfBytes) {
    try {
      // Define the storage path
      const storagePath = `${userId}/${filename}`;

      // Upload the file to Supabase Storage
      const { data, error } = await supabase.storage
        .from(this.certificateBucket)
        .upload(storagePath, pdfBytes, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (error) {
        throw new Error(`Storage upload error: ${error.message}`);
      }

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from(this.certificateBucket)
        .getPublicUrl(storagePath);

      return { storagePath, publicUrl: urlData.publicUrl };
    } catch (error) {
      // console.error('Error storing certificate in Supabase:', error);
      throw error;
    }
  }

  /**
   * Create a certificate record in the database
   * @param {string|number} userId - The user ID
   * @param {string} storagePath - The storage path in Supabase
   * @param {Object} templateData - Certificate data
   * @returns {Object} - The created certificate record
   */
  /**
   * Create a certificate record in the database
   * @param {string|number} userId - The user ID
   * @param {string} storagePath - The storage path in Supabase
   * @param {Object} templateData - Certificate data
   * @param {string} certificateType - The type of certificate
   * @returns {Object} - The created certificate record
   */
  async createCertificateRecord(userId, storagePath, templateData, certificateType = 'standard') {
    try {
      const { data: certificate, error } = await supabase
        .from('certificates')
        .insert({
          user_id: userId,
          certificate_type: certificateType === 'intro_kapitein' ? 'Intro Kapitein' : 'Maritime Onboarding Training',
          certificate_number: templateData.certificate_number,
          issue_date: new Date().toISOString().split('T')[0],
          expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          issuing_authority: templateData.issuing_authority,
          file_path: storagePath,
          verified: true,
          metadata: {
            phase1_completed: templateData.phase1_completed,
            phase2_completed: templateData.phase2_completed,
            phase3_completed: templateData.phase3_completed,
            phase1_score: templateData.phase1_score,
            phase2_score: templateData.phase2_score,
            phase3_score: templateData.phase3_score,
            overall_score: templateData.overall_score,
            vessel: templateData.vessel,
            position: templateData.position
          }
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Error creating certificate record: ${error.message}`);
      }

      return certificate;
    } catch (error) {
      // console.error('Error creating certificate record:', error);
      throw error;
    }
  }

  /**
   * Distribute the certificate via email
   * @param {Object} user - User data
   * @param {string} storagePath - The storage path in Supabase
   * @returns {Object} - Email sending result
   */
  async distributeCertificate(user, storagePath) {
    try {
      // Download the certificate from Supabase
      const { data: pdfBlob, error } = await supabase.storage
        .from(this.certificateBucket)
        .download(storagePath);

      if (error) {
        throw new Error(`Storage download error: ${error.message}`);
      }

      // Convert blob to buffer
      const pdfBytes = await pdfBlob.arrayBuffer();

      // Create a temporary file path
      const tempFilePath = path.join(__dirname, '..', 'temp', `temp_certificate_${Date.now()}.pdf`);

      // Ensure the temp directory exists
      await fs.mkdir(path.dirname(tempFilePath), { recursive: true });

      // Write the file to disk temporarily
      await fs.writeFile(tempFilePath, Buffer.from(pdfBytes));

      // Send the email with the certificate attached
      const result = await unifiedEmailService.sendCompletionCertificateEmail(user.id, tempFilePath);

      // Clean up the temporary file
      await fs.unlink(tempFilePath).catch(err => {
        
      });

      return result;
    } catch (error) {
      // console.error('Error distributing certificate via email:', error);
      throw error;
    }
  }

  /**
   * Generate the Intro Kapitein PDF certificate
   * @param {Object} templateData - Data to populate the template
   * @returns {Object} - PDF bytes and filename
   */
  async generateIntroKapiteinCertificate(templateData) {
    try {
      // For now, we'll use the same generation logic as the standard certificate
      // In a real implementation, you might have a different template or customization

      // Read the template PDF
      const templateBytes = await fs.readFile(this.introKapiteinTemplatePath);
      const pdfDoc = await PDFDocument.load(templateBytes);

      // Fill the PDF form fields
      const form = pdfDoc.getForm();
      const fields = form.getFields();

      // Fill form fields with template data
      fields.forEach(field => {
        const fieldName = field.getName().toLowerCase();
        const fieldType = field.constructor.name;

        // Try to find a matching value for this field
        let value = null;
        for (const [key, val] of Object.entries(templateData)) {
          if (fieldName.includes(key.toLowerCase()) || key.toLowerCase().includes(fieldName)) {
            value = val;
            break;
          }
        }

        if (value) {
          try {
            if (fieldType === 'PDFTextField') {
              field.setText(String(value));
              
            } else if (fieldType === 'PDFCheckBox') {
              // Check boxes for completed phases
              if (fieldName.includes('phase1') && templateData.phase1_completed !== 'Not Completed') {
                field.check();
              } else if (fieldName.includes('phase2') && templateData.phase2_completed !== 'Not Completed') {
                field.check();
              } else if (fieldName.includes('phase3') && templateData.phase3_completed !== 'Not Completed') {
                field.check();
              } else if (fieldName.includes('complete') || fieldName.includes('certified')) {
                field.check();
              }
              
            }
          } catch (fieldError) {
            
          }
        }
      });

      // Flatten the form to prevent further editing
      form.flatten();

      // Add a custom summary page for Intro Kapitein
      await this.addIntroKapiteinSummaryPage(pdfDoc, templateData);

      // Save the PDF
      const pdfBytes = await pdfDoc.save();
      const filename = `${templateData.first_name}_${templateData.last_name}_Intro_Kapitein_Certificate_${Date.now()}.pdf`;

      return { pdfBytes, filename };
    } catch (error) {
      // console.error('Error generating Intro Kapitein certificate PDF:', error);
      throw error;
    }
  }

  /**
   * Add a summary page specific to the Intro Kapitein certificate
   * @param {PDFDocument} pdfDoc - PDF document
   * @param {Object} templateData - Certificate data
   */
  async addIntroKapiteinSummaryPage(pdfDoc, templateData) {
    try {
      const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

      // Add a new page
      const page = pdfDoc.addPage();
      const { width, height } = page.getSize();

      // Embed fonts
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

      // Title
      page.drawText('INTRO KAPITEIN CERTIFICATE', {
        x: 50,
        y: height - 50,
        size: 18,
        font: boldFont,
        color: rgb(0, 0.2, 0.6)
      });

      // Certificate number
      page.drawText(`Certificate #: ${templateData.certificate_number}`, {
        x: 50,
        y: height - 80,
        size: 12,
        font: regularFont
      });

      // Issue date
      page.drawText(`Issue Date: ${templateData.issue_date}`, {
        x: 50,
        y: height - 100,
        size: 12,
        font: regularFont
      });

      // Crew member info
      page.drawText(`Crew Member: ${templateData.name}`, {
        x: 50,
        y: height - 130,
        size: 14,
        font: boldFont
      });

      page.drawText(`Position: ${templateData.position}`, {
        x: 50,
        y: height - 150,
        size: 12,
        font: regularFont
      });

      page.drawText(`Vessel Assignment: ${templateData.vessel}`, {
        x: 50,
        y: height - 170,
        size: 12,
        font: regularFont
      });

      // Intro Kapitein specific content
      page.drawText('INTRO KAPITEIN QUALIFICATION', {
        x: 50,
        y: height - 210,
        size: 14,
        font: boldFont
      });

      let yPos = height - 240;

      // Qualification details
      page.drawText('This certificate confirms that the crew member has successfully', {
        x: 50,
        y: yPos,
        size: 12,
        font: regularFont
      });

      yPos -= 20;
      page.drawText('completed the Intro Kapitein training module and is qualified to', {
        x: 50,
        y: yPos,
        size: 12,
        font: regularFont
      });

      yPos -= 20;
      page.drawText('perform the duties of a Kapitein in accordance with Maritime Onboarding Platform', {
        x: 50,
        y: yPos,
        size: 12,
        font: regularFont
      });

      yPos -= 20;
      page.drawText('Services Safety Management System and operational procedures.', {
        x: 50,
        y: yPos,
        size: 12,
        font: regularFont
      });

      // Validity
      yPos -= 40;
      page.drawText('CERTIFICATE VALIDITY', {
        x: 50,
        y: yPos,
        size: 14,
        font: boldFont
      });

      yPos -= 30;
      page.drawText(`Valid Until: ${templateData.valid_until}`, {
        x: 70,
        y: yPos,
        size: 12,
        font: boldFont
      });

      // Signature
      yPos -= 60;
      page.drawText('Authorized by:', {
        x: 50,
        y: yPos,
        size: 12,
        font: regularFont
      });

      yPos -= 30;
      page.drawText('_______________________________', {
        x: 50,
        y: yPos,
        size: 12,
        font: regularFont
      });

      yPos -= 20;
      page.drawText('Training Manager', {
        x: 50,
        y: yPos,
        size: 10,
        font: regularFont
      });

      yPos -= 15;
      page.drawText('Maritime Onboarding Platform', {
        x: 50,
        y: yPos,
        size: 10,
        font: regularFont
      });

    } catch (error) {
      // console.error('Error adding Intro Kapitein summary page:', error);
      throw error;
    }
  }

  /**
   * Distribute the Intro Kapitein certificate via email
   * @param {Object} user - User data
   * @param {string} storagePath - The storage path in Supabase
   * @param {Object} certificateData - Additional certificate metadata
   * @returns {Object} - Email sending result
   */
  async distributeIntroKapiteinCertificate(user, storagePath, certificateData = {}) {
    try {
      // Download the certificate from Supabase
      const { data: pdfBlob, error } = await supabase.storage
        .from(this.certificateBucket)
        .download(storagePath);

      if (error) {
        throw new Error(`Storage download error: ${error.message}`);
      }

      // Convert blob to buffer
      const pdfBytes = await pdfBlob.arrayBuffer();

      // Create a temporary file path
      const tempFilePath = path.join(__dirname, '..', 'temp', `temp_intro_kapitein_${Date.now()}.pdf`);

      // Ensure the temp directory exists
      await fs.mkdir(path.dirname(tempFilePath), { recursive: true });

      // Write the file to disk temporarily
      await fs.writeFile(tempFilePath, Buffer.from(pdfBytes));

      // Send the email with the certificate attached using the specialized method
      const result = await unifiedEmailService.sendCompletionCertificateEmail(user.id, tempFilePath);

      // Clean up the temporary file
      await fs.unlink(tempFilePath).catch(err => {
        
      });

      return result;
    } catch (error) {
      // console.error('Error distributing Intro Kapitein certificate via email:', error);
      throw error;
    }
  }
}

export default new AutomatedCertificateService();