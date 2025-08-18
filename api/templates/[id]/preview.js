const { supabase } = require('../../../lib/supabase');
const { requireManagerOrAdmin } = require('../../../lib/auth');
const { uploadRateLimit } = require('../../../lib/rateLimit');

module.exports = uploadRateLimit(requireManagerOrAdmin(async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Template ID is required' });
  }

  try {
    // Get template from database
    const { data: template, error: templateError } = await supabase
      .from('pdf_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (templateError) {
      // console.error('Error fetching template:', templateError);
      return res.status(404).json({ error: 'Template not found' });
    }

    // Parse fields from JSON string stored in database
    let fields = [];
    try {
      if (template.fields) {
        fields = typeof template.fields === 'string'
          ? JSON.parse(template.fields)
          : template.fields;
      }
      // Ensure fields is always an array
      if (!Array.isArray(fields)) {
        fields = [];
      }
    } catch (parseError) {
      // console.error('Error parsing template fields in preview:', parseError);
      fields = [];
    }

    // Generate preview data
    const preview = {
      template_id: id,
      name: template.name,
      description: template.description,
      type: template.type || 'document',
      page_format: template.page_format || 'A4',
      thumbnail: `/api/templates/${id}/thumbnail`,
      preview_url: `/api/templates/${id}/preview-pdf`,
      fields: fields,
      field_count: fields.length,
      created_at: template.created_at,
      updated_at: template.updated_at
    };

    res.status(200).json(preview);
  } catch (_error) {
    // console.error('Error generating template preview:', _error);
    res.status(500).json({ error: 'Internal server error' });
  }
}));
