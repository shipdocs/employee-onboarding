const { supabase } = require('../../lib/supabase');
const { verifyAuth } = require('../../lib/auth');
const formidable = require('formidable');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { safeReadFile, generateSecureFilename, SECURITY_CONFIG } = require('../../lib/security/pathSecurity');
const { logFileUploadEvent } = require('../../lib/securityLogger');
const { uploadRateLimit } = require('../../lib/rateLimit');

const config = {
  api: {
    bodyParser: false
  }
};

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await verifyAuth(req, res);
    if (!user) return;

    // Get client info for logging
    const clientIP = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Check if user has content editing permissions
    if (user.role !== 'admin' && (user.role !== 'manager' || !user.permissions?.includes('content_edit'))) {
      // Log permission denied file upload attempt
      await logFileUploadEvent(
        user.id,
        user.email,
        'unknown',
        0,
        false,
        'insufficient_permissions',
        clientIP,
        userAgent
      );
      return res.status(403).json({ error: 'Insufficient permissions for content editing' });
    }

    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB limit
      filter: ({ mimetype }) => {
        return mimetype && mimetype.includes('image');
      }
    });

    const [fields, files] = await form.parse(req);
    const imageFile = files.image?.[0];

    if (!imageFile) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(imageFile.mimetype)) {
      // Log rejected file upload (invalid type)
      await logFileUploadEvent(
        user.id,
        user.email,
        imageFile.originalFilename || 'unknown',
        imageFile.size || 0,
        false,
        'invalid_file_type',
        clientIP,
        userAgent
      );
      return res.status(400).json({ error: 'Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.' });
    }

    // Validate file extension matches MIME type
    const fileExtension = path.extname(imageFile.originalFilename || '').toLowerCase();
    const allowedExtensions = SECURITY_CONFIG.allowedExtensions.images;
    if (!allowedExtensions.includes(fileExtension)) {
      // Log rejected file upload (invalid extension)
      await logFileUploadEvent(
        user.id,
        user.email,
        imageFile.originalFilename || 'unknown',
        imageFile.size || 0,
        false,
        'invalid_file_extension',
        clientIP,
        userAgent
      );
      return res.status(400).json({
        error: 'Invalid file extension. Only JPEG, PNG, WebP, and GIF files are allowed.',
        allowedExtensions
      });
    }

    // Generate secure filename
    const fileName = `content-images/${generateSecureFilename(imageFile.originalFilename, 'img_')}`;

    // Safely read file content with path validation
    let fileContent;
    try {
      fileContent = await safeReadFile(imageFile.filepath, 'uploads', {
        allowedExtensions: allowedExtensions,
        maxFileSize: 10 * 1024 * 1024 // 10MB limit
      });
    } catch (_error) {
      // Log security validation failure
      await logFileUploadEvent(
        user.id,
        user.email,
        imageFile.originalFilename || 'unknown',
        imageFile.size || 0,
        false,
        'security_validation_failed',
        clientIP,
        userAgent
      );
      return res.status(400).json({
        error: 'File security validation failed',
        details: _error.message
      });
    }

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('content-media')
      .upload(fileName, fileContent, {
        contentType: imageFile.mimetype,
        upsert: false
      });

    if (error) {
      // console.error('Error uploading image to storage:', _error);
      return res.status(500).json({ error: 'Failed to upload image' });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('content-media')
      .getPublicUrl(fileName);

    // Log the upload to audit log
    await supabase
      .from('audit_log')
      .insert({
        user_id: user.id,
        action: 'upload_content_image',
        resource_type: 'content_media',
        resource_id: fileName,
        details: {
          filename: imageFile.originalFilename,
          size: imageFile.size,
          mimetype: imageFile.mimetype
        }
      });

    // Log successful file upload security event
    await logFileUploadEvent(
      user.id,
      user.email,
      imageFile.originalFilename || fileName,
      imageFile.size || 0,
      true,
      'successful_upload',
      clientIP,
      userAgent
    );

    // Clean up temporary file
    await fs.unlink(imageFile.filepath);

    return res.status(200).json({
      url: urlData.publicUrl,
      filename: fileName,
      originalName: imageFile.originalFilename,
      size: imageFile.size,
      mimetype: imageFile.mimetype
    });

  } catch (_error) {
    // console.error('Error handling image upload:', _error);
    return res.status(500).json({ error: 'Failed to upload image' });
  }
}

module.exports = uploadRateLimit(handler);
module.exports.config = config;
