// lib/security/cspSecurity.js - Content Security Policy utilities

const crypto = require('crypto');

/**
 * Generates a cryptographically secure nonce for CSP
 * @returns {string} Base64 encoded nonce
 */
function generateNonce() {
  return crypto.randomBytes(16).toString('base64');
}

/**
 * Creates a CSP header with nonce support
 * @param {Object} options - CSP configuration options
 * @returns {string} CSP header value
 */
function createCSPHeader(options = {}) {
  const {
    nonce = null,
    environment = process.env.NODE_ENV || 'production',
    allowUnsafeInline = false, // Only for development
    allowUnsafeEval = false    // Only for development
  } = options;

  const directives = [];

  // Default source
  directives.push("default-src 'self'");

  // Script source - NEVER allow unsafe-inline for scripts
  let scriptSrc = ["'self'"];
  if (nonce) {
    scriptSrc.push(`'nonce-${nonce}'`);
  }
  // Only allow unsafe-eval in development for React error overlay
  if (allowUnsafeEval && environment === 'development') {
    scriptSrc.push("'unsafe-eval'");
  }
  // Add trusted script sources
  scriptSrc.push(
    'https://cdn.jsdelivr.net',
    'https://unpkg.com',
    'https://vercel.live',
    'https://*.shipdocs-projects.vercel.app'
  );
  directives.push(`script-src ${scriptSrc.join(' ')}`);

  // Style source - Allow unsafe-inline for Material-UI/Emotion
  // This is a necessary compromise for CSS-in-JS libraries
  let styleSrc = ["'self'"];
  if (nonce) {
    styleSrc.push(`'nonce-${nonce}'`);
  }
  // Material-UI/Emotion requires unsafe-inline for styles
  // This is acceptable as style-based XSS is much less dangerous than script-based
  styleSrc.push("'unsafe-inline'");
  styleSrc.push('https://fonts.googleapis.com');
  directives.push(`style-src ${styleSrc.join(' ')}`);

  // Font source
  directives.push("font-src 'self' https://fonts.gstatic.com");

  // Image source
  directives.push([
    "img-src 'self' data: blob:",
    'https://*.supabase.co',
    'https://*.amazonaws.com',
    'https://*.s3.amazonaws.com',
    'https://*.s3.eu-west-1.amazonaws.com'
  ].join(' '));

  // Media source
  directives.push([
    "media-src 'self'",
    'https://*.amazonaws.com',
    'https://*.s3.amazonaws.com',
    'https://*.s3.eu-west-1.amazonaws.com'
  ].join(' '));

  // Connect source
  const connectSrc = [
    "'self'",
    'https://*.supabase.co',
    'wss://*.supabase.co',
    'https://vercel.live',
    'wss://vercel.live',
    'https://*.shipdocs-projects.vercel.app',
    'wss://*.shipdocs-projects.vercel.app'
  ];

  // Add localhost for development
  if (environment === 'development') {
    connectSrc.push(
      'ws://localhost:*',
      'http://localhost:*',
      'ws://192.168.1.35:*',
      'http://192.168.1.35:*'
    );
  }

  directives.push(`connect-src ${connectSrc.join(' ')}`);

  // Other directives
  directives.push("frame-src 'self'");
  directives.push("object-src 'none'");
  directives.push("base-uri 'self'");
  directives.push("form-action 'self'");
  directives.push("frame-ancestors 'none'");
  
  // Only add upgrade-insecure-requests in production
  if (environment === 'production') {
    directives.push("upgrade-insecure-requests");
  }

  // Add CSP reporting endpoint
  if (environment === 'production') {
    directives.push("report-uri /api/security/csp-report");
  }

  return directives.join('; ');
}

/**
 * Middleware to add CSP headers with nonce support
 * @param {Object} options - CSP configuration options
 * @returns {Function} Express middleware function
 */
function cspMiddleware(options = {}) {
  return (req, res, next) => {
    // Generate a unique nonce for this request
    const nonce = generateNonce();
    
    // Store nonce in request for use in templates
    req.cspNonce = nonce;
    
    // Determine environment
    const environment = process.env.NODE_ENV || 'production';
    
    // Create CSP header
    const cspHeader = createCSPHeader({
      nonce,
      environment,
      allowUnsafeInline: environment === 'development' && options.allowUnsafeInlineInDev,
      allowUnsafeEval: environment === 'development' && options.allowUnsafeEvalInDev,
      ...options
    });

    // Set CSP header
    res.setHeader('Content-Security-Policy', cspHeader);

    // Also set other security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    next();
  };
}

/**
 * Creates a CSP violation report handler
 * @param {Object} options - Report handler options
 * @returns {Function} Express route handler
 */
function createCSPReportHandler(options = {}) {
  const { logToConsole = true, logToDatabase = false, supabase = null } = options;

  return async (req, res) => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      const report = req.body;
      
      if (logToConsole) {
        console.warn('🚨 CSP Violation Report:', {
          timestamp: new Date().toISOString(),
          userAgent: req.headers['user-agent'],
          ip: req.ip,
          report: JSON.stringify(report, null, 2)
        });
      }

      if (logToDatabase && supabase) {
        try {
          await supabase
            .from('security_violations')
            .insert({
              type: 'csp_violation',
              user_agent: req.headers['user-agent'],
              ip_address: req.ip,
              report_data: report,
              created_at: new Date().toISOString()
            });
        } catch (dbError) {
          console.error('Failed to log CSP violation to database:', dbError);
        }
      }

      res.status(204).end();
    } catch (error) {
      console.error('Error processing CSP report:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

/**
 * Validates if a style or script tag has the correct nonce
 * @param {string} content - HTML content to validate
 * @param {string} nonce - Expected nonce value
 * @returns {Object} Validation result
 */
function validateNonceUsage(content, nonce) {
  const result = {
    isValid: true,
    issues: [],
    suggestions: []
  };

  // Check for inline scripts without nonce
  const inlineScriptRegex = /<script(?![^>]*src=)[^>]*>/gi;
  const inlineScripts = content.match(inlineScriptRegex) || [];
  
  for (const script of inlineScripts) {
    if (!script.includes(`nonce="${nonce}"`)) {
      result.isValid = false;
      result.issues.push(`Inline script without nonce: ${script.substring(0, 50)}...`);
      result.suggestions.push(`Add nonce="${nonce}" to inline script tags`);
    }
  }

  // Check for inline styles without nonce
  const inlineStyleRegex = /<style[^>]*>/gi;
  const inlineStyles = content.match(inlineStyleRegex) || [];
  
  for (const style of inlineStyles) {
    if (!style.includes(`nonce="${nonce}"`)) {
      result.isValid = false;
      result.issues.push(`Inline style without nonce: ${style.substring(0, 50)}...`);
      result.suggestions.push(`Add nonce="${nonce}" to inline style tags`);
    }
  }

  // Check for style attributes (these won't work with nonce-based CSP)
  const styleAttributeRegex = /style\s*=\s*["'][^"']*["']/gi;
  const styleAttributes = content.match(styleAttributeRegex) || [];
  
  if (styleAttributes.length > 0) {
    result.isValid = false;
    result.issues.push(`Found ${styleAttributes.length} inline style attributes`);
    result.suggestions.push('Move inline styles to CSS classes or use styled-components with nonce');
  }

  return result;
}

module.exports = {
  generateNonce,
  createCSPHeader,
  cspMiddleware,
  createCSPReportHandler,
  validateNonceUsage
};
