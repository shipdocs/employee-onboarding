/**
 * Security Headers Utility
 * Provides consistent security headers across all API routes
 */

// Move crypto import to module level for better performance
const crypto = require('crypto');

/**
 * Generate a cryptographically secure nonce for CSP
 * @returns {string} Base64 encoded nonce
 */
function generateStyleNonce() {
  return crypto.randomBytes(16).toString('base64');
}
/**
 * Apply comprehensive security headers to API responses
 * @param {Object} res - Express/Next.js response object
 * @param {Object} options - Optional configuration
 */
function applySecurityHeaders(res, options = {}) {
  const {
    enableHSTS = true,
    hstsMaxAge = 31536000, // 1 year
    includeSubDomains = true,
    preload = true,
    enableCSP = true,
    enableFrameOptions = true,
    enableContentTypeOptions = true,
    enableReferrerPolicy = true,
    enablePermissionsPolicy = true,
    cspReportOnly = process.env.CSP_REPORT_ONLY === 'true' // Allow report-only mode via env var
  } = options;

  // HTTP Strict Transport Security (HSTS)
  if (enableHSTS) {
    let hstsValue = `max-age=${hstsMaxAge}`;
    if (includeSubDomains) hstsValue += '; includeSubDomains';
    if (preload) hstsValue += '; preload';

    res.setHeader('Strict-Transport-Security', hstsValue);
  }

  // Content Security Policy
  if (enableCSP) {
    // Use the helper function to generate a nonce for inline styles
    const styleNonce = generateStyleNonce();
    const cspDirectives = [
      "default-src 'self'",
      "script-src 'self' https://cdn.jsdelivr.net https://unpkg.com",
      `style-src 'self' 'nonce-${styleNonce}' https://fonts.googleapis.com`,
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://*.supabase.co https://*.amazonaws.com",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'"
    ];

    // Add report-uri if configured
    if (process.env.CSP_REPORT_URI) {
      cspDirectives.push(`report-uri ${process.env.CSP_REPORT_URI}`);
    }

    // Use Report-Only header during transition phase
    const cspHeader = cspReportOnly
      ? 'Content-Security-Policy-Report-Only'
      : 'Content-Security-Policy';

    res.setHeader(cspHeader, cspDirectives.join('; '));

    // Store nonce for use in templates if needed
    res.locals = res.locals || {};
    res.locals.styleNonce = styleNonce;
  }

  // X-Frame-Options
  if (enableFrameOptions) {
    res.setHeader('X-Frame-Options', 'DENY');
  }

  // X-Content-Type-Options
  if (enableContentTypeOptions) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
  }

  // Referrer Policy
  if (enableReferrerPolicy) {
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  }

  // Permissions Policy
  if (enablePermissionsPolicy) {
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  }

  // Additional security headers
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('X-Download-Options', 'noopen');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
}

/**
 * Middleware function for Next.js API routes
 * @param {Function} handler - The API route handler
 * @param {Object} options - Security options
 * @returns {Function} Enhanced handler with security headers
 */
function withSecurityHeaders(handler, options = {}) {
  return async (req, res) => {
    // Apply security headers
    applySecurityHeaders(res, options);

    // Call the original handler
    return handler(req, res);
  };
}

/**
 * CORS-safe security headers for API endpoints
 * @param {Object} res - Response object
 */
function applyApiSecurityHeaders(res) {
  applySecurityHeaders(res, {
    enableCSP: false, // CSP can interfere with API responses
    enableFrameOptions: true,
    enableHSTS: true,
    enableContentTypeOptions: true,
    enableReferrerPolicy: true,
    enablePermissionsPolicy: false // Not needed for API endpoints
  });
}

/**
 * Security headers specifically for file uploads/downloads
 * @param {Object} res - Response object
 */
function applyFileSecurityHeaders(res) {
  applySecurityHeaders(res, {
    enableCSP: false, // Files need different CSP
    enableHSTS: true,
    enableContentTypeOptions: true,
    enableFrameOptions: true
  });

  // Additional headers for file handling
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
}

module.exports = {
  applySecurityHeaders,
  withSecurityHeaders,
  applyApiSecurityHeaders,
  applyFileSecurityHeaders
};
