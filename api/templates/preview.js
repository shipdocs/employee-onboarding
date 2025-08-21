// Vercel API Route: /api/templates/preview.js
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const { authenticateToken } = require('../../lib/auth');
const { uploadRateLimit } = require('../../lib/rateLimit');

module.exports = uploadRateLimit(async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Authenticate user
  const authResult = await authenticateToken(req);
  if (!authResult.success) {
    return res.status(401).json({ error: authResult.error });
  }

  try {
    const { template, sampleData } = req.body;

    console.log('Preview request received:', {
      hasTemplate: !!template,
      templateKeys: template ? Object.keys(template) : [],
      hasSampleData: !!sampleData,
      sampleDataKeys: sampleData ? Object.keys(sampleData) : []
    });

    if (!template) {
      return res.status(400).json({ error: 'Template data is required' });
    }

    // Generate PDF from template
    const pdfBytes = await generatePDFFromTemplate(template, sampleData || {});

    // Set response headers for PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${template.name || 'preview'}.pdf"`);
    res.setHeader('Content-Length', pdfBytes.length);

    return res.send(Buffer.from(pdfBytes));
  } catch (error) {
    console.error('PDF preview error:', error);
    return res.status(500).json({
      error: 'Failed to generate PDF preview',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

async function generatePDFFromTemplate(template, data) {
  // Create a new PDF document
  const pdfDoc = await PDFDocument.create();

  // Get page dimensions based on template settings
  const { width, height } = getPageDimensions(template.pageSize, template.orientation);

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
  if (template.backgroundImage) {
    try {
      // Note: In a real implementation, you'd need to handle base64 images
      // For now, we'll skip background images in the preview

    } catch (error) {

    }
  }

  // Process each field
  for (const field of template.fields || []) {
    try {
      await renderField(page, field, data, fontMap);
    } catch (error) {

    }
  }

  // Add watermark for preview
  page.drawText('PREVIEW', {
    x: width / 2 - 50,
    y: height / 2,
    size: 48,
    font: helveticaBoldFont,
    color: rgb(0.9, 0.9, 0.9),
    opacity: 0.3
  });

  // Serialize the PDF
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

async function renderField(page, field, data, fontMap) {
  const { x, y, width, height, type, properties, dataBinding } = field;

  // Get the value for this field
  let value = '';
  if (dataBinding && data[dataBinding]) {
    value = data[dataBinding];
  } else if (properties.placeholder) {
    value = properties.placeholder;
  } else {
    value = getDefaultValueForType(type);
  }

  // Convert coordinates (PDF coordinates start from bottom-left)
  const pdfY = page.getHeight() - y - height;

  // Get font
  const fontFamily = properties.fontFamily || 'Arial';
  const font = fontMap[fontFamily] || fontMap['default'];
  const fontSize = properties.fontSize || 12;
  const color = hexToRgb(properties.color || '#000000');

  switch (type) {
    case 'text':
    case 'number':
      await renderTextField(page, { x, y: pdfY, width, height }, value, font, fontSize, color, properties);
      break;

    case 'date':
      const dateValue = formatDate(value, properties.format);
      await renderTextField(page, { x, y: pdfY, width, height }, dateValue, font, fontSize, color, properties);
      break;

    case 'checkbox':
      await renderCheckbox(page, { x, y: pdfY, width: properties.size || 16, height: properties.size || 16 }, value, color);
      break;

    case 'signature':
      await renderSignatureField(page, { x, y: pdfY, width, height }, font, fontSize, color);
      break;

    case 'image':
      await renderImagePlaceholder(page, { x, y: pdfY, width, height });
      break;

    case 'qr_code':
    case 'barcode':
      await renderCodePlaceholder(page, { x, y: pdfY, width, height }, type, font, fontSize);
      break;

    default:
      await renderTextField(page, { x, y: pdfY, width, height }, `[${type}]`, font, fontSize, color, properties);
  }
}

async function renderTextField(page, bounds, text, font, fontSize, color, properties) {
  const { x, y, width, height } = bounds;

  // Draw border if specified
  if (properties.border && properties.border !== 'none') {
    page.drawRectangle({
      x,
      y,
      width,
      height,
      borderColor: rgb(0.7, 0.7, 0.7),
      borderWidth: 1
    });
  }

  // Draw background if specified
  if (properties.backgroundColor && properties.backgroundColor !== 'transparent') {
    const bgColor = hexToRgb(properties.backgroundColor);
    page.drawRectangle({
      x,
      y,
      width,
      height,
      color: bgColor
    });
  }

  // Calculate text position based on alignment
  let textX = x + 4; // Default left padding
  const textY = y + (height - fontSize) / 2;

  if (properties.textAlign === 'center') {
    const textWidth = font.widthOfTextAtSize(text, fontSize);
    textX = x + (width - textWidth) / 2;
  } else if (properties.textAlign === 'right') {
    const textWidth = font.widthOfTextAtSize(text, fontSize);
    textX = x + width - textWidth - 4;
  }

  // Draw text
  page.drawText(String(text), {
    x: textX,
    y: textY,
    size: fontSize,
    font,
    color
  });
}

async function renderCheckbox(page, bounds, checked, color) {
  const { x, y, width, height } = bounds;

  // Draw checkbox border
  page.drawRectangle({
    x,
    y,
    width,
    height,
    borderColor: color,
    borderWidth: 1
  });

  // Draw checkmark if checked
  if (checked) {
    page.drawText('✓', {
      x: x + 2,
      y: y + 2,
      size: height - 4,
      color
    });
  }
}

async function renderSignatureField(page, bounds, font, fontSize, color) {
  const { x, y, width, height } = bounds;

  // Draw signature border
  page.drawRectangle({
    x,
    y,
    width,
    height,
    borderColor: rgb(0.7, 0.7, 0.7),
    borderWidth: 1
  });

  // Draw signature placeholder text
  page.drawText('Signature', {
    x: x + width / 2 - 25,
    y: y + height / 2 - fontSize / 2,
    size: fontSize,
    font,
    color: rgb(0.6, 0.6, 0.6)
  });
}

async function renderImagePlaceholder(page, bounds) {
  const { x, y, width, height } = bounds;

  // Draw image placeholder border
  page.drawRectangle({
    x,
    y,
    width,
    height,
    borderColor: rgb(0.7, 0.7, 0.7),
    borderWidth: 1,
    borderDashArray: [5, 5]
  });

  // Draw image icon placeholder
  page.drawText('📷', {
    x: x + width / 2 - 10,
    y: y + height / 2 - 10,
    size: 20,
    color: rgb(0.6, 0.6, 0.6)
  });
}

async function renderCodePlaceholder(page, bounds, type, font, fontSize) {
  const { x, y, width, height } = bounds;

  // Draw border
  page.drawRectangle({
    x,
    y,
    width,
    height,
    borderColor: rgb(0.7, 0.7, 0.7),
    borderWidth: 1
  });

  // Draw placeholder text
  const text = type === 'qr_code' ? 'QR CODE' : 'BARCODE';
  page.drawText(text, {
    x: x + width / 2 - (font.widthOfTextAtSize(text, fontSize) / 2),
    y: y + height / 2 - fontSize / 2,
    size: fontSize,
    font,
    color: rgb(0.6, 0.6, 0.6)
  });
}

function getPageDimensions(pageSize, orientation) {
  const sizes = {
    'A4': { width: 595, height: 842 },
    'Letter': { width: 612, height: 792 },
    'Legal': { width: 612, height: 1008 },
    'A3': { width: 842, height: 1191 }
  };

  let { width, height } = sizes[pageSize] || sizes['A4'];

  if (orientation === 'landscape') {
    [width, height] = [height, width];
  }

  return { width, height };
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? rgb(
    parseInt(result[1], 16) / 255,
    parseInt(result[2], 16) / 255,
    parseInt(result[3], 16) / 255
  ) : rgb(0, 0, 0);
}

function formatDate(value, format) {
  if (!value) return '';

  const date = new Date(value);
  if (isNaN(date.getTime())) return value;

  switch (format) {
    case 'DD/MM/YYYY':
      return date.toLocaleDateString('en-GB');
    case 'MM/DD/YYYY':
      return date.toLocaleDateString('en-US');
    case 'YYYY-MM-DD':
      return date.toISOString().split('T')[0];
    case 'DD MMM YYYY':
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    default:
      return date.toLocaleDateString();
  }
}

function getDefaultValueForType(type) {
  switch (type) {
    case 'text': return 'Sample Text';
    case 'number': return '123';
    case 'date': return new Date().toLocaleDateString();
    case 'checkbox': return false;
    case 'signature': return '';
    case 'image': return '';
    case 'qr_code': return 'QR123456';
    case 'barcode': return '123456789';
    default: return `[${type}]`;
  }
}
