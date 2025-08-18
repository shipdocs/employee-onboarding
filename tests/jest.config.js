/** @type {import('jest').Config} */
module.exports = {
  // Automatically clear mock calls and instances between every test
  clearMocks: true,

  // Indicates whether the coverage information should be collected while executing the test
  collectCoverage: true,

  // The directory where Jest should output its coverage files
  coverageDirectory: "coverage",

  // Coverage reporters to use
  coverageReporters: [
    "text",
    "lcov",
    "html",
    "json-summary"
  ],

  // Coverage thresholds (temporarily lowered for Sprint S04 new features)
  coverageThreshold: {
    global: {
      branches: 15,
      functions: 20,
      lines: 15,
      statements: 15
    }
  },

  // Test environment - use jsdom for React components, node for others
  testEnvironment: "node",

  // Per-test environment configuration
  testEnvironmentOptions: {
    url: "http://localhost"
  },

  // Test match patterns
  testMatch: [
    "**/tests/unit/**/*.test.js",
    "**/tests/unit/**/*.test.ts",
    "**/tests/integration/**/*.test.js",
    "**/tests/integration/**/*.test.ts"
  ],

  // Transform TypeScript and JavaScript files
  transform: {
    "^.+\\.(ts|tsx)$": ["ts-jest", {
      useESM: false,
      tsconfig: {
        jsx: "react-jsx"
      }
    }],
    "^.+\\.(js|jsx)$": ["babel-jest", {
      presets: [
        ["@babel/preset-env", { targets: { node: "current" }, modules: "commonjs" }],
        ["@babel/preset-react", { runtime: "automatic" }]
      ]
    }]
  },

  // File extensions to consider
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],

  // Setup files to run before tests
  setupFilesAfterEnv: ["<rootDir>/setup.js"],

  // Module directories
  moduleDirectories: ["node_modules", "<rootDir>"],

  // Module name mapper for aliases and static assets
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    "^lib/(.*)$": "<rootDir>/lib/$1",
    "^api/(.*)$": "<rootDir>/api/$1",
    "^types/(.*)$": "<rootDir>/types/$1",
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
    "\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$": "jest-transform-stub"
  },

  // Ignore patterns
  testPathIgnorePatterns: [
    "/node_modules/",
    "/dist/",
    "/build/",
    "/coverage/",
    "/client/build/",
    "/e2e-tests/"
  ],

  // Transform ignore patterns - allow ES modules to be transformed
  transformIgnorePatterns: [
    "node_modules/(?!(.*\\.mjs$|@supabase|@testing-library))"
  ],

  // Collect coverage from these files
  collectCoverageFrom: [
    "../server/**/*.{js,ts}",
    "../lib/**/*.{js,ts}",
    "../client/src/**/*.{js,ts,tsx}",
    "!**/*.d.ts",
    "!**/node_modules/**",
    "!**/coverage/**",
    "!**/dist/**",
    "!**/build/**",
    "!**/tests/**"
  ],

  // Verbose output
  verbose: false,

  // Test timeout
  testTimeout: 15000,

  // Max workers for parallel execution - reduced to prevent memory issues
  maxWorkers: 2,

  // Worker idle memory limit
  workerIdleMemoryLimit: "512MB",

  // Detect open handles
  detectOpenHandles: false,

  // Force exit after tests complete
  forceExit: true,

  // Error on deprecated features
  errorOnDeprecated: false,

  // Bail after first test failure in CI
  bail: process.env.CI ? 1 : 0
}
