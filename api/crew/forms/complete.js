// Vercel API Route: /api/crew/forms/complete.js - Complete and distribute Form 05_03a
const { supabase } = require('../../../lib/supabase');
const { requireAuth } = require('../../../lib/auth');
const unifiedEmailService = require('../../../lib/unifiedEmailService');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const { StorageService } = require('../../../lib/storage');
const fs = require('fs/promises');
const path = require('path');
const { trainingRateLimit } = require('../../../lib/rateLimit');
async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const userId = req.user.userId;
    const { formType, formData, generatePDF = false } = req.body;

    // Validate form type
    if (formType !== '05_03a') {
      return res.status(400).json({ error: 'Only Form 05_03a is currently supported' });
    }

    // Validate required form data
    if (!formData || typeof formData !== 'object') {
      return res.status(400).json({ error: 'Form data is required' });
    }

    // Get user details
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .eq('role', 'crew')
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Store form completion in database
    const formCompletionData = {
      user_id: userId,
      form_type: formType,
      form_data: formData,
      completed_at: new Date().toISOString(),
      status: 'completed'
    };

    const { data: formCompletion, error: insertError } = await supabase
      .from('form_completions')
      .insert(formCompletionData)
      .select()
      .single();

    if (insertError) {
      // If table doesn't exist, we'll create a simple log entry

      // Log the completion in email_notifications table as a fallback
      await supabase
        .from('email_notifications')
        .insert({
          recipient_email: user.email,
          subject: `Form ${formType} Completed`,
          body: `Form completion logged for ${user.first_name} ${user.last_name}`,
          sent_at: new Date().toISOString()
        });
    }

    // Prepare form data for email
    const emailFormData = {
      formType: formType,
      completedAt: new Date().toISOString(),
      completedBy: {
        name: `${user.first_name} ${user.last_name}`,
        email: user.email,
        position: user.position,
        vessel: user.vessel_assignment
      },
      formFields: formData
    };

    // Generate PDF if requested and template exists
    let pdfPath = null;
    if (generatePDF) {
      try {

        // Get template data
        let template = null;
        const templateId = req.body.templateId;

        if (templateId) {
          const { data: templateData, error: templateError } = await supabase
            .from('pdf_templates')
            .select('*')
            .eq('id', templateId)
            .single();

          if (!templateError && templateData) {
            template = templateData;
          }
        } else {
          // Find Form 05_03a template by name
          const { data: templates, error: templateError } = await supabase
            .from('pdf_templates')
            .select('*')
            .ilike('name', '%05_03a%');

          if (!templateError && templates && templates.length > 0) {
            template = templates.find(t =>
              t.name.toLowerCase().includes('05_03a') ||
              t.name.toLowerCase().includes('form') ||
              t.description?.toLowerCase().includes('05_03a')
            ) || templates[0];
          }
        }

        if (template) {
          // Prepare data for template
          const templateData = {
            firstName: user.first_name,
            lastName: user.last_name,
            fullName: `${user.first_name} ${user.last_name}`,
            email: user.email,
            position: user.position,
            vesselAssignment: user.vessel_assignment,
            expectedBoardingDate: user.expected_boarding_date,
            contactPhone: user.contact_phone,
            emergencyContactName: user.emergency_contact_name,
            emergencyContactPhone: user.emergency_contact_phone,
            preferredLanguage: user.preferred_language,
            completionDate: new Date().toISOString().split('T')[0],
            formType: '05_03a',
            ...formData // Include any additional form data
          };

          // Generate PDF from template
          const pdfBytes = await generatePDFFromTemplate(template, templateData);

          // Create filename and save to temp file
          const fileName = `${user.first_name}_${user.last_name}_Form_05_03a_${Date.now()}.pdf`;
          const tempDir = '/tmp';

          // Sanitize filename to prevent path traversal
          const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
          const tempFilePath = path.join(tempDir, sanitizedFileName);

          // Validate the final path is within temp directory
          const normalizedPath = path.normalize(tempFilePath);
          if (!normalizedPath.startsWith('/tmp/')) {
            throw new Error('Invalid file path: outside temp directory');
          }
          await fs.writeFile(tempFilePath, pdfBytes);

          pdfPath = tempFilePath;

        } else {

        }
      } catch (pdfError) {
        // console.error('📋 [ERROR] PDF generation error:', pdfError);
        // Continue without PDF rather than failing the entire process
      }
    }

    // Send automatic distribution emails

    try {
      await unifiedEmailService.sendFormCompletionEmail(userId, emailFormData, pdfPath);

      // Update user status to indicate form completion
      await supabase
        .from('users')
        .update({
          status: 'forms_completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      // Check if user is ready for process closure
      let processClosureReady = false;
      let processClosureMessage = '';

      // Get updated user data to check if all requirements are met
      const { data: updatedUser } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (updatedUser) {
        const profileComplete = updatedUser.contact_phone &&
                               updatedUser.emergency_contact_name &&
                               updatedUser.emergency_contact_phone;
        const formComplete = updatedUser.status === 'form_completed';

        if (profileComplete && formComplete) {
          processClosureReady = true;
          processClosureMessage = 'All onboarding requirements completed. Ready for process closure.';
        } else {
          processClosureMessage = 'Form completed. Profile update still required for process closure.';
        }
      }

      res.json({
        success: true,
        message: 'Form completed and distributed successfully',
        formCompletion: {
          id: formCompletion?.id || 'logged',
          formType: formType,
          completedAt: emailFormData.completedAt,
          distributedTo: ['crew', 'hr', 'qhse'],
          pdfGenerated: !!pdfPath
        },
        emailsSent: true,
        distributionComplete: true,
        processClosureReady: processClosureReady,
        processClosureMessage: processClosureMessage,
        nextStep: processClosureReady ?
          'Call POST /api/crew/process/complete to finalize onboarding' :
          'Complete profile updates to enable process closure'
      });

    } catch (emailError) {
      // console.error('📧 [ERROR] Failed to send distribution emails:', emailError);

      res.status(500).json({
        error: 'Form completed but distribution failed',
        details: emailError.message,
        formCompletion: {
          id: formCompletion?.id || 'logged',
          formType: formType,
          completedAt: emailFormData.completedAt
        },
        emailsSent: false,
        distributionComplete: false
      });
    }

  } catch (_error) {
    // console.error('📋 [ERROR] Form completion failed:', _error);
    res.status(500).json({
      error: 'Failed to complete form',
      details: _error.message
    });
  }
}

// Generate PDF from template (copied from preview.js and modified)
async function generatePDFFromTemplate(template, data) {
  // Create a new PDF document
  const pdfDoc = await PDFDocument.create();

  // Get page dimensions based on template settings
  const { width, height } = getPageDimensions(template.page_size, template.orientation);

  // Add a page
  const page = pdfDoc.addPage([width, height]);

  // Load fonts
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const timesFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const courierFont = await pdfDoc.embedFont(StandardFonts.Courier);

  const fontMap = {
    'Arial': helveticaFont,
    'Helvetica': helveticaFont,
    'Times New Roman': timesFont,
    'Courier New': courierFont,
    'default': helveticaFont
  };

  // Add background image if exists
  if (template.background_image) {
    try {

      let imageBytes;

      // Check if it's a URL or a file path
      if (template.background_image.startsWith('http://') || template.background_image.startsWith('https://')) {
        // It's a URL - fetch it directly

        const response = await fetch(template.background_image);
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.status}`);
        }
        imageBytes = await response.arrayBuffer();
      } else {
        // It's a file path - download from Supabase Storage

        const imageData = await StorageService.downloadFile('documents', template.background_image);
        imageBytes = await imageData.arrayBuffer();
      }

      // Embed image (assuming PNG/JPG)
      let image;
      if (template.background_image.toLowerCase().includes('.png')) {
        image = await pdfDoc.embedPng(imageBytes);
      } else {
        image = await pdfDoc.embedJpg(imageBytes);
      }

      // Draw background image
      page.drawImage(image, {
        x: 0,
        y: 0,
        width: width,
        height: height
      });

    } catch (_error) {

    }
  }

  // Process each field
  const fields = JSON.parse(template.fields || '[]');

  for (const field of fields) {
    try {

      await renderField(page, field, data, fontMap, height);
    } catch (_error) {

    }
  }

  // Serialize the PDF
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

// Helper functions
function getPageDimensions(pageSize, orientation) {
  const sizes = {
    'A4': { width: 595, height: 842 },
    'A3': { width: 842, height: 1191 },
    'Letter': { width: 612, height: 792 },
    'Legal': { width: 612, height: 1008 }
  };

  let { width, height } = sizes[pageSize] || sizes['A4'];

  if (orientation === 'landscape') {
    [width, height] = [height, width];
  }

  return { width, height };
}

async function renderField(page, field, data, fontMap, pageHeight) {
  const { x, y, width, height, type, properties = {}, dataBinding } = field;

  // Convert Y coordinate (template uses top-left origin, PDF uses bottom-left)
  const pdfY = pageHeight - y - height;

  // Get the value for this field
  let value = '';
  if (dataBinding && data[dataBinding]) {
    value = String(data[dataBinding]);
  } else if (properties.placeholder) {
    value = properties.placeholder;
  } else {
    value = getDefaultValueForType(type);
  }

  // Get font and styling
  const fontFamily = properties.fontFamily || 'default';
  const font = fontMap[fontFamily] || fontMap['default'];
  const fontSize = properties.fontSize || 12;
  const color = rgb(0, 0, 0); // Default black

  switch (type) {
    case 'text':
    case 'number':
      page.drawText(value, {
        x: x,
        y: pdfY,
        size: fontSize,
        font: font,
        color: color,
        maxWidth: width
      });
      break;

    case 'date':
      const dateValue = formatDate(value, properties.format);
      page.drawText(dateValue, {
        x: x,
        y: pdfY,
        size: fontSize,
        font: font,
        color: color,
        maxWidth: width
      });
      break;

    case 'checkbox':
      const checkboxSize = properties.size || 16;
      // Draw checkbox border
      page.drawRectangle({
        x: x,
        y: pdfY,
        width: checkboxSize,
        height: checkboxSize,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1
      });

      // Draw checkmark if checked
      if (value === true || value === 'true' || value === 'checked') {
        page.drawText('✓', {
          x: x + 2,
          y: pdfY + 2,
          size: checkboxSize - 4,
          font: font,
          color: color
        });
      }
      break;
  }
}

function getDefaultValueForType(type) {
  switch (type) {
    case 'text': return 'Sample Text';
    case 'number': return '123';
    case 'date': return new Date().toISOString().split('T')[0];
    case 'checkbox': return false;
    default: return '';
  }
}

function formatDate(value, format = 'YYYY-MM-DD') {
  if (!value) return '';

  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) return value;

    switch (format) {
      case 'DD/MM/YYYY':
        return date.toLocaleDateString('en-GB');
      case 'MM/DD/YYYY':
        return date.toLocaleDateString('en-US');
      case 'YYYY-MM-DD':
      default:
        return date.toISOString().split('T')[0];
    }
  } catch (_error) {
    return value;
  }
}

module.exports = trainingRateLimit(requireAuth(handler));
