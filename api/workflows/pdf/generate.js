const db = require('../../../lib/database');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const { requireAuth } = require('../../../lib/auth.js');
const fs = require('fs');
const path = require('path');
const { apiRateLimit } = require('../../../lib/rateLimit');
const { handleErrorAndRespond, createSimpleError } = require('../../../lib/security/secureErrorHandlerHelper');

/**
 * Workflow PDF Generation API
 * Generates PDFs from workflow form data using templates
 */
module.exports = apiRateLimit(requireAuth(async function handler(req, res) {
  try {
    const user = req.user;

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const {
      workflow_instance_id,
      template_id,
      form_data,
      template_type = 'form_completion'
    } = req.body;

    if (!workflow_instance_id) {
      return res.status(400).json({ error: 'Workflow instance ID is required' });
    }

    // Get workflow instance
    const { data: instance, error: instanceError } = await supabase
  // TODO: Implement storage.from('workflow_instances')
      .select(`
        *,
        workflow_templates (*),
        workflow_step_progress (
          *,
          workflow_steps (*)
        )
      `)
      .eq('id', workflow_instance_id)
      .single();

    if (instanceError || !instance) {
      return res.status(404).json({ error: 'Workflow instance not found' });
    }

    // Check permissions
    if (user.role === 'crew' && instance.assigned_to !== user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    let pdfBytes;
    let fileName;

    if (template_id) {
      // Generate PDF from existing template
      pdfBytes = await generateFromTemplate(template_id, form_data, instance);
      fileName = `workflow_${instance.id}_template_${template_id}.pdf`;
    } else {
      // Generate standard completion certificate/report
      switch (template_type) {
        case 'completion_certificate':
          pdfBytes = await generateCompletionCertificate(instance);
          fileName = `completion_certificate_${instance.id}.pdf`;
          break;
        case 'form_report':
          pdfBytes = await generateFormReport(instance, form_data);
          fileName = `form_report_${instance.id}.pdf`;
          break;
        case 'progress_summary':
          pdfBytes = await generateProgressSummary(instance);
          fileName = `progress_summary_${instance.id}.pdf`;
          break;
        default:
          return res.status(400).json({ error: 'Invalid template type' });
      }
    }

    // Upload PDF to storage
    // TODO: Implement storage.from('workflow-pdfs')
    // TODO: Implement storage.upload(`${user.company_id}/${fileName}`, pdfBytes, {
    //   contentType: 'application/pdf',
    //   upsert: true
    // });

    if (uploadError) {
      error.details = { originalError: uploadError.message };
      return await handleErrorAndRespond(error, req, res, user);
    }

    // Get public URL
    // TODO: Replace with MinIO storage
    // TODO: Implement storage.from('workflow-pdfs')
    // TODO: Implement storage.getPublicUrl(uploadData.path);
    const publicUrl = `/api/workflows/pdf/download/${fileName}`; // Temporary placeholder

    // Update workflow instance with generated document
    const currentDocs = instance.generated_documents || [];
    const newDoc = {
      id: Date.now(),
      type: template_type,
      template_id,
      url: publicUrl,
      filename: fileName,
      generated_at: new Date().toISOString(),
      generated_by: user.id
    };

    await supabase
  // TODO: Implement storage.from('workflow_instances')
      .update({
        generated_documents: [...currentDocs, newDoc],
        updated_at: new Date().toISOString()
      })
      .eq('id', workflow_instance_id);

    return res.status(200).json({
      success: true,
      document: newDoc,
      url: publicUrl
    });

  } catch (error) {
    await handleErrorAndRespond(error, req, res, req.user);
  }
}));

/**
 * Generate PDF from existing template with form data mapping
 */
async function generateFromTemplate(templateId, formData, instance) {
  // Get PDF template
  // TODO: Implement storage.from('pdf_templates')
  // TODO: Implement .select('*').eq('id', templateId).single();
  const template = null; // Placeholder

  if (!template) {
    throw new Error('PDF template not found');
  }

  // Download template file
  // TODO: Implement storage.from('pdf-templates')
  // TODO: Implement storage.download(template.template_url);

  // Placeholder for template file
  const templateFile = null;
  if (!templateFile) {
    throw new Error('Failed to download PDF template');
  }

  const templateBytes = await templateFile.arrayBuffer();
  const pdfDoc = await PDFDocument.load(templateBytes);
  const form = pdfDoc.getForm();

  // Apply field mappings
  if (template.field_mappings && formData) {
    Object.entries(template.field_mappings).forEach(([fieldName, dataPath]) => {
      try {
        const value = getNestedValue(formData, dataPath);
        if (value !== undefined && value !== null) {
          const field = form.getField(fieldName);
          if (field) {
            try {
              field.setText(String(value));
            } catch (error) {
              console.error(error);
            }
          }
        }
      } catch (err) {
        console.warn(`Failed to set field ${fieldName}:`, err);
      }
    });
  }

  return await pdfDoc.save();
}

/**
 * Generate completion certificate
 */
async function generateCompletionCertificate(instance) {
  const page = pdfDoc.addPage([612, 792]); // Letter size
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const { width, height } = page.getSize();

  // Title
  page.drawText('Certificate of Completion', {
    x: width / 2 - 150,
    y: height - 100,
    size: 24,
    font: font,
    color: rgb(0, 0, 0)
  });

  // Workflow name
  page.drawText(`${instance.workflow_templates.name}`, {
    x: width / 2 - 100,
    y: height - 200,
    size: 18,
    font: font,
    color: rgb(0.2, 0.4, 0.8)
  });

  // Completion date
  const completionDate = new Date(instance.completed_at).toLocaleDateString();
  page.drawText(`Completed on: ${completionDate}`, {
    x: width / 2 - 80,
    y: height - 250,
    size: 14,
    font: regularFont,
    color: rgb(0, 0, 0)
  });

  // Instance ID for verification
  page.drawText(`Certificate ID: ${instance.id}`, {
    x: 50,
    y: 50,
    size: 10,
    font: regularFont,
    color: rgb(0.5, 0.5, 0.5)
  });

  return await pdfDoc.save();
}

/**
 * Generate form report from collected data
 */
async function generateFormReport(instance, formData) {

  let yPosition = 750;
  const margin = 50;

  // Title
  page.drawText('Workflow Form Report', {
    x: margin,
    y: yPosition,
    size: 20,
    font: font,
    color: rgb(0, 0, 0)
  });

  yPosition -= 40;

  // Workflow details
  page.drawText(`Workflow: ${instance.workflow_templates.name}`, {
    x: margin,
    y: yPosition,
    size: 14,
    font: regularFont
  });

  yPosition -= 20;

  page.drawText(`Completed: ${new Date(instance.completed_at).toLocaleString()}`, {
    x: margin,
    y: yPosition,
    size: 14,
    font: regularFont
  });

  yPosition -= 40;

  // Form data
  if (formData && Object.keys(formData).length > 0) {
    page.drawText('Collected Data:', {
      x: margin,
      y: yPosition,
      size: 16,
      font: font
    });

    yPosition -= 25;

    Object.entries(formData).forEach(([key, value]) => {
      if (yPosition < 100) {
        // Add new page if needed
        const newPage = pdfDoc.addPage([612, 792]);
        yPosition = 750;
      }

      const displayValue = Array.isArray(value) ? value.join(', ') : String(value);

      page.drawText(`${key}:`, {
        x: margin,
        y: yPosition,
        size: 12,
        font: font
      });

      page.drawText(displayValue, {
        x: margin + 20,
        y: yPosition - 15,
        size: 12,
        font: regularFont,
        maxWidth: 500
      });

      yPosition -= 40;
    });
  }

  return await pdfDoc.save();
}

/**
 * Generate progress summary
 */
async function generateProgressSummary(instance) {

  let yPosition = 750;

  // Title
  page.drawText('Workflow Progress Summary', {
    x: margin,
    y: yPosition,
    size: 20,
    font: font
  });

  yPosition -= 60;

  // Step progress
  if (instance.workflow_step_progress) {
    instance.workflow_step_progress.forEach((progress, index) => {
      const step = progress.workflow_steps;
      const status = progress.status.charAt(0).toUpperCase() + progress.status.slice(1);

      page.drawText(`${index + 1}. ${step.name}`, {
        x: margin,
        y: yPosition,
        size: 14,
        font: font
      });

      page.drawText(`Status: ${status}`, {
        x: margin + 20,
        y: yPosition - 20,
        size: 12,
        font: regularFont,
        color: progress.status === 'completed' ? rgb(0, 0.6, 0) : rgb(0.8, 0.4, 0)
      });

      if (progress.completed_at) {
        page.drawText(`Completed: ${new Date(progress.completed_at).toLocaleString()}`, {
          x: margin + 20,
          y: yPosition - 35,
          size: 10,
          font: regularFont,
          color: rgb(0.5, 0.5, 0.5)
        });
      }

      yPosition -= 60;
    });
  }

  return await pdfDoc.save();
}

/**
 * Helper function to get nested object values
 */
function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}
