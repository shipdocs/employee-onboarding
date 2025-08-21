const db = require('../../../lib/database-direct');
const { requireManagerOrAdmin } = require('../../../lib/auth');
const { adminRateLimit } = require('../../../lib/rateLimit');

module.exports = adminRateLimit(requireManagerOrAdmin(async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Template ID is required' });
  }

  try {
    // Get template from database
    const templateResult = await db.query('SELECT * FROM pdf_templates WHERE id = $1', [id]);
    const template = templateResult.rows[0];
    const templateError = !template;

    if (templateError) {
      // console.error('Error fetching template:', templateError);
      return res.status(404).json({ error: 'Template not found' });
    }

    // For now, return a placeholder SVG thumbnail
    // In a real implementation, this would generate or return an actual thumbnail
    const placeholderSvg = `
      <svg width="200" height="260" viewBox="0 0 200 260" xmlns="http://www.w3.org/2000/svg">
        <rect width="200" height="260" fill="#f8fafc" stroke="#e2e8f0" stroke-width="2"/>
        <rect x="20" y="20" width="160" height="20" fill="#18AA9D" rx="2"/>
        <rect x="20" y="50" width="120" height="10" fill="#e2e8f0" rx="1"/>
        <rect x="20" y="70" width="140" height="10" fill="#e2e8f0" rx="1"/>
        <rect x="20" y="90" width="80" height="10" fill="#e2e8f0" rx="1"/>
        
        <rect x="20" y="120" width="160" height="80" fill="#f1f5f9" stroke="#e2e8f0" rx="4"/>
        <text x="100" y="150" text-anchor="middle" font-family="Arial" font-size="12" fill="#64748b">
          ${template.name || 'PDF Template'}
        </text>
        <text x="100" y="170" text-anchor="middle" font-family="Arial" font-size="10" fill="#94a3b8">
          ${template.type || 'Document'}
        </text>
        
        <rect x="20" y="220" width="60" height="10" fill="#e2e8f0" rx="1"/>
        <rect x="90" y="220" width="40" height="10" fill="#e2e8f0" rx="1"/>
        <rect x="140" y="220" width="40" height="10" fill="#e2e8f0" rx="1"/>
      </svg>
    `;

    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    res.status(200).send(placeholderSvg);
  } catch (_error) {
    // console.error('Error generating thumbnail:', _error);
    res.status(500).json({ error: 'Internal server error' });
  }
}));
