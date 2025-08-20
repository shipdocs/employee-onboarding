// lib/security/scriptSecurity.js - Security utilities for script file operations

const path = require('path');
const fs = require('fs').promises;
const { validatePath, safeReadFile, safeWriteFile } = require('./pathSecurity');

/**
 * Security configuration for script operations
 */
const SCRIPT_SECURITY_CONFIG = {
  // Allowed base directories for script operations
  allowedBasePaths: {
    migrations: ['supabase/migrations/'],
    scripts: ['scripts/'],
    backup: ['migration-backup/', 'backup/'],
    temp: ['/tmp/', './temp/']
  },

  // Allowed file extensions for different script contexts
  allowedExtensions: {
    migrations: ['.sql'],
    scripts: ['.js', '.ts', '.py', '.sh'],
    config: ['.json', '.yaml', '.yml', '.env'],
    docs: ['.md', '.txt'],
    backup: ['.sql', '.js', '.ts', '.json', '.md', '.txt']
  },

  // Maximum file sizes for different contexts
  maxFileSizes: {
    migrations: 5 * 1024 * 1024,  // 5MB
    scripts: 1 * 1024 * 1024,     // 1MB
    config: 100 * 1024,           // 100KB
    backup: 10 * 1024 * 1024      // 10MB
  }
};

/**
 * Safely reads a file for script operations with context-specific validation
 * @param {string} filePath - The file path to read
 * @param {string} context - The script context (migrations, scripts, config, etc.)
 * @returns {Promise<string>} File content as string
 */
async function safeScriptReadFile(filePath, context = 'scripts') {
  try {
    const allowedExtensions = SCRIPT_SECURITY_CONFIG.allowedExtensions[context] ||
                             SCRIPT_SECURITY_CONFIG.allowedExtensions.scripts;
    const maxFileSize = SCRIPT_SECURITY_CONFIG.maxFileSizes[context] ||
                       SCRIPT_SECURITY_CONFIG.maxFileSizes.scripts;

    const content = await safeReadFile(filePath, context, {
      allowedExtensions,
      maxFileSize,
      encoding: 'utf8'
    });

    return content;
  } catch (error) {
    throw new Error(`Script file read failed: ${error.message}`);
  }
}

/**
 * Safely writes a file for script operations with context-specific validation
 * @param {string} filePath - The file path to write
 * @param {string} content - The content to write
 * @param {string} context - The script context (migrations, scripts, config, etc.)
 * @returns {Promise<void>}
 */
async function safeScriptWriteFile(filePath, content, context = 'scripts') {
  try {
    const allowedExtensions = SCRIPT_SECURITY_CONFIG.allowedExtensions[context] ||
                             SCRIPT_SECURITY_CONFIG.allowedExtensions.scripts;

    await safeWriteFile(filePath, content, context, {
      allowedExtensions,
      encoding: 'utf8'
    });
  } catch (error) {
    throw new Error(`Script file write failed: ${error.message}`);
  }
}

/**
 * Safely constructs a file path within allowed directories
 * @param {string} baseDir - Base directory (migrations, scripts, etc.)
 * @param {string} fileName - File name
 * @param {string} context - The script context
 * @returns {Object} Validation result with path
 */
function safeScriptPath(baseDir, fileName, context = 'scripts') {
  try {
    // Validate the base directory is allowed for this context
    const allowedBases = SCRIPT_SECURITY_CONFIG.allowedBasePaths[context] || [];

    let validBaseDir = null;
    for (const allowedBase of allowedBases) {
      if (baseDir.startsWith(allowedBase) || allowedBase.startsWith(baseDir)) {
        validBaseDir = allowedBase;
        break;
      }
    }

    if (!validBaseDir) {
      throw new Error(`Base directory '${baseDir}' not allowed for context '${context}'`);
    }

    // Sanitize the filename
    const sanitizedFileName = path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, '_');

    // Construct the safe path
    const safePath = path.join(validBaseDir, sanitizedFileName);

    // Validate the constructed path
    const validation = validatePath(safePath, context);

    if (!validation.isValid) {
      throw new Error(`Path validation failed: ${validation.error}`);
    }

    return {
      isValid: true,
      safePath: validation.sanitizedPath,
      originalPath: path.join(baseDir, fileName)
    };
  } catch (error) {
    return {
      isValid: false,
      error: error.message,
      safePath: null,
      originalPath: path.join(baseDir, fileName)
    };
  }
}

/**
 * Safely lists files in a directory with security validation
 * @param {string} dirPath - Directory path to list
 * @param {string} context - The script context
 * @param {Object} options - Additional options
 * @returns {Promise<Array>} Array of safe file paths
 */
async function safeScriptListFiles(dirPath, context = 'scripts', options = {}) {
  try {
    // Validate directory path
    const validation = validatePath(dirPath, context);
    if (!validation.isValid) {
      throw new Error(`Directory validation failed: ${validation.error}`);
    }

    const files = await fs.readdir(validation.sanitizedPath);
    const allowedExtensions = SCRIPT_SECURITY_CONFIG.allowedExtensions[context] || [];

    const safeFiles = [];

    for (const file of files) {
      const filePath = path.join(validation.sanitizedPath, file);

      try {
        const stats = await fs.stat(filePath);

        // Skip directories unless explicitly requested
        if (stats.isDirectory() && !options.includeDirectories) {
          continue;
        }

        // Check file extension if it's a file
        if (stats.isFile()) {
          const ext = path.extname(file).toLowerCase();
          if (allowedExtensions.length > 0 && !allowedExtensions.includes(ext)) {
            continue;
          }
        }

        safeFiles.push({
          name: file,
          path: filePath,
          isDirectory: stats.isDirectory(),
          size: stats.size,
          modified: stats.mtime
        });
      } catch (statError) {
        // Skip files that can't be accessed
        continue;
      }
    }

    return safeFiles;
  } catch (error) {
    throw new Error(`Directory listing failed: ${error.message}`);
  }
}

/**
 * Safely checks if a file exists with security validation
 * @param {string} filePath - File path to check
 * @param {string} context - The script context
 * @returns {Promise<boolean>} True if file exists and is accessible
 */
async function safeScriptFileExists(filePath, context = 'scripts') {
  try {
    const validation = validatePath(filePath, context);
    if (!validation.isValid) {
      return false;
    }

    await fs.access(validation.sanitizedPath);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Safely gets file stats with security validation
 * @param {string} filePath - File path to check
 * @param {string} context - The script context
 * @returns {Promise<Object>} File stats or null if not accessible
 */
async function safeScriptFileStats(filePath, context = 'scripts') {
  try {
    const validation = validatePath(filePath, context);
    if (!validation.isValid) {
      return null;
    }

    const stats = await fs.stat(validation.sanitizedPath);
    return {
      size: stats.size,
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory(),
      modified: stats.mtime,
      created: stats.birthtime
    };
  } catch (error) {
    return null;
  }
}

module.exports = {
  safeScriptReadFile,
  safeScriptWriteFile,
  safeScriptPath,
  safeScriptListFiles,
  safeScriptFileExists,
  safeScriptFileStats,
  SCRIPT_SECURITY_CONFIG
};
