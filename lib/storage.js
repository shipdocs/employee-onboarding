// lib/storage.js - Supabase Storage utilities
const { supabase } = require('./supabase');

class StorageService {
  // Upload file to Supabase Storage
  static async uploadFile(bucket, path, file, options = {}) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        ...options
      });

    if (error) {
      // console.error(`Storage upload error for ${bucket}/${path}:`, error);
      throw error;
    }

    return data;
  }

  // Get public URL for a file
  static async getFileUrl(bucket, path) {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return data.publicUrl;
  }

  // Get signed URL for private files
  static async getSignedUrl(bucket, path, expiresIn = 3600) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error) {
      // console.error(`Error creating signed URL for ${bucket}/${path}:`, error);
      throw error;
    }

    return data.signedUrl;
  }

  // Download file from storage
  static async downloadFile(bucket, path) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .download(path);

    if (error) {
      // console.error(`Storage download error for ${bucket}/${path}:`, error);
      throw error;
    }

    return data;
  }

  // Delete file from storage
  static async deleteFile(bucket, path) {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) {
      // console.error(`Storage delete error for ${bucket}/${path}:`, error);
      throw error;
    }
  }

  // List files in a bucket/folder
  static async listFiles(bucket, folder = '', options = {}) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(folder, {
        limit: 100,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' },
        ...options
      });

    if (error) {
      // console.error(`Storage list error for ${bucket}/${folder}:`, error);
      throw error;
    }

    return data;
  }

  // Move/rename file
  static async moveFile(bucket, fromPath, toPath) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .move(fromPath, toPath);

    if (error) {
      // console.error(`Storage move error from ${fromPath} to ${toPath}:`, error);
      throw error;
    }

    return data;
  }

  // Copy file
  static async copyFile(bucket, fromPath, toPath) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .copy(fromPath, toPath);

    if (error) {
      // console.error(`Storage copy error from ${fromPath} to ${toPath}:`, error);
      throw error;
    }

    return data;
  }

  // Get file metadata
  static async getFileInfo(bucket, path) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list('', {
        search: path
      });

    if (error) {
      // console.error(`Storage info error for ${bucket}/${path}:`, error);
      throw error;
    }

    return data.find(file => file.name === path.split('/').pop());
  }

  // Upload multiple files
  static async uploadMultipleFiles(bucket, files) {
    const uploadPromises = files.map(({ path, file, options }) =>
      this.uploadFile(bucket, path, file, options)
    );

    const results = await Promise.allSettled(uploadPromises);

    const successful = [];
    const failed = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successful.push({
          path: files[index].path,
          data: result.value
        });
      } else {
        failed.push({
          path: files[index].path,
          error: result.reason
        });
      }
    });

    return { successful, failed };
  }

  // Create bucket if it doesn't exist
  static async createBucket(bucketId, options = {}) {
    const { data, error } = await supabase.storage
      .createBucket(bucketId, {
        public: false,
        fileSizeLimit: 10485760, // 10MB
        allowedMimeTypes: ['image/*', 'application/pdf'],
        ...options
      });

    if (error && !error.message.includes('already exists')) {
      // console.error(`Error creating bucket ${bucketId}:`, error);
      throw error;
    }

    return data;
  }

  // Get bucket info
  static async getBucketInfo(bucketId) {
    const { data, error } = await supabase.storage
      .getBucket(bucketId);

    if (error) {
      // console.error(`Error getting bucket info for ${bucketId}:`, error);
      throw error;
    }

    return data;
  }
}

module.exports = { StorageService };
