/**
 * SecureDOMPurify - Enhanced DOMPurify wrapper with security logging
 * Provides comprehensive HTML and CSS sanitization with XSS detection and logging
 */

const DOMPurify = require('isomorphic-dompurify');

// Optional import for SecurityAuditLogger to avoid dependency issues in tests
let SecurityAuditLogger;
try {
  SecurityAuditLogger = require('./SecurityAuditLogger');
} catch (error) {
  // Fallback for testing or when SecurityAuditLogger is not available
  SecurityAuditLogger = {
    logSecurityEvent: async () => {
      console.warn('SecurityAuditLogger not available, skipping security event logging');
      return true;
    }
  };
}

/**
 * Enhanced DOMPurify configurations for different security levels
 */
const SECURITY_CONFIGS = {
  strict: {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em'],
    ALLOWED_ATTR: [],
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'textarea', 'select', 'button', 'iframe', 'img', 'a', 'style', 'link'],
    FORBID_ATTR: ['onclick', 'onload', 'onerror', 'onmouseover', 'onfocus', 'onblur', 'onchange', 'onsubmit', 'style', 'href', 'src'],
    KEEP_CONTENT: true,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
    RETURN_DOM_IMPORT: false,
    SANITIZE_DOM: true,
    WHOLE_DOCUMENT: false
  },

  moderate: {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'id'],
    ALLOW_DATA_ATTR: false,
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'textarea', 'select', 'button', 'iframe', 'style', 'link'],
    FORBID_ATTR: ['onclick', 'onload', 'onerror', 'onmouseover', 'onfocus', 'onblur', 'onchange', 'onsubmit', 'style'],
    KEEP_CONTENT: true,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
    RETURN_DOM_IMPORT: false,
    SANITIZE_DOM: true,
    WHOLE_DOCUMENT: false
  },

  permissive: {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'id', 'src', 'alt', 'width', 'height', 'title'],
    ALLOW_DATA_ATTR: false,
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'textarea', 'select', 'button', 'iframe', 'style', 'link'],
    FORBID_ATTR: ['onclick', 'onload', 'onerror', 'onmouseover', 'onfocus', 'onblur', 'onchange', 'onsubmit'],
    KEEP_CONTENT: true,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
    RETURN_DOM_IMPORT: false,
    SANITIZE_DOM: true,
    WHOLE_DOCUMENT: false
  }
};

/**
 * CSS sanitization patterns - dangerous CSS properties and values
 */
const DANGEROUS_CSS_PATTERNS = [
  /expression\s*\([^)]*\)/gi,
  /javascript\s*:[^;)]*[;)]/gi,
  /vbscript\s*:[^;)]*[;)]/gi,
  /data\s*:\s*text\/html[^;)]*[;)]/gi,
  /url\s*\(\s*javascript\s*:[^)]*\)/gi,
  /url\s*\(\s*vbscript\s*:[^)]*\)/gi,
  /url\s*\(\s*data\s*:\s*text\/html[^)]*\)/gi,
  /@import[^;]*;/gi,
  /behavior\s*:[^;]*;/gi,
  /-moz-binding[^;]*;/gi,
  /position\s*:\s*fixed[^;]*;/gi,
  /position\s*:\s*absolute[^;]*;/gi
];

/**
 * XSS detection patterns for enhanced monitoring
 */
const ENHANCED_XSS_PATTERNS = [
  // Script injection patterns
  /<script[^>]*>.*?<\/script>/gis,
  /<script[^>]*\/>/gi,
  /javascript\s*:/gi,
  /vbscript\s*:/gi,
  
  // Event handler patterns
  /on\w+[ \t]*=[ \t]*["'][^"']*["']/gi,
  /on\w+[ \t]*=[ \t]*[^>[ \t]]+/gi,
  
  // Object/embed patterns
  /<(object|embed|applet)[^>]*>/gi,
  /<iframe[^>]*>/gi,
  
  // Form injection patterns
  /<form[^>]*>/gi,
  /<input[^>]*>/gi,
  /<textarea[^>]*>/gi,
  /<select[^>]*>/gi,
  
  // CSS injection patterns
  /<style[^>]*>.*?<\/style>/gis,
  /<link[^>]*stylesheet[^>]*>/gi,
  /expression\s*\(/gi,
  
  // Data URI patterns
  /data\s*:\s*text\/html/gi,
  /data\s*:\s*application\/javascript/gi,
  
  // Meta refresh patterns
  /<meta[^>]*http-equiv\s*=\s*["']?refresh["']?[^>]*>/gi,
  
  // Base href manipulation
  /<base[^>]*href[^>]*>/gi
];

class SecureDOMPurify {
  /**
   * Sanitize HTML content with enhanced security and logging
   * @param {string} input - HTML content to sanitize
   * @param {object} options - Sanitization options
   * @returns {string} - Sanitized HTML content
   */
  static sanitizeHTML(input, options = {}) {
    const {
      securityLevel = 'moderate',
      customConfig = null,
      source = 'unknown',
      userId = null,
      ipAddress = null,
      userAgent = null,
      logXSSAttempts = true
    } = options;

    // Input validation
    if (!input || typeof input !== 'string') {
      return '';
    }

    // Detect XSS attempts before sanitization
    const xssAttempts = this.detectXSSAttempts(input);
    
    // Log XSS attempts if found and logging is enabled
    if (xssAttempts.length > 0 && logXSSAttempts) {
      this.logXSSAttempts(input, xssAttempts, source, userId, ipAddress, userAgent);
    }

    // Get sanitization configuration
    const config = customConfig || SECURITY_CONFIGS[securityLevel] || SECURITY_CONFIGS.moderate;

    // Perform sanitization
    let sanitizedContent;
    try {
      sanitizedContent = DOMPurify.sanitize(input, config);
    } catch (error) {
      console.error('DOMPurify sanitization error:', error);
      
      // Log sanitization failure
      this.logSanitizationFailure(input, error, source, userId);
      
      // Return empty string on failure for security
      return '';
    }

    // Only check for critical XSS patterns that should never survive sanitization
    const criticalPatterns = [
      /<script[^>]*>.*?<\/script>/gis,
      /javascript\s*:/gi,
      /<iframe[^>]*>/gi,
      /<object[^>]*>/gi,
      /<embed[^>]*>/gi
    ];
    
    const remainingCriticalXSS = [];
    criticalPatterns.forEach((pattern, index) => {
      const matches = sanitizedContent.match(pattern);
      if (matches) {
        remainingCriticalXSS.push({
          pattern: pattern.toString(),
          matches: matches,
          severity: 'critical',
          patternIndex: index
        });
      }
    });
    
    if (remainingCriticalXSS.length > 0) {
      console.error('Critical XSS patterns detected after sanitization:', remainingCriticalXSS);
      
      // Log critical security issue
      this.logPostSanitizationXSS(sanitizedContent, remainingCriticalXSS, source, userId);
      
      // Return empty string if critical XSS survived sanitization
      return '';
    }

    return sanitizedContent;
  }

  /**
   * Sanitize CSS content
   * @param {string} input - CSS content to sanitize
   * @param {object} options - Sanitization options
   * @returns {string} - Sanitized CSS content
   */
  static sanitizeCSS(input, options = {}) {
    const {
      source = 'unknown',
      userId = null,
      logAttempts = true
    } = options;

    // Input validation
    if (!input || typeof input !== 'string') {
      return '';
    }

    // Detect dangerous CSS patterns
    const dangerousPatterns = [];
    DANGEROUS_CSS_PATTERNS.forEach((pattern, index) => {
      const matches = input.match(pattern);
      if (matches) {
        dangerousPatterns.push({
          pattern: pattern.toString(),
          matches: matches,
          patternIndex: index
        });
      }
    });

    // Log dangerous CSS attempts
    if (dangerousPatterns.length > 0 && logAttempts) {
      this.logDangerousCSS(input, dangerousPatterns, source, userId);
    }

    // Remove dangerous patterns
    let sanitizedCSS = input;
    DANGEROUS_CSS_PATTERNS.forEach(pattern => {
      sanitizedCSS = sanitizedCSS.replace(pattern, '');
    });

    // Additional CSS sanitization - more comprehensive patterns
    sanitizedCSS = sanitizedCSS
      .replace(/\/\*.*?\*\//gs, '') // Remove comments
      .replace(/@import[^;]+;/gi, '') // Remove @import statements
      .replace(/expression\s*\([^)]*\)/gi, '') // Remove CSS expressions
      .replace(/javascript\s*:[^;\s)]*[^;)]*/gi, '') // Remove javascript: URLs (improved pattern)
      .replace(/vbscript\s*:[^;\s)]*[^;)]*/gi, '') // Remove vbscript: URLs (improved pattern)
      .replace(/url\s*\(\s*javascript\s*:[^)]*\)/gi, 'url()') // Remove javascript URLs in url()
      .replace(/url\s*\(\s*vbscript\s*:[^)]*\)/gi, 'url()') // Remove vbscript URLs in url()
      .replace(/url\s*\(\s*data\s*:\s*text\/html[^)]*\)/gi, 'url()') // Remove data:text/html URLs
      .trim();

    return sanitizedCSS;
  }

  /**
   * Validate if content is safe (without sanitization)
   * @param {string} content - Content to validate
   * @param {object} options - Validation options
   * @returns {object} - Validation results
   */
  static validateSafeContent(content, options = {}) {
    const {
      securityLevel = 'moderate',
      source = 'unknown'
    } = options;

    if (!content || typeof content !== 'string') {
      return {
        isSafe: true,
        xssAttempts: [],
        warnings: []
      };
    }

    // Detect XSS attempts
    const xssAttempts = this.detectXSSAttempts(content);
    
    // Check against security level requirements
    const config = SECURITY_CONFIGS[securityLevel] || SECURITY_CONFIGS.moderate;
    const warnings = [];

    // Check for forbidden tags
    if (config.FORBID_TAGS) {
      config.FORBID_TAGS.forEach(tag => {
        const tagPattern = new RegExp(`<${tag}[^>]*>`, 'gi');
        if (tagPattern.test(content)) {
          warnings.push(`Contains forbidden tag: ${tag}`);
        }
      });
    }

    // Check for forbidden attributes
    if (config.FORBID_ATTR) {
      config.FORBID_ATTR.forEach(attr => {
        const attrPattern = new RegExp(`${attr}\\s*=`, 'gi');
        if (attrPattern.test(content)) {
          warnings.push(`Contains forbidden attribute: ${attr}`);
        }
      });
    }

    return {
      isSafe: xssAttempts.length === 0 && warnings.length === 0,
      xssAttempts,
      warnings,
      securityLevel,
      source
    };
  }

  /**
   * Detect XSS attempts in content
   * @param {string} content - Content to analyze
   * @returns {array} - Array of detected XSS patterns
   */
  static detectXSSAttempts(content) {
    const attempts = [];
    
    ENHANCED_XSS_PATTERNS.forEach((pattern, index) => {
      const matches = content.match(pattern);
      if (matches) {
        attempts.push({
          pattern: pattern.toString(),
          matches: matches.slice(0, 5), // Limit matches for logging
          severity: this.getXSSSeverity(pattern),
          patternIndex: index,
          category: this.getXSSCategory(pattern)
        });
      }
    });

    return attempts;
  }

  /**
   * Get XSS severity level based on pattern
   * @param {RegExp} pattern - XSS pattern
   * @returns {string} - Severity level
   */
  static getXSSSeverity(pattern) {
    const patternString = pattern.toString().toLowerCase();
    
    if (patternString.includes('script') || patternString.includes('javascript') || patternString.includes('vbscript')) {
      return 'critical';
    }
    if (patternString.includes('iframe') || patternString.includes('object') || patternString.includes('embed') || patternString.includes('form')) {
      return 'high';
    }
    if (patternString.includes('on\\w+') || patternString.includes('expression') || patternString.includes('style')) {
      return 'medium';
    }
    
    return 'low';
  }

  /**
   * Get XSS category based on pattern
   * @param {RegExp} pattern - XSS pattern
   * @returns {string} - XSS category
   */
  static getXSSCategory(pattern) {
    const patternString = pattern.toString().toLowerCase();
    
    if (patternString.includes('script')) return 'script_injection';
    if (patternString.includes('on\\w+')) return 'event_handler';
    if (patternString.includes('iframe') || patternString.includes('object') || patternString.includes('embed')) return 'object_injection';
    if (patternString.includes('form') || patternString.includes('input')) return 'form_injection';
    if (patternString.includes('style') || patternString.includes('expression')) return 'css_injection';
    if (patternString.includes('data:')) return 'data_uri';
    if (patternString.includes('meta') || patternString.includes('base')) return 'meta_manipulation';
    
    return 'unknown';
  }

  /**
   * Log XSS attempts for security monitoring
   * @param {string} content - Original content
   * @param {array} xssAttempts - Detected XSS attempts
   * @param {string} source - Source of the content
   * @param {string} userId - User ID if available
   * @param {string} ipAddress - IP address if available
   * @param {string} userAgent - User agent if available
   */
  static async logXSSAttempts(content, xssAttempts, source, userId, ipAddress, userAgent) {
    try {
      const highestSeverity = xssAttempts.reduce((max, attempt) => {
        const severityLevels = { low: 1, medium: 2, high: 3, critical: 4 };
        return severityLevels[attempt.severity] > severityLevels[max] ? attempt.severity : max;
      }, 'low');

      await SecurityAuditLogger.logSecurityEvent({
        type: 'xss_attempt',
        severity: highestSeverity,
        userId,
        ipAddress,
        userAgent,
        details: {
          source,
          contentLength: content.length,
          xssAttempts: xssAttempts.map(attempt => ({
            pattern: attempt.pattern,
            severity: attempt.severity,
            category: attempt.category,
            matchCount: attempt.matches.length,
            matches: attempt.matches.slice(0, 3) // Limit logged matches
          })),
          contentPreview: content.substring(0, 200) + (content.length > 200 ? '...' : ''),
          timestamp: new Date().toISOString(),
          sanitizationMethod: 'SecureDOMPurify'
        },
        threats: ['xss_injection', 'content_injection']
      });
    } catch (error) {
      console.error('Failed to log XSS attempts:', error);
    }
  }

  /**
   * Log dangerous CSS patterns
   * @param {string} content - Original CSS content
   * @param {array} dangerousPatterns - Detected dangerous patterns
   * @param {string} source - Source of the content
   * @param {string} userId - User ID if available
   */
  static async logDangerousCSS(content, dangerousPatterns, source, userId) {
    try {
      await SecurityAuditLogger.logSecurityEvent({
        type: 'css_injection_attempt',
        severity: 'medium',
        userId,
        details: {
          source,
          contentLength: content.length,
          dangerousPatterns: dangerousPatterns.map(pattern => ({
            pattern: pattern.pattern,
            matchCount: pattern.matches.length,
            matches: pattern.matches.slice(0, 3)
          })),
          contentPreview: content.substring(0, 200) + (content.length > 200 ? '...' : ''),
          timestamp: new Date().toISOString()
        },
        threats: ['css_injection', 'content_injection']
      });
    } catch (error) {
      console.error('Failed to log dangerous CSS:', error);
    }
  }

  /**
   * Log sanitization failures
   * @param {string} content - Original content
   * @param {Error} error - Sanitization error
   * @param {string} source - Source of the content
   * @param {string} userId - User ID if available
   */
  static async logSanitizationFailure(content, error, source, userId) {
    try {
      await SecurityAuditLogger.logSecurityEvent({
        type: 'sanitization_failure',
        severity: 'high',
        userId,
        details: {
          source,
          contentLength: content.length,
          error: error.message,
          stack: error.stack,
          contentPreview: content.substring(0, 200) + (content.length > 200 ? '...' : ''),
          timestamp: new Date().toISOString()
        },
        threats: ['sanitization_bypass']
      });
    } catch (logError) {
      console.error('Failed to log sanitization failure:', logError);
    }
  }

  /**
   * Log XSS patterns that survived sanitization (critical security issue)
   * @param {string} sanitizedContent - Content after sanitization
   * @param {array} xssAttempts - XSS patterns found after sanitization
   * @param {string} source - Source of the content
   * @param {string} userId - User ID if available
   */
  static async logPostSanitizationXSS(sanitizedContent, xssAttempts, source, userId) {
    try {
      await SecurityAuditLogger.logSecurityEvent({
        type: 'sanitization_bypass',
        severity: 'critical',
        userId,
        details: {
          source,
          sanitizedContentLength: sanitizedContent.length,
          xssAttempts: xssAttempts.map(attempt => ({
            pattern: attempt.pattern,
            severity: attempt.severity,
            category: attempt.category,
            matches: attempt.matches
          })),
          sanitizedContent: sanitizedContent.substring(0, 500) + (sanitizedContent.length > 500 ? '...' : ''),
          timestamp: new Date().toISOString(),
          criticalAlert: true
        },
        threats: ['sanitization_bypass', 'xss_injection']
      });
    } catch (error) {
      console.error('Failed to log post-sanitization XSS:', error);
    }
  }

  /**
   * Get available security levels
   * @returns {array} - Array of available security level names
   */
  static getAvailableSecurityLevels() {
    return Object.keys(SECURITY_CONFIGS);
  }

  /**
   * Get configuration for a security level
   * @param {string} securityLevel - Security level name
   * @returns {object} - Configuration object
   */
  static getSecurityLevelConfig(securityLevel) {
    return SECURITY_CONFIGS[securityLevel] || SECURITY_CONFIGS.moderate;
  }

  /**
   * Create a custom configuration by merging with existing level
   * @param {string} baseLevel - Base security level
   * @param {object} overrides - Configuration overrides
   * @returns {object} - Merged configuration
   */
  static createCustomConfig(baseLevel, overrides) {
    const baseConfig = SECURITY_CONFIGS[baseLevel] || SECURITY_CONFIGS.moderate;
    return { ...baseConfig, ...overrides };
  }

  /**
   * Log XSS attempts (simple interface for backward compatibility)
   * @param {string} content - Original content
   * @param {array} xssAttempts - Detected XSS attempts
   * @param {string} source - Source of the content
   * @param {string} userId - User ID if available
   */
  static async logXSSAttempts(content, xssAttempts, source, userId) {
    // Call the full method with null values for optional parameters
    try {
      const highestSeverity = xssAttempts.reduce((max, attempt) => {
        const severityLevels = { low: 1, medium: 2, high: 3, critical: 4 };
        return severityLevels[attempt.severity] > severityLevels[max] ? attempt.severity : max;
      }, 'low');

      await SecurityAuditLogger.logSecurityEvent({
        type: 'xss_attempt',
        severity: highestSeverity,
        userId,
        details: {
          source,
          contentLength: content.length,
          xssAttempts: xssAttempts.map(attempt => ({
            pattern: attempt.pattern,
            severity: attempt.severity,
            category: attempt.category || 'unknown',
            matchCount: attempt.matches ? attempt.matches.length : 0,
            matches: attempt.matches ? attempt.matches.slice(0, 3) : []
          })),
          contentPreview: content.substring(0, 200) + (content.length > 200 ? '...' : ''),
          timestamp: new Date().toISOString(),
          sanitizationMethod: 'SecureDOMPurify'
        },
        threats: ['xss_injection', 'content_injection']
      });
    } catch (error) {
      console.error('Failed to log XSS attempts:', error);
    }
  }
}

module.exports = SecureDOMPurify;