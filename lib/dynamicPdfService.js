/**
 * DynamicPdfService
 *
 * Handles configurable PDF generation based on workflow PDF output configurations.
 * Integrates with the existing quiz/workflow completion system to provide
 * dynamic template selection, data mapping, and recipient configuration.
 */

const fs = require('fs').promises;
const path = require('path');
const { PDFDocument } = require('pdf-lib');
const { unifiedEmailService } = require('./unifiedEmailService');

// Use the database compatibility layer
const supabase = require('./supabase');

class DynamicPdfService {
  constructor() {
    this.certificateBucket = 'certificates';
  }

  /**
   * Process workflow completion and generate configured PDFs
   * @param {string|number} userId - The user ID
   * @param {string|number} workflowId - The workflow ID (if available)
   * @param {string} triggerType - 'workflow_complete', 'quiz_complete', 'phase_complete', 'manual'
   * @param {Object} contextData - Additional context (phase, quiz results, etc.)
   * @returns {Array} - Array of generated PDF results
   */
  async processWorkflowTrigger(userId, workflowId = null, triggerType = 'workflow_complete', contextData = {}) {
    try {

      // 1. Find workflows with PDF output configurations for this trigger
      const workflowConfigs = await this.getWorkflowPdfConfigurations(workflowId, triggerType);

      if (!workflowConfigs || workflowConfigs.length === 0) {

        return [];
      } catch (error) { console.error(error); }
      // 2. Gather all data needed for PDF generation
      const userData = await this.getUserData(userId);
      const workflowData = await this.getWorkflowCompletionData(userId, workflowId);

      // 3. Generate PDFs for each configured template
      const results = [];
      for (const config of workflowConfigs) {
        try {
          const result = await this.generateConfiguredPdf(userData, workflowData, config, contextData);
          results.push(result);
        } catch (error) {
          // console.error(`Failed to generate PDF for config ${config.id}:`, error);
          results.push({
            success: false,
            configId: config.id,
            templateId: config.template_id,
            error: error.message
          });
        }
      }

      return results;
    } catch (error) {
      // console.error('Error processing workflow trigger:', error);
      throw error;
    }
  }

  /**
   * Get workflow PDF configurations for a specific trigger
   * @param {string|number} workflowId - The workflow ID
   * @param {string} triggerType - The trigger type
   * @returns {Array} - Workflow PDF configurations
   */
  async getWorkflowPdfConfigurations(workflowId, triggerType) {
    try {
      // For now, we'll look for workflows with PDF output enabled
      // In the future, this could be stored in a dedicated table

      let query = supabase
  // TODO: Implement storage.from('workflows')
        .select('id, name, config');

      if (workflowId) {
        query = query.eq('id', workflowId);
      } catch (error) { console.error(error); }
      const { data: workflows, error } = await query;

      if (error) {
        throw new Error(`Error fetching workflows: ${error.message}`);
      }

      // Filter workflows that have PDF output configured for this trigger
      const configuredWorkflows = [];

      for (const workflow of workflows || []) {
        const config = workflow.config;
        const pdfOutput = config?.pdf_output;

        if (pdfOutput?.enabled && pdfOutput?.templates) {
          // Find templates configured for this trigger type
          const matchingTemplates = pdfOutput.templates.filter(template =>
            template.enabled && template.trigger === triggerType
          );

          for (const template of matchingTemplates) {
            configuredWorkflows.push({
              id: `${workflow.id}-${template.id}`,
              workflow_id: workflow.id,
              workflow_name: workflow.name,
              template_id: template.template_id,
              trigger: template.trigger,
              data_mapping: template.data_mapping || {},
              recipients: template.recipients || pdfOutput.globalSettings?.recipients || {},
              email_delivery: pdfOutput.globalSettings?.emailDelivery !== false
            });
          }
        }
      }

      return configuredWorkflows;
    } catch (error) {
      // console.error('Error getting workflow PDF configurations:', error);
      throw error;
    }
  }

  /**
   * Get user data for PDF generation
   * @param {string|number} userId - The user ID
   * @returns {Object} - User data
   */
  async getUserData(userId) {
    try {
  // TODO: Implement storage.from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !user) {
        throw new Error(`User not found: ${error?.message || 'No user data returned'}`);
      }

      // Get manager data if available
      let managerData = null;
      if (user.manager_id) {
  // TODO: Implement storage.from('users')
          .select('first_name, last_name, email')
          .eq('id', user.manager_id)
          .single();
        managerData = manager;
      }

      return {
        ...user,
        manager: managerData
      };
    } catch (error) {
      // console.error(`Error fetching user data for ID ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get workflow completion data (quiz results, training sessions, etc.)
   * @param {string|number} userId - The user ID
   * @param {string|number} workflowId - The workflow ID
   * @returns {Object} - Workflow completion data
   */
  async getWorkflowCompletionData(userId, workflowId) {
    try {
      // Get quiz results
  // TODO: Implement storage.from('quiz_results')
        .select('*')
        .eq('user_id', userId)
        .order('phase');

      if (quizError) {

      } catch (error) { console.error(error); }
      // Get training sessions
  // TODO: Implement storage.from('training_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('phase');

      if (trainingError) {

      }

      // Get workflow instance data if workflowId is provided
      let workflowInstance = null;
      if (workflowId) {
  // TODO: Implement storage.from('workflow_instances')
          .select('*')
          .eq('id', workflowId)
          .eq('user_id', userId)
          .single();
        workflowInstance = instance;
      }

      return {
        quiz_results: quizResults || [],
        training_sessions: trainingSessions || [],
        workflow_instance: workflowInstance,
        completion_date: new Date().toISOString()
      };
    } catch (error) {
      // console.error('Error fetching workflow completion data:', error);
      throw error;
    }
  }

  /**
   * Generate PDF using configured template and data mapping
   * @param {Object} userData - User data
   * @param {Object} workflowData - Workflow completion data
   * @param {Object} config - PDF configuration
   * @param {Object} contextData - Additional context data
   * @returns {Object} - Generation result
   */
  async generateConfiguredPdf(userData, workflowData, config, contextData = {}) {
    try {

      // 1. Get template data
      const template = await this.getTemplate(config.template_id);

      // 2. Map data according to configuration
      const mappedData = this.mapDataToTemplate(userData, workflowData, config.data_mapping, contextData);

      // 3. Generate PDF
      const { pdfBytes, filename } = await this.generatePdfFromTemplate(template, mappedData);

      // 4. Store PDF
      const { storagePath, publicUrl } = await this.storePdf(userData.id, filename, pdfBytes);

      // 5. Create database record
      const pdfRecord = await this.createPdfRecord(userData.id, config, storagePath, mappedData);

      // 6. Send email if configured
      if (config.email_delivery) {
        await this.deliverPdf(userData, config, storagePath, mappedData);
      }

      return {
        success: true,
        configId: config.id,
        templateId: config.template_id,
        pdfId: pdfRecord.id,
        filename,
        url: publicUrl,
        emailSent: config.email_delivery
      };
    } catch (error) {
      // console.error('Error generating configured PDF:', error);
      throw error;
    }
  }

  /**
   * Get template data from database
   * @param {string|number} templateId - Template ID
   * @returns {Object} - Template data
   */
  async getTemplate(templateId) {
    try {
  // TODO: Implement storage.from('pdf_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (error || !template) {
        throw new Error(`Template not found: ${error?.message || 'No template data'}`);
      }

      return template;
    } catch (error) {
      // console.error(`Error fetching template ${templateId}:`, error);
      throw error;
    }
  }

  /**
   * Map user and workflow data to template fields
   * @param {Object} userData - User data
   * @param {Object} workflowData - Workflow data
   * @param {Object} dataMapping - Field mapping configuration
   * @param {Object} contextData - Additional context
   * @returns {Object} - Mapped data
   */
  mapDataToTemplate(userData, workflowData, dataMapping, contextData) {

    // Create a comprehensive data source
    const dataSource = {
      // User data
      'user.name': `${userData.first_name || ''} ${userData.last_name || ''}`.trim(),
      'user.email': userData.email,
      'user.employee_id': userData.employee_id,
      'user.department': userData.department,
      'user.position': userData.position,
      'user.vessel': userData.vessel_assignment,
      'user.boarding_date': userData.expected_boarding_date,

      // Manager data
      'manager.name': userData.manager ? `${userData.manager.first_name} ${userData.manager.last_name}` : '',
      'manager.email': userData.manager?.email || '',

      // Workflow data
      'workflow.name': contextData.workflowName || 'Maritime Onboarding',
      'workflow.description': contextData.workflowDescription || '',
      'workflow.completion_date': new Date().toLocaleDateString(),

      // Quiz results
      ...this.mapQuizResults(workflowData.quiz_results),

      // Phase data
      ...this.mapPhaseData(workflowData.training_sessions),

      // Certificate data
      'certificate.number': `BMS-${userData.id}-${Date.now()}`,
      'certificate.issue_date': new Date().toLocaleDateString(),
      'certificate.valid_until': new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString()
    };

    // Apply data mapping
    for (const [templateField, sourceField] of Object.entries(dataMapping)) {
      if (sourceField && dataSource[sourceField] !== undefined) {
        mappedData[templateField] = dataSource[sourceField];
      }
    }

    return mappedData;
  }

  /**
   * Map quiz results to data source format
   * @param {Array} quizResults - Quiz results
   * @returns {Object} - Mapped quiz data
   */
  mapQuizResults(quizResults) {
    const mapped = {};

    quizResults.forEach(result => {
      const phaseKey = `phase.${result.phase}`;
      mapped[`${phaseKey}.score`] = result.score;
      mapped[`${phaseKey}.total`] = result.total_questions || 10;
      mapped[`${phaseKey}.percentage`] = Math.round((result.score / (result.total_questions || 10)) * 100);
      mapped[`${phaseKey}.passed`] = result.passed ? 'Yes' : 'No';
      mapped[`quiz.${result.phase}.score`] = result.score;
      mapped[`quiz.${result.phase}.percentage`] = Math.round((result.score / (result.total_questions || 10)) * 100);
      mapped[`quiz.${result.phase}.passed`] = result.passed ? 'Yes' : 'No';
    });

    return mapped;
  }

  /**
   * Map training session data to data source format
   * @param {Array} trainingSessions - Training sessions
   * @returns {Object} - Mapped phase data
   */
  mapPhaseData(trainingSessions) {

    trainingSessions.forEach(session => {
      mapped[`${phaseKey}.completion_date`] = session.completed_at ?
        new Date(session.completed_at).toLocaleDateString() : 'Not Completed';
      mapped[`${phaseKey}.status`] = session.status;
    });

    return mapped;
  }

  /**
   * Generate PDF from template and mapped data
   * @param {Object} template - Template data
   * @param {Object} mappedData - Mapped field data
   * @returns {Object} - PDF bytes and filename
   */
  async generatePdfFromTemplate(template, mappedData) {
    try {
      // For now, create a simple PDF with the mapped data
      // In a full implementation, this would use the actual template file
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage();
      const { width, height } = page.getSize();

      // Add title
      page.drawText(template.name || 'Generated Certificate', {
        x: 50,
        y: height - 50,
        size: 18
      });

      // Add mapped data
      let yPos = height - 100;
      for (const [field, value] of Object.entries(mappedData)) {
        if (yPos < 50) break; // Don't overflow page

        page.drawText(`${field}: ${value}`, {
          x: 50,
          y: yPos,
          size: 12
        });
        yPos -= 20;
      }


      return { pdfBytes, filename };
    } catch (error) {
      // console.error('Error generating PDF from template:', error);
      throw error;
    }
  }

  /**
   * Store PDF in Supabase Storage
   * @param {string|number} userId - User ID
   * @param {string} filename - PDF filename
   * @param {Buffer} pdfBytes - PDF data
   * @returns {Object} - Storage path and public URL
   */
  async storePdf(userId, filename, pdfBytes) {
    try {

      // await // TODO: Replace with MinIO storage
      //         .from(this.certificateBucket)
  // TODO: Implement storage.upload(storagePath, pdfBytes, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (error) {
        throw new Error(`Storage upload error: ${error.message}`);
      }
  // TODO: Implement storage.from(this.certificateBucket)
  // TODO: Implement storage.getPublicUrl(storagePath);

      return { storagePath, publicUrl: urlData.publicUrl };
    } catch (error) {
      // console.error('Error storing PDF:', error);
      throw error;
    }
  }

  /**
   * Create PDF generation record in database
   * @param {string|number} userId - User ID
   * @param {Object} config - PDF configuration
   * @param {string} storagePath - Storage path
   * @param {Object} mappedData - Mapped data
   * @returns {Object} - Created record
   */
  async createPdfRecord(userId, config, storagePath, mappedData) {
    try {
  // TODO: Implement storage.from('certificates')
        .insert({
          user_id: userId,
          certificate_type: `Dynamic PDF - ${config.workflow_name}`,
          certificate_number: mappedData['certificate.number'] || `DYN-${Date.now()}`,
          issue_date: new Date().toISOString().split('T')[0],
          expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          issuing_authority: 'Maritime Onboarding Platform',
          file_path: storagePath,
          verified: true,
          metadata: {
            workflow_id: config.workflow_id,
            template_id: config.template_id,
            trigger: config.trigger,
            mapped_data: mappedData,
            generation_type: 'dynamic_pdf_system'
          }
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Error creating PDF record: ${error.message}`);
      }

      return record;
    } catch (error) {
      // console.error('Error creating PDF record:', error);
      throw error;
    }
  }

  /**
   * Deliver PDF via email according to configuration
   * @param {Object} userData - User data
   * @param {Object} config - PDF configuration
   * @param {string} storagePath - Storage path
   * @param {Object} mappedData - Mapped data
   * @returns {Object} - Email delivery result
   */
  async deliverPdf(userData, config, storagePath, mappedData) {
    try {
      // Download PDF for email attachment
      // await // TODO: Replace with MinIO storage
      //         .from(this.certificateBucket)
  // TODO: Implement storage.download(storagePath);

      if (error) {
        throw new Error(`Storage download error: ${error.message}`);
      }

      const tempFilePath = path.join(__dirname, '..', 'temp', `temp_dynamic_${Date.now()}.pdf`);

      // Ensure temp directory exists
      await fs.mkdir(path.dirname(tempFilePath), { recursive: true });
      await fs.writeFile(tempFilePath, Buffer.from(pdfBytes));

      // Send email based on recipient configuration
      const recipients = config.recipients || {};
      const emailPromises = [];

      if (recipients.user) {
        emailPromises.push(
          unifiedEmailService.sendCompletionCertificateEmail(userData.id, tempFilePath)
        );
      }

      // Add custom recipients
      if (recipients.custom && recipients.custom.length > 0) {
        for (const email of recipients.custom) {
          emailPromises.push(
            unifiedEmailService.sendCustomPdfEmail(email, tempFilePath, mappedData)
          );
        }
      }


      // Clean up temp file
      await fs.unlink(tempFilePath).catch(err => {

      });

      return {
        success: true,
        emailsSent: results.filter(r => r.status === 'fulfilled').length,
        errors: results.filter(r => r.status === 'rejected').map(r => r.reason)
      };
    } catch (error) {
      // console.error('Error delivering PDF:', error);
      throw error;
    }
  }
}

module.exports = new DynamicPdfService();
