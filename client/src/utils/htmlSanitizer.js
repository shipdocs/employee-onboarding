import DOMPurify from 'dompurify';

/**
 * HTML Sanitization Utility
 * Provides safe HTML sanitization for user-generated content
 */

/**
 * Default configuration for training content
 * Allows safe HTML tags while preventing XSS attacks
 */
const DEFAULT_CONFIG = {
  ALLOWED_TAGS: [
    // Text formatting
    'p', 'br', 'strong', 'em', 'u', 'b', 'i', 's', 'sub', 'sup',
    // Headings
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    // Lists
    'ul', 'ol', 'li',
    // Quotes and blocks
    'blockquote', 'div', 'span',
    // Links and media (with restrictions)
    'a', 'img',
    // Tables (for structured content)
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    // Code (for technical content)
    'code', 'pre'
  ],
  ALLOWED_ATTR: [
    // Link attributes
    'href', 'title', 'target',
    // Image attributes
    'alt', 'src', 'width', 'height',
    // Styling (limited)
    'class', 'id',
    // Table attributes
    'colspan', 'rowspan'
  ],
  // Only allow safe URLs
  ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|data):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  // Explicitly forbid dangerous tags
  FORBID_TAGS: [
    'script', 'object', 'embed', 'form', 'input', 'button', 'textarea',
    'select', 'option', 'iframe', 'frame', 'frameset', 'noframes',
    'meta', 'link', 'style', 'base', 'head', 'html', 'body'
  ],
  // Forbid all event handlers and dangerous attributes
  FORBID_ATTR: [
    'onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur',
    'onchange', 'onsubmit', 'onreset', 'onselect', 'onunload', 'onabort',
    'onkeydown', 'onkeypress', 'onkeyup', 'onmousedown', 'onmouseup',
    'onmousemove', 'onmouseout', 'oncontextmenu', 'ondblclick',
    'ondrag', 'ondragend', 'ondragenter', 'ondragleave', 'ondragover',
    'ondragstart', 'ondrop', 'onscroll', 'onwheel', 'ontouchstart',
    'ontouchend', 'ontouchmove', 'ontouchcancel', 'style'
  ],
  KEEP_CONTENT: true,
  RETURN_DOM: false,
  RETURN_DOM_FRAGMENT: false,
  RETURN_DOM_IMPORT: false
};

/**
 * Strict configuration for user input
 * More restrictive for content that comes directly from users
 */
const STRICT_CONFIG = {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li'],
  ALLOWED_ATTR: [],
  FORBID_TAGS: ['script', 'object', 'embed', 'iframe', 'form', 'input'],
  FORBID_ATTR: ['style', 'class', 'id'],
  KEEP_CONTENT: true
};

/**
 * Permissive configuration for admin content
 * Allows more formatting options for administrative content
 */
const PERMISSIVE_CONFIG = {
  ...DEFAULT_CONFIG,
  ALLOWED_TAGS: [
    ...DEFAULT_CONFIG.ALLOWED_TAGS,
    'hr', 'small', 'mark', 'del', 'ins', 'abbr', 'cite', 'q'
  ],
  ALLOWED_ATTR: [
    ...DEFAULT_CONFIG.ALLOWED_ATTR,
    'style' // Allow inline styles for admin content
  ]
};

/**
 * Sanitize HTML content with default configuration
 * @param {string} html - HTML content to sanitize
 * @param {Object} customConfig - Optional custom DOMPurify configuration
 * @returns {string} Sanitized HTML content
 */
export function sanitizeHTML(html, customConfig = null) {
  if (!html || typeof html !== 'string') {
    return '';
  }

  const config = customConfig || DEFAULT_CONFIG;

  try {
    return DOMPurify.sanitize(html, config);
  } catch (error) {
    // console.error('HTML sanitization failed:', error);
    // Return empty string if sanitization fails
    return '';
  }
}

/**
 * Sanitize HTML with strict configuration for user input
 * @param {string} html - HTML content to sanitize
 * @returns {string} Sanitized HTML content
 */
export function sanitizeUserHTML(html) {
  return sanitizeHTML(html, STRICT_CONFIG);
}

/**
 * Sanitize HTML with permissive configuration for admin content
 * @param {string} html - HTML content to sanitize
 * @returns {string} Sanitized HTML content
 */
export function sanitizeAdminHTML(html) {
  return sanitizeHTML(html, PERMISSIVE_CONFIG);
}

/**
 * Sanitize training content specifically
 * Optimized for educational content with proper formatting
 * @param {string} html - HTML content to sanitize
 * @returns {string} Sanitized HTML content
 */
export function sanitizeTrainingContent(html) {
  const trainingConfig = {
    ...DEFAULT_CONFIG,
    // Allow additional educational formatting
    ALLOWED_TAGS: [
      ...DEFAULT_CONFIG.ALLOWED_TAGS,
      'hr', 'small', 'mark', 'del', 'ins', 'abbr', 'cite', 'q',
      'details', 'summary' // For collapsible content
    ],
    // Allow data attributes for interactive elements
    ALLOWED_ATTR: [
      ...DEFAULT_CONFIG.ALLOWED_ATTR,
      'data-*'
    ]
  };

  return sanitizeHTML(html, trainingConfig);
}

/**
 * Strip all HTML tags and return plain text
 * @param {string} html - HTML content to strip
 * @returns {string} Plain text content
 */
export function stripHTML(html) {
  if (!html || typeof html !== 'string') {
    return '';
  }

  try {
    // Use DOMPurify to strip all tags
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true
    });
  } catch (error) {
    // console.error('HTML stripping failed:', error);
    // Fallback: use regex to remove HTML tags (less safe but better than nothing)
    return html.replace(/<[^>]*>/g, '');
  }
}

/**
 * Validate if HTML content is safe (doesn't contain dangerous elements)
 * @param {string} html - HTML content to validate
 * @returns {boolean} True if content is safe, false otherwise
 */
export function isHTMLSafe(html) {
  if (!html || typeof html !== 'string') {
    return true;
  }

  try {
    // Enhanced security checks
    const dangerousPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=\s*["'][^"']*["']/gi,
      /<iframe[^>]*>/gi,
      /<object[^>]*>/gi,
      /<embed[^>]*>/gi,
      /<form[^>]*>/gi,
      /<input[^>]*>/gi,
      /<button[^>]*>/gi,
      /data:text\/html/gi,
      /vbscript:/gi,
      /expression\s*\(/gi,
      /@import/gi,
      /url\s*\(\s*["']?javascript:/gi
    ];

    // Check for dangerous patterns
    for (const pattern of dangerousPatterns) {
      if (pattern.test(html)) {
        // console.warn('Dangerous HTML pattern detected:', pattern);
        return false;
      }
    }

    // Additional check: compare with sanitized version
    const sanitized = sanitizeHTML(html);
    const lengthDifference = Math.abs(html.length - sanitized.length);
    const maxAllowedDifference = html.length * 0.1; // Allow 10% difference for normal sanitization

    if (lengthDifference > maxAllowedDifference) {
      // console.warn('Significant content removed during sanitization, content may be unsafe');
      return false;
    }

    return true;
  } catch (error) {
    // console.error('HTML safety validation failed:', error);
    return false;
  }
}

/**
 * Get a summary of what was removed during sanitization
 * Useful for debugging and content validation
 * @param {string} html - Original HTML content
 * @returns {Object} Summary of sanitization results
 */
export function getSanitizationSummary(html) {
  if (!html || typeof html !== 'string') {
    return { original: '', sanitized: '', removed: [], safe: true };
  }

  try {
    const sanitized = sanitizeHTML(html);
    const originalLength = html.length;
    const sanitizedLength = sanitized.length;
    const reductionPercentage = Math.round(((originalLength - sanitizedLength) / originalLength) * 100);

    return {
      original: html,
      sanitized: sanitized,
      originalLength,
      sanitizedLength,
      reductionPercentage,
      safe: reductionPercentage < 10, // Consider safe if less than 10% was removed
      significantChanges: reductionPercentage > 25
    };
  } catch (error) {
    // console.error('Sanitization summary failed:', error);
    return {
      original: html,
      sanitized: '',
      safe: false,
      error: error.message
    };
  }
}

// Default export
export default {
  sanitizeHTML,
  sanitizeUserHTML,
  sanitizeAdminHTML,
  sanitizeTrainingContent,
  stripHTML,
  isHTMLSafe,
  getSanitizationSummary
};
