module.exports = {
  entry: [
    'api/**/*.{js,ts}',
    'client/src/index.js',
    'client/src/App.js'
  ],
  project: [
    'api/**/*.{js,ts}',
    'client/src/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.js',
    'services/**/*.js'
  ],
  ignore: [
    '**/*.test.{js,ts}',
    '**/*.spec.{js,ts}',
    'tests/**/*',
    'node_modules/**/*',
    'build/**/*',
    'dist/**/*',
    '.next/**/*',
    'coverage/**/*'
  ],
  ignoreDependencies: [
    '@types/**',
    'eslint-*',
    'prettier',
    '@testing-library/**'
  ]
};