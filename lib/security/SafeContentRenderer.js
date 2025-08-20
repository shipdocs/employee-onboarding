/**
 * SafeContentRenderer - Secure content rendering component
 * Replaces all innerHTML and dangerouslySetInnerHTML usage with secure alternatives
 */

const DOMPurify = require('isomorphic-dompurify');

// Optional import for SecurityAuditLogger to avoid dependency issues in tests
let logSecurityEvent;
try {
  logSecurityEvent = require('./SecurityAuditLogger').logSecurityEvent;
} catch (error) {
  // Fallback for testing or when SecurityAuditLogger is not available
  logSecurityEvent = async () => {
    console.warn('SecurityAuditLogger not available, skipping security event logging');
    return true;
  };
}

/**
 * Configuration for different content types
 */
const CONTENT_CONFIGS = {
  default: {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'id'],
    ALLOW_DATA_ATTR: false,
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'textarea', 'select', 'button'],
    FORBID_ATTR: ['onclick', 'onload', 'onerror', 'onmouseover', 'onfocus', 'onblur', 'onchange', 'onsubmit']
  },

  rich_text: {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre', 'img', 'div'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'id', 'src', 'alt', 'width', 'height', 'style'],
    ALLOW_DATA_ATTR: false,
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'textarea', 'select', 'button', 'iframe'],
    FORBID_ATTR: ['onclick', 'onload', 'onerror', 'onmouseover', 'onfocus', 'onblur', 'onchange', 'onsubmit']
  },

  minimal: {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em'],
    ALLOWED_ATTR: [],
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'textarea', 'select', 'button', 'iframe', 'img', 'a'],
    FORBID_ATTR: ['onclick', 'onload', 'onerror', 'onmouseover', 'onfocus', 'onblur', 'onchange', 'onsubmit', 'style', 'href']
  }
};

/**
 * XSS attack patterns for detection
 */
const XSS_PATTERNS = [
  /<script[^>]*>.*?<\/script>/gi,
  /javascript:/gi,
  /\son\w+\s*=/gi,  // More specific - only match event handlers in attributes
  /<iframe[^>]*>/gi,
  /<object[^>]*>/gi,
  /<embed[^>]*>/gi,
  /<form[^>]*>/gi,
  /expression\s*\(/gi,
  /vbscript:/gi,
  /data:(?:text|image)\/(?:html|svg|xml|x-)?(?:;base64)?/gi,
  /<meta[^>]*http-equiv/gi,
  /@import\s+url\(/gi,
  /\ssrcdoc\s*=/gi
];

class SafeContentRenderer {
  /**
   * Sanitize content and return just the sanitized string (for backward compatibility)
   * @param {string} content - Raw HTML content to sanitize
   * @param {object} options - Sanitization options
   * @returns {string} - Sanitized content string
   */
  static sanitizeAndRender(content, options = {}) {
    const result = this.sanitizeAndRenderDetailed(content, options);
    return result.sanitizedContent;
  }

  /**
   * Sanitize and render content safely with detailed results
   * @param {string} content - Raw HTML content to sanitize
   * @param {object} options - Sanitization options
   * @returns {object} - Sanitized content and validation results
   */
  static sanitizeAndRenderDetailed(content, options = {}) {
    const {
      contentType = 'default',
      maxLength = 50000,
      allowCustomConfig = false,
      source = 'unknown',
      userId = null
    } = options;

    // Input validation
    if (!content || typeof content !== 'string') {
      return {
        sanitizedContent: '',
        isValid: true,
        warnings: [],
        xssAttempts: []
      };
    }

    // Length check
    if (content.length > maxLength) {
      return {
        sanitizedContent: '',
        isValid: false,
        warnings: [`Content exceeds maximum length of ${maxLength} characters`],
        xssAttempts: []
      };
    }

    // Detect XSS attempts before sanitization
    const xssDetection = this.detectXSSAttempts(content);
    const xssAttempts = xssDetection.threats;

    // Log XSS attempts if found
    if (xssDetection.hasXSS) {
      this.logXSSAttempts(content, xssAttempts, source, userId);
    }

    // Get sanitization configuration with secure merging
    const base = CONTENT_CONFIGS[contentType] || CONTENT_CONFIGS.default;
    let config = { ...base };

    if (allowCustomConfig && options.customConfig) {
      const custom = options.customConfig;
      // Union-merge allowed lists, preserving base restrictions
      if (Array.isArray(custom.ALLOWED_TAGS)) {
        config.ALLOWED_TAGS = Array.from(new Set([...(base.ALLOWED_TAGS || []), ...custom.ALLOWED_TAGS]));
      }
      if (Array.isArray(custom.ALLOWED_ATTR)) {
        config.ALLOWED_ATTR = Array.from(new Set([...(base.ALLOWED_ATTR || []), ...custom.ALLOWED_ATTR]));
      }
      // Never relax forbidden lists; always enforce base forbids
      if (Array.isArray(base.FORBID_TAGS)) {
        config.FORBID_TAGS = base.FORBID_TAGS.slice();
      }
      if (Array.isArray(base.FORBID_ATTR)) {
        config.FORBID_ATTR = base.FORBID_ATTR.slice();
      }
      // Always enforce safe URI regexp
      if (base.ALLOWED_URI_REGEXP) {
        config.ALLOWED_URI_REGEXP = base.ALLOWED_URI_REGEXP;
      }
      // Copy over other safe flags; do not allow enabling data attrs if base forbids
      config.ALLOW_DATA_ATTR = Boolean(base.ALLOW_DATA_ATTR && custom.ALLOW_DATA_ATTR);
    }

    // Sanitize content
    let sanitizedContent;
    try {
      sanitizedContent = DOMPurify.sanitize(content, config);
    } catch (error) {
      console.error('DOMPurify sanitization error:', error);
      return {
        sanitizedContent: '',
        isValid: false,
        warnings: ['Content sanitization failed'],
        xssAttempts
      };
    }

    // Additional validation
    const warnings = [];

    // Check if content was significantly modified
    const originalLength = content.length;
    const sanitizedLength = sanitizedContent.length;
    const reductionPercentage = ((originalLength - sanitizedLength) / originalLength) * 100;

    if (reductionPercentage > 50) {
      warnings.push('Content was significantly modified during sanitization');
    }

    // Validate sanitized content doesn't contain critical XSS patterns
    // Only check for the most dangerous patterns that should never survive sanitization
    const criticalPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
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
      return {
        sanitizedContent: '',
        isValid: false,
        warnings: ['Content contains critical unsafe patterns after sanitization'],
        xssAttempts: [...xssAttempts, ...remainingCriticalXSS]
      };
    }

    return {
      sanitizedContent,
      isValid: true,
      warnings,
      xssAttempts
    };
  }

  /**
   * Validate content without sanitization
   * @param {string} content - Content to validate
   * @returns {object} - Validation results
   */
  static validateContent(content) {
    if (!content || typeof content !== 'string') {
      return {
        isValid: true,
        xssAttempts: [],
        warnings: []
      };
    }

    const xssDetection = this.detectXSSAttempts(content);

    return {
      isValid: !xssDetection.hasXSS,
      xssAttempts: xssDetection.threats,
      warnings: xssDetection.hasXSS ? ['Content contains potential XSS patterns'] : []
    };
  }

  /**
   * Detect XSS attempts in content
   * @param {string} content - Content to analyze
   * @returns {object} - Object with hasXSS boolean and threats array
   */
  static detectXSSAttempts(content) {
    const attempts = [];

    XSS_PATTERNS.forEach((pattern, index) => {
      const matches = content.match(pattern);
      if (matches) {
        attempts.push({
          pattern: pattern.toString(),
          matches: matches,
          severity: this.getXSSSeverity(pattern),
          patternIndex: index
        });
      }
    });

    return {
      hasXSS: attempts.length > 0,
      threats: attempts
    };
  }

  /**
   * Get severity level for XSS pattern
   * @param {RegExp} pattern - XSS pattern
   * @returns {string} - Severity level
   */
  static getXSSSeverity(pattern) {
    const patternString = pattern.toString();

    if (patternString.includes('script') || patternString.includes('javascript')) {
      return 'critical';
    }
    if (patternString.includes('iframe') || patternString.includes('object') || patternString.includes('embed')) {
      return 'high';
    }
    if (patternString.includes('on\\w+') || patternString.includes('expression')) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Log XSS attempts for security monitoring
   * @param {string} content - Original content
   * @param {array} xssAttempts - Detected XSS attempts
   * @param {string} source - Source of the content
   * @param {string} userId - User ID if available
   */
  static async logXSSAttempts(content, xssAttempts, source, userId) {
    try {
      const highestSeverity = xssAttempts.reduce((max, attempt) => {
        const severityLevels = { low: 1, medium: 2, high: 3, critical: 4 };
        return severityLevels[attempt.severity] > severityLevels[max] ? attempt.severity : max;
      }, 'low');

      if (logSecurityEvent) {
        await logSecurityEvent({
          type: 'xss_attempt',
          severity: highestSeverity,
          userId,
          details: {
            source,
            contentLength: content.length,
            xssAttempts: xssAttempts.map(attempt => ({
              pattern: attempt.pattern,
              severity: attempt.severity,
              matchCount: attempt.matches.length,
              matches: attempt.matches.slice(0, 3) // Limit logged matches
            })),
            contentPreview: content.substring(0, 200) + (content.length > 200 ? '...' : ''),
            timestamp: new Date().toISOString()
          },
          threats: ['xss_injection', 'content_injection']
        });
      }
    } catch (error) {
      console.error('Failed to log XSS attempts:', error);
    }
  }

  /**
   * Create safe HTML for React components
   * @param {string} content - Content to render
   * @param {object} options - Rendering options
   * @returns {object} - Object safe for dangerouslySetInnerHTML (if absolutely necessary)
   */
  static createSafeHTML(content, options = {}) {
    const result = this.sanitizeAndRender(content, options);

    if (!result.isValid) {
      console.warn('Content failed validation, returning empty HTML');
      return { __html: '' };
    }

    return { __html: result.sanitizedContent };
  }

  /**
   * Sanitize text content (strip all HTML)
   * @param {string} content - Content to sanitize
   * @returns {string} - Plain text content
   */
  static sanitizeText(content) {
    if (!content || typeof content !== 'string') {
      return '';
    }

    // Remove all HTML tags and decode HTML entities
    const textOnly = DOMPurify.sanitize(content, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true
    });

    // Additional cleanup
    return textOnly
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .trim();
  }

  /**
   * Get available content types
   * @returns {array} - Array of available content type names
   */
  static getAvailableContentTypes() {
    return Object.keys(CONTENT_CONFIGS);
  }

  /**
   * Get configuration for a content type
   * @param {string} contentType - Content type name
   * @returns {object} - Configuration object
   */
  static getContentTypeConfig(contentType) {
    return CONTENT_CONFIGS[contentType] || CONTENT_CONFIGS.default;
  }
}

module.exports = SafeContentRenderer;
