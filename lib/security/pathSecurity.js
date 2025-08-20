// lib/security/pathSecurity.js - Path security utilities for preventing directory traversal attacks

const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

/**
 * Security configuration for path validation
 */
const SECURITY_CONFIG = {
  // Allowed base directories for different operations
  allowedBasePaths: {
    uploads: ['/tmp/', '/var/tmp/'],
    content: ['/tmp/', '/var/tmp/'],
    migrations: ['supabase/migrations/'],
    scripts: ['scripts/'],
    api: ['api/'],
    pages: ['pages/api/']
  },

  // Forbidden path patterns
  forbiddenPatterns: [
    /\.\./g,           // Parent directory references
    /\/\.\./g,         // Absolute parent directory references
    /\.\.\//g,         // Parent directory with trailing slash
    /~\//g,            // Home directory references
    /\/etc\//gi,       // System configuration directories
    /\/proc\//gi,      // Process information
    /\/sys\//gi,       // System information
    /\/dev\//gi,       // Device files
    /\/var\/log\//gi,  // System logs
    /\/root\//gi,      // Root user directory
    /\/home\/[^\/]+\/\.[^\/]+/gi // Hidden files in user directories
  ],

  // Maximum path length
  maxPathLength: 4096,

  // Allowed file extensions by context
  allowedExtensions: {
    images: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
    videos: ['.mp4', '.webm', '.ogg', '.mov'],
    documents: ['.pdf', '.doc', '.docx', '.txt'],
    scripts: ['.js', '.ts', '.py', '.sql'],
    migrations: ['.sql']
  }
};

/**
 * Validates if a path is safe and within allowed boundaries
 * @param {string} inputPath - The path to validate
 * @param {string} context - The context (uploads, content, migrations, etc.)
 * @param {Object} options - Additional validation options
 * @returns {Object} Validation result with isValid boolean and details
 */
function validatePath(inputPath, context = 'uploads', options = {}) {
  const result = {
    isValid: false,
    sanitizedPath: null,
    error: null,
    details: {}
  };

  try {
    // Basic input validation
    if (!inputPath || typeof inputPath !== 'string') {
      result.error = 'Invalid path: must be a non-empty string';
      return result;
    }

    // Check path length
    if (inputPath.length > SECURITY_CONFIG.maxPathLength) {
      result.error = `Path too long: maximum ${SECURITY_CONFIG.maxPathLength} characters`;
      return result;
    }

    // Normalize the path to resolve any relative references
    const normalizedPath = path.normalize(inputPath);

    // Check for forbidden patterns
    for (const pattern of SECURITY_CONFIG.forbiddenPatterns) {
      // Reset regex state to prevent stateful regex issues with global flags
      pattern.lastIndex = 0;
      if (pattern.test(normalizedPath) || pattern.test(inputPath)) {
        result.error = `Forbidden path pattern detected: ${pattern.source}`;
        return result;
      }
    }

    // Check if path is within allowed base paths for the context
    const allowedBases = SECURITY_CONFIG.allowedBasePaths[context] || [];
    let isWithinAllowedBase = false;

    for (const basePath of allowedBases) {
      if (normalizedPath.startsWith(basePath)) {
        isWithinAllowedBase = true;
        break;
      }
    }

    if (allowedBases.length > 0 && !isWithinAllowedBase) {
      result.error = `Path not within allowed base directories for context: ${context}`;
      result.details.allowedBases = allowedBases;
      return result;
    }

    // Validate file extension if specified
    if (options.allowedExtensions) {
      const ext = path.extname(normalizedPath).toLowerCase();
      if (!options.allowedExtensions.includes(ext)) {
        result.error = `Invalid file extension: ${ext}`;
        result.details.allowedExtensions = options.allowedExtensions;
        return result;
      }
    }

    // Additional custom validation
    if (options.customValidator && typeof options.customValidator === 'function') {
      const customResult = options.customValidator(normalizedPath);
      if (!customResult.isValid) {
        result.error = customResult.error || 'Custom validation failed';
        return result;
      }
    }

    result.isValid = true;
    result.sanitizedPath = normalizedPath;
    return result;

  } catch (error) {
    result.error = `Path validation error: ${error.message}`;
    return result;
  }
}

/**
 * Safely reads a file with path validation
 * @param {string} filePath - The file path to read
 * @param {string} context - The security context
 * @param {Object} options - Additional options
 * @returns {Promise<Buffer|string>} File content or throws error
 */
async function safeReadFile(filePath, context = 'uploads', options = {}) {
  const validation = validatePath(filePath, context, options);

  if (!validation.isValid) {
    throw new Error(`Unsafe file path: ${validation.error}`);
  }

  try {
    // Check if file exists and is actually a file (not a directory)
    const stats = await fs.stat(validation.sanitizedPath);
    if (!stats.isFile()) {
      throw new Error('Path does not point to a regular file');
    }

    // Check file size if specified
    if (options.maxFileSize && stats.size > options.maxFileSize) {
      throw new Error(`File too large: ${stats.size} bytes (max: ${options.maxFileSize})`);
    }

    // Read the file
    const encoding = options.encoding || null; // null for binary, 'utf8' for text
    return await fs.readFile(validation.sanitizedPath, encoding);

  } catch (error) {
    throw new Error(`Failed to read file: ${error.message}`);
  }
}

/**
 * Safely writes a file with path validation
 * @param {string} filePath - The file path to write
 * @param {Buffer|string} content - The content to write
 * @param {string} context - The security context
 * @param {Object} options - Additional options
 * @returns {Promise<void>} Resolves on success or throws error
 */
async function safeWriteFile(filePath, content, context = 'uploads', options = {}) {
  const validation = validatePath(filePath, context, options);

  if (!validation.isValid) {
    throw new Error(`Unsafe file path: ${validation.error}`);
  }

  try {
    // Ensure directory exists
    const dir = path.dirname(validation.sanitizedPath);
    await fs.mkdir(dir, { recursive: true });

    // Write the file
    const writeOptions = {};
    if (options.encoding) {
      writeOptions.encoding = options.encoding;
    }
    if (options.mode) {
      writeOptions.mode = options.mode;
    }

    await fs.writeFile(validation.sanitizedPath, content, writeOptions);

  } catch (error) {
    throw new Error(`Failed to write file: ${error.message}`);
  }
}

/**
 * Generates a secure filename with random components
 * @param {string} originalName - Original filename
 * @param {string} prefix - Optional prefix
 * @returns {string} Secure filename
 */
function generateSecureFilename(originalName = '', prefix = '') {
  const ext = path.extname(originalName).toLowerCase();
  const randomId = crypto.randomUUID();
  const timestamp = Date.now();

  // Sanitize the original name (remove path components and special chars)
  const baseName = path.basename(originalName, ext)
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .substring(0, 50); // Limit length

  return `${prefix}${timestamp}_${randomId}_${baseName}${ext}`;
}

/**
 * Validates API path for dynamic routing
 * @param {string} apiPath - The API path to validate
 * @returns {Object} Validation result
 */
function validateApiPath(apiPath) {
  const result = {
    isValid: false,
    sanitizedPath: null,
    error: null
  };

  try {
    if (!apiPath || typeof apiPath !== 'string') {
      result.error = 'Invalid API path: must be a non-empty string';
      return result;
    }

    // Remove any path traversal attempts
    const sanitized = apiPath.replace(/\.\./g, '').replace(/\/+/g, '/');

    // Validate against allowed patterns (alphanumeric, hyphens, underscores, slashes)
    if (!/^[a-zA-Z0-9/_-]+$/.test(sanitized)) {
      result.error = 'API path contains invalid characters';
      return result;
    }

    // Prevent access to sensitive paths
    const forbiddenPaths = [
      'config', 'env', 'secret', 'key', 'password', 'token',
      'admin', 'root', 'system', 'internal'
    ];

    const pathLower = sanitized.toLowerCase();
    for (const forbidden of forbiddenPaths) {
      if (pathLower.includes(forbidden)) {
        result.error = `API path contains forbidden component: ${forbidden}`;
        return result;
      }
    }

    result.isValid = true;
    result.sanitizedPath = sanitized;
    return result;

  } catch (error) {
    result.error = `API path validation error: ${error.message}`;
    return result;
  }
}

module.exports = {
  validatePath,
  safeReadFile,
  safeWriteFile,
  generateSecureFilename,
  validateApiPath,
  SECURITY_CONFIG
};
