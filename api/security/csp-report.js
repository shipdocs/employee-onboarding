const { db } = require('../../lib/database');
const { apiRateLimit } = require('../../lib/rateLimit');

/**
 * Rate limiting for CSP violation reports
 * Prevents abuse of the reporting endpoint
 */
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REPORTS = 10; // Max 10 reports per minute per IP

/**
 * Get client IP address from request
 * @param {Object} req - Request object
 * @returns {string} Client IP address
 */
function getClientIP(req) {
  return req.headers['x-forwarded-for'] ||
         req.headers['x-real-ip'] ||
         req.connection?.remoteAddress ||
         req.socket?.remoteAddress ||
         'unknown';
}

/**
 * Check if request is rate limited
 * @param {string} ip - Client IP address
 * @returns {boolean} True if rate limited
 */
function isRateLimited(ip) {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW;

  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, []);
  }

  const requests = rateLimitMap.get(ip);

  // Remove old requests outside the window
  const recentRequests = requests.filter(timestamp => timestamp > windowStart);
  rateLimitMap.set(ip, recentRequests);

  // Check if limit exceeded
  if (recentRequests.length >= RATE_LIMIT_MAX_REPORTS) {
    return true;
  }

  // Add current request
  recentRequests.push(now);
  rateLimitMap.set(ip, recentRequests);

  return false;
}

/**
 * Validate and sanitize CSP violation report
 * @param {Object} report - Raw violation report
 * @returns {Object} Sanitized report or null if invalid
 */
function validateViolationReport(report) {
  if (!report || typeof report !== 'object') {
    return null;
  }

  // Required fields for a valid CSP report
  const requiredFields = ['violated-directive', 'blocked-uri'];
  for (const field of requiredFields) {
    if (!report[field]) {
      return null;
    }
  }

  // Sanitize and validate fields
  const sanitized = {
    violatedDirective: String(report['violated-directive']).substring(0, 200),
    blockedUri: String(report['blocked-uri']).substring(0, 500),
    documentUri: report['document-uri'] ? String(report['document-uri']).substring(0, 500) : null,
    referrer: report['referrer'] ? String(report['referrer']).substring(0, 500) : null,
    sourceFile: report['source-file'] ? String(report['source-file']).substring(0, 500) : null,
    lineNumber: report['line-number'] ? parseInt(report['line-number']) : null,
    columnNumber: report['column-number'] ? parseInt(report['column-number']) : null,
    statusCode: report['status-code'] ? parseInt(report['status-code']) : null,
    effectiveDirective: report['effective-directive'] ? String(report['effective-directive']).substring(0, 200) : null
  };

  // Additional validation
  if (sanitized.lineNumber && (sanitized.lineNumber < 0 || sanitized.lineNumber > 1000000)) {
    sanitized.lineNumber = null;
  }

  if (sanitized.columnNumber && (sanitized.columnNumber < 0 || sanitized.columnNumber > 10000)) {
    sanitized.columnNumber = null;
  }

  return sanitized;
}

/**
 * Log CSP violation to database
 * @param {Object} violation - Sanitized violation report
 * @param {Object} metadata - Additional metadata
 */
async function logViolation(violation, metadata) {
  try {
    const logEntry = {
      violated_directive: violation.violatedDirective,
      blocked_uri: violation.blockedUri,
      document_uri: violation.documentUri,
      referrer: violation.referrer,
      source_file: violation.sourceFile,
      line_number: violation.lineNumber,
      column_number: violation.columnNumber,
      status_code: violation.statusCode,
      effective_directive: violation.effectiveDirective,
      user_agent: metadata.userAgent,
      ip_address: metadata.ip,
      timestamp: metadata.timestamp,
      environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'unknown'
    };

    // Insert into audit_log table with CSP-specific action
    await supabase
      .from('audit_log')
      .insert({
        action: 'csp_violation',
        resource_type: 'security',
        details: logEntry,
        created_at: new Date().toISOString()
      });

  } catch (error) {
    console.error('Failed to log CSP violation:', error);
    // Don't throw error - violation reporting should not break the application
  }
}

/**
 * Analyze violation for potential security threats
 * @param {Object} violation - Violation report
 * @returns {Object} Analysis result
 */
function analyzeViolation(violation) {
  const analysis = {
    severity: 'low',
    category: 'unknown',
    potentialThreat: false,
    recommendations: []
  };

  // Check for potential XSS attempts
  if (violation.blockedUri.includes('javascript:') ||
      violation.blockedUri.includes('data:text/html') ||
      violation.blockedUri.includes('<script')) {
    analysis.severity = 'high';
    analysis.category = 'xss_attempt';
    analysis.potentialThreat = true;
    analysis.recommendations.push('Potential XSS attack detected - review source');
  }

  // Check for external script injection
  if (violation.violatedDirective.includes('script-src') &&
      !violation.blockedUri.startsWith('https://cdn.jsdelivr.net') &&
      !violation.blockedUri.startsWith('https://unpkg.com') &&
      violation.blockedUri.startsWith('http')) {
    analysis.severity = 'medium';
    analysis.category = 'external_script';
    analysis.potentialThreat = true;
    analysis.recommendations.push('External script blocked - verify if legitimate');
  }

  // Check for inline violations (might indicate compromised content)
  if (violation.blockedUri === 'inline' || violation.blockedUri === 'eval') {
    analysis.severity = 'medium';
    analysis.category = 'inline_violation';
    analysis.recommendations.push('Inline content blocked - consider using nonces');
  }

  return analysis;
}

/**
 * Main CSP violation report handler
 */
module.exports = apiRateLimit(async function handler(req, res) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const clientIP = getClientIP(req);

  // Check rate limiting
  if (isRateLimited(clientIP)) {
    console.warn(`CSP violation report rate limited for IP: ${clientIP}`);
    return res.status(429).json({ error: 'Too many reports' });
  }

  try {
    // Parse violation report
    const rawReport = req.body['csp-report'];
    if (!rawReport) {
      return res.status(400).json({ error: 'Missing csp-report' });
    }

    // Validate and sanitize report
    const violation = validateViolationReport(rawReport);
    if (!violation) {
      return res.status(400).json({ error: 'Invalid violation report' });
    }

    // Analyze violation for security threats
    const analysis = analyzeViolation(violation);

    // Prepare metadata
    const metadata = {
      userAgent: req.headers['user-agent'] || 'unknown',
      ip: clientIP,
      timestamp: new Date().toISOString(),
      analysis
    };

    // Log violation
    await logViolation(violation, metadata);

    // Log high-severity violations to console for immediate attention
    if (analysis.severity === 'high') {
      console.warn('HIGH SEVERITY CSP VIOLATION:', {
        directive: violation.violatedDirective,
        uri: violation.blockedUri,
        document: violation.documentUri,
        analysis: analysis
      });
    }

    // Return success (204 No Content as per CSP spec)
    res.status(204).end();

  } catch (error) {
    console.error('CSP violation report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
