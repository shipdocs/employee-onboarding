/**
 * File Validation Service
 * Provides comprehensive file validation for uploads
 */

const crypto = require('crypto');
const path = require('path');

class FileValidator {
  constructor() {
    // Allowed file extensions by category
    this.allowedExtensions = {
      images: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'],
      documents: ['.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt'],
      spreadsheets: ['.xls', '.xlsx', '.csv', '.ods'],
      videos: ['.mp4', '.avi', '.mov', '.wmv', '.webm'],
      audio: ['.mp3', '.wav', '.ogg', '.m4a'],
      archives: ['.zip', '.tar', '.gz', '.7z', '.rar']
    };

    // MIME type validation
    this.allowedMimeTypes = {
      // Images
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/gif': ['.gif'],
      'image/webp': ['.webp'],
      'image/svg+xml': ['.svg'],

      // Documents
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'text/csv': ['.csv'],

      // Spreadsheets
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],

      // Videos
      'video/mp4': ['.mp4'],
      'video/webm': ['.webm'],

      // Archives
      'application/zip': ['.zip'],
      'application/x-zip-compressed': ['.zip'],
      'application/x-tar': ['.tar'],
      'application/gzip': ['.gz']
    };

    // File size limits by type (in bytes)
    this.sizeLimits = {
      images: 10 * 1024 * 1024,        // 10MB
      documents: 50 * 1024 * 1024,     // 50MB
      spreadsheets: 20 * 1024 * 1024,  // 20MB
      videos: 500 * 1024 * 1024,       // 500MB
      audio: 50 * 1024 * 1024,         // 50MB
      archives: 100 * 1024 * 1024,     // 100MB
      default: 10 * 1024 * 1024        // 10MB default
    };

    // Dangerous file patterns (even if extension is allowed)
    this.dangerousPatterns = [
      /\.exe$/i,
      /\.dll$/i,
      /\.bat$/i,
      /\.cmd$/i,
      /\.sh$/i,
      /\.ps1$/i,
      /\.vbs$/i,
      /\.jar$/i,
      /\.app$/i,
      /\.scr$/i,
      /\.msi$/i,
      /\.com$/i
    ];

    // Magic numbers for file type verification
    this.magicNumbers = {
      'jpg': [0xFF, 0xD8, 0xFF],
      'png': [0x89, 0x50, 0x4E, 0x47],
      'gif': [0x47, 0x49, 0x46, 0x38],
      'pdf': [0x25, 0x50, 0x44, 0x46],
      'zip': [0x50, 0x4B, 0x03, 0x04],
      'rar': [0x52, 0x61, 0x72, 0x21],
      'mp4': [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70],
      'webm': [0x1A, 0x45, 0xDF, 0xA3]
    };
  }

  /**
   * Get file category based on extension
   */
  getFileCategory(filename) {
    const ext = path.extname(filename).toLowerCase();

    for (const [category, extensions] of Object.entries(this.allowedExtensions)) {
      if (extensions.includes(ext)) {
        return category;
      }
    }

    return null;
  }

  /**
   * Validate file extension
   */
  validateExtension(filename, allowedCategories = null) {
    const ext = path.extname(filename).toLowerCase();

    // Check for dangerous patterns
    for (const pattern of this.dangerousPatterns) {
      if (pattern.test(filename)) {
        return {
          valid: false,
          error: `Dangerous file type detected: ${ext}`
        };
      }
    }

    // If no categories specified, allow all safe categories
    if (!allowedCategories) {
      allowedCategories = Object.keys(this.allowedExtensions);
    }

    // Check if extension is in allowed categories
    for (const category of allowedCategories) {
      if (this.allowedExtensions[category]?.includes(ext)) {
        return { valid: true, category, extension: ext };
      }
    }

    return {
      valid: false,
      error: `File extension ${ext} is not allowed. Allowed types: ${allowedCategories.join(', ')}`
    };
  }

  /**
   * Validate file size
   */
  validateSize(size, category) {
    const limit = this.sizeLimits[category] || this.sizeLimits.default;

    if (size > limit) {
      return {
        valid: false,
        error: `File size ${this.formatBytes(size)} exceeds limit of ${this.formatBytes(limit)}`
      };
    }

    if (size === 0) {
      return {
        valid: false,
        error: 'File is empty'
      };
    }

    return { valid: true, size };
  }

  /**
   * Validate MIME type
   */
  validateMimeType(mimeType, extension) {
    const ext = extension.toLowerCase();

    // Check if MIME type is allowed
    if (!this.allowedMimeTypes[mimeType]) {
      return {
        valid: false,
        error: `MIME type ${mimeType} is not allowed`
      };
    }

    // Check if extension matches MIME type
    const expectedExtensions = this.allowedMimeTypes[mimeType];
    if (!expectedExtensions.includes(ext)) {
      return {
        valid: false,
        error: `MIME type ${mimeType} does not match extension ${ext}`
      };
    }

    return { valid: true, mimeType };
  }

  /**
   * Validate file magic numbers (first bytes)
   */
  validateMagicNumbers(buffer, extension) {
    const ext = extension.toLowerCase().replace('.', '');
    const expectedMagic = this.magicNumbers[ext];

    if (!expectedMagic) {
      // No magic number check for this type
      return { valid: true, warning: 'No magic number validation for this file type' };
    }

    if (buffer.length < expectedMagic.length) {
      return {
        valid: false,
        error: 'File too small to validate'
      };
    }

    for (let i = 0; i < expectedMagic.length; i++) {
      if (buffer[i] !== expectedMagic[i]) {
        return {
          valid: false,
          error: 'File content does not match expected type'
        };
      }
    }

    return { valid: true };
  }

  /**
   * Sanitize filename
   */
  sanitizeFilename(filename) {
    // Remove path traversal attempts
    let safe = path.basename(filename);

    // Remove special characters except dots, dashes, and underscores
    safe = safe.replace(/[^a-zA-Z0-9._-]/g, '_');

    // Remove multiple dots (prevent double extensions)
    safe = safe.replace(/\.{2,}/g, '.');

    // Limit length
    const ext = path.extname(safe);
    const name = path.basename(safe, ext);
    if (name.length > 100) {
      safe = name.substring(0, 100) + ext;
    }

    // Add timestamp to ensure uniqueness
    const timestamp = Date.now();
    const uniqueName = `${path.basename(safe, ext)}_${timestamp}${ext}`;

    return uniqueName;
  }

  /**
   * Generate secure file hash
   */
  generateFileHash(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Check for malware signatures (basic)
   */
  checkMalwareSignatures(buffer) {
    // Basic signature checks (expand this in production)
    const signatures = [
      Buffer.from('4D5A'),                    // EXE
      Buffer.from('EICAR'),                   // EICAR test
      Buffer.from('X5O!P%@AP[4\\PZX54(P^)')  // EICAR
    ];

    const bufferHex = buffer.toString('hex').toUpperCase();

    for (const signature of signatures) {
      if (bufferHex.includes(signature.toString('hex'))) {
        return {
          valid: false,
          error: 'Potential malware signature detected'
        };
      }
    }

    return { valid: true };
  }

  /**
   * Comprehensive file validation
   */
  async validateFile(file, options = {}) {
    const results = {
      valid: true,
      errors: [],
      warnings: [],
      metadata: {}
    };

    try {
      // Validate filename
      if (!file.name) {
        results.valid = false;
        results.errors.push('Filename is required');
        return results;
      }

      // Sanitize filename
      const sanitizedName = this.sanitizeFilename(file.name);
      results.metadata.sanitizedName = sanitizedName;

      // Validate extension
      const extResult = this.validateExtension(file.name, options.allowedCategories);
      if (!extResult.valid) {
        results.valid = false;
        results.errors.push(extResult.error);
        return results;
      }
      results.metadata.category = extResult.category;
      results.metadata.extension = extResult.extension;

      // Validate size
      const sizeResult = this.validateSize(file.size || file.buffer?.length || 0, extResult.category);
      if (!sizeResult.valid) {
        results.valid = false;
        results.errors.push(sizeResult.error);
        return results;
      }
      results.metadata.size = sizeResult.size;

      // Validate MIME type if provided
      if (file.mimeType || file.type) {
        const mimeResult = this.validateMimeType(file.mimeType || file.type, extResult.extension);
        if (!mimeResult.valid) {
          results.valid = false;
          results.errors.push(mimeResult.error);
          return results;
        }
        results.metadata.mimeType = mimeResult.mimeType;
      }

      // Validate magic numbers if buffer provided
      if (file.buffer) {
        const magicResult = this.validateMagicNumbers(file.buffer, extResult.extension);
        if (!magicResult.valid) {
          results.valid = false;
          results.errors.push(magicResult.error);
        } else if (magicResult.warning) {
          results.warnings.push(magicResult.warning);
        }

        // Check for malware signatures
        const malwareResult = this.checkMalwareSignatures(file.buffer);
        if (!malwareResult.valid) {
          results.valid = false;
          results.errors.push(malwareResult.error);
          return results;
        }

        // Generate file hash
        results.metadata.hash = this.generateFileHash(file.buffer);
      }

      return results;

    } catch (error) {
      results.valid = false;
      results.errors.push(`Validation error: ${error.message}`);
      return results;
    }
  }

  /**
   * Format bytes to human readable
   */
  formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
}

// Export singleton instance
module.exports = new FileValidator();
