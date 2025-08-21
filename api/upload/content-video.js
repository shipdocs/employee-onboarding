const { supabase } = require('../../lib/database-supabase-compat');
const { verifyAuth } = require('../../lib/auth.js');
const formidable = require('formidable');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { safeReadFile, generateSecureFilename, SECURITY_CONFIG } = require('../../lib/security/pathSecurity');
const { uploadRateLimit } = require('../../lib/rateLimit');
const config = {
  api: {
    bodyParser: false
  }
};

module.exports = uploadRateLimit(async function handler(req, res) {;
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await verifyAuth(req, res);
    if (!user) return;

    // Check if user has content editing permissions
    if (user.role !== 'admin' && (user.role !== 'manager' || !user.permissions?.includes('content_edit'))) {
      return res.status(403).json({ error: 'Insufficient permissions for content editing' });
    }

    const form = formidable({
      maxFileSize: 100 * 1024 * 1024, // 100MB limit for videos
      filter: ({ mimetype }) => {
        return mimetype && mimetype.includes('video');
      }
    });

    const [fields, files] = await form.parse(req);
    const videoFile = files.video?.[0];

    if (!videoFile) {
      return res.status(400).json({ error: 'No video file provided' });
    }

    // Validate file type
    const allowedTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
    if (!allowedTypes.includes(videoFile.mimetype)) {
      return res.status(400).json({ error: 'Invalid file type. Only MP4, WebM, OGG, and QuickTime are allowed.' });
    }

    // Validate file extension matches MIME type
    const fileExtension = path.extname(videoFile.originalFilename || '').toLowerCase();
    const allowedExtensions = SECURITY_CONFIG.allowedExtensions.videos;
    if (!allowedExtensions.includes(fileExtension)) {
      return res.status(400).json({
        error: 'Invalid file extension. Only MP4, WebM, OGG, and MOV files are allowed.',
        allowedExtensions
      });
    }

    // Generate secure filename
    const fileName = `content-videos/${generateSecureFilename(videoFile.originalFilename, 'vid_')}`;

    // Safely read file content with path validation
    let fileContent;
    try {
      fileContent = await safeReadFile(videoFile.filepath, 'uploads', {
        allowedExtensions: allowedExtensions,
        maxFileSize: 100 * 1024 * 1024 // 100MB limit
      });
    } catch (_error) {
      return res.status(400).json({
        error: 'File security validation failed',
        details: _error.message
      });
    }

    // Upload to Supabase Storage
    // TODO: Replace with MinIO storage implementation
    const data = { path: fileName };
    const error = null;

    if (error) {
      // console.error('Error uploading video to storage:', _error);
      return res.status(500).json({ error: 'Failed to upload video' });
    }

    // Get public URL
    // TODO: Replace with MinIO storage implementation
    const urlData = { publicUrl: `http://localhost:9000/content-media/${fileName}` };

    // Log the upload
    await supabase
      .from('audit_log')
      .insert({
        user_id: user.id,
        action: 'upload_content_video',
        resource_type: 'content_media',
        resource_id: fileName,
        details: {
          filename: videoFile.originalFilename,
          size: videoFile.size,
          mimetype: videoFile.mimetype
        }
      });

    // Clean up temporary file
    await fs.unlink(videoFile.filepath);

    return res.status(200).json({
      url: urlData.publicUrl,
      filename: fileName,
      originalName: videoFile.originalFilename,
      size: videoFile.size,
      mimetype: videoFile.mimetype
    });

  } catch (_error) {
    // console.error('Error handling video upload:', _error);
    return res.status(500).json({ error: 'Failed to upload video' });
  }
});
