// Vercel API Route: /api/pdf/generate-certificate.js
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const db = require('../../lib/database');
const { requireAuth } = require('../../lib/auth');
const { StorageService } = require('../../lib/storage');
const { EmailService } = require('../../lib/email');
const { uploadRateLimit } = require('../../lib/rateLimit');

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const userId = req.user.userId;

    // Get user data
    const userResult = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
    const user = userResult.rows[0];
    const userError = !user;

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get all completed training sessions and items
    const { data: sessions, error: sessionsError } = await supabase
      .from('training_sessions')
      .select(`
        *,
        training_items (*)
      `)
      .eq('user_id', userId)
      .eq('status', 'completed')
      .order('phase');

    if (sessionsError) {
      // console.error('Error fetching training sessions:', sessionsError);
      return res.status(500).json({ error: 'Failed to fetch training data' });
    }

    if (!sessions || sessions.length === 0) {
      return res.status(400).json({ error: 'No completed training sessions found' });
    }

    // Get quiz results
    const { data: quizResults, error: quizError } = await supabase
      .from('quiz_results')
      .select('*')
      .eq('user_id', userId)
      .eq('passed', true)
      .order('phase');

    if (quizError) {
      // console.error('Error fetching quiz results:', quizError);
      return res.status(500).json({ error: 'Failed to fetch quiz data' });
    }

    // Generate PDF certificate
    const pdfDoc = await PDFDocument.create();
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const timesRomanBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Add certificate page
    const page1 = pdfDoc.addPage([595, 842]); // A4 size
    const { width, height } = page1.getSize();

    // Header
    page1.drawText('MARITIME ONBOARDING SERVICES', {
      x: 50,
      y: height - 50,
      size: 20,
      font: timesRomanBoldFont,
      color: rgb(0, 0.2, 0.6)
    });

    page1.drawText('CREW ONBOARDING TRAINING CERTIFICATE', {
      x: 50,
      y: height - 80,
      size: 16,
      font: timesRomanBoldFont,
      color: rgb(0, 0.2, 0.6)
    });

    // Certificate content
    page1.drawText('This is to certify that', {
      x: 50,
      y: height - 150,
      size: 14,
      font: timesRomanFont
    });

    page1.drawText(`${user.first_name} ${user.last_name}`, {
      x: 50,
      y: height - 180,
      size: 18,
      font: timesRomanBoldFont,
      color: rgb(0, 0.2, 0.6)
    });

    page1.drawText('has successfully completed the Maritime Safety Training Program', {
      x: 50,
      y: height - 210,
      size: 14,
      font: timesRomanFont
    });

    page1.drawText(`Position: ${user.position || 'Crew Member'}`, {
      x: 50,
      y: height - 250,
      size: 12,
      font: timesRomanFont
    });

    page1.drawText(`Vessel Assignment: ${user.vessel_assignment || 'TBD'}`, {
      x: 50,
      y: height - 270,
      size: 12,
      font: timesRomanFont
    });

    page1.drawText(`Completion Date: ${new Date().toLocaleDateString()}`, {
      x: 50,
      y: height - 290,
      size: 12,
      font: timesRomanFont
    });

    // Training phases summary
    let yPosition = height - 340;
    page1.drawText('Training Phases Completed:', {
      x: 50,
      y: yPosition,
      size: 14,
      font: timesRomanBoldFont
    });

    sessions.forEach((session, index) => {
      yPosition -= 30;
      const completedItems = session.training_items.filter(item => item.completed).length;
      const totalItems = session.training_items.length;

      page1.drawText(`Phase ${session.phase}: ${completedItems}/${totalItems} items completed`, {
        x: 70,
        y: yPosition,
        size: 12,
        font: helveticaFont
      });

      yPosition -= 15;
      page1.drawText(`Completed: ${new Date(session.completed_at).toLocaleDateString()}`, {
        x: 90,
        y: yPosition,
        size: 10,
        font: timesRomanFont
      });
    });

    // Quiz results summary
    if (quizResults && quizResults.length > 0) {
      yPosition -= 40;
      page1.drawText('Quiz Results:', {
        x: 50,
        y: yPosition,
        size: 14,
        font: timesRomanBoldFont
      });

      quizResults.forEach(result => {
        yPosition -= 25;
        const percentage = Math.round((result.score / result.total_questions) * 100);
        page1.drawText(`Phase ${result.phase}: ${result.score}/${result.total_questions} (${percentage}%)`, {
          x: 70,
          y: yPosition,
          size: 12,
          font: helveticaFont
        });
      });
    }

    // Signature area
    page1.drawText('Authorized by:', {
      x: 50,
      y: 150,
      size: 12,
      font: timesRomanFont
    });

    page1.drawText('_________________________', {
      x: 50,
      y: 120,
      size: 12,
      font: timesRomanFont
    });

    page1.drawText('Training Manager', {
      x: 50,
      y: 100,
      size: 10,
      font: timesRomanFont
    });

    page1.drawText('Maritime Onboarding Services', {
      x: 50,
      y: 85,
      size: 10,
      font: timesRomanFont
    });

    // Generate PDF bytes
    const pdfBytes = await pdfDoc.save();

    // Upload to Supabase Storage
    const fileName = `${user.first_name}_${user.last_name}_Training_Certificate_${Date.now()}.pdf`;
    const filePath = `${userId}/${fileName}`;

    const uploadResult = await StorageService.uploadFile(
      'certificates',
      filePath,
      pdfBytes,
      {
        contentType: 'application/pdf'
      }
    );

    // Save certificate record to database
    const { data: certificateRecord, error: certError } = await supabase
      .from('certificates')
      .insert({
        user_id: userId,
        certificate_type: 'Maritime Onboarding Training',
        issue_date: new Date().toISOString().split('T')[0],
        certificate_number: `BMS-${userId}-${Date.now()}`,
        issuing_authority: 'Maritime Onboarding Services',
        file_path: uploadResult.path,
        verified: true
      })
      .select()
      .single();

    if (certError) {
      // console.error('Error saving certificate record:', certError);
      return res.status(500).json({ error: 'Failed to save certificate record' });
    }

    // Send completion email with certificate
    try {
      await EmailService.sendCompletionCertificate(user, uploadResult.path);
    } catch (emailError) {
      // console.error('Error sending completion email:', emailError);
      // Don't fail the request if email fails
    }

    // Get public URL for the certificate
    const publicUrl = await StorageService.getFileUrl('certificates', filePath);

    res.json({
      message: 'Certificate generated successfully',
      certificate: {
        id: certificateRecord.id,
        filename: fileName,
        path: uploadResult.path,
        url: publicUrl,
        certificateNumber: certificateRecord.certificate_number
      }
    });

  } catch (error) {
    // console.error('Certificate generation error:', error);
    res.status(500).json({ error: 'Failed to generate certificate' });
  }
}

module.exports = uploadRateLimit(requireAuth(handler));
