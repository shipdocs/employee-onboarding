// Vercel API Route: /api/templates/index.js
const { supabase } = require('../../lib/supabase');
const { requireManagerOrAdmin } = require('../../lib/auth');
const { v4: uuidv4 } = require('uuid');
const { adminRateLimit } = require('../../lib/rateLimit');

module.exports = adminRateLimit(requireManagerOrAdmin(async function handler(req, res) {
  // User is already authenticated and verified as admin by requireAdmin middleware

  try {
    switch (req.method) {
      case 'GET':
        return await getTemplates(req, res, req.user);
      case 'POST':
        return await createTemplate(req, res, req.user);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (_error) {
    // console.error('Templates API error:', _error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}));

// Helper function to upload background image to Supabase Storage
async function uploadBackgroundImage(base64Data, userId) {
  try {
    // Extract the data part from base64 string (remove data:image/png;base64, prefix)
    const base64Content = base64Data.split(',')[1] || base64Data;
    const buffer = Buffer.from(base64Content, 'base64');

    // Generate unique filename
    const fileName = `template-bg-${userId}-${uuidv4()}.png`;
    const filePath = `backgrounds/${fileName}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('documents')
      .upload(filePath, buffer, {
        contentType: 'image/png',
        upsert: false
      });

    if (error) {
      // console.error('Storage upload error:', _error);
      throw new Error(`Failed to upload background image: ${_error.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  } catch (_error) {
    // console.error('Error uploading background image:', _error);
    throw error;
  }
}

async function getTemplates(req, res, user) {
  try {
    // For template browsing in flow configuration, show all templates
    // Only filter by user for personal template management
    const showAllTemplates = req.query.browse === 'true' || user.role === 'manager';

    const whereClause = !showAllTemplates ? { created_by: user.userId } : {};

    const templates = await supabase.helpers.select('pdf_templates',
      whereClause,
      { orderBy: { 'updated_at': 'DESC' } }
    );

    if (!templates) {
      return res.status(500).json({ error: 'Failed to fetch templates' });
    }

    // Transform templates to frontend format
    const responseTemplates = templates.map(template => {
      try {
        let fields = [];
        try {
          fields = JSON.parse(template.fields || '[]');
          // Ensure fields is always an array
          if (!Array.isArray(fields)) {
            fields = [];
          }
        } catch (fieldParseError) {

          fields = [];
        }

        let metadata = {};
        try {
          metadata = JSON.parse(template.metadata || '{}');
        } catch (metadataParseError) {

          metadata = {};
        }

        return {
          id: template.id,
          name: template.name,
          description: template.description,
          pageSize: template.page_size,
          orientation: template.orientation,
          // Background image is now a URL from Supabase Storage
          backgroundImage: template.background_image,
          fields: fields,
          metadata: metadata,
          // Add template browser specific fields
          type: metadata.type || 'document',
          page_format: `${template.page_size || 'A4'} ${template.orientation || 'portrait'}`,
          field_count: fields.length,
          createdBy: template.created_by,
          updatedBy: template.updated_by,
          createdAt: template.created_at,
          updatedAt: template.updated_at,
          created_at: template.created_at,
          updated_at: template.updated_at
        };
      } catch (err) {
        // console.error('Error transforming template:', err, template);
        // Return a minimal valid template object
        return {
          id: template.id,
          name: template.name || 'Untitled Template',
          description: template.description || '',
          pageSize: template.page_size || 'A4',
          orientation: template.orientation || 'portrait',
          backgroundImage: null,
          fields: [],
          metadata: {},
          type: 'document',
          page_format: `${template.page_size || 'A4'} ${template.orientation || 'portrait'}`,
          field_count: 0,
          createdBy: template.created_by,
          updatedBy: template.updated_by,
          createdAt: template.created_at,
          updatedAt: template.updated_at,
          created_at: template.created_at,
          updated_at: template.updated_at
        };
      }
    });

    return res.json({ templates: responseTemplates });
  } catch (_error) {
    // console.error('Get templates error:', _error);
    return res.status(500).json({ error: 'Failed to fetch templates' });
  }
}

async function createTemplate(req, res, user) {
  try {
    const {
      name,
      description,
      pageSize,
      orientation,
      backgroundImage,
      fields,
      metadata
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Template name is required' });
    }

    // Handle background image upload to Supabase Storage
    let backgroundImageUrl = null;
    if (backgroundImage && typeof backgroundImage === 'string') {
      try {

        backgroundImageUrl = await uploadBackgroundImage(backgroundImage, user.userId);

      } catch (uploadError) {
        // console.error('Failed to upload background image:', uploadError);
        return res.status(500).json({
          error: 'Failed to upload background image',
          details: uploadError.message
        });
      }
    }

    const templateData = {
      name,
      description: description || '',
      page_size: pageSize || 'A4',
      orientation: orientation || 'portrait',
      // Store the Supabase Storage URL instead of base64 data
      background_image: backgroundImageUrl,
      fields: JSON.stringify(fields || []),
      metadata: JSON.stringify({
        ...metadata,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1
      }),
      created_by: user.userId,
      updated_by: user.userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    let template;
    try {
      // Log the user ID and template data for debugging

      const { data, error } = await supabase
        .from('pdf_templates')
        .insert([templateData])
        .select()
        .single();

      if (error) {
        // console.error('Error creating template:', _error);
        // Error details:
        //   error: _error.message,
        //   templateId: id,
        //   message: _error.message,
        //   details: error.details,
        //   hint: error.hint,
        //   code: error.code
        // });
        return res.status(500).json({
          error: 'Failed to create template: ' + _error.message,
          details: error.details,
          hint: error.hint
        });
      }

      if (!data) {
        // console.error('No template returned after insert');
        return res.status(500).json({ error: 'Failed to create template: No data returned' });
      }

      template = data;

    } catch (insertError) {
      // console.error('Exception during template creation:', insertError);
      return res.status(500).json({ error: 'Exception during template creation: ' + insertError.message });
    }

    try {
      // Transform back to frontend format
      const responseTemplate = {
        id: template.id,
        name: template.name,
        description: template.description,
        pageSize: template.page_size,
        orientation: template.orientation,
        // Background image is now a URL from Supabase Storage
        backgroundImage: template.background_image,
        fields: JSON.parse(template.fields || '[]'),
        metadata: JSON.parse(template.metadata || '{}'),
        createdBy: template.created_by,
        updatedBy: template.updated_by,
        createdAt: template.created_at,
        updatedAt: template.updated_at
      };

      return res.status(201).json(responseTemplate);
    } catch (transformError) {
      // console.error('Error transforming template response:', transformError);
      // Return a simplified response if transformation fails
      return res.status(201).json({
        id: template.id,
        name: template.name,
        success: true,
        message: 'Template created but response transformation failed'
      });
    }
  } catch (_error) {
    // console.error('Create template error:', _error);
    return res.status(500).json({ error: 'Failed to create template' });
  }
}
