/**
 * Email Context Extractor
 * Utility for extracting audit context from requests for email logging compliance
 */

/**
 * Extract comprehensive audit context from request and user data
 * @param {Object} req - Express request object
 * @param {Object} user - Authenticated user object
 * @param {Object} options - Additional context options
 * @returns {Object} Audit context for email logging
 */
function extractEmailContext(req, user = null, options = {}) {
  const context = {
    // User identification
    user: user ? {
      id: user.id || user.userId,
      email: user.email,
      role: user.role,
      firstName: user.firstName || user.first_name,
      lastName: user.lastName || user.last_name
    } : null,

    // Network context
    ipAddress: extractClientIP(req),
    userAgent: req?.headers?.['user-agent'] || null,

    // Client context
    clientContext: {
      method: req?.method,
      path: req?.path || req?.url,
      referer: req?.headers?.referer,
      origin: req?.headers?.origin,
      forwardedFor: req?.headers?.['x-forwarded-for'],
      realIP: req?.headers?.['x-real-ip'],
      requestId: req?.requestId || req?.headers?.['x-request-id'],
      correlationId: req?.correlationId || req?.headers?.['x-correlation-id']
    },

    // Email-specific context
    emailType: options.emailType || 'notification',
    retentionCategory: options.retentionCategory || 'standard',
    createdBy: options.createdBy || 'email-service',

    // Additional metadata
    metadata: {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'production',
      service: options.service || 'smtp-email-service',
      ...options.metadata
    }
  };

  return context;
}

/**
 * Extract client IP address from request with proxy support
 * @param {Object} req - Express request object
 * @returns {string|null} Client IP address
 */
function extractClientIP(req) {
  if (!req) return null;

  // Check various headers for real client IP
  const headers = req.headers || {};
  const possibleIPs = [
    headers['x-forwarded-for']?.split(',')[0]?.trim(),
    headers['x-real-ip'],
    headers['x-client-ip'],
    req.connection?.remoteAddress,
    req.socket?.remoteAddress,
    req.ip
  ].filter(Boolean);

  // Return first valid IP
  for (const ip of possibleIPs) {
    if (isValidIP(ip)) {
      return ip;
    }
  }

  return null;
}

/**
 * Validate IP address format
 * @param {string} ip - IP address to validate
 * @returns {boolean} True if valid IP
 */
function isValidIP(ip) {
  if (!ip || typeof ip !== 'string') return false;

  // Handle localhost
  if (ip === 'localhost') return true;

  // Remove IPv6 prefix if present
  const cleanIP = ip.replace(/^::ffff:/, '');

  // IPv4 validation with range checking
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const ipv4Match = cleanIP.match(ipv4Regex);

  if (ipv4Match) {
    // Check if all octets are in valid range (0-255)
    const octets = ipv4Match.slice(1).map(Number);
    return octets.every(octet => octet >= 0 && octet <= 255);
  }

  // Handle IPv6 with prefix - reject these
  if (ip.startsWith('::ffff:')) {
    return false; // We want to validate the cleaned IP, not the prefixed version
  }

  // IPv6 validation (simplified - accepts full format)
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

  return ipv6Regex.test(ip);
}

/**
 * Create email context for API handlers
 * @param {Object} req - Express request object
 * @param {string} emailType - Type of email being sent
 * @param {string} retentionCategory - Data retention category
 * @returns {Object} Email context
 */
function createAPIEmailContext(req, emailType = 'api_notification', retentionCategory = 'standard') {
  return extractEmailContext(req, req.user, {
    emailType,
    retentionCategory,
    createdBy: 'api-handler',
    service: 'api-email-service'
  });
}

/**
 * Create email context for system processes
 * @param {string} emailType - Type of email being sent
 * @param {string} retentionCategory - Data retention category
 * @param {Object} systemContext - System-specific context
 * @returns {Object} Email context
 */
function createSystemEmailContext(emailType = 'system_notification', retentionCategory = 'standard', systemContext = {}) {
  return {
    user: null,
    ipAddress: null,
    userAgent: 'system-process',
    clientContext: {
      method: 'SYSTEM',
      path: systemContext.process || 'background-job',
      requestId: systemContext.jobId || null,
      correlationId: systemContext.correlationId || null
    },
    emailType,
    retentionCategory,
    createdBy: systemContext.service || 'system-process',
    metadata: {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'production',
      service: 'system-email-service',
      processType: systemContext.processType || 'background',
      ...systemContext.metadata
    }
  };
}

/**
 * Create email context for authentication flows
 * @param {Object} req - Express request object
 * @param {string} authType - Type of authentication email
 * @returns {Object} Email context
 */
function createAuthEmailContext(req, authType = 'auth_notification') {
  return extractEmailContext(req, null, {
    emailType: authType,
    retentionCategory: 'extended', // Auth emails kept longer for security
    createdBy: 'auth-service',
    service: 'authentication-service'
  });
}

/**
 * Create email context for compliance-related emails
 * @param {Object} req - Express request object
 * @param {Object} user - User object
 * @param {string} complianceType - Type of compliance email
 * @returns {Object} Email context
 */
function createComplianceEmailContext(req, user, complianceType = 'compliance_notification') {
  return extractEmailContext(req, user, {
    emailType: complianceType,
    retentionCategory: 'permanent', // Compliance emails never expire
    createdBy: 'compliance-service',
    service: 'compliance-email-service'
  });
}

/**
 * Sanitize context for logging (remove sensitive data)
 * @param {Object} context - Email context to sanitize
 * @returns {Object} Sanitized context
 */
function sanitizeEmailContext(context) {
  const sanitized = { ...context };

  // Remove sensitive user data for logging
  if (sanitized.user) {
    delete sanitized.user.password;
    delete sanitized.user.token;
    delete sanitized.user.secret;
  }

  // Remove sensitive headers
  if (sanitized.clientContext) {
    delete sanitized.clientContext.authorization;
    delete sanitized.clientContext.cookie;
    delete sanitized.clientContext.session;
  }

  return sanitized;
}

module.exports = {
  extractEmailContext,
  extractClientIP,
  isValidIP,
  createAPIEmailContext,
  createSystemEmailContext,
  createAuthEmailContext,
  createComplianceEmailContext,
  sanitizeEmailContext
};
