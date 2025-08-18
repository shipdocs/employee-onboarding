/**
 * Secure File Processor
 * Comprehensive file validation, sanitization, and security scanning
 */

const crypto = require('crypto');
const path = require('path');
const fs = require('fs').promises;
const { fileValidators, FILE_UPLOAD_CONFIG } = require('../validation');
const securityAuditLogger = require('./SecurityAuditLogger');
const configManager = require('./SecureConfigManager');

class SecureFileProcessor {
  constructor() {
    this.quarantineDir = './uploads/quarantine';
    this.tempDir = './uploads/temp';
    this.maxFileSize = 100 * 1024 * 1024; // 100MB absolute maximum

    // Dangerous file extensions that should never be allowed
    this.DANGEROUS_EXTENSIONS = [
      '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs',
      '.js', '.jar', '.php', '.asp', '.jsp', '.msi', '.dll'
    ];
    
    // Enhanced magic byte signatures
    this.magicBytes = {
      // Images
      'ffd8ffe0': { type: 'jpg', category: 'image', safe: true },
      'ffd8ffe1': { type: 'jpg', category: 'image', safe: true },
      'ffd8ffe2': { type: 'jpg', category: 'image', safe: true },
      'ffd8ffe3': { type: 'jpg', category: 'image', safe: true },
      'ffd8ffdb': { type: 'jpg', category: 'image', safe: true },
      '89504e47': { type: 'png', category: 'image', safe: true },
      '47494638': { type: 'gif', category: 'image', safe: true },
      '52494646': { type: 'webp', category: 'image', safe: true },
      '424d': { type: 'bmp', category: 'image', safe: true },
      
      // Documents
      '25504446': { type: 'pdf', category: 'document', safe: true },
      'd0cf11e0': { type: 'doc', category: 'document', safe: true },
      // Note: DOCX files are ZIP archives - handled with additional validation
      '504b0506': { type: 'docx', category: 'document', safe: true },
      '504b0708': { type: 'docx', category: 'document', safe: true },
      
      // Archives (potentially dangerous)
      // '504b0304' is shared by ZIP/DOCX - priority given to ZIP for security
      '504b0304': { type: 'zip', category: 'archive', safe: false, note: 'Also used by DOCX files' },
      '526172211a0700': { type: 'rar', category: 'archive', safe: false },
      '1f8b08': { type: 'gz', category: 'archive', safe: false },
      
      // Executables (dangerous)
      '4d5a': { type: 'exe', category: 'executable', safe: false },
      '7f454c46': { type: 'elf', category: 'executable', safe: false },
      'cafebabe': { type: 'class', category: 'executable', safe: false },
      
      // Scripts (potentially dangerous)
      '3c3f706870': { type: 'php', category: 'script', safe: false },
      '3c25': { type: 'jsp', category: 'script', safe: false },
      '3c73637269707420': { type: 'js', category: 'script', safe: false }
    };
    
    // Suspicious patterns in file content
    this.suspiciousPatterns = [
      // Script injection patterns
      /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
      /<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi,
      /javascript:/gi,
      /vbscript:/gi,
      /onload\s*=/gi,
      /onerror\s*=/gi,
      /onclick\s*=/gi,
      
      // PHP patterns
      /<\?php/gi,
      /<\?=/gi,
      /eval\s*\(/gi,
      /exec\s*\(/gi,
      /system\s*\(/gi,
      /shell_exec\s*\(/gi,
      
      // SQL injection patterns
      /union\s+select/gi,
      /drop\s+table/gi,
      /delete\s+from/gi,
      /insert\s+into/gi,
      
      // Command injection patterns
      /\|\s*nc\s/gi,
      /\|\s*netcat\s/gi,
      /\|\s*wget\s/gi,
      /\|\s*curl\s/gi,
      /\|\s*bash\s/gi,
      /\|\s*sh\s/gi
    ];
    
    // Initialize directories
    this.initializeDirectories();
  }

  /**
   * Initialize required directories
   */
  async initializeDirectories() {
    try {
      await fs.mkdir(this.quarantineDir, { recursive: true });
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      console.error('Failed to initialize file processor directories:', error);
    }
  }

  /**
   * Process uploaded file with comprehensive security checks
   */
  async processFile(file, options = {}) {
    const startTime = Date.now();
    const fileId = this.generateFileId();
    
    try {
      // Initial validation
      const initialValidation = await this.validateFileBasics(file, options);
      if (!initialValidation.valid) {
        await this.logSecurityEvent('file_validation_failed', 'medium', {
          fileId,
          fileName: file.originalFilename || file.name,
          errors: initialValidation.errors,
          stage: 'initial_validation'
        }, options.req);
        
        return {
          success: false,
          fileId,
          errors: initialValidation.errors,
          stage: 'initial_validation'
        };
      }

      // Read file content for analysis
      const fileBuffer = await this.readFileBuffer(file);
      if (!fileBuffer) {
        return {
          success: false,
          fileId,
          errors: ['Failed to read file content'],
          stage: 'file_reading'
        };
      }

      // Magic byte validation
      const magicByteValidation = await this.validateMagicBytes(fileBuffer, file);
      if (!magicByteValidation.valid) {
        await this.logSecurityEvent('magic_byte_validation_failed', 'high', {
          fileId,
          fileName: file.originalFilename || file.name,
          detectedType: magicByteValidation.detectedType,
          expectedType: options.expectedType,
          stage: 'magic_byte_validation'
        }, options.req);
        
        return {
          success: false,
          fileId,
          errors: [magicByteValidation.error],
          stage: 'magic_byte_validation'
        };
      }

      // Content analysis
      const contentAnalysis = await this.analyzeFileContent(fileBuffer, file);
      if (!contentAnalysis.safe) {
        // Quarantine suspicious file
        await this.quarantineFile(fileBuffer, fileId, file, contentAnalysis);
        
        await this.logSecurityEvent('malicious_file_detected', 'critical', {
          fileId,
          fileName: file.originalFilename || file.name,
          threats: contentAnalysis.threats,
          suspiciousPatterns: contentAnalysis.suspiciousPatterns,
          stage: 'content_analysis'
        }, options.req);
        
        return {
          success: false,
          fileId,
          errors: ['File contains suspicious content and has been quarantined'],
          threats: contentAnalysis.threats,
          quarantined: true,
          stage: 'content_analysis'
        };
      }

      // File sanitization
      const sanitizedBuffer = await this.sanitizeFile(fileBuffer, magicByteValidation.detectedType);

      // Generate file hash for integrity
      const fileHash = this.generateFileHash(sanitizedBuffer);

      // Log successful processing
      await this.logSecurityEvent('file_processed_successfully', 'low', {
        fileId,
        fileName: file.originalFilename || file.name,
        fileSize: file.size,
        fileType: magicByteValidation.detectedType,
        fileHash,
        processingTime: Date.now() - startTime,
        stage: 'completed'
      }, options.req);

      return {
        success: true,
        fileId,
        fileHash,
        detectedType: magicByteValidation.detectedType,
        sanitizedBuffer,
        metadata: {
          originalName: file.originalFilename || file.name,
          size: file.size,
          mimeType: file.mimetype,
          processingTime: Date.now() - startTime
        }
      };

    } catch (error) {
      await this.logSecurityEvent('file_processing_error', 'high', {
        fileId,
        fileName: file.originalFilename || file.name,
        error: error.message,
        stage: 'processing_error'
      }, options.req);

      return {
        success: false,
        fileId,
        errors: ['File processing failed'],
        stage: 'processing_error'
      };
    }
  }

  /**
   * Validate basic file properties
   */
  async validateFileBasics(file, options = {}) {
    const errors = [];

    // Check file existence
    if (!file) {
      errors.push('No file provided');
    }

    // Check file size
    if (file.size > this.maxFileSize) {
      errors.push(`File size exceeds maximum allowed size of ${this.maxFileSize / 1024 / 1024}MB`);
    }

    if (file.size === 0) {
      errors.push('File is empty');
    }

    // Check filename
    if (file.originalFilename || file.name) {
      const filename = file.originalFilename || file.name;
      
      // Check for path traversal
      if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        errors.push('Filename contains invalid characters');
      }

      // Check for suspicious extensions
      const ext = path.extname(filename).toLowerCase();
      if (this.DANGEROUS_EXTENSIONS.includes(ext)) {
        errors.push(`File extension ${ext} is not allowed`);
      }

      // Check filename length
      if (filename.length > 255) {
        errors.push('Filename is too long');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Read file buffer safely
   */
  async readFileBuffer(file) {
    try {
      if (file.buffer) {
        return file.buffer;
      }
      
      if (file.path) {
        return await fs.readFile(file.path);
      }
      
      if (file.stream) {
        const chunks = [];
        for await (const chunk of file.stream) {
          chunks.push(chunk);
        }
        return Buffer.concat(chunks);
      }
      
      return null;
    } catch (error) {
      console.error('Failed to read file buffer:', error);
      return null;
    }
  }

  /**
   * Validate file type using magic bytes
   */
  async validateMagicBytes(buffer, file) {
    if (!buffer || buffer.length < 4) {
      return { valid: false, error: 'Invalid file buffer' };
    }

    const header = buffer.slice(0, 16).toString('hex').toLowerCase();
    let detectedType = null;
    let detectedInfo = null;

    // Check against our enhanced magic byte database
    for (const [signature, info] of Object.entries(this.magicBytes)) {
      if (header.startsWith(signature.toLowerCase())) {
        detectedType = info.type;
        detectedInfo = info;
        break;
      }
    }

    if (!detectedType) {
      return { valid: false, error: 'File type could not be verified' };
    }

    // Special handling for ZIP/DOCX ambiguity
    if (detectedType === 'zip' && file && file.name) {
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (extension === 'docx' || extension === 'xlsx' || extension === 'pptx') {
        // Office Open XML formats are ZIP archives - allow them as documents
        return {
          valid: true,
          detectedType: extension,
          category: 'document',
          note: 'Office Open XML format detected'
        };
      }
    }

    // Check if detected type is safe
    if (!detectedInfo.safe) {
      return { 
        valid: false, 
        error: `File type ${detectedType} is not allowed`,
        detectedType,
        category: detectedInfo.category
      };
    }

    return { 
      valid: true, 
      detectedType,
      category: detectedInfo.category
    };
  }

  /**
   * Analyze file content for malicious patterns
   */
  async analyzeFileContent(buffer, file) {
    const analysis = {
      safe: true,
      threats: [],
      suspiciousPatterns: [],
      contentType: 'unknown'
    };

    try {
      // Convert buffer to string for pattern matching (first 64KB only for performance)
      const contentString = buffer.slice(0, 65536).toString('utf8', 0, Math.min(buffer.length, 65536));
      
      // Check for suspicious patterns
      for (const pattern of this.suspiciousPatterns) {
        const matches = contentString.match(pattern);
        if (matches) {
          analysis.safe = false;
          analysis.suspiciousPatterns.push({
            pattern: pattern.toString(),
            matches: matches.slice(0, 5) // Limit matches for logging
          });
        }
      }

      // Check for embedded executables
      if (this.containsEmbeddedExecutable(buffer)) {
        analysis.safe = false;
        analysis.threats.push('embedded_executable');
      }

      // Check for suspicious metadata
      if (this.containsSuspiciousMetadata(buffer)) {
        analysis.safe = false;
        analysis.threats.push('suspicious_metadata');
      }

      // Check for polyglot files (files that are valid in multiple formats)
      if (this.isPolyglotFile(buffer)) {
        analysis.safe = false;
        analysis.threats.push('polyglot_file');
      }

      // Determine threat level
      if (analysis.suspiciousPatterns.length > 0) {
        analysis.threats.push('malicious_content');
      }

    } catch (error) {
      console.error('Content analysis error:', error);
      analysis.safe = false;
      analysis.threats.push('analysis_error');
    }

    return analysis;
  }

  /**
   * Check for embedded executables
   */
  containsEmbeddedExecutable(buffer) {
    const executableSignatures = ['4d5a', '7f454c46', 'cafebabe'];
    const bufferHex = buffer.toString('hex').toLowerCase();
    
    return executableSignatures.some(sig => bufferHex.includes(sig));
  }

  /**
   * Check for suspicious metadata
   */
  containsSuspiciousMetadata(buffer) {
    const suspiciousStrings = [
      'autorun.inf',
      'cmd.exe',
      'powershell',
      'wscript',
      'cscript',
      'regsvr32'
    ];
    
    const contentString = buffer.toString('utf8').toLowerCase();
    return suspiciousStrings.some(str => contentString.includes(str));
  }

  /**
   * Check if file is a polyglot (valid in multiple formats)
   */
  isPolyglotFile(buffer) {
    const header = buffer.slice(0, 16).toString('hex').toLowerCase();
    let matchCount = 0;
    
    // Count how many file types this could be
    for (const signature of Object.keys(this.magicBytes)) {
      if (header.startsWith(signature.toLowerCase())) {
        matchCount++;
      }
    }
    
    return matchCount > 1;
  }

  /**
   * Sanitize file content
   */
  async sanitizeFile(buffer, fileType) {
    // For now, return the original buffer
    // In a production environment, you might want to:
    // - Strip metadata from images
    // - Remove macros from documents
    // - Sanitize PDF content
    
    return buffer;
  }

  /**
   * Quarantine suspicious file
   */
  async quarantineFile(buffer, fileId, file, analysis) {
    try {
      const quarantinePath = path.join(this.quarantineDir, `${fileId}.quarantine`);
      await fs.writeFile(quarantinePath, buffer);
      
      // Write analysis report
      const reportPath = path.join(this.quarantineDir, `${fileId}.report.json`);
      const report = {
        fileId,
        originalName: file.originalFilename || file.name,
        size: file.size,
        mimeType: file.mimetype,
        analysis,
        quarantineTime: new Date().toISOString()
      };
      
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
      
      console.log(`🔒 [FILE-SECURITY] File quarantined: ${fileId}`);
    } catch (error) {
      console.error('Failed to quarantine file:', error);
    }
  }

  /**
   * Generate unique file ID
   */
  generateFileId() {
    const crypto = require('crypto');
    const timestamp = Date.now();
    const random = crypto.randomBytes(9).toString('hex');
    return `file_${timestamp}_${random}`;
  }

  /**
   * Generate file hash for integrity checking
   */
  generateFileHash(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Log security events
   */
  async logSecurityEvent(type, severity, details, req = null) {
    await securityAuditLogger.logEvent({
      type: `file_${type}`,
      severity: securityAuditLogger.severityLevels[severity.toUpperCase()],
      userId: req?.user?.userId || null,
      ipAddress: req?.headers?.['x-forwarded-for'] || req?.connection?.remoteAddress,
      userAgent: req?.headers?.['user-agent'],
      details,
      threats: details.threats || []
    });
  }

  /**
   * Get quarantined files list
   */
  async getQuarantinedFiles() {
    try {
      const files = await fs.readdir(this.quarantineDir);
      const quarantinedFiles = [];
      
      for (const file of files) {
        if (file.endsWith('.report.json')) {
          const reportPath = path.join(this.quarantineDir, file);
          const reportContent = await fs.readFile(reportPath, 'utf8');
          const report = JSON.parse(reportContent);
          quarantinedFiles.push(report);
        }
      }
      
      return quarantinedFiles.sort((a, b) => new Date(b.quarantineTime) - new Date(a.quarantineTime));
    } catch (error) {
      console.error('Failed to get quarantined files:', error);
      return [];
    }
  }

  /**
   * Clean up old quarantined files
   */
  async cleanupQuarantine(retentionDays = 30) {
    try {
      const files = await fs.readdir(this.quarantineDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
      
      let cleanedCount = 0;
      
      for (const file of files) {
        const filePath = path.join(this.quarantineDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime < cutoffDate) {
          await fs.unlink(filePath);
          cleanedCount++;
        }
      }
      
      console.log(`🔒 [FILE-SECURITY] Cleaned up ${cleanedCount} old quarantined files`);
      return { cleanedCount };
    } catch (error) {
      console.error('Failed to cleanup quarantine:', error);
      return { cleanedCount: 0, error: error.message };
    }
  }
}

module.exports = SecureFileProcessor;