/**
 * Admin Compliance Report Download API
 * Handles downloading compliance reports
 */

const { supabase } = require('../../../../lib/supabase');
const { authenticateRequest } = require('../../../../lib/auth');
const { applyApiSecurityHeaders } = require('../../../../lib/securityHeaders');
const { adminRateLimit } = require('../../../../lib/rateLimit');

module.exports = adminRateLimit(async (req, res) => {
  try {
    applyApiSecurityHeaders(res);

    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Verify admin authentication with proper blacklist checking
    const user = await authenticateRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Access token required' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'Report ID is required' });
    }

    // Try to fetch the report
    const { data: report, error } = await supabase
      .from('compliance_reports')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code === '42P01') {
      // Table doesn't exist, return mock PDF
      return generateMockPDF(res, id);
    }

    if (error || !report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    if (report.status !== 'completed') {
      return res.status(400).json({ 
        error: 'Report is not ready for download',
        status: report.status 
      });
    }

    // If report has a file_url, try to serve it
    if (report.file_url) {
      // In a real implementation, you would fetch the file from storage
      // For now, generate a mock PDF
      return generateMockPDF(res, id, report);
    }

    // Generate report on-the-fly if no file exists
    return generateMockPDF(res, id, report);

  } catch (error) {
    console.error('Download compliance report API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

function generateMockPDF(res, reportId, report = null) {
  // Generate a simple mock PDF content
  const reportTitle = report?.title || `Compliance Report ${reportId}`;
  const reportType = report?.type || 'general';
  const createdAt = report?.created_at || new Date().toISOString();
  
  const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Resources <<
/Font <<
/F1 4 0 R
>>
>>
/Contents 5 0 R
>>
endobj

4 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj

5 0 obj
<<
/Length 200
>>
stream
BT
/F1 12 Tf
50 750 Td
(${reportTitle}) Tj
0 -20 Td
(Report ID: ${reportId}) Tj
0 -20 Td
(Type: ${reportType}) Tj
0 -20 Td
(Generated: ${new Date(createdAt).toLocaleDateString()}) Tj
0 -40 Td
(This is a mock compliance report.) Tj
0 -20 Td
(In a real implementation, this would contain) Tj
0 -20 Td
(detailed compliance data and analysis.) Tj
ET
endstream
endobj

xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000274 00000 n 
0000000351 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
600
%%EOF`;

  // Set headers for PDF download
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="compliance-report-${reportId}.pdf"`);
  res.setHeader('Content-Length', Buffer.byteLength(pdfContent));

  // Send the PDF content
  res.send(pdfContent);
}
