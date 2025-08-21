// Vercel API Route: /api/pdf/generate-form-05-03a.js
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const db = require('../../lib/database');
const { requireAuth } = require('../../lib/auth');
const { StorageService } = require('../../lib/storage');
const fs = require('fs/promises');
const path = require('path');
const { safeWriteFile, generateSecureFilename } = require('../../lib/security/pathSecurity');
const { uploadRateLimit } = require('../../lib/rateLimit');
async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const userId = req.user.userId;
    const { templateId, formData } = req.body;

    // Get user data
    const userResult = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
    const user = userResult.rows[0];
    const userError = !user;

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get template data if templateId provided
    let template = null;
    if (templateId) {
      const templateDataResult = await db.query('SELECT * FROM pdf_templates WHERE id = $1', [templateId]);
    const templateData = templateDataResult.rows[0];
    const templateError = !templateData;

      if (templateError) {
        // console.error('Template not found:', templateError);
        return res.status(404).json({ error: 'Template not found' });
      }
      template = templateData;
    } else {
      // Find Form 05_03a template by name
      const { data: templates, error: templateError } = await supabase
        .from('pdf_templates')
        .select('*')
        .ilike('name', '%05_03a%');

      if (templateError || !templates || templates.length === 0) {
        return res.status(404).json({ error: 'Form 05_03a template not found' });
      }

      template = templates.find(t =>
        t.name.toLowerCase().includes('05_03a') ||
        t.name.toLowerCase().includes('form') ||
        t.description?.toLowerCase().includes('05_03a')
      ) || templates[0];
    }

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

    // Generate secure filename
    const originalFileName = `${user.first_name}_${user.last_name}_Form_05_03a.pdf`;
    const secureFileName = generateSecureFilename(originalFileName, 'form_');
    const filePath = `${userId}/${secureFileName}`;

    // Upload to Supabase Storage
    const uploadResult = await StorageService.uploadFile(
      'documents',
      filePath,
      pdfBytes,
      {
        contentType: 'application/pdf'
      }
    );

    if (!uploadResult.success) {
      throw new Error('Failed to upload PDF to storage');
    }

    // Get public URL for the PDF
    const publicUrl = await StorageService.getFileUrl('documents', filePath);

    // Save PDF to temp file for email attachment using secure file handling
    const tempFilePath = `/tmp/${secureFileName}`;
    try {
      await safeWriteFile(tempFilePath, pdfBytes, 'uploads', {
        allowedExtensions: ['.pdf']
      });
    } catch (error) {
      throw new Error(`Failed to create temporary PDF file: ${error.message}`);
    }

    res.json({
      success: true,
      message: 'Form 05_03a PDF generated successfully',
      pdf: {
        filename: secureFileName,
        path: uploadResult.path,
        url: publicUrl,
        tempPath: tempFilePath // For email attachment
      },
      template: {
        id: template.id,
        name: template.name
      }
    });

  } catch (error) {
    // console.error('📋 [ERROR] Form 05_03a PDF generation failed:', error);
    res.status(500).json({
      error: 'Failed to generate Form 05_03a PDF',
      details: error.message
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
      // Download background image from Supabase Storage
      const imageData = await StorageService.downloadFile('documents', template.background_image);
      const imageBytes = await imageData.arrayBuffer();

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
    } catch (error) {

    }
  }

  // Process each field
  const fields = JSON.parse(template.fields || '[]');
  for (const field of fields) {
    try {
      await renderField(page, field, data, fontMap, height);
    } catch (error) {

    }
  }

  // Serialize the PDF
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

// Helper functions (copied from preview.js)
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
  } catch (error) {
    return value;
  }
}

module.exports = uploadRateLimit(requireAuth(handler));
