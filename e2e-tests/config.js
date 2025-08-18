// Secure E2E Test Configuration Loader
// This file loads configuration from environment variables instead of hardcoded secrets

const fs = require('fs');
const path = require('path');

// Load environment variables from .env file if it exists
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
}

// Base configuration from JSON file
const baseConfig = require('./config.json');

// Override credentials with environment variables
const secureConfig = {
  ...baseConfig,
  credentials: {
    admin: {
      email: process.env.E2E_ADMIN_EMAIL || 'admin@shipdocs.app',
      password: process.env.E2E_ADMIN_PASSWORD || 'CHANGE_ME_ADMIN_PASSWORD'
    },
    manager: {
      email: process.env.E2E_MANAGER_EMAIL || 'manager@shipdocs.app', 
      password: process.env.E2E_MANAGER_PASSWORD || 'CHANGE_ME_MANAGER_PASSWORD'
    },
    crew: {
      email: process.env.E2E_CREW_EMAIL || 'crew@shipdocs.app',
      password: process.env.E2E_CREW_PASSWORD || 'CHANGE_ME_CREW_PASSWORD'
    }
  },
  baseUrl: process.env.E2E_BASE_URL || baseConfig.baseUrl,
  timeout: parseInt(process.env.E2E_TIMEOUT) || baseConfig.timeout
};

// Validate that credentials are not using default values
function validateCredentials() {
  const warnings = [];
  
  if (secureConfig.credentials.admin.password === 'CHANGE_ME_ADMIN_PASSWORD') {
    warnings.push('⚠️  Admin password not set - using default (INSECURE)');
  }
  
  if (secureConfig.credentials.manager.password === 'CHANGE_ME_MANAGER_PASSWORD') {
    warnings.push('⚠️  Manager password not set - using default (INSECURE)');
  }
  
  if (secureConfig.credentials.crew.password === 'CHANGE_ME_CREW_PASSWORD') {
    warnings.push('⚠️  Crew password not set - using default (INSECURE)');
  }
  
  if (warnings.length > 0) {
    console.warn('🔒 E2E Test Security Warnings:');
    warnings.forEach(warning => console.warn(warning));
    console.warn('📝 Please set environment variables in e2e-tests/.env');
    console.warn('📋 See e2e-tests/.env.example for template');
  }
}

// Validate on load
validateCredentials();

module.exports = secureConfig;
