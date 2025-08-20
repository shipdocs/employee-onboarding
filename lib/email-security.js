// lib/email-security.js - Comprehensive email security controls
// Provides domain validation, rate limiting, content sanitization, and security monitoring

const { supabase } = require('./supabase');
const DOMPurify = require('isomorphic-dompurify');
const crypto = require('crypto');

// Security configuration with strict defaults
const SECURITY_CONFIG = {
  // Domain security settings
  domains: {
    // Whitelisted domains for production email sending
    whitelist: [
      'shipdocs.app',
      'maritime-onboarding.example.com',
      'gmail.com',
      'outlook.com',
      'hotmail.com',
      'yahoo.com',
      'protonmail.com',
      'company.com', // Replace with actual company domains
    ],
    // Blacklisted domains that should never receive emails
    blacklist: [
      'tempmail.com',
      'guerrillamail.com',
      'mailinator.com',
      '10minutemail.com',
      'throwaway.email',
      'test.com',
      'example.com',
      'localhost',
    ],
    // Maritime organizations to protect from test emails
    protectedOrganizations: [
      'imo.org',
      'mardep.gov.hk',
      'mpa.gov.sg',
      'amsa.gov.au',
      'dma.dk',
      'ship-technology.com',
      'maritime-executive.com',
      'lloydslist.com',
      'dnv.com',
      'classnk.or.jp',
      'lr.org',
      'bureauveritas.com',
      'rina.org',
      'uscg.mil',
    ]
  },
  
  // Rate limiting configuration
  rateLimits: {
    perRecipientPerHour: 5,
    perRecipientPerDay: 20,
    globalPerMinute: 30,
    globalPerHour: 500,
    globalPerDay: 2000,
    burstProtection: {
      windowSeconds: 60,
      maxBurst: 10
    }
  },
  
  // Content security settings
  contentSecurity: {
    maxSubjectLength: 200,
    maxBodyLength: 50000, // 50KB
    maxAttachmentSize: 10485760, // 10MB
    maxAttachments: 5,
    allowedAttachmentTypes: [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    forbiddenPatterns: [
      /<script[^>]*>.*?<\/script>/gi,
      /<iframe[^>]*>.*?<\/iframe>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi, // Event handlers
      /<object[^>]*>.*?<\/object>/gi,
      /<embed[^>]*>/gi,
    ]
  },
  
  // Environment-specific settings
  environments: {
    development: {
      interceptEmails: true,
      redirectTo: 'dev-team@shipdocs.app',
      subjectPrefix: '[DEV] ',
      allowedDomains: ['shipdocs.app', 'localhost'],
    },
    staging: {
      interceptEmails: true,
      redirectTo: 'staging-team@shipdocs.app',
      subjectPrefix: '[STAGING] ',
      allowedDomains: ['shipdocs.app'],
    },
    production: {
      interceptEmails: false,
      redirectTo: null,
      subjectPrefix: '',
      allowedDomains: null, // Use main whitelist
    }
  },
  
  // API key rotation settings
  apiKeys: {
    rotationIntervalDays: 90,
    warningDays: 14,
    maxActiveKeys: 3,
  }
};

class EmailSecurityService {
  constructor() {
    this.environment = process.env.NODE_ENV || 'development';
    this.rateLimitCache = new Map();
    this.securityLog = [];
    this.apiKeyRotationEnabled = false;
  }

  // Initialize security service
  async initialize() {
    // Create security tables if they don't exist
    await this.createSecurityTables();
    
    // Load custom security rules from database
    await this.loadCustomSecurityRules();
    
    // Initialize rate limit cleanup
    this.startRateLimitCleanup();
    
    // Initialize API key rotation monitoring
    if (this.apiKeyRotationEnabled) {
      await this.initializeApiKeyRotation();
    }
    
    console.log('✅ Email security service initialized');
  }

  // Create necessary security tables
  async createSecurityTables() {
    try {
      // Email security logs table
      const { error: logsError } = await supabase.rpc('create_table_if_not_exists', {
        table_sql: `
          CREATE TABLE IF NOT EXISTS email_security_logs (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            event_type VARCHAR(50) NOT NULL,
            recipient_email VARCHAR(255),
            sender_email VARCHAR(255),
            subject TEXT,
            security_action VARCHAR(50),
            reason TEXT,
            metadata JSONB,
            environment VARCHAR(50),
            ip_address VARCHAR(45),
            user_agent TEXT
          );
          
          CREATE INDEX IF NOT EXISTS idx_security_logs_timestamp ON email_security_logs(timestamp);
          CREATE INDEX IF NOT EXISTS idx_security_logs_recipient ON email_security_logs(recipient_email);
          CREATE INDEX IF NOT EXISTS idx_security_logs_event_type ON email_security_logs(event_type);
        `
      });

      // Rate limit tracking table
      const { error: rateLimitError } = await supabase.rpc('create_table_if_not_exists', {
        table_sql: `
          CREATE TABLE IF NOT EXISTS email_rate_limits (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            identifier VARCHAR(255) NOT NULL,
            limit_type VARCHAR(50) NOT NULL,
            count INTEGER DEFAULT 0,
            window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            window_end TIMESTAMP WITH TIME ZONE,
            last_attempt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(identifier, limit_type)
          );
          
          CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier ON email_rate_limits(identifier);
          CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON email_rate_limits(window_end);
        `
      });

      // API key management table
      const { error: apiKeyError } = await supabase.rpc('create_table_if_not_exists', {
        table_sql: `
          CREATE TABLE IF NOT EXISTS email_api_keys (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            key_hash VARCHAR(255) NOT NULL UNIQUE,
            provider VARCHAR(50) NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            expires_at TIMESTAMP WITH TIME ZONE,
            last_used_at TIMESTAMP WITH TIME ZONE,
            is_active BOOLEAN DEFAULT TRUE,
            rotation_reminder_sent BOOLEAN DEFAULT FALSE,
            usage_count INTEGER DEFAULT 0,
            metadata JSONB
          );
          
          CREATE INDEX IF NOT EXISTS idx_api_keys_active ON email_api_keys(is_active);
          CREATE INDEX IF NOT EXISTS idx_api_keys_expires ON email_api_keys(expires_at);
        `
      });

      // Custom security rules table
      const { error: rulesError } = await supabase.rpc('create_table_if_not_exists', {
        table_sql: `
          CREATE TABLE IF NOT EXISTS email_security_rules (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            rule_type VARCHAR(50) NOT NULL,
            rule_value TEXT NOT NULL,
            action VARCHAR(50) NOT NULL,
            reason TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            created_by UUID,
            is_active BOOLEAN DEFAULT TRUE,
            priority INTEGER DEFAULT 0
          );
          
          CREATE INDEX IF NOT EXISTS idx_security_rules_type ON email_security_rules(rule_type);
          CREATE INDEX IF NOT EXISTS idx_security_rules_active ON email_security_rules(is_active);
        `
      });

    } catch (error) {
      console.error('Error creating security tables:', error);
      // Continue operation even if table creation fails
    }
  }

  // Load custom security rules from database
  async loadCustomSecurityRules() {
    try {
      const { data: rules, error } = await supabase
        .from('email_security_rules')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false });

      if (!error && rules) {
        rules.forEach(rule => {
          switch (rule.rule_type) {
            case 'domain_whitelist':
              SECURITY_CONFIG.domains.whitelist.push(rule.rule_value);
              break;
            case 'domain_blacklist':
              SECURITY_CONFIG.domains.blacklist.push(rule.rule_value);
              break;
            case 'protected_organization':
              SECURITY_CONFIG.domains.protectedOrganizations.push(rule.rule_value);
              break;
          }
        });
      }
    } catch (error) {
      console.error('Error loading custom security rules:', error);
    }
  }

  // Validate recipient email address
  async validateRecipient(email, options = {}) {
    const validationResult = {
      valid: false,
      reason: null,
      sanitizedEmail: null,
      securityFlags: []
    };

    try {
      // Basic email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        validationResult.reason = 'Invalid email format';
        await this.logSecurityEvent('invalid_email_format', { email });
        return validationResult;
      }

      // Normalize and sanitize email
      const normalizedEmail = email.toLowerCase().trim();
      const [localPart, domain] = normalizedEmail.split('@');

      // Check domain blacklist
      if (this.isDomainBlacklisted(domain)) {
        validationResult.reason = 'Domain is blacklisted';
        validationResult.securityFlags.push('blacklisted_domain');
        await this.logSecurityEvent('blacklisted_domain', { email: normalizedEmail, domain });
        return validationResult;
      }

      // Check protected organizations
      if (this.isProtectedOrganization(domain) && !options.allowProtected) {
        validationResult.reason = 'Protected organization domain';
        validationResult.securityFlags.push('protected_organization');
        await this.logSecurityEvent('protected_organization', { email: normalizedEmail, domain });
        return validationResult;
      }

      // Environment-specific validation
      const envConfig = SECURITY_CONFIG.environments[this.environment];
      if (envConfig.allowedDomains && !envConfig.allowedDomains.includes(domain)) {
        validationResult.reason = `Domain not allowed in ${this.environment} environment`;
        validationResult.securityFlags.push('environment_restriction');
        await this.logSecurityEvent('environment_restriction', { 
          email: normalizedEmail, 
          domain,
          environment: this.environment 
        });
        return validationResult;
      }

      // Check domain whitelist (optional)
      if (options.requireWhitelist && !this.isDomainWhitelisted(domain)) {
        validationResult.reason = 'Domain not whitelisted';
        validationResult.securityFlags.push('not_whitelisted');
        await this.logSecurityEvent('not_whitelisted', { email: normalizedEmail, domain });
        return validationResult;
      }

      // Check for suspicious patterns
      const suspiciousPatterns = [
        /test\d*/i,
        /demo\d*/i,
        /example/i,
        /noreply/i,
        /donotreply/i,
      ];

      for (const pattern of suspiciousPatterns) {
        if (pattern.test(localPart)) {
          validationResult.securityFlags.push('suspicious_pattern');
          break;
        }
      }

      validationResult.valid = true;
      validationResult.sanitizedEmail = normalizedEmail;
      
      return validationResult;

    } catch (error) {
      console.error('Error validating recipient:', error);
      validationResult.reason = 'Validation error';
      return validationResult;
    }
  }

  // Check if domain is blacklisted
  isDomainBlacklisted(domain) {
    return SECURITY_CONFIG.domains.blacklist.some(blacklisted => 
      domain.endsWith(blacklisted)
    );
  }

  // Check if domain is whitelisted
  isDomainWhitelisted(domain) {
    return SECURITY_CONFIG.domains.whitelist.some(whitelisted => 
      domain.endsWith(whitelisted)
    );
  }

  // Check if domain belongs to protected organization
  isProtectedOrganization(domain) {
    return SECURITY_CONFIG.domains.protectedOrganizations.some(protectedDomain =>
      domain.endsWith(protectedDomain)
    );
  }

  // Rate limiting check
  async checkRateLimit(identifier, type = 'recipient') {
    const limits = SECURITY_CONFIG.rateLimits;
    const now = new Date();
    
    try {
      // Check burst protection first
      const burstKey = `burst:${identifier}`;
      const burstWindow = this.rateLimitCache.get(burstKey) || { count: 0, windowStart: now };
      
      if (now - burstWindow.windowStart < limits.burstProtection.windowSeconds * 1000) {
        if (burstWindow.count >= limits.burstProtection.maxBurst) {
          await this.logSecurityEvent('rate_limit_burst', { identifier, type });
          return { allowed: false, reason: 'Burst limit exceeded' };
        }
        burstWindow.count++;
      } else {
        burstWindow.count = 1;
        burstWindow.windowStart = now;
      }
      this.rateLimitCache.set(burstKey, burstWindow);

      // Check database rate limits
      if (type === 'recipient') {
        // Per-recipient hourly limit
        const hourlyLimit = await this.checkDatabaseRateLimit(
          identifier,
          'hourly',
          limits.perRecipientPerHour,
          60 * 60 * 1000
        );
        if (!hourlyLimit.allowed) return hourlyLimit;

        // Per-recipient daily limit
        const dailyLimit = await this.checkDatabaseRateLimit(
          identifier,
          'daily',
          limits.perRecipientPerDay,
          24 * 60 * 60 * 1000
        );
        if (!dailyLimit.allowed) return dailyLimit;
      }

      // Global rate limits
      const globalHourly = await this.checkDatabaseRateLimit(
        'global',
        'hourly',
        limits.globalPerHour,
        60 * 60 * 1000
      );
      if (!globalHourly.allowed) return globalHourly;

      const globalDaily = await this.checkDatabaseRateLimit(
        'global',
        'daily',
        limits.globalPerDay,
        24 * 60 * 60 * 1000
      );
      if (!globalDaily.allowed) return globalDaily;

      return { allowed: true };

    } catch (error) {
      console.error('Error checking rate limit:', error);
      // Fail open in case of errors
      return { allowed: true };
    }
  }

  // Check rate limit in database
  async checkDatabaseRateLimit(identifier, limitType, maxCount, windowMs) {
    const now = new Date();
    const windowEnd = new Date(now.getTime() + windowMs);
    
    try {
      // Get or create rate limit record
      const { data: rateLimit, error: fetchError } = await supabase
        .from('email_rate_limits')
        .select('*')
        .eq('identifier', identifier)
        .eq('limit_type', limitType)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (rateLimit) {
        // Check if window has expired
        if (new Date(rateLimit.window_end) < now) {
          // Reset window
          const { error: updateError } = await supabase
            .from('email_rate_limits')
            .update({
              count: 1,
              window_start: now,
              window_end: windowEnd,
              last_attempt: now
            })
            .eq('id', rateLimit.id);

          if (updateError) throw updateError;
          return { allowed: true };
        }

        // Check if limit exceeded
        if (rateLimit.count >= maxCount) {
          await this.logSecurityEvent('rate_limit_exceeded', {
            identifier,
            limitType,
            count: rateLimit.count,
            maxCount
          });
          return { 
            allowed: false, 
            reason: `${limitType} rate limit exceeded`,
            resetAt: rateLimit.window_end
          };
        }

        // Increment counter
        const { error: incrementError } = await supabase
          .from('email_rate_limits')
          .update({
            count: rateLimit.count + 1,
            last_attempt: now
          })
          .eq('id', rateLimit.id);

        if (incrementError) throw incrementError;
        return { allowed: true };

      } else {
        // Create new rate limit record
        const { error: insertError } = await supabase
          .from('email_rate_limits')
          .insert({
            identifier,
            limit_type: limitType,
            count: 1,
            window_start: now,
            window_end: windowEnd,
            last_attempt: now
          });

        if (insertError) throw insertError;
        return { allowed: true };
      }

    } catch (error) {
      console.error('Error checking database rate limit:', error);
      return { allowed: true }; // Fail open
    }
  }

  // Sanitize email content
  sanitizeContent(content, type = 'html') {
    try {
      // Remove any script tags and dangerous content
      let sanitized = DOMPurify.sanitize(content, {
        ALLOWED_TAGS: [
          'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          'ul', 'ol', 'li', 'blockquote', 'a', 'img', 'table', 'thead', 'tbody',
          'tr', 'td', 'th', 'div', 'span', 'style'
        ],
        ALLOWED_ATTR: [
          'href', 'src', 'alt', 'title', 'width', 'height', 'style',
          'class', 'id', 'target', 'rel'
        ],
        ALLOW_DATA_ATTR: false,
        FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form'],
        FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover']
      });

      // Additional security checks
      const securityConfig = SECURITY_CONFIG.contentSecurity;
      
      // Check for forbidden patterns
      for (const pattern of securityConfig.forbiddenPatterns) {
        if (pattern.test(sanitized)) {
          console.warn('Forbidden pattern detected in email content');
          sanitized = sanitized.replace(pattern, '');
        }
      }

      // Check content length
      if (sanitized.length > securityConfig.maxBodyLength) {
        console.warn('Email content exceeds maximum length');
        sanitized = sanitized.substring(0, securityConfig.maxBodyLength);
      }

      return sanitized;

    } catch (error) {
      console.error('Error sanitizing content:', error);
      return ''; // Return empty string on error
    }
  }

  // Validate email subject
  validateSubject(subject) {
    const securityConfig = SECURITY_CONFIG.contentSecurity;
    
    // Check length
    if (subject.length > securityConfig.maxSubjectLength) {
      return {
        valid: false,
        reason: 'Subject too long',
        sanitized: subject.substring(0, securityConfig.maxSubjectLength)
      };
    }

    // Check for injection attempts
    const dangerousPatterns = [
      /[\r\n]/g, // Newlines (header injection)
      /[<>]/g,   // HTML tags
      /javascript:/gi,
      /data:/gi
    ];

    let sanitized = subject;
    for (const pattern of dangerousPatterns) {
      sanitized = sanitized.replace(pattern, '');
    }

    return {
      valid: true,
      sanitized: sanitized.trim()
    };
  }

  // Intercept emails for non-production environments
  interceptForEnvironment(email, subject) {
    const envConfig = SECURITY_CONFIG.environments[this.environment];
    
    if (envConfig.interceptEmails && envConfig.redirectTo) {
      return {
        email: envConfig.redirectTo,
        subject: `${envConfig.subjectPrefix}${subject}`,
        intercepted: true,
        originalEmail: email
      };
    }

    return {
      email,
      subject,
      intercepted: false
    };
  }

  // Log security events
  async logSecurityEvent(eventType, details = {}) {
    try {
      const logEntry = {
        event_type: eventType,
        timestamp: new Date().toISOString(),
        environment: this.environment,
        ...details,
        metadata: {
          user_agent: details.userAgent || 'system',
          ip_address: details.ipAddress || 'unknown',
          ...details.metadata
        }
      };

      // Store in memory for recent events
      this.securityLog.push(logEntry);
      if (this.securityLog.length > 1000) {
        this.securityLog.shift();
      }

      // Store in database
      const { error } = await supabase
        .from('email_security_logs')
        .insert(logEntry);

      if (error) {
        console.error('Error logging security event:', error);
      }

      // Alert on critical events
      if (this.isCriticalEvent(eventType)) {
        await this.alertSecurityTeam(eventType, details);
      }

    } catch (error) {
      console.error('Error in security logging:', error);
    }
  }

  // Check if event is critical
  isCriticalEvent(eventType) {
    const criticalEvents = [
      'rate_limit_burst',
      'injection_attempt',
      'api_key_compromised',
      'mass_email_attempt',
      'protected_organization'
    ];
    return criticalEvents.includes(eventType);
  }

  // Alert security team
  async alertSecurityTeam(eventType, details) {
    // Implementation depends on alerting system
    console.warn(`🚨 SECURITY ALERT: ${eventType}`, details);
    // Could integrate with Slack, PagerDuty, etc.
  }

  // API Key Management
  async rotateApiKey(provider) {
    try {
      // Generate new API key hash
      const newKeyHash = crypto.randomBytes(32).toString('hex');
      
      // Store new key
      const { data: newKey, error: insertError } = await supabase
        .from('email_api_keys')
        .insert({
          key_hash: newKeyHash,
          provider,
          expires_at: new Date(Date.now() + SECURITY_CONFIG.apiKeys.rotationIntervalDays * 24 * 60 * 60 * 1000)
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Deactivate old keys after grace period
      setTimeout(async () => {
        const { error: deactivateError } = await supabase
          .from('email_api_keys')
          .update({ is_active: false })
          .eq('provider', provider)
          .neq('id', newKey.id);

        if (deactivateError) {
          console.error('Error deactivating old API keys:', deactivateError);
        }
      }, 24 * 60 * 60 * 1000); // 24 hour grace period

      await this.logSecurityEvent('api_key_rotated', { provider });
      
      return { success: true, keyId: newKey.id };

    } catch (error) {
      console.error('Error rotating API key:', error);
      return { success: false, error: error.message };
    }
  }

  // Initialize API key rotation monitoring
  async initializeApiKeyRotation() {
    setInterval(async () => {
      try {
        const { data: keys, error } = await supabase
          .from('email_api_keys')
          .select('*')
          .eq('is_active', true);

        if (error) throw error;

        for (const key of keys) {
          const expiresAt = new Date(key.expires_at);
          const now = new Date();
          const daysUntilExpiry = (expiresAt - now) / (24 * 60 * 60 * 1000);

          if (daysUntilExpiry <= SECURITY_CONFIG.apiKeys.warningDays && !key.rotation_reminder_sent) {
            await this.sendRotationReminder(key);
            await supabase
              .from('email_api_keys')
              .update({ rotation_reminder_sent: true })
              .eq('id', key.id);
          }

          if (daysUntilExpiry <= 0) {
            await this.rotateApiKey(key.provider);
          }
        }
      } catch (error) {
        console.error('Error in API key rotation monitoring:', error);
      }
    }, 24 * 60 * 60 * 1000); // Check daily
  }

  // Send API key rotation reminder
  async sendRotationReminder(key) {
    await this.logSecurityEvent('api_key_expiry_warning', {
      provider: key.provider,
      expires_at: key.expires_at
    });
    // Implement actual notification logic here
  }

  // Clean up old rate limit records
  startRateLimitCleanup() {
    setInterval(async () => {
      try {
        const now = new Date();
        
        // Clean up expired rate limits
        const { error } = await supabase
          .from('email_rate_limits')
          .delete()
          .lt('window_end', now.toISOString());

        if (error) {
          console.error('Error cleaning up rate limits:', error);
        }

        // Clean up in-memory cache
        for (const [key, value] of this.rateLimitCache.entries()) {
          if (now - value.windowStart > 3600000) { // 1 hour
            this.rateLimitCache.delete(key);
          }
        }
      } catch (error) {
        console.error('Error in rate limit cleanup:', error);
      }
    }, 60 * 60 * 1000); // Run hourly
  }

  // Get security metrics
  async getSecurityMetrics(timeRange = '24h') {
    try {
      const startTime = this.getStartTime(timeRange);
      
      const { data: logs, error } = await supabase
        .from('email_security_logs')
        .select('event_type, count')
        .gte('timestamp', startTime.toISOString())
        .select('event_type, COUNT(*)');

      if (error) throw error;

      const metrics = {
        totalEvents: 0,
        byEventType: {},
        criticalEvents: 0,
        blockedEmails: 0,
        rateLimitHits: 0
      };

      logs.forEach(log => {
        metrics.totalEvents++;
        metrics.byEventType[log.event_type] = (metrics.byEventType[log.event_type] || 0) + 1;
        
        if (this.isCriticalEvent(log.event_type)) {
          metrics.criticalEvents++;
        }
        
        if (log.event_type.includes('blocked') || log.event_type.includes('rejected')) {
          metrics.blockedEmails++;
        }
        
        if (log.event_type.includes('rate_limit')) {
          metrics.rateLimitHits++;
        }
      });

      return metrics;

    } catch (error) {
      console.error('Error getting security metrics:', error);
      return null;
    }
  }

  // Helper to get start time for metrics
  getStartTime(timeRange) {
    const now = new Date();
    switch (timeRange) {
      case '1h':
        return new Date(now - 60 * 60 * 1000);
      case '24h':
        return new Date(now - 24 * 60 * 60 * 1000);
      case '7d':
        return new Date(now - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now - 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now - 24 * 60 * 60 * 1000);
    }
  }

  // Validate attachments
  validateAttachments(attachments) {
    const config = SECURITY_CONFIG.contentSecurity;
    const validation = {
      valid: true,
      errors: [],
      sanitizedAttachments: []
    };

    if (!Array.isArray(attachments)) {
      validation.valid = false;
      validation.errors.push('Attachments must be an array');
      return validation;
    }

    if (attachments.length > config.maxAttachments) {
      validation.valid = false;
      validation.errors.push(`Too many attachments (max: ${config.maxAttachments})`);
      return validation;
    }

    for (const attachment of attachments) {
      // Check size
      if (attachment.size > config.maxAttachmentSize) {
        validation.errors.push(`Attachment ${attachment.filename} exceeds size limit`);
        continue;
      }

      // Check MIME type
      if (!config.allowedAttachmentTypes.includes(attachment.contentType)) {
        validation.errors.push(`Attachment ${attachment.filename} has disallowed type`);
        continue;
      }

      // Sanitize filename
      const sanitizedFilename = attachment.filename
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .substring(0, 255);

      validation.sanitizedAttachments.push({
        ...attachment,
        filename: sanitizedFilename
      });
    }

    if (validation.errors.length > 0) {
      validation.valid = false;
    }

    return validation;
  }

  // Main security check method
  async performSecurityCheck(emailData) {
    const securityResult = {
      allowed: true,
      modifications: {},
      warnings: [],
      errors: []
    };

    try {
      // 1. Validate recipient
      const recipientValidation = await this.validateRecipient(emailData.to, emailData.options || {});
      if (!recipientValidation.valid) {
        securityResult.allowed = false;
        securityResult.errors.push(recipientValidation.reason);
        return securityResult;
      }
      securityResult.modifications.to = recipientValidation.sanitizedEmail;

      // 2. Check rate limits
      const rateLimit = await this.checkRateLimit(recipientValidation.sanitizedEmail);
      if (!rateLimit.allowed) {
        securityResult.allowed = false;
        securityResult.errors.push(rateLimit.reason);
        return securityResult;
      }

      // 3. Validate and sanitize subject
      const subjectValidation = this.validateSubject(emailData.subject);
      if (!subjectValidation.valid) {
        securityResult.warnings.push(subjectValidation.reason);
      }
      securityResult.modifications.subject = subjectValidation.sanitized;

      // 4. Sanitize content
      if (emailData.html) {
        securityResult.modifications.html = this.sanitizeContent(emailData.html, 'html');
      }
      if (emailData.text) {
        securityResult.modifications.text = this.sanitizeContent(emailData.text, 'text');
      }

      // 5. Validate attachments
      if (emailData.attachments) {
        const attachmentValidation = this.validateAttachments(emailData.attachments);
        if (!attachmentValidation.valid) {
          securityResult.allowed = false;
          securityResult.errors.push(...attachmentValidation.errors);
          return securityResult;
        }
        securityResult.modifications.attachments = attachmentValidation.sanitizedAttachments;
      }

      // 6. Environment interception
      const interception = this.interceptForEnvironment(
        securityResult.modifications.to,
        securityResult.modifications.subject
      );
      if (interception.intercepted) {
        securityResult.modifications.to = interception.email;
        securityResult.modifications.subject = interception.subject;
        securityResult.warnings.push(`Email intercepted for ${this.environment} environment`);
        securityResult.modifications.originalTo = interception.originalEmail;
      }

      // 7. Log security check
      await this.logSecurityEvent('email_security_check', {
        recipient_email: emailData.to,
        subject: emailData.subject,
        security_action: securityResult.allowed ? 'allowed' : 'blocked',
        warnings: securityResult.warnings,
        errors: securityResult.errors
      });

      return securityResult;

    } catch (error) {
      console.error('Error in security check:', error);
      securityResult.allowed = false;
      securityResult.errors.push('Security check failed');
      return securityResult;
    }
  }
}

// Export singleton instance
const emailSecurity = new EmailSecurityService();

module.exports = {
  emailSecurity,
  EmailSecurityService,
  SECURITY_CONFIG
};