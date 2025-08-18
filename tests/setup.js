/**
 * Jest Setup File
 * Configure test environment and global mocks
 */

// Set test environment
process.env.NODE_ENV = 'test';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Global test timeout
jest.setTimeout(15000);

// Mock fetch for Node environment
global.fetch = jest.fn();

// Mock process.exit to prevent tests from exiting
process.exit = jest.fn();

// Clear all mocks after each test
afterEach(() => {
  jest.clearAllMocks();
});
