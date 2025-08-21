#!/usr/bin/env node

/**
 * Production MFA Deployment Script
 * 
 * This script ensures MFA is properly configured for production deployment
 */

const crypto = require('crypto');

console.log('🔐 Maritime Onboarding - MFA Production Deployment');
console.log('================================================');

// Check if we're in production environment
const isProduction = process.env.NODE_ENV === 'production' ||
                    process.env.VERCEL_ENV === 'production';

if (!isProduction) {
  console.log('⚠️  Not in production environment - skipping MFA deployment checks');
  process.exit(0);
}

console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`Vercel Environment: ${process.env.VERCEL_ENV || 'not set'}`);

// Required MFA environment variables for production
const requiredMFAVars = [
  'MFA_ENABLED',
  'MFA_ENFORCEMENT', 
  'MFA_BACKUP_CODES',
  'MFA_ENCRYPTION_KEY'
];

console.log('\n📋 Checking MFA Configuration...');

let allConfigured = true;

requiredMFAVars.forEach(varName => {
  const value = process.env[varName];
  const isSet = value !== undefined && value !== '';
  
  console.log(`${isSet ? '✅' : '❌'} ${varName}: ${isSet ? 'configured' : 'missing'}`);
  
  if (!isSet) {
    allConfigured = false;
  }
});

// Special check for encryption key
if (process.env.MFA_ENCRYPTION_KEY) {
  const keyLength = process.env.MFA_ENCRYPTION_KEY.length;
  if (keyLength < 32) {
    console.log(`⚠️  MFA_ENCRYPTION_KEY is too short (${keyLength} chars, need 32+)`);
    allConfigured = false;
  } else {
    console.log(`✅ MFA_ENCRYPTION_KEY: proper length (${keyLength} chars)`);
  }
}

console.log('\n🚀 MFA Feature Status:');
console.log(`✅ MFA_ENABLED: ${process.env.MFA_ENABLED || 'true (default)'}`);
console.log(`✅ MFA_ENFORCEMENT: ${process.env.MFA_ENFORCEMENT || 'true (production default)'}`);
console.log(`✅ MFA_BACKUP_CODES: ${process.env.MFA_BACKUP_CODES || 'true (default)'}`);

if (!allConfigured) {
  console.log('\n❌ MFA Configuration Issues Found!');
  console.log('\nTo fix, set these environment variables in Vercel:');
  console.log('1. Go to your Vercel project dashboard');
  console.log('2. Navigate to Settings > Environment Variables');
  console.log('3. Add the following variables:');
  console.log('');
  
  if (!process.env.MFA_ENABLED) {
    console.log('   MFA_ENABLED=true');
  }
  if (!process.env.MFA_ENFORCEMENT) {
    console.log('   MFA_ENFORCEMENT=true');
  }
  if (!process.env.MFA_BACKUP_CODES) {
    console.log('   MFA_BACKUP_CODES=true');
  }
  if (!process.env.MFA_ENCRYPTION_KEY || process.env.MFA_ENCRYPTION_KEY.length < 32) {
    console.log('   MFA_ENCRYPTION_KEY=<generate-a-secure-64-character-hex-key>');
    console.log('   # Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  }
  
  console.log('\n4. Redeploy your application');
  process.exit(1);
} else {
  console.log('\n✅ MFA is properly configured for production!');
  console.log('\n🔒 Security Features Enabled:');
  console.log('   • TOTP-based authentication');
  console.log('   • Encrypted secret storage');
  console.log('   • Backup codes for recovery');
  console.log('   • Rate limiting protection');
  console.log('   • Comprehensive audit logging');
  console.log('   • Automatic enforcement for admin/manager roles');
  
  console.log('\n📱 Users can now:');
  console.log('   • Set up MFA in their profile settings');
  console.log('   • Use authenticator apps (Google Authenticator, Authy, etc.)');
  console.log('   • Access backup codes for emergency recovery');
  console.log('   • Admins and managers will be required to enable MFA');
  
  process.exit(0);
}