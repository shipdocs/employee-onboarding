// Vercel API Route: /api/pdf/generate-manager-welcome.js
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const { supabase } = require('../../lib/supabase');
const { requireAuth } = require('../../lib/auth');
const fs = require('fs/promises');
const path = require('path');
const { safeWriteFile, generateSecureFilename } = require('../../lib/security/pathSecurity');
const { uploadRateLimit } = require('../../lib/rateLimit');
async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { managerId } = req.body;

    // Get manager data
    const { data: manager, error: managerError } = await supabase
      .from('users')
      .select('*')
      .eq('id', managerId)
      .eq('role', 'manager')
      .single();

    if (managerError || !manager) {
      return res.status(404).json({ error: 'Manager not found' });
    }

    // Generate PDF
    const pdfBytes = await generateManagerWelcomePDF(manager);

    // Generate secure filename and save to temp file
    const originalFileName = `Manager_Welcome_Guide_${manager.first_name}_${manager.last_name}.pdf`;
    const secureFileName = generateSecureFilename(originalFileName, 'welcome_');
    const tempFilePath = `/tmp/${secureFileName}`;

    try {
      await safeWriteFile(tempFilePath, pdfBytes, 'uploads', {
        allowedExtensions: ['.pdf']
      });
    } catch (_error) {
      throw new Error(`Failed to create temporary PDF file: ${_error.message}`);
    }

    res.json({
      success: true,
      message: 'Manager Welcome PDF generated successfully',
      pdf: {
        filename: secureFileName,
        tempPath: tempFilePath
      },
      manager: {
        id: manager.id,
        name: `${manager.first_name} ${manager.last_name}`
      }
    });

  } catch (_error) {
    // console.error('📋 [ERROR] Manager Welcome PDF generation failed:', _error);
    res.status(500).json({
      error: 'Failed to generate Manager Welcome PDF',
      details: _error.message
    });
  }
}

// Generate Manager Welcome PDF
async function generateManagerWelcomePDF(manager) {
  // Create a new PDF document
  const pdfDoc = await PDFDocument.create();

  // Add a page (A4 size)
  const page = pdfDoc.addPage([595, 842]);
  const { width, height } = page.getSize();

  // Load fonts
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Colors
  const primaryBlue = rgb(0.07, 0.15, 0.27); // #132545
  const accentBlue = rgb(0, 0.42, 0.51); // #006A82
  const lightGray = rgb(0.5, 0.5, 0.5);
  const darkGray = rgb(0.2, 0.2, 0.2);

  let yPosition = height - 60;

  // Header
  page.drawRectangle({
    x: 0,
    y: yPosition - 40,
    width: width,
    height: 80,
    color: primaryBlue
  });

  page.drawText('MANAGER WELCOME GUIDE', {
    x: 50,
    y: yPosition - 15,
    size: 24,
    font: helveticaBoldFont,
    color: rgb(1, 1, 1)
  });

  page.drawText('Maritime Onboarding System', {
    x: 50,
    y: yPosition - 35,
    size: 14,
    font: helveticaFont,
    color: rgb(0.8, 0.8, 0.8)
  });

  yPosition -= 100;

  // Welcome Section
  page.drawText(`Welcome ${manager.first_name} ${manager.last_name}!`, {
    x: 50,
    y: yPosition,
    size: 20,
    font: helveticaBoldFont,
    color: primaryBlue
  });

  yPosition -= 30;

  const welcomeText = [
    'Congratulations on being appointed as a Manager in our Maritime Onboarding System.',
    'This guide will help you understand your role and responsibilities in managing crew',
    'onboarding processes.',
    '',
    'Your manager account has been created with the following details:',
    `• Email: ${manager.email}`,
    `• Position: ${manager.position || 'Manager'}`,
    '• Account Status: Active'
  ];

  welcomeText.forEach((line) => {
    page.drawText(line, {
      x: 50,
      y: yPosition,
      size: 12,
      font: helveticaFont,
      color: darkGray
    });
    yPosition -= 18;
  });

  yPosition -= 20;

  // Responsibilities Section
  page.drawText('Your Key Responsibilities:', {
    x: 50,
    y: yPosition,
    size: 16,
    font: helveticaBoldFont,
    color: accentBlue
  });

  yPosition -= 25;

  const responsibilities = [
    '1. Crew Member Management',
    '   • Register new crew members in the system',
    '   • Set boarding dates and vessel assignments',
    '   • Monitor onboarding progress',
    '',
    '2. Training Oversight',
    '   • Review training completion status',
    '   • Approve quiz results and certificates',
    '   • Ensure compliance with maritime regulations',
    '',
    '3. Communication',
    '   • Send magic links for crew access',
    '   • Coordinate with HR and QHSE departments',
    '   • Manage onboarding timelines',
    '',
    '4. Compliance Monitoring',
    '   • Ensure all required forms are completed',
    '   • Verify safety management system understanding',
    '   • Maintain accurate records'
  ];

  responsibilities.forEach((line) => {
    const isHeader = line.match(/^\d+\./);
    page.drawText(line, {
      x: 50,
      y: yPosition,
      size: isHeader ? 13 : 11,
      font: isHeader ? helveticaBoldFont : helveticaFont,
      color: isHeader ? primaryBlue : darkGray
    });
    yPosition -= 16;
  });

  yPosition -= 20;

  // Getting Started Section
  page.drawText('Getting Started:', {
    x: 50,
    y: yPosition,
    size: 16,
    font: helveticaBoldFont,
    color: accentBlue
  });

  yPosition -= 25;

  const gettingStarted = [
    '1. Login to the system using your email and the temporary password provided',
    '2. Change your password on first login for security',
    '3. Familiarize yourself with the manager dashboard',
    '4. Review existing crew members and their progress',
    '5. Contact the admin team if you need additional permissions'
  ];

  gettingStarted.forEach((line, index) => {
    page.drawText(line, {
      x: 50,
      y: yPosition,
      size: 12,
      font: helveticaFont,
      color: darkGray
    });
    yPosition -= 18;
  });

  yPosition -= 20;

  // Onboarding Workflow Section
  page.drawText('Crew Onboarding Workflow:', {
    x: 50,
    y: yPosition,
    size: 16,
    font: helveticaBoldFont,
    color: accentBlue
  });

  yPosition -= 25;

  const workflow = [
    '1. Create crew member account with boarding date',
    '2. System automatically sends safety management PDF (5 days before boarding)',
    '3. System sends onboarding start email on boarding day',
    '4. Crew completes training phases and Form 05_03a',
    '5. System distributes completed forms to HR and QHSE',
    '6. Monitor and approve completion as needed'
  ];

  workflow.forEach((line) => {
    page.drawText(line, {
      x: 50,
      y: yPosition,
      size: 12,
      font: helveticaFont,
      color: darkGray
    });
    yPosition -= 18;
  });

  yPosition -= 30;

  // Footer
  page.drawRectangle({
    x: 0,
    y: 0,
    width: width,
    height: 60,
    color: rgb(0.95, 0.95, 0.95)
  });

  page.drawText('For support, contact: support@shipdocs.app', {
    x: 50,
    y: 30,
    size: 10,
    font: helveticaFont,
    color: lightGray
  });

  page.drawText(`Generated on: ${new Date().toLocaleDateString()}`, {
    x: width - 200,
    y: 30,
    size: 10,
    font: helveticaFont,
    color: lightGray
  });

  // Serialize the PDF
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

module.exports = uploadRateLimit(requireAuth(handler));
