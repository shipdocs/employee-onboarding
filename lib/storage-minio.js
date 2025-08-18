/**
 * MinIO Storage Service
 * S3-compatible object storage to replace Supabase Storage
 */

const Minio = require('minio');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

// Initialize MinIO client
const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || 'minio',
  port: parseInt(process.env.MINIO_PORT || '9000'),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin'
});

class StorageService {
  constructor() {
    this.buckets = {
      uploads: 'uploads',
      certificates: 'certificates',
      trainingProofs: 'training-proofs',
      documents: 'documents',
      profilePhotos: 'profile-photos'
    };
    
    this.initialized = false;
  }

  /**
   * Initialize storage buckets
   */
  async init() {
    if (this.initialized) return;
    
    try {
      for (const [key, bucket] of Object.entries(this.buckets)) {
        const exists = await minioClient.bucketExists(bucket);
        if (!exists) {
          await minioClient.makeBucket(bucket, 'us-east-1');
          console.log(`📦 Created bucket: ${bucket}`);
          
          // Set public read policy for certain buckets
          if (['uploads', 'certificates', 'profile-photos'].includes(bucket)) {
            await this.setBucketPolicy(bucket, 'public-read');
          }
        }
      }
      this.initialized = true;
      console.log('✅ Storage service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize storage:', error);
      throw error;
    }
  }

  /**
   * Set bucket policy
   * @param {string} bucket - Bucket name
   * @param {string} policy - Policy type ('public-read', 'private')
   */
  async setBucketPolicy(bucket, policy = 'private') {
    const policies = {
      'public-read': {
        Version: '2012-10-17',
        Statement: [{
          Effect: 'Allow',
          Principal: { AWS: ['*'] },
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${bucket}/*`]
        }]
      },
      'private': {
        Version: '2012-10-17',
        Statement: []
      }
    };

    await minioClient.setBucketPolicy(bucket, JSON.stringify(policies[policy]));
  }

  /**
   * Upload a file
   * @param {string} bucket - Bucket name or key
   * @param {string} fileName - File name
   * @param {Buffer|Stream} file - File data
   * @param {Object} metadata - File metadata
   * @returns {Promise<Object>} Upload result
   */
  async upload(bucket, fileName, file, metadata = {}) {
    await this.init();
    
    // Resolve bucket name if using key
    const bucketName = this.buckets[bucket] || bucket;
    
    // Generate unique filename if needed
    const ext = path.extname(fileName);
    const name = path.basename(fileName, ext);
    const uniqueName = `${name}_${Date.now()}_${uuidv4().slice(0, 8)}${ext}`;
    
    try {
      // Add content type if not provided
      if (!metadata['Content-Type']) {
        metadata['Content-Type'] = this.getContentType(ext);
      }
      
      await minioClient.putObject(bucketName, uniqueName, file, metadata);
      
      return {
        success: true,
        path: `${bucketName}/${uniqueName}`,
        url: await this.getUrl(bucketName, uniqueName),
        bucket: bucketName,
        key: uniqueName,
        size: file.length || null
      };
    } catch (error) {
      console.error('❌ Upload error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Download a file
   * @param {string} bucket - Bucket name
   * @param {string} fileName - File name
   * @returns {Promise<Stream>} File stream
   */
  async download(bucket, fileName) {
    await this.init();
    
    const bucketName = this.buckets[bucket] || bucket;
    
    try {
      return await minioClient.getObject(bucketName, fileName);
    } catch (error) {
      console.error('❌ Download error:', error);
      throw error;
    }
  }

  /**
   * Delete a file
   * @param {string} bucket - Bucket name
   * @param {string} fileName - File name
   * @returns {Promise<boolean>} Success status
   */
  async delete(bucket, fileName) {
    await this.init();
    
    const bucketName = this.buckets[bucket] || bucket;
    
    try {
      await minioClient.removeObject(bucketName, fileName);
      return true;
    } catch (error) {
      console.error('❌ Delete error:', error);
      return false;
    }
  }

  /**
   * Get a presigned URL for a file
   * @param {string} bucket - Bucket name
   * @param {string} fileName - File name
   * @param {number} expiry - Expiry time in seconds (default: 1 hour)
   * @returns {Promise<string>} Presigned URL
   */
  async getUrl(bucket, fileName, expiry = 3600) {
    await this.init();
    
    const bucketName = this.buckets[bucket] || bucket;
    
    try {
      return await minioClient.presignedGetObject(bucketName, fileName, expiry);
    } catch (error) {
      console.error('❌ URL generation error:', error);
      return null;
    }
  }

  /**
   * Get a presigned URL for upload
   * @param {string} bucket - Bucket name
   * @param {string} fileName - File name
   * @param {number} expiry - Expiry time in seconds (default: 1 hour)
   * @returns {Promise<string>} Presigned upload URL
   */
  async getUploadUrl(bucket, fileName, expiry = 3600) {
    await this.init();
    
    const bucketName = this.buckets[bucket] || bucket;
    
    try {
      return await minioClient.presignedPutObject(bucketName, fileName, expiry);
    } catch (error) {
      console.error('❌ Upload URL generation error:', error);
      return null;
    }
  }

  /**
   * List files in a bucket
   * @param {string} bucket - Bucket name
   * @param {string} prefix - File prefix
   * @param {boolean} recursive - List recursively
   * @returns {Promise<Array>} List of files
   */
  async list(bucket, prefix = '', recursive = false) {
    await this.init();
    
    const bucketName = this.buckets[bucket] || bucket;
    const files = [];
    
    return new Promise((resolve, reject) => {
      const stream = minioClient.listObjects(bucketName, prefix, recursive);
      
      stream.on('data', (obj) => {
        files.push({
          name: obj.name,
          size: obj.size,
          lastModified: obj.lastModified,
          etag: obj.etag
        });
      });
      
      stream.on('error', reject);
      stream.on('end', () => resolve(files));
    });
  }

  /**
   * Check if a file exists
   * @param {string} bucket - Bucket name
   * @param {string} fileName - File name
   * @returns {Promise<boolean>} Exists status
   */
  async exists(bucket, fileName) {
    await this.init();
    
    const bucketName = this.buckets[bucket] || bucket;
    
    try {
      await minioClient.statObject(bucketName, fileName);
      return true;
    } catch (error) {
      if (error.code === 'NotFound') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get file metadata
   * @param {string} bucket - Bucket name
   * @param {string} fileName - File name
   * @returns {Promise<Object>} File metadata
   */
  async getMetadata(bucket, fileName) {
    await this.init();
    
    const bucketName = this.buckets[bucket] || bucket;
    
    try {
      const stat = await minioClient.statObject(bucketName, fileName);
      return {
        size: stat.size,
        lastModified: stat.lastModified,
        etag: stat.etag,
        contentType: stat.metaData['content-type'] || null,
        metadata: stat.metaData
      };
    } catch (error) {
      console.error('❌ Metadata error:', error);
      return null;
    }
  }

  /**
   * Copy a file
   * @param {string} sourceBucket - Source bucket
   * @param {string} sourceFile - Source file name
   * @param {string} destBucket - Destination bucket
   * @param {string} destFile - Destination file name
   * @returns {Promise<boolean>} Success status
   */
  async copy(sourceBucket, sourceFile, destBucket, destFile) {
    await this.init();
    
    const sourceBucketName = this.buckets[sourceBucket] || sourceBucket;
    const destBucketName = this.buckets[destBucket] || destBucket;
    
    try {
      await minioClient.copyObject(
        destBucketName,
        destFile,
        `/${sourceBucketName}/${sourceFile}`
      );
      return true;
    } catch (error) {
      console.error('❌ Copy error:', error);
      return false;
    }
  }

  /**
   * Get content type from file extension
   * @param {string} ext - File extension
   * @returns {string} Content type
   */
  getContentType(ext) {
    const types = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.csv': 'text/csv',
      '.txt': 'text/plain',
      '.json': 'application/json',
      '.xml': 'application/xml',
      '.zip': 'application/zip',
      '.mp4': 'video/mp4',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav'
    };
    
    return types[ext.toLowerCase()] || 'application/octet-stream';
  }

  /**
   * Supabase Storage compatibility layer
   * For easier migration from Supabase
   */
  from(bucket) {
    const bucketName = this.buckets[bucket] || bucket;
    
    return {
      upload: async (path, file, options = {}) => {
        const result = await this.upload(bucketName, path, file, options.metadata || {});
        return {
          data: result.success ? { path: result.path } : null,
          error: result.success ? null : result.error
        };
      },
      
      download: async (path) => {
        try {
          const stream = await this.download(bucketName, path);
          return {
            data: stream,
            error: null
          };
        } catch (error) {
          return {
            data: null,
            error: error.message
          };
        }
      },
      
      remove: async (paths) => {
        const pathArray = Array.isArray(paths) ? paths : [paths];
        try {
          await Promise.all(pathArray.map(p => this.delete(bucketName, p)));
          return {
            data: { message: 'Files deleted' },
            error: null
          };
        } catch (error) {
          return {
            data: null,
            error: error.message
          };
        }
      },
      
      list: async (path, options = {}) => {
        try {
          const files = await this.list(bucketName, path, options.recursive);
          return {
            data: files,
            error: null
          };
        } catch (error) {
          return {
            data: null,
            error: error.message
          };
        }
      },
      
      getPublicUrl: (path) => {
        const baseUrl = process.env.MINIO_PUBLIC_URL || `http://localhost:9000`;
        return {
          data: {
            publicUrl: `${baseUrl}/${bucketName}/${path}`
          }
        };
      },
      
      createSignedUrl: async (path, expiresIn) => {
        try {
          const url = await this.getUrl(bucketName, path, expiresIn);
          return {
            data: { signedUrl: url },
            error: null
          };
        } catch (error) {
          return {
            data: null,
            error: error.message
          };
        }
      }
    };
  }
}

// Export singleton instance
const storageService = new StorageService();

module.exports = storageService;
module.exports.StorageService = StorageService;