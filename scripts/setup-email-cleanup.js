#!/usr/bin/env node

/**
 * Email Cleanup Setup Script
 * Generates secure CRON_SECRET and provides setup instructions
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function generateSecureSecret(length = 64) {
  return crypto.randomBytes(length).toString('hex');
}

function setupEmailCleanup() {
  console.log('🔧 Email Cleanup Setup');
  console.log('======================\n');

  // Generate secure CRON_SECRET
  const cronSecret = generateSecureSecret(32); // 64 character hex string
  
  console.log('✅ Generated secure CRON_SECRET');
  console.log('📋 Configuration Values:');
  console.log('');
  console.log('CRON_SECRET=' + cronSecret);
  console.log('EMAIL_CLEANUP_ENABLED=true');
  console.log('EMAIL_CLEANUP_BATCH_SIZE=1000');
  console.log('EMAIL_CLEANUP_MAX_BATCHES=10');
  console.log('EMAIL_CLEANUP_INTERVAL_HOURS=24');
  console.log('');

  // Check if .env.local exists
  const envLocalPath = path.join(process.cwd(), '.env.local');
  const envExists = fs.existsSync(envLocalPath);

  if (envExists) {
    console.log('📄 Found .env.local file');
    
    // Read existing .env.local
    const envContent = fs.readFileSync(envLocalPath, 'utf8');
    
    // Check if CRON_SECRET already exists
    if (envContent.includes('CRON_SECRET=')) {
      console.log('⚠️  CRON_SECRET already exists in .env.local');
      console.log('   If you want to regenerate it, remove the existing line first.');
    } else {
      // Append the new configuration
      const newConfig = `
# Email Log Cleanup Configuration (Auto-generated)
CRON_SECRET=${cronSecret}
EMAIL_CLEANUP_ENABLED=true
EMAIL_CLEANUP_BATCH_SIZE=1000
EMAIL_CLEANUP_MAX_BATCHES=10
EMAIL_CLEANUP_INTERVAL_HOURS=24
`;
      
      fs.appendFileSync(envLocalPath, newConfig);
      console.log('✅ Added email cleanup configuration to .env.local');
    }
  } else {
    // Create new .env.local file
    const newEnvContent = `# Email Log Cleanup Configuration (Auto-generated)
CRON_SECRET=${cronSecret}
EMAIL_CLEANUP_ENABLED=true
EMAIL_CLEANUP_BATCH_SIZE=1000
EMAIL_CLEANUP_MAX_BATCHES=10
EMAIL_CLEANUP_INTERVAL_HOURS=24
`;
    
    fs.writeFileSync(envLocalPath, newEnvContent);
    console.log('✅ Created .env.local with email cleanup configuration');
  }

  console.log('');
  console.log('🚀 Vercel Deployment Setup:');
  console.log('');
  console.log('1. Set environment variables in Vercel dashboard:');
  console.log('   vercel env add CRON_SECRET');
  console.log('   (paste the generated secret when prompted)');
  console.log('');
  console.log('2. Set other cleanup variables:');
  console.log('   vercel env add EMAIL_CLEANUP_ENABLED');
  console.log('   vercel env add EMAIL_CLEANUP_BATCH_SIZE');
  console.log('   vercel env add EMAIL_CLEANUP_MAX_BATCHES');
  console.log('   vercel env add EMAIL_CLEANUP_INTERVAL_HOURS');
  console.log('');
  console.log('3. Deploy to activate cron job:');
  console.log('   vercel --prod');
  console.log('');
  console.log('📊 Monitoring:');
  console.log('');
  console.log('• Check cron logs: vercel logs --follow');
  console.log('• Test cleanup: curl -X POST https://your-app.vercel.app/api/cron/email-cleanup \\');
  console.log('                     -H "Authorization: Bearer ' + cronSecret + '"');
  console.log('• Admin dashboard: https://your-app.vercel.app/admin (retention status)');
  console.log('');
  console.log('🔒 Security Notes:');
  console.log('');
  console.log('• CRON_SECRET is used to authenticate cron requests');
  console.log('• Keep this secret secure and never commit it to git');
  console.log('• GitHub Actions backup requires CRON_SECRET in repository secrets');
  console.log('• Admin endpoints require admin role authentication');
  console.log('');
  console.log('✅ Email cleanup setup complete!');
  console.log('   Cron job will run daily at 1:00 AM UTC');
  console.log('   GitHub Actions backup runs at 2:30 AM UTC');
}

// Run setup if called directly
if (require.main === module) {
  setupEmailCleanup();
}

module.exports = { setupEmailCleanup, generateSecureSecret };
