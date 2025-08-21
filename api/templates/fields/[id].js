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
    // Get template fields from the PDF template
    const templateResult = await db.query('SELECT * FROM pdf_templates WHERE id = $1', [id]);
    const template = templateResult.rows[0];
    const templateError = !template;

    if (templateError) {
      // console.error('Error fetching template:', templateError);
      return res.status(404).json({ error: 'Template not found' });
    }

    // Parse the template fields from the template data
    // Fields are stored as JSON string in the database
    let templateFields = [];
    try {
      if (template.fields) {
        templateFields = typeof template.fields === 'string'
          ? JSON.parse(template.fields)
          : template.fields;
      }
      // Ensure templateFields is always an array
      if (!Array.isArray(templateFields)) {
        templateFields = [];
      }
    } catch (parseError) {
      // console.error('Error parsing template fields:', parseError);
      templateFields = [];
    }

    // If no fields are stored, generate some default fields based on template type
    let fields = templateFields;
    if (!fields || fields.length === 0) {
      // Generate default fields based on template type
      switch (template.type) {
        case 'certificate':
          fields = [
            { id: 'participant_name', name: 'Participant Name', type: 'text', required: true },
            { id: 'course_name', name: 'Course Name', type: 'text', required: true },
            { id: 'completion_date', name: 'Completion Date', type: 'date', required: true },
            { id: 'certificate_number', name: 'Certificate Number', type: 'text', required: false },
            { id: 'instructor_name', name: 'Instructor Name', type: 'text', required: false },
            { id: 'instructor_signature', name: 'Instructor Signature', type: 'image', required: false }
          ];
          break;
        case 'report':
          fields = [
            { id: 'report_title', name: 'Report Title', type: 'text', required: true },
            { id: 'participant_name', name: 'Participant Name', type: 'text', required: true },
            { id: 'generated_date', name: 'Generated Date', type: 'date', required: true },
            { id: 'overall_score', name: 'Overall Score', type: 'number', required: false },
            { id: 'status', name: 'Status', type: 'text', required: false },
            { id: 'comments', name: 'Comments', type: 'textarea', required: false }
          ];
          break;
        default:
          fields = [
            { id: 'document_title', name: 'Document Title', type: 'text', required: true },
            { id: 'participant_name', name: 'Participant Name', type: 'text', required: true },
            { id: 'date', name: 'Date', type: 'date', required: true },
            { id: 'content', name: 'Content', type: 'textarea', required: false }
          ];
      }
    }

    // Add field count to response
    const response = {
      template_id: id,
      template_name: template.name,
      template_type: template.type,
      fields: fields,
      field_count: fields.length
    };

    res.status(200).json(response);
  } catch (_error) {
    // console.error('Error fetching template fields:', _error);
    res.status(500).json({ error: 'Internal server error' });
  }
}));
