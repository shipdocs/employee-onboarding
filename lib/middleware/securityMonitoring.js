// Enhanced Security Monitoring Middleware
const { supabase } = require('../supabase');

/**
 * Enhanced security monitoring middleware that detects various attack patterns
 * and logs them to the security_events table for admin dashboard visibility
 */

// Attack pattern detection rules
const ATTACK_PATTERNS = {
  SQL_INJECTION: [
    /(\bUNION\b.*\bSELECT\b)/i,
    /(\bSELECT\b.*\bFROM\b.*\bWHERE\b)/i,
    /(\bINSERT\b.*\bINTO\b)/i,
    /(\bDROP\b.*\bTABLE\b)/i,
    /(\bDELETE\b.*\bFROM\b)/i,
    /(\bUPDATE\b.*\bSET\b)/i,
    /('.*OR.*'.*=.*')/i,
    /('.*AND.*'.*=.*')/i,
    /(--|\#|\/\*)/,
    /(\bOR\b.*1.*=.*1)/i,
    /(\bAND\b.*1.*=.*1)/i
  ],
  
  XSS_ATTEMPTS: [
    /<script[^>]*>.*?<\/script>/i,
    /<iframe[^>]*>.*?<\/iframe>/i,
    /<object[^>]*>.*?<\/object>/i,
    /<embed[^>]*>/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<img[^>]*onerror[^>]*>/i,
    /<svg[^>]*onload[^>]*>/i,
    /alert\s*\(/i,
    /document\.cookie/i,
    /window\.location/i
  ],
  
  DIRECTORY_TRAVERSAL: [
    /\.\.\/\.\.\//,
    /\.\.\\\.\.\\/, 
    /%2e%2e%2f/i,
    /%2e%2e%5c/i,
    /\/etc\/passwd/i,
    /\/proc\/self\/environ/i,
    /\/windows\/system32/i,
    /\.\.%2f/i,
    /\.\.%5c/i
  ],
  
  COMMAND_INJECTION: [
    /;\s*(cat|ls|pwd|whoami|id|uname)/i,
    /\|\s*(cat|ls|pwd|whoami|id|uname)/i,
    /`.*`/,
    /\$\(.*\)/,
    /&&\s*(cat|ls|pwd|whoami|id|uname)/i,
    /\|\|\s*(cat|ls|pwd|whoami|id|uname)/i
  ],
  
  CORS_VIOLATIONS: [
    // These will be detected by checking Origin header against allowed origins
  ],
  
  SUSPICIOUS_USER_AGENTS: [
    /sqlmap/i,
    /nikto/i,
    /nmap/i,
    /burp/i,
    /zap/i,
    /acunetix/i,
    /nessus/i,
    /openvas/i,
    /w3af/i,
    /havij/i
  ]
};

/**
 * Generate a unique event ID
 */
function generateEventId(type) {
  return `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get client IP address from request
 */
function getClientIP(req) {
  return req.headers['x-forwarded-for'] || 
         req.headers['x-real-ip'] || 
         req.connection?.remoteAddress || 
         req.socket?.remoteAddress || 
         'unknown';
}

/**
 * Detect attack patterns in a string
 */
function detectAttackPatterns(input, patterns) {
  const detected = [];
  for (const pattern of patterns) {
    if (pattern.test(input)) {
      detected.push(pattern.toString());
    }
  }
  return detected;
}

/**
 * Check for CORS violations
 */
function checkCORSViolation(req) {
  const origin = req.headers.origin;
  if (!origin) return null;
  
  const allowedOrigins = [
    'https://maritime-onboarding.example.com',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001'
  ];
  
  // Add Vercel preview URLs dynamically
  if (process.env.VERCEL_URL) {
    allowedOrigins.push(`https://${process.env.VERCEL_URL}`);
  }
  
  // In development, allow localhost origins
  if (process.env.NODE_ENV === 'development') {
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return null;
    }
  }
  
  if (!allowedOrigins.includes(origin)) {
    return {
      type: 'cors_violation',
      origin: origin,
      allowedOrigins: allowedOrigins
    };
  }
  
  return null;
}

/**
 * Log security event to database
 */
async function logSecurityEvent(eventData) {
  try {
    const { error } = await supabase
      .from('security_events')
      .insert(eventData);
      
    if (error) {
      console.error('Failed to log security event:', error);
    }
  } catch (err) {
    console.error('Security logging error:', err);
  }
}

/**
 * Main security monitoring middleware
 */
function securityMonitoringMiddleware(req, res, next) {
  const startTime = Date.now();
  const clientIP = getClientIP(req);
  const userAgent = req.headers['user-agent'] || 'unknown';
  const method = req.method;
  const url = req.url;
  const origin = req.headers.origin;
  
  // Collect all input data for analysis
  const inputData = {
    url: url,
    query: JSON.stringify(req.query || {}),
    body: typeof req.body === 'object' ? JSON.stringify(req.body) : (req.body || ''),
    headers: JSON.stringify(req.headers)
  };
  
  const allInput = Object.values(inputData).join(' ');
  
  // Detect various attack patterns
  const detectedThreats = [];
  const attackDetails = {};
  
  // SQL Injection detection
  const sqlPatterns = detectAttackPatterns(allInput, ATTACK_PATTERNS.SQL_INJECTION);
  if (sqlPatterns.length > 0) {
    detectedThreats.push('sql_injection_attempt');
    attackDetails.sql_patterns = sqlPatterns;
  }
  
  // XSS detection
  const xssPatterns = detectAttackPatterns(allInput, ATTACK_PATTERNS.XSS_ATTEMPTS);
  if (xssPatterns.length > 0) {
    detectedThreats.push('xss_attempt');
    attackDetails.xss_patterns = xssPatterns;
  }
  
  // Directory traversal detection
  const traversalPatterns = detectAttackPatterns(allInput, ATTACK_PATTERNS.DIRECTORY_TRAVERSAL);
  if (traversalPatterns.length > 0) {
    detectedThreats.push('directory_traversal_attempt');
    attackDetails.traversal_patterns = traversalPatterns;
  }
  
  // Command injection detection
  const commandPatterns = detectAttackPatterns(allInput, ATTACK_PATTERNS.COMMAND_INJECTION);
  if (commandPatterns.length > 0) {
    detectedThreats.push('command_injection_attempt');
    attackDetails.command_patterns = commandPatterns;
  }
  
  // Suspicious user agent detection
  const suspiciousUA = detectAttackPatterns(userAgent, ATTACK_PATTERNS.SUSPICIOUS_USER_AGENTS);
  if (suspiciousUA.length > 0) {
    detectedThreats.push('suspicious_user_agent');
    attackDetails.suspicious_ua_patterns = suspiciousUA;
  }
  
  // CORS violation detection
  const corsViolation = checkCORSViolation(req);
  if (corsViolation) {
    detectedThreats.push('cors_violation');
    attackDetails.cors_violation = corsViolation;
  }
  
  // Rate limiting detection (if too many requests from same IP)
  // This will be handled by the rate limiting middleware
  
  // Log security events if threats detected
  if (detectedThreats.length > 0) {
    const severity = detectedThreats.includes('sql_injection_attempt') || 
                    detectedThreats.includes('command_injection_attempt') ? 'high' : 
                    detectedThreats.includes('xss_attempt') || 
                    detectedThreats.includes('directory_traversal_attempt') ? 'medium' : 'low';
    
    // Log asynchronously to not block the request
    setTimeout(() => {
      logSecurityEvent({
        event_id: generateEventId('security_threat'),
        type: 'security_threat_detected',
        severity: severity,
        user_id: req.user?.id || null,
        ip_address: clientIP,
        user_agent: userAgent,
        details: {
          method: method,
          url: url,
          origin: origin,
          threats: detectedThreats,
          attack_details: attackDetails,
          timestamp: new Date().toISOString(),
          request_data: inputData
        },
        threats: detectedThreats
      });
    }, 0);
  }
  
  // Continue with the request
  if (typeof next === 'function') {
    next();
  }
}

module.exports = {
  securityMonitoringMiddleware,
  detectAttackPatterns,
  checkCORSViolation,
  logSecurityEvent,
  ATTACK_PATTERNS
};
