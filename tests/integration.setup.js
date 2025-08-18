/**
 * Integration Test Setup
 * Configures real services for integration testing
 */

// Don't mock Supabase for integration tests
// Don't mock axios for integration tests  
// Don't mock email services for integration tests

// Only mock services we don't want to actually trigger
jest.mock('stripe', () => ({
  charges: {
    create: jest.fn().mockResolvedValue({ 
      id: 'test_charge_123', 
      status: 'succeeded',
      amount: 1000,
      currency: 'usd'
    })
  },
  customers: {
    create: jest.fn().mockResolvedValue({
      id: 'test_customer_123',
      email: 'test@example.com'
    })
  }
}), { virtual: true });

jest.mock('twilio', () => ({
  messages: {
    create: jest.fn().mockResolvedValue({ 
      sid: 'test_sms_123', 
      status: 'sent',
      to: '+1234567890',
      body: 'Test SMS message'
    })
  }
}), { virtual: true });

// Mock file system operations to use temp directories
const fs = require('fs');
const path = require('path');
const os = require('os');

const originalWriteFile = fs.writeFileSync;
const originalReadFile = fs.readFileSync;

// Create temp directory for test files
const testTempDir = path.join(os.tmpdir(), 'maritime-onboarding-tests');
if (!fs.existsSync(testTempDir)) {
  fs.mkdirSync(testTempDir, { recursive: true });
}

// Override file operations to use temp directory
fs.writeFileSync = (filePath, data, options) => {
  if (filePath.includes('/pdfs/') || filePath.includes('/uploads/')) {
    const tempPath = path.join(testTempDir, path.basename(filePath));
    return originalWriteFile(tempPath, data, options);
  }
  return originalWriteFile(filePath, data, options);
};

fs.readFileSync = (filePath, options) => {
  if (filePath.includes('/pdfs/') || filePath.includes('/uploads/')) {
    const tempPath = path.join(testTempDir, path.basename(filePath));
    if (fs.existsSync(tempPath)) {
      return originalReadFile(tempPath, options);
    }
  }
  return originalReadFile(filePath, options);
};

// Global test helpers for integration tests
global.testHelpers = {
  // Wait for condition with timeout
  waitForCondition: async (conditionFn, timeout = 10000, interval = 500) => {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      if (await conditionFn()) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    
    throw new Error(`Condition not met within ${timeout}ms`);
  },

  // Generate unique test email
  generateTestEmail: () => {
    return `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@shipdocs.app`;
  },

  // Generate test user data
  generateTestUser: (overrides = {}) => ({
    email: global.testHelpers.generateTestEmail(),
    name: 'Test User',
    role: 'crew',
    vessel: 'Test Vessel',
    boarding_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'pending',
    ...overrides
  }),

  // Clean up temp files
  cleanupTempFiles: () => {
    try {
      if (fs.existsSync(testTempDir)) {
        fs.rmSync(testTempDir, { recursive: true, force: true });
      }
    } catch (error) {
      console.warn('Temp file cleanup warning:', error.message);
    }
  }
};

// Cleanup after all tests
afterAll(() => {
  global.testHelpers.cleanupTempFiles();
});

// Console logging for integration test progress
const originalConsoleLog = console.log;
console.log = (...args) => {
  const timestamp = new Date().toISOString();
  originalConsoleLog(`[${timestamp}]`, ...args);
};

console.log('🧪 Integration test environment initialized');
console.log('📊 Using real services: Supabase, Email, PDF generation');
console.log('🚫 Mocked services: Stripe, Twilio, File system');
