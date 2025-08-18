#!/usr/bin/env node

// Test script for environment configuration system

const { environmentConfig } = require('../config/environment');
const { featureToggles, isEnabled, FEATURES } = require('../config/features');

console.log('🔍 Testing Environment Configuration System\n');

// Test 1: Environment Detection
console.log('1️⃣  Environment Detection');
console.log('   Current Environment:', environmentConfig.getEnvironment());
console.log('   Is Development:', environmentConfig.isDevelopment());
console.log('   Is Staging:', environmentConfig.isStaging());
console.log('   Is Production:', environmentConfig.isProduction());
console.log('');

// Test 2: Environment Configuration
console.log('2️⃣  Environment Configuration');
const config = environmentConfig.getConfig();
console.log('   Logging Level:', config.logging.level);
console.log('   Email Enabled:', config.email.enabled);
console.log('   Email Provider:', config.email.provider);
console.log('   Rate Limit Provider:', config.security.rateLimitProvider);
console.log('   Caching Enabled:', config.performance.caching);
console.log('   Test Data Allowed:', config.data.testDataAllowed);
console.log('');

// Test 3: Feature Flags
console.log('3️⃣  Feature Flags Status');
const criticalFeatures = [
  'EMAIL_SENDING_ENABLED',
  'QUIZ_SCORING_ENABLED',
  'CERTIFICATE_GENERATION_ENABLED',
  'RATE_LIMITING_ENABLED',
  'DEBUG_LOGGING_ENABLED',
  'TEST_DATA_ALLOWED'
];

criticalFeatures.forEach(feature => {
  const enabled = isEnabled(FEATURES[feature]);
  const emoji = enabled ? '✅' : '❌';
  console.log(`   ${emoji} ${feature}: ${enabled}`);
});
console.log('');

// Test 4: Feature Summary
console.log('4️⃣  Feature Summary by Category');
const summary = featureToggles.getFeatureSummary();
Object.entries(summary).forEach(([category, features]) => {
  console.log(`   ${category}:`);
  Object.entries(features).forEach(([feature, enabled]) => {
    const emoji = enabled ? '✅' : '❌';
    console.log(`     ${emoji} ${feature}`);
  });
});
console.log('');

// Test 5: Configuration Warnings
console.log('5️⃣  Configuration Validation');
const warnings = featureToggles.validateConfiguration();
if (warnings.length > 0) {
  console.log('   ⚠️  Warnings found:');
  warnings.forEach(warning => {
    console.log(`      - ${warning}`);
  });
} else {
  console.log('   ✅ No configuration warnings');
}
console.log('');

// Test 6: Environment Summary
console.log('6️⃣  Environment Summary');
const envSummary = environmentConfig.getSummary();
console.log('   Environment:', envSummary.environment);
console.log('   Features:');
Object.entries(envSummary.features).forEach(([feature, enabled]) => {
  const emoji = enabled ? '✅' : '❌';
  console.log(`     ${emoji} ${feature}`);
});
console.log('   Security:');
Object.entries(envSummary.security).forEach(([setting, enabled]) => {
  const emoji = enabled ? '✅' : '❌';
  console.log(`     ${emoji} ${setting}`);
});
console.log('');

// Test 7: Override Examples
console.log('7️⃣  Environment Variable Overrides');
console.log('   To override features, use environment variables:');
console.log('     EMAIL_SENDING_ENABLED=true npm start');
console.log('     RATE_LIMITING_ENABLED=false npm start');
console.log('     TEST_DATA_ALLOWED=true npm start');
console.log('');

// Test 8: Email Configuration Details
console.log('8️⃣  Email Configuration Details');
if (environmentConfig.isStaging()) {
  const emailConfig = environmentConfig.get('email');
  console.log('   Whitelist Domains:', emailConfig.whitelist.length > 0 ? emailConfig.whitelist.join(', ') : 'None configured');
}
console.log('   Email Test Mode:', config.email.testMode);
console.log('');

console.log('✅ Environment configuration test complete!');