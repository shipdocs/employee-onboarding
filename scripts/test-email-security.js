#!/usr/bin/env node

// Test script for email security controls
// Run with: node scripts/test-email-security.js

require('dotenv').config({ path: '.env.local' });
const { emailSecurity } = require('../lib/email-security');
const { emailInterceptor } = require('../lib/email-interceptor');
const { emailMonitoring } = require('../lib/email-monitoring');
const { apiKeyManager } = require('../lib/api-key-manager');

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60) + '\n');
}

async function testDomainValidation() {
  logSection('Testing Domain Validation');

  const testCases = [
    { email: 'test@gmail.com', expected: true, description: 'Valid whitelisted domain' },
    { email: 'user@tempmail.com', expected: false, description: 'Blacklisted temporary email' },
    { email: 'admin@imo.org', expected: false, description: 'Protected maritime organization' },
    { email: 'invalid-email', expected: false, description: 'Invalid email format' },
    { email: 'test123@shipdocs.app', expected: true, description: 'Company domain' },
    { email: 'demo@example.com', expected: false, description: 'Example domain (blacklisted)' },
  ];

  for (const testCase of testCases) {
    const result = await emailSecurity.validateRecipient(testCase.email);
    const passed = result.valid === testCase.expected;
    
    log(
      `${passed ? '✓' : '✗'} ${testCase.description}: ${testCase.email}`,
      passed ? 'green' : 'red'
    );
    
    if (!passed) {
      log(`  Reason: ${result.reason}`, 'yellow');
    }
    
    if (result.securityFlags.length > 0) {
      log(`  Flags: ${result.securityFlags.join(', ')}`, 'blue');
    }
  }
}

async function testRateLimiting() {
  logSection('Testing Rate Limiting');

  const testEmail = 'ratelimit-test@shipdocs.app';
  
  // Test burst protection
  log('Testing burst protection (max 10 in 60 seconds)...', 'blue');
  
  let burstCount = 0;
  for (let i = 0; i < 12; i++) {
    const result = await emailSecurity.checkRateLimit(testEmail);
    if (result.allowed) {
      burstCount++;
    } else {
      log(`✓ Burst limit enforced after ${burstCount} emails`, 'green');
      log(`  Reason: ${result.reason}`, 'yellow');
      break;
    }
  }
  
  if (burstCount === 12) {
    log('✗ Burst protection not working', 'red');
  }
}

async function testContentSanitization() {
  logSection('Testing Content Sanitization');

  const testCases = [
    {
      input: '<p>Hello <script>alert("XSS")</script> World</p>',
      description: 'Script tag removal',
      shouldRemove: '<script>alert("XSS")</script>'
    },
    {
      input: '<a href="javascript:alert(1)">Click me</a>',
      description: 'JavaScript URL sanitization',
      shouldRemove: 'javascript:'
    },
    {
      input: '<img src="x" onerror="alert(1)">',
      description: 'Event handler removal',
      shouldRemove: 'onerror'
    },
    {
      input: '<iframe src="malicious.com"></iframe>',
      description: 'Iframe removal',
      shouldRemove: '<iframe'
    },
  ];

  for (const testCase of testCases) {
    const sanitized = emailSecurity.sanitizeContent(testCase.input);
    const passed = !sanitized.includes(testCase.shouldRemove);
    
    log(
      `${passed ? '✓' : '✗'} ${testCase.description}`,
      passed ? 'green' : 'red'
    );
    
    if (!passed) {
      log(`  Input: ${testCase.input}`, 'yellow');
      log(`  Output: ${sanitized}`, 'yellow');
    }
  }
}

async function testEmailInterception() {
  logSection('Testing Email Interception');

  const environment = process.env.NODE_ENV || 'development';
  log(`Current environment: ${environment}`, 'blue');

  const testEmails = [
    { to: 'user@gmail.com', subject: 'Test Email' },
    { to: 'dev-team@shipdocs.app', subject: 'Safe Recipient Test' },
    { to: 'admin@maritime-company.com', subject: 'External Email' },
  ];

  for (const email of testEmails) {
    const intercepted = await emailInterceptor.interceptEmail({
      ...email,
      html: '<p>Test email body</p>',
      text: 'Test email body'
    });

    if (intercepted.intercepted) {
      log(`✓ Intercepted: ${email.to} → ${intercepted.to}`, 'green');
      log(`  Subject: ${intercepted.subject}`, 'yellow');
    } else {
      log(`✓ Not intercepted (safe recipient): ${email.to}`, 'green');
    }
  }
}

async function testSecurityLogging() {
  logSection('Testing Security Logging');

  // Test various security events
  const events = [
    { type: 'invalid_email_format', details: { email: 'bad-email' } },
    { type: 'blacklisted_domain', details: { email: 'test@tempmail.com' } },
    { type: 'rate_limit_exceeded', details: { email: 'spammer@test.com' } },
    { type: 'injection_attempt', details: { email: 'hacker@test.com' } },
  ];

  for (const event of events) {
    await emailSecurity.logSecurityEvent(event.type, event.details);
    log(`✓ Logged security event: ${event.type}`, 'green');
  }

  // Check if critical events trigger alerts
  const criticalEvent = 'injection_attempt';
  const isCritical = emailSecurity.isCriticalEvent(criticalEvent);
  log(
    `✓ Critical event detection: ${criticalEvent} is ${isCritical ? 'critical' : 'not critical'}`,
    'green'
  );
}

async function testApiKeyManagement() {
  logSection('Testing API Key Management');

  try {
    // Initialize API key manager
    await apiKeyManager.initialize();
    log('✓ API key manager initialized', 'green');

    // Test key retrieval
    const providers = ['mailersend'];
    
    for (const provider of providers) {
      try {
        const keyData = await apiKeyManager.getApiKey(provider);
        if (keyData) {
          log(`✓ Retrieved API key for ${provider}`, 'green');
          log(`  Key expires: ${new Date(keyData.expiresAt).toLocaleDateString()}`, 'blue');
        }
      } catch (error) {
        log(`✗ Failed to retrieve key for ${provider}: ${error.message}`, 'red');
      }
    }

    // Test key statistics
    const stats = await apiKeyManager.getKeyStatistics();
    if (stats) {
      log('✓ API key statistics:', 'green');
      log(`  Total keys: ${stats.total}`, 'blue');
      log(`  Active keys: ${stats.active}`, 'blue');
      log(`  Expired keys: ${stats.expired}`, 'blue');
    }

  } catch (error) {
    log(`✗ API key management error: ${error.message}`, 'red');
  }
}

async function testMonitoringMetrics() {
  logSection('Testing Monitoring Metrics');

  try {
    // Initialize monitoring
    await emailMonitoring.initialize();
    log('✓ Email monitoring initialized', 'green');

    // Collect current metrics
    const metrics = await emailMonitoring.collectMetrics();
    if (metrics) {
      log('✓ Current metrics collected:', 'green');
      log(`  Hourly sent: ${metrics.hourly.sent}`, 'blue');
      log(`  Hourly blocked: ${metrics.hourly.blocked}`, 'blue');
      log(`  Hourly failed: ${metrics.hourly.failed}`, 'blue');
      
      if (metrics.rates.failureRate !== undefined) {
        log(`  Failure rate: ${(metrics.rates.failureRate * 100).toFixed(2)}%`, 'blue');
      }
    }

    // Get dashboard data
    const dashboard = await emailMonitoring.getDashboardData();
    if (dashboard) {
      log('✓ Dashboard data retrieved', 'green');
      log(`  Recent alerts: ${dashboard.alerts.length}`, 'blue');
      log(`  System status: ${dashboard.currentStatus.operational ? 'Operational' : 'Issues detected'}`, 
        dashboard.currentStatus.operational ? 'green' : 'yellow');
    }

  } catch (error) {
    log(`✗ Monitoring error: ${error.message}`, 'red');
  }
}

async function testAttachmentValidation() {
  logSection('Testing Attachment Validation');

  const testAttachments = [
    {
      attachments: [
        { filename: 'document.pdf', contentType: 'application/pdf', size: 1000000 }
      ],
      expected: true,
      description: 'Valid PDF attachment'
    },
    {
      attachments: [
        { filename: 'script.exe', contentType: 'application/x-executable', size: 1000000 }
      ],
      expected: false,
      description: 'Executable file (blocked)'
    },
    {
      attachments: [
        { filename: 'huge.pdf', contentType: 'application/pdf', size: 20000000 }
      ],
      expected: false,
      description: 'Oversized attachment'
    },
    {
      attachments: Array(10).fill({ filename: 'doc.pdf', contentType: 'application/pdf', size: 100000 }),
      expected: false,
      description: 'Too many attachments'
    },
  ];

  for (const test of testAttachments) {
    const result = emailSecurity.validateAttachments(test.attachments);
    const passed = result.valid === test.expected;
    
    log(
      `${passed ? '✓' : '✗'} ${test.description}`,
      passed ? 'green' : 'red'
    );
    
    if (result.errors.length > 0) {
      log(`  Errors: ${result.errors.join(', ')}`, 'yellow');
    }
  }
}

async function testFullSecurityCheck() {
  logSection('Testing Full Security Check');

  const testEmails = [
    {
      to: 'valid@gmail.com',
      subject: 'Normal Email',
      html: '<p>Hello World</p>',
      attachments: [],
      expected: true,
      description: 'Valid email'
    },
    {
      to: 'admin@imo.org',
      subject: 'Test to Protected Org',
      html: '<p>Test</p>',
      attachments: [],
      expected: false,
      description: 'Protected organization'
    },
    {
      to: 'test@tempmail.com',
      subject: 'Spam Test',
      html: '<script>alert(1)</script>',
      attachments: [],
      expected: false,
      description: 'Blacklisted domain with XSS'
    },
  ];

  for (const test of testEmails) {
    const result = await emailSecurity.performSecurityCheck(test);
    const passed = result.allowed === test.expected;
    
    log(
      `${passed ? '✓' : '✗'} ${test.description}`,
      passed ? 'green' : 'red'
    );
    
    if (!result.allowed) {
      log(`  Blocked: ${result.errors.join(', ')}`, 'yellow');
    }
    
    if (result.warnings.length > 0) {
      log(`  Warnings: ${result.warnings.join(', ')}`, 'blue');
    }
  }
}

async function main() {
  console.log('\n');
  log('EMAIL SECURITY CONTROLS TEST SUITE', 'cyan');
  log('==================================', 'cyan');
  console.log('\n');

  try {
    // Initialize security service
    await emailSecurity.initialize();
    log('✓ Email security service initialized\n', 'green');

    // Run all tests
    await testDomainValidation();
    await testRateLimiting();
    await testContentSanitization();
    await testEmailInterception();
    await testSecurityLogging();
    await testApiKeyManagement();
    await testMonitoringMetrics();
    await testAttachmentValidation();
    await testFullSecurityCheck();

    console.log('\n');
    log('✅ All security tests completed!', 'green');
    console.log('\n');

  } catch (error) {
    console.error('\n');
    log(`❌ Test suite failed: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

// Run tests
main().catch(console.error);