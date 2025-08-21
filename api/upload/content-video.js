const db = require('../../lib/database');
const { verifyAuth } = require('../../lib/auth');
const formidable = require('formidable');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
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

    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });

    const videoFile = Array.isArray(files.file) ? files.file[0] : files.file;

    if (!videoFile) {
      return res.status(400).json({ error: 'No video file provided' });
    }

    // Validate file extension
    const allowedExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi'];
    const fileExt = path.extname(videoFile.originalFilename || '').toLowerCase();
    
    if (!allowedExtensions.includes(fileExt)) {
      return res.status(400).json({ 
        error: 'Invalid file type',
        allowed: allowedExtensions 
      });
    }

    // Generate secure filename
    const fileName = `${uuidv4()}${fileExt}`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'content-media');
    
    // Ensure upload directory exists
    await fs.mkdir(uploadDir, { recursive: true });
    
    const targetPath = path.join(uploadDir, fileName);

    // Read and move file
    const fileContent = await fs.readFile(videoFile.filepath);
    await fs.writeFile(targetPath, fileContent);

    // Clean up temporary file
    await fs.unlink(videoFile.filepath).catch(() => {});

    // Save metadata to database
    try {
      await db.query(
        `INSERT INTO file_uploads (
          user_id, file_name, original_name, file_path, 
          file_size, mime_type, upload_type, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [
          user.id,
          fileName,
          videoFile.originalFilename,
          `/uploads/content-media/${fileName}`,
          videoFile.size,
          videoFile.mimetype,
          'content_video'
        ]
      );
    } catch (dbError) {
      console.error('Database insert error:', dbError);
      // Continue even if DB insert fails
    }

    // Return public URL
    const publicUrl = `/uploads/content-media/${fileName}`;

    return res.status(200).json({
      url: publicUrl,
      filename: fileName,
      originalName: videoFile.originalFilename,
      size: videoFile.size,
      mimetype: videoFile.mimetype
    });

  } catch (error) {
    console.error('Error handling video upload:', error);
    return res.status(500).json({ error: 'Failed to upload video' });
  }
}

module.exports = uploadRateLimit(handler);
module.exports.config = config;