module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true,
    jest: true
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true
    }
  },
  settings: {
    react: {
      version: 'detect'
    }
  },
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      parser: '@typescript-eslint/parser',
      extends: [
        'plugin:@typescript-eslint/recommended'
      ],
      rules: {
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
      }
    },
    {
      files: ['*.jsx', '*.tsx'],
      extends: [
        'plugin:react/recommended',
        'plugin:react-hooks/recommended'
      ],
      rules: {
        'react/react-in-jsx-scope': 'off',
        'react/prop-types': 'off'
      }
    }
  ],
  rules: {
    'no-console': ['warn', { allow: ['warn', 'error', 'info', 'log'] }],
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-undef': 'error',
    'semi': ['error', 'always'],
    'quotes': ['error', 'single', { avoidEscape: true }],
    'comma-dangle': ['error', 'never'],
    'no-trailing-spaces': 'error',
    'eol-last': ['error', 'always'],
    'no-multiple-empty-lines': ['error', { max: 1 }]
  },
  ignorePatterns: [
    'node_modules/',
    'build/',
    'dist/',
    '.next/',
    'coverage/',
    '*.min.js',
    'client/build/',
    'client/node_modules/'
  ]
};
