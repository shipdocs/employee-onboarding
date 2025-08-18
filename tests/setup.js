// tests/setup.js - Test environment setup
const dotenv = require('dotenv');

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment variables for consistent testing
// ⚠️ THESE ARE FAKE TEST CREDENTIALS - NOT REAL SECRETS ⚠️
process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = 'https://fake-test-project.supabase.co';
process.env.SUPABASE_ANON_KEY = 'fake.test.anon.key.for.testing.only.not.real.credentials';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake.test.service.key.for.testing.only.not.real.credentials';
process.env.JWT_SECRET = 'fake-test-jwt-secret-for-testing-only-not-real';
process.env.TEST_SUPABASE_URL = 'https://fake-test-project.supabase.co';
process.env.TEST_SUPABASE_SERVICE_KEY = 'fake.test.service.key.for.testing.only.not.real.credentials';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://fake-test-project.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'fake.test.anon.key.for.testing.only.not.real.credentials';

// Set test timeout
jest.setTimeout(30000);

// Global test utilities
global.testUtils = {
  // Mock user data for testing
  mockUser: {
    id: 'test-user-id',
    email: 'test@example.com',
    role: 'crew'
  },
  
  // Mock manager data
  mockManager: {
    id: 'test-manager-id',
    email: 'manager@example.com',
    role: 'manager'
  },
  
  // Mock admin data
  mockAdmin: {
    id: 'test-admin-id',
    email: 'admin@example.com',
    role: 'admin'
  }
};

// Mock console methods to reduce test noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Setup DOM environment for React testing
require('@testing-library/jest-dom');

// Mock window.location
delete window.location;
window.location = {
  href: 'http://localhost:3000',
  origin: 'http://localhost:3000',
  pathname: '/',
  search: '',
  hash: ''
};

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.sessionStorage = sessionStorageMock;

// Mock fetch for API calls
global.fetch = jest.fn();

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
});

// Clean up after all tests
afterAll(() => {
  jest.restoreAllMocks();
});

console.log('✅ Test environment setup complete');
console.log('📝 Using fake test credentials (not real secrets)');
