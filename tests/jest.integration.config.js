/**
 * Jest Configuration for Integration Tests
 * Uses real services and databases for comprehensive testing
 */

const baseConfig = require('./jest.config.js');

module.exports = {
  ...baseConfig,
  
  // Test environment
  testEnvironment: 'node',
  
  // Only run integration tests
  testMatch: [
    '<rootDir>/integration/**/*.test.js',
    '<rootDir>/e2e/**/*.test.js'
  ],
  
  // Longer timeout for real API calls
  testTimeout: 30000,
  
  // Don't mock external services for integration tests
  clearMocks: false,
  resetMocks: false,
  restoreMocks: false,
  
  // Setup files for integration tests
  setupFilesAfterEnv: [
    '<rootDir>/integration.setup.js'
  ],
  
  // Coverage settings for integration tests
  collectCoverage: false, // Integration tests focus on workflows, not coverage
  
  // Verbose output for debugging
  verbose: true,
  
  // Don't ignore any patterns for integration tests
  testPathIgnorePatterns: [
    "/node_modules/",
    "/dist/",
    "/build/",
    "/coverage/"
  ],
  
  // Environment variables for integration tests
  setupFiles: [
    '<rootDir>/integration.env.js'
  ],
  
  // Reporters for integration test results
  reporters: ['default']
};
