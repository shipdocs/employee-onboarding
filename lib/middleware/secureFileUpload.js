/**
 * Secure File Upload Middleware
 * Integrates SecureFileProcessor and MalwareScanner for comprehensive file security
 */

const SecureFileProcessor = require('../security/SecureFileProcessor');
const MalwareScanner = require('../security/MalwareScanner');
const { uploadRateLimit } = require('../rateLimit');
const securityAuditLogger = require('../security/SecurityAuditLogger');

class SecureFileUploadMiddleware {
  constructor() {
    this.fileProcessor = new SecureFileProcessor();
    this.malwareScanner = new MalwareScanner();
    this.maxConcurrentUploads = 5;
    this.activeUploads = new Set();
  }

  /**
   * Create secure file upload middleware
   */
  createMiddleware(options = {}) {
    return async (req, res, next) => {
      try {
        // Check concurrent upload limit
        if (this.activeUploads.size >= this.maxConcurrentUploads) {
          return res.status(429).json({
            error: 'Too many concurrent uploads',
            retryAfter: 30
          });
        }

        // Generate upload session ID
        const uploadId = this.generateUploadId();
        this.activeUploads.add(uploadId);

        try {
          // Process the upload
          const result = await this.processUpload(req, options);
          
          if (!result.success) {
            return res.status(400).json({
              error: 'File upload failed',
              details: result.errors,
              uploadId: uploadId
            });
          }

          // Add upload result to request for downstream processing
          req.secureUpload = result;
          req.uploadId = uploadId;

          next();
        } finally {
          // Clean up active uploads
          this.activeUploads.delete(uploadId);
        }

      } catch (error) {
        console.error('Secure file upload middleware error:', error);
        
        await securityAuditLogger.logEvent({
          type: 'file_upload_middleware_error',
          severity: securityAuditLogger.severityLevels.HIGH,
          userId: req.user?.userId,
          ipAddress: req.headers['x-forwarded-for'] || req.connection?.remoteAddress,
          userAgent: req.headers['user-agent'],
          details: {
            error: error.message,
            endpoint: req.url
          }
        });

        res.status(500).json({
          error: 'File upload processing failed',
          uploadId: req.uploadId
        });
      }
    };
  }

  /**
   * Process file upload with security checks
   */
  async processUpload(req, options = {}) {
    const startTime = Date.now();
    
    try {
      // Extract file from request
      const file = this.extractFileFromRequest(req);
      if (!file) {
        return {
          success: false,
          errors: ['No file provided in request'],
          stage: 'file_extraction'
        };
      }

      // Log upload attempt
      await securityAuditLogger.logEvent({
        type: 'file_upload_attempt',
        severity: securityAuditLogger.severityLevels.LOW,
        userId: req.user?.userId,
        ipAddress: req.headers['x-forwarded-for'] || req.connection?.remoteAddress,
        userAgent: req.headers['user-agent'],
        details: {
          fileName: file.originalFilename || file.name,
          fileSize: file.size,
          mimeType: file.mimetype,
          endpoint: req.url
        }
      });

      // Process file through SecureFileProcessor
      const processingResult = await this.fileProcessor.processFile(file, {
        expectedType: options.expectedType,
        req: req
      });

      if (!processingResult.success) {
        await this.logUploadFailure(req, file, processingResult, 'file_processing');
        return processingResult;
      }

      // Scan for malware
      const scanResult = await this.malwareScanner.scanFile(
        processingResult.sanitizedBuffer,
        file.originalFilename || file.name,
        { req: req }
      );

      if (scanResult.error) {
        await this.logUploadFailure(req, file, { errors: [scanResult.error] }, 'malware_scanning');
        return {
          success: false,
          errors: ['File scanning failed'],
          stage: 'malware_scanning'
        };
      }

      // Check scan results
      if (scanResult.quarantined) {
        await this.logUploadFailure(req, file, {
          errors: ['File contains malware and has been quarantined'],
          threats: scanResult.threats
        }, 'malware_detected');
        
        return {
          success: false,
          errors: ['File contains malicious content and has been quarantined'],
          threats: scanResult.threats,
          quarantined: true,
          scanId: scanResult.scanId,
          stage: 'malware_scanning'
        };
      }

      // Log successful upload
      await securityAuditLogger.logEvent({
        type: 'file_upload_success',
        severity: securityAuditLogger.severityLevels.LOW,
        userId: req.user?.userId,
        ipAddress: req.headers['x-forwarded-for'] || req.connection?.remoteAddress,
        userAgent: req.headers['user-agent'],
        details: {
          fileName: file.originalFilename || file.name,
          fileSize: file.size,
          fileHash: processingResult.fileHash,
          detectedType: processingResult.detectedType,
          scanId: scanResult.scanId,
          processingTime: Date.now() - startTime,
          endpoint: req.url
        }
      });

      return {
        success: true,
        fileId: processingResult.fileId,
        fileHash: processingResult.fileHash,
        detectedType: processingResult.detectedType,
        sanitizedBuffer: processingResult.sanitizedBuffer,
        scanResult: scanResult,
        metadata: processingResult.metadata,
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      console.error('File upload processing error:', error);
      return {
        success: false,
        errors: ['File upload processing failed'],
        error: error.message,
        stage: 'processing_error'
      };
    }
  }

  /**
   * Extract file from request (supports multiple upload libraries)
   */
  extractFileFromRequest(req) {
    // Check for multer file
    if (req.file) {
      return req.file;
    }

    // Check for multer files array
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      return req.files[0];
    }

    // Check for multer files object
    if (req.files && typeof req.files === 'object') {
      const fileKeys = Object.keys(req.files);
      if (fileKeys.length > 0) {
        const files = req.files[fileKeys[0]];
        return Array.isArray(files) ? files[0] : files;
      }
    }

    // Check for formidable files
    if (req.body && req.body.files) {
      const files = req.body.files;
      if (Array.isArray(files) && files.length > 0) {
        return files[0];
      }
      if (typeof files === 'object') {
        const fileKeys = Object.keys(files);
        if (fileKeys.length > 0) {
          return files[fileKeys[0]];
        }
      }
    }

    return null;
  }

  /**
   * Log upload failure
   */
  async logUploadFailure(req, file, result, stage) {
    await securityAuditLogger.logEvent({
      type: 'file_upload_failure',
      severity: result.quarantined ? securityAuditLogger.severityLevels.HIGH : securityAuditLogger.severityLevels.MEDIUM,
      userId: req.user?.userId,
      ipAddress: req.headers['x-forwarded-for'] || req.connection?.remoteAddress,
      userAgent: req.headers['user-agent'],
      details: {
        fileName: file.originalFilename || file.name,
        fileSize: file.size,
        mimeType: file.mimetype,
        errors: result.errors,
        threats: result.threats,
        quarantined: result.quarantined,
        stage: stage,
        endpoint: req.url
      },
      threats: result.threats || []
    });
  }

  /**
   * Generate unique upload ID
   */
  generateUploadId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `upload_${timestamp}_${random}`;
  }

  /**
   * Get upload statistics
   */
  getStatistics() {
    return {
      activeUploads: this.activeUploads.size,
      maxConcurrentUploads: this.maxConcurrentUploads,
      fileProcessorStats: this.fileProcessor.stats || {},
      malwareScannerStats: this.malwareScanner.getStatistics()
    };
  }
}

// Create singleton instance
const secureFileUploadMiddleware = new SecureFileUploadMiddleware();

/**
 * Factory function to create secure file upload middleware
 */
function createSecureFileUpload(options = {}) {
  // Apply rate limiting first
  const rateLimitedHandler = uploadRateLimit(secureFileUploadMiddleware.createMiddleware(options));
  
  return rateLimitedHandler;
}

/**
 * Predefined middleware for common file types
 */
const secureImageUpload = createSecureFileUpload({ expectedType: 'image' });
const secureDocumentUpload = createSecureFileUpload({ expectedType: 'document' });
const secureVideoUpload = createSecureFileUpload({ expectedType: 'video' });

module.exports = {
  createSecureFileUpload,
  secureImageUpload,
  secureDocumentUpload,
  secureVideoUpload,
  secureFileUploadMiddleware
};