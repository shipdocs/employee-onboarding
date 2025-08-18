/**
 * File handling utility functions for quiz file uploads
 */

/**
 * Default accepted file types for uploads
 */
export const DEFAULT_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Default maximum file size in MB
 */
export const DEFAULT_MAX_SIZE_MB = 5;

/**
 * Validates a file against type and size constraints
 * @param {File} file - File to validate
 * @param {string[]} acceptedTypes - Array of accepted MIME types
 * @param {number} maxSizeMB - Maximum file size in megabytes
 * @returns {Object} Validation result with valid flag and error message
 */
export const validateFile = (file, acceptedTypes = DEFAULT_FILE_TYPES, maxSizeMB = DEFAULT_MAX_SIZE_MB) => {
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  // Validate file type
  if (!acceptedTypes.includes(file.type)) {
    const extensions = acceptedTypes.map(type => type.split('/')[1]).join(', ');
    return {
      valid: false,
      error: `Invalid file type. Accepted formats: ${extensions}`
    };
  }

  // Validate file size
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `File too large. Maximum size is ${maxSizeMB}MB`
    };
  }

  return { valid: true };
};

/**
 * Converts a file to base64 string for storage
 * @param {File} file - File to convert
 * @returns {Promise<string>} Base64 string representation
 */
export const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
};

/**
 * Creates a preview URL for an uploaded file
 * @param {File|string} file - File object or base64 string
 * @returns {string} Preview URL
 */
export const createPreviewUrl = (file) => {
  if (typeof file === 'string') {
    // Already a base64 string or URL
    return file;
  }
  return URL.createObjectURL(file);
};

/**
 * Cleans up object URLs to prevent memory leaks
 * @param {string} url - Object URL to revoke
 */
export const revokePreviewUrl = (url) => {
  if (url && url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
};

/**
 * Formats file size for display
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
