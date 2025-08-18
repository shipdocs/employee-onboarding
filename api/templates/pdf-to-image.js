// Vercel API Route: /api/templates/pdf-to-image.js
const { PDFDocument } = require('pdf-lib');
const { authenticateToken } = require('../../lib/auth');
const { adminRateLimit } = require('../../lib/rateLimit');

module.exports = adminRateLimit(async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Authenticate user
  const authResult = await authenticateToken(req);
  if (!authResult.success) {
    return res.status(401).json({ error: authResult.error });
  }

  try {
    const { pdfData } = req.body;

    if (!pdfData) {
      return res.status(400).json({ error: 'PDF data is required' });
    }

    // Convert base64 to buffer
    const pdfBuffer = Buffer.from(pdfData.split(',')[1], 'base64');

    // Load PDF document
    const pdfDoc = await PDFDocument.load(pdfBuffer);

    // Get first page
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    const { width, height } = firstPage.getSize();

    // For now, we'll return the PDF dimensions and a placeholder
    // In a real implementation, you'd use a library like pdf2pic or similar
    // to convert PDF to image on the server side

    return res.json({
      success: true,
      dimensions: { width, height },
      message: 'PDF processed successfully. Client-side conversion recommended for better performance.',
      // In production, you might return a converted image URL here
      imageUrl: null
    });

  } catch (_error) {
    // console.error('PDF to image conversion error:', _error);
    return res.status(500).json({ error: 'Failed to process PDF' });
  }
});
