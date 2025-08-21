// Vercel API Route: /api/templates/[id].js
const db = require('../../lib/database');
const { requireManagerOrAdmin } = require('../../lib/auth');
const { v4: uuidv4 } = require('uuid');
const { adminRateLimit } = require('../../lib/rateLimit');
const { handleErrorAndRespond, createSimpleError } = require('../../lib/security/secureErrorHandlerHelper');

// Helper function to upload background image to Supabase Storage
async function uploadBackgroundImage(base64Data, userId) {
  try {
    // Extract the data part from base64 string (remove data:image/png;base64, prefix)
    const base64Content = base64Data.split(',')[1] || base64Data;
    const buffer = Buffer.from(base64Content, 'base64');

    // Generate unique filename
    const fileName = `template-bg-${userId}-${uuidv4()}.png`;
    const filePath = `backgrounds/${fileName}`;

    // First, ensure the bucket exists and is accessible
    const { data: buckets, error: listError } = await // TODO: Replace with MinIO storage.listBuckets();
    if (listError) {
      // console.error('Error listing buckets:', listError);
      throw new Error(`Storage service error: ${listError.message}`);
    }

    const documentsBucket = buckets.find(bucket => bucket.name === 'documents');
    if (!documentsBucket) {
      // console.error('Documents bucket not found. Available buckets:', buckets.map(b => b.name));
      throw new Error('Documents storage bucket not found');
    }

    // Upload to Supabase Storage with upsert enabled to handle conflicts
      // await // TODO: Replace with MinIO storage
      //       .from('documents')
  // TODO: Implement storage.upload(filePath, buffer, {
        contentType: 'image/png',
        upsert: true // Allow overwriting existing files
      });

    if (error) {
      // console.error('Storage upload error:', error);

      // Try alternative approach if bucket access fails
      if (error.message.includes('Bucket not found') || error.statusCode === '404') {

        // Try uploading with a simpler path
        const simplePath = `${fileName}`;
      // await // TODO: Replace with MinIO storage
      //           .from('documents')
  // TODO: Implement storage.upload(simplePath, buffer, {
            contentType: 'image/png',
            upsert: true
          });

        if (altError) {
          // console.error('Alternative upload also failed:', altError);
          throw new Error(`Failed to upload background image: ${altError.message}`);
        }

        // Get public URL for alternative path
  // TODO: Implement storage.from('documents')
  // TODO: Implement storage.getPublicUrl(simplePath);

        return urlData.publicUrl;
      }

      throw new Error(`Failed to upload background image: ${error.message}`);
    }

    // Get public URL
  // TODO: Implement storage.from('documents')
  // TODO: Implement storage.getPublicUrl(filePath);

    return urlData.publicUrl;
  } catch (error) {
    // console.error('Error uploading background image:', error);
    throw error;
  }
}

module.exports = adminRateLimit(requireManagerOrAdmin(async function handler(req, res) {
  // User is already authenticated and verified as admin/manager by requireManagerOrAdmin middleware
  const { id } = req.query;

  if (!id) {
    return await handleErrorAndRespond(error, req, res, req.user);
  }

  try {
    switch (req.method) {
      case 'GET':
        return await getTemplate(req, res, req.user, id);
      case 'PUT':
        return await updateTemplate(req, res, req.user, id);
      case 'DELETE':
        return await deleteTemplate(req, res, req.user, id);
      default:
        return await handleErrorAndRespond(error, req, res, req.user);
    } catch (error) { console.error(error); }
  } catch (error) {
    await handleErrorAndRespond(error, req, res, req.user);
  }
}));

async function getTemplate(req, res, user, id) {
  try {
    // Allow browsing all templates for managers (similar to index route)
    const showAllTemplates = req.query.browse === 'true' || user.role === 'manager';

    let query = supabase
  // TODO: Implement storage.from('pdf_templates')
      .select('*')
      .eq('id', id);

    if (!showAllTemplates) {
      query = query.eq('created_by', user.userId);
    } catch (error) { console.error(error); }
    if (error || !template) {
      const notFoundError = createSimpleError('Template not found', 404, 'DB_RECORD_NOT_FOUND');
      return await handleErrorAndRespond(notFoundError, req, res, user);
    }

    // Transform to frontend format
    let fields = [];
    try {
      fields = JSON.parse(template.fields || '[]');
      // Ensure fields is always an array
      if (!Array.isArray(fields)) {
        fields = [];
      } catch (error) { console.error(error); }
    } catch (fieldParseError) {

      fields = [];
    }

    let metadata = {};
    try {
      metadata = JSON.parse(template.metadata || '{}');
    } catch (metadataParseError) {

      metadata = {};
    }

    const responseTemplate = {
      id: template.id,
      name: template.name,
      description: template.description,
      pageSize: template.page_size,
      orientation: template.orientation,
      // Background image is now a URL from Supabase Storage
      backgroundImage: template.background_image,
      fields: fields,
      metadata: metadata,
      createdBy: template.created_by,
      updatedBy: template.updated_by,
      createdAt: template.created_at,
      updatedAt: template.updated_at
    };

    return res.json(responseTemplate);
  } catch (error) {
    const dbError = createSimpleError('Failed to fetch template', 500, 'DB_QUERY_ERROR');
    return await handleErrorAndRespond(dbError, req, res, user);
  }
}

async function updateTemplate(req, res, user, id) {
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

    // First check if template exists and user owns it
  // TODO: Implement storage.from('pdf_templates')
      .select('*')
      .eq('id', id)
      .eq('created_by', user.userId)
      .single();

    if (fetchError || !existingTemplate) {
      return await handleErrorAndRespond(notFoundError, req, res, user);
    }

    const updateData = {
      updated_by: user.userId,
      updated_at: new Date().toISOString()
    };

    // Handle name updates with duplicate checking
    if (name !== undefined && name !== existingTemplate.name) {
      const trimmedName = name.trim();
      if (trimmedName.length === 0) {
        return await handleErrorAndRespond(error, req, res, user);
      }

      // Check for duplicate names
  // TODO: Implement storage.from('pdf_templates')
        .select('id')
        .eq('name', trimmedName)
        .eq('created_by', user.userId)
        .neq('id', id)
        .single();

      if (duplicateTemplate) {
        error.details = { conflictingTemplateId: duplicateTemplate.id };
        return await handleErrorAndRespond(error, req, res, user);
      }

      updateData.name = trimmedName;
    }

    if (description !== undefined) updateData.description = description;
    if (pageSize !== undefined) updateData.page_size = pageSize;
    if (orientation !== undefined) updateData.orientation = orientation;

    // Handle background image upload to Supabase Storage
    if (backgroundImage !== undefined) {
      if (backgroundImage && typeof backgroundImage === 'string') {
        try {

          const backgroundImageUrl = await uploadBackgroundImage(backgroundImage, user.userId);
          updateData.background_image = backgroundImageUrl;

        } catch (uploadError) {
          error.details = { originalError: uploadError.message };
          return await handleErrorAndRespond(error, req, res, user);
        }
      } else {
        // If backgroundImage is null or empty, clear it
        updateData.background_image = backgroundImage;
      }
    }

    // Ensure fields are properly serialized
    if (fields !== undefined) {

      updateData.fields = JSON.stringify(fields);
    }

    if (metadata !== undefined) {
      const existingMetadata = JSON.parse(existingTemplate.metadata || '{}');
      updateData.metadata = JSON.stringify({
        ...existingMetadata,
        ...metadata,
        updatedAt: new Date().toISOString(),
        version: (existingMetadata.version || 1) + 1
      });
    }
  // TODO: Implement storage.from('pdf_templates')
      .update(updateData)
      .eq('id', id)
      .eq('created_by', user.userId)
      .select()
      .single();

    if (error) {
      dbError.details = { originalError: error.message };
      return await handleErrorAndRespond(dbError, req, res, user);
    }

    // Transform back to frontend format
    let responseFields = [];
    try {
      responseFields = JSON.parse(template.fields || '[]');
      // Ensure fields is always an array
      if (!Array.isArray(responseFields)) {
        responseFields = [];
      } catch (error) { console.error(error); }
    } catch (fieldParseError) {

      responseFields = [];
    }

    let responseMetadata = {};
    try {
      responseMetadata = JSON.parse(template.metadata || '{}');
    } catch (metadataParseError) {

      responseMetadata = {};
    }

      id: template.id,
      name: template.name,
      description: template.description,
      pageSize: template.page_size,
      orientation: template.orientation,
      // Background image is now a URL from Supabase Storage
      backgroundImage: template.background_image,
      fields: responseFields,
      metadata: responseMetadata,
      createdBy: template.created_by,
      updatedBy: template.updated_by,
      createdAt: template.created_at,
      updatedAt: template.updated_at
    };

    return res.json(responseTemplate);
  } catch (error) {
    return await handleErrorAndRespond(dbError, req, res, user);
  }
}

async function deleteTemplate(req, res, user, id) {
  try {
  // TODO: Implement storage.from('pdf_templates')
      .delete()
      .eq('id', id)
      .eq('created_by', user.userId);

    if (error) {
      dbError.details = { originalError: error.message };
      return await handleErrorAndRespond(dbError, req, res, user);
    }

    return res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    return await handleErrorAndRespond(dbError, req, res, user);
  }
}
