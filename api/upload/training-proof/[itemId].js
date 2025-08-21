// Vercel API Route: /api/upload/training-proof/[itemId].js
const db = require('../../../lib/database-direct');
const { requireAuth } = require('../../../lib/auth');
const { uploadRateLimit } = require('../../../lib/rateLimit');
const { StorageService } = require('../../../lib/storage');
const formidable = require('formidable');
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const { fileValidators, sanitizers, validators } = require('../../../lib/validation');
const { createAPIHandler, createError, createValidationError } = require('../../../lib/apiHandler');
const config = {
  api: {
    bodyParser: false // Required for file uploads
  }
};

async function handler(req, res) {
  try {
    const { itemId } = req.query;
    const userId = req.user.userId;

    // Validate itemId
    const itemIdValidation = validators.uuid(itemId);
    if (!itemIdValidation.valid) {
      throw createValidationError('Invalid training item ID', { error: itemIdValidation.error });
    }

    // Parse multipart form data with enhanced security
    const form = formidable({
      maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
      maxFiles: 1, // Only allow one file
      filter: ({ mimetype, originalFilename }) => {
        // Enhanced validation: check both MIME type and file extension
        if (!mimetype || !mimetype.startsWith('image/')) {
          return false;
        }

        // Validate file extension
        const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
        const ext = path.extname(originalFilename || '').toLowerCase();
        return allowedExtensions.includes(ext);
      }
    });

    const [fields, files] = await form.parse(req);
    const file = files.photo?.[0];

    if (!file) {
      return res.status(400).json({ error: 'No valid image file uploaded' });
    }

    // Verify the training item belongs to the current user
    const { data: item, error: itemError } = await supabase
      .from('training_items')
      .select(`
        *,
        training_sessions!inner (
          user_id
        )
      `)
      .eq('id', itemId)
      .eq('training_sessions.user_id', userId)
      .single();

    if (itemError || !item) {
      return res.status(404).json({ error: 'Training item not found' });
    }

    // Enhanced file validation
    const uploadValidation = await fileValidators.validateUpload(file, 'image');
    if (!uploadValidation.valid) {
      throw createValidationError('File validation failed', { errors: uploadValidation.errors });
    }

    // Read file and validate by magic bytes
    // SECURITY: file.filepath is safe here - it's a temporary file path created by formidable library,
    // not user-controlled input. The path is validated by formidable's internal security measures.
    if (!file.filepath || typeof file.filepath !== 'string') {
      throw createValidationError('Invalid file path from upload');
    }
    const fileBuffer = await fs.readFile(file.filepath);
    const typeValidation = await fileValidators.validateFileType(fileBuffer, 'image');
    if (!typeValidation.valid) {
      throw createValidationError(typeValidation.error);
    }

    // Generate secure filename
    const sanitizedOriginalName = sanitizers.filename(file.originalFilename || 'upload.jpg');
    const fileExtension = path.extname(sanitizedOriginalName).toLowerCase();
    const secureFilename = `${crypto.randomUUID()}${fileExtension}`;
    const fileName = `${userId}/${Date.now()}_${secureFilename}`;

    const uploadResult = await StorageService.uploadFile(
      'training-photos',
      fileName,
      fileBuffer,
      {
        contentType: file.mimetype
      }
    );

    // Save file info to database
    const { data: fileRecord, error: fileError } = await supabase
      .from('file_uploads')
      .insert({
        user_id: userId,
        filename: fileName,
        original_name: secureFilename,
        file_path: uploadResult.path,
        file_type: file.mimetype,
        file_size: file.size,
        upload_purpose: 'training_proof'
      })
      .select()
      .single();

    if (fileError) {
      // console.error('Error saving file record:', fileError);
      // Clean up uploaded file
      await StorageService.deleteFile('training-photos', fileName);
      return res.status(500).json({ error: 'Failed to save file record' });
    }

    // Update training item with photo path
    const { error: updateError } = await supabase
      .from('training_items')
      .update({ proof_photo_path: uploadResult.path })
      .eq('id', itemId);

    if (updateError) {
      // console.error('Error updating training item:', updateError);
      return res.status(500).json({ error: 'Failed to update training item' });
    }

    // Get public URL for the uploaded file
    const publicUrl = await StorageService.getFileUrl('training-photos', fileName);

    res.json({
      message: 'Proof photo uploaded successfully',
      file: {
        id: fileRecord.id,
        filename: fileName,
        originalName: sanitizedOriginalName,
        size: file.size,
        url: publicUrl,
        path: uploadResult.path
      }
    });

  } catch (_error) {
    // console.error('Upload error:', _error);

    if (error.code === 'LIMIT_FILE_SIZE') {
      throw createValidationError(`File too large. Maximum file size is ${Math.round((parseInt(process.env.MAX_FILE_SIZE) || 10485760) / 1024 / 1024)}MB`);
    }

    // Re-throw to be handled by API handler
    throw error;
  }
}

// Create the standardized handler with error handling
const apiHandler = createAPIHandler(handler, {
  allowedMethods: ['POST']
});

// Export with authentication and rate limiting
module.exports = uploadRateLimit(requireAuth(apiHandler));
