#!/usr/bin/env node

// scripts/update-code-to-use-config.js - Update code to use centralized config
const fs = require('fs').promises;
const path = require('path');
const glob = require('glob');

/**
 * Code Update Script
 * 
 * Helps identify and update code that uses process.env
 * to use the centralized configuration service instead
 */

// Mapping of environment variables to config keys
const ENV_TO_CONFIG_MAP = {
  // Email settings
  'EMAIL_SERVICE_PROVIDER': 'email.provider',
  'EMAIL_FROM': 'email.from_email',
  'EMAIL_FROM_NAME': 'email.from_name',
  'SMTP_HOST': 'email.smtp_host',
  'SMTP_PORT': 'email.smtp_port',
  'SMTP_SECURE': 'email.smtp_secure',
  'SMTP_USER': 'email.smtp_user',
  'ENABLE_REAL_EMAILS': 'email.enable_real_emails',
  'EMAIL_TEST_MODE': 'email.email_test_mode',
  'HR_EMAIL': 'email.hr_email',
  'ADMIN_EMAIL': 'email.admin_email',
  
  // Application settings
  'BASE_URL': 'application.base_url',
  'NEXT_PUBLIC_APP_URL': 'application.base_url',
  'DOCS_BASE_URL': 'application.docs_base_url',
  'API_TIMEOUT': 'application.api_timeout',
  'DB_TIMEOUT': 'application.db_timeout',
  'NODE_ENV': 'application.environment',
  'ENVIRONMENT': 'application.environment',
  'ALLOW_PRODUCTION_CHANGES': 'application.allow_production_changes',
  'MONITORING_PORT': 'application.monitoring_port',
  
  // Security settings
  'MAGIC_LINK_EXPIRY': 'security.magic_link_expiry',
  'EMAIL_VERIFICATION_ENABLED': 'security.email_verification_enabled',
  'EMAIL_VERIFICATION_TIMEOUT': 'security.email_verification_timeout',
  'TEST_EMAIL_DOMAIN': 'security.test_email_domain',
  'DISABLE_RATE_LIMITING': 'security.disable_rate_limiting',
  
  // Training settings
  'PDF_OUTPUT_DIR': 'training.pdf_output_dir',
  'PDF_TEST_MODE': 'training.pdf_test_mode',
  'DEFAULT_LANGUAGE': 'application.default_language',
  
  // Translation settings
  'TRANSLATION_PROVIDER': 'translation.translation_provider',
  'AUTO_TRANSLATE_ENABLED': 'translation.auto_translate_enabled'
};

// Environment variables that should NOT be migrated
const KEEP_IN_ENV = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'JWT_SECRET',
  'CRON_SECRET',
  'MAILERSEND_API_KEY',
  'SMTP_PASSWORD',
  'ANTHROPIC_API_KEY',
  'OPENAI_API_KEY',
  'GOOGLE_TRANSLATE_API_KEY',
  'DEEPL_API_KEY',
  'MICROSOFT_TRANSLATOR_KEY',
  'VERCEL_URL',
  'VERCEL_ENV',
  'VERCEL_GIT_COMMIT_REF'
];

async function findFilesToUpdate() {
  console.log('🔍 Searching for files using process.env...\n');
  
  const patterns = [
    'api/**/*.js',
    'api/**/*.ts',
    'lib/**/*.js',
    'lib/**/*.ts',
    'services/**/*.js',
    'services/**/*.ts',
    'scripts/**/*.js',
    'client/src/**/*.js',
    'client/src/**/*.jsx',
    'client/src/**/*.ts',
    'client/src/**/*.tsx'
  ];
  
  const files = [];
  for (const pattern of patterns) {
    const matches = glob.sync(pattern, { 
      ignore: ['**/node_modules/**', '**/dist/**', '**/build/**']
    });
    files.push(...matches);
  }
  
  return files;
}

async function analyzeFile(filePath) {
  const content = await fs.readFile(filePath, 'utf-8');
  const envUsages = [];
  
  // Find all process.env usages
  const regex = /process\.env\.([A-Z_]+)/g;
  let match;
  
  while ((match = regex.exec(content)) !== null) {
    const envVar = match[1];
    const lineNumber = content.substring(0, match.index).split('\n').length;
    const line = content.split('\n')[lineNumber - 1];
    
    envUsages.push({
      envVar,
      lineNumber,
      line: line.trim(),
      configKey: ENV_TO_CONFIG_MAP[envVar],
      shouldMigrate: !KEEP_IN_ENV.includes(envVar)
    });
  }
  
  return envUsages;
}

async function generateReport() {
  const files = await findFilesToUpdate();
  const report = {
    totalFiles: 0,
    totalUsages: 0,
    toMigrate: 0,
    toKeep: 0,
    byFile: {},
    byEnvVar: {}
  };
  
  console.log(`Found ${files.length} files to analyze...\n`);
  
  for (const file of files) {
    const usages = await analyzeFile(file);
    
    if (usages.length > 0) {
      report.totalFiles++;
      report.totalUsages += usages.length;
      report.byFile[file] = usages;
      
      usages.forEach(usage => {
        if (usage.shouldMigrate) {
          report.toMigrate++;
        } else {
          report.toKeep++;
        }
        
        if (!report.byEnvVar[usage.envVar]) {
          report.byEnvVar[usage.envVar] = {
            count: 0,
            configKey: usage.configKey,
            shouldMigrate: usage.shouldMigrate,
            files: []
          };
        }
        
        report.byEnvVar[usage.envVar].count++;
        if (!report.byEnvVar[usage.envVar].files.includes(file)) {
          report.byEnvVar[usage.envVar].files.push(file);
        }
      });
    }
  }
  
  return report;
}

async function printReport(report) {
  console.log('📊 ENVIRONMENT VARIABLE USAGE REPORT');
  console.log('=====================================\n');
  
  console.log(`Total files with env vars: ${report.totalFiles}`);
  console.log(`Total env var usages: ${report.totalUsages}`);
  console.log(`To migrate to config: ${report.toMigrate}`);
  console.log(`To keep in .env: ${report.toKeep}\n`);
  
  console.log('📋 ENVIRONMENT VARIABLES TO MIGRATE:');
  console.log('------------------------------------');
  
  Object.entries(report.byEnvVar)
    .filter(([_, data]) => data.shouldMigrate)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([envVar, data]) => {
      console.log(`\n${envVar} → config.get('${data.configKey || '???'}')`);
      console.log(`  Used ${data.count} times in ${data.files.length} files`);
      data.files.slice(0, 3).forEach(file => {
        console.log(`  - ${file}`);
      });
      if (data.files.length > 3) {
        console.log(`  ... and ${data.files.length - 3} more files`);
      }
    });
  
  console.log('\n\n🔒 ENVIRONMENT VARIABLES TO KEEP:');
  console.log('----------------------------------');
  
  Object.entries(report.byEnvVar)
    .filter(([_, data]) => !data.shouldMigrate)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([envVar, data]) => {
      console.log(`${envVar} - Used ${data.count} times (keep in .env)`);
    });
  
  // Generate migration examples
  console.log('\n\n📝 MIGRATION EXAMPLES:');
  console.log('---------------------\n');
  
  console.log('Backend (CommonJS):');
  console.log('```javascript');
  console.log('// Old');
  console.log('const timeout = process.env.API_TIMEOUT || 30000;');
  console.log('');
  console.log('// New');
  console.log("const { config } = require('./lib/configService');");
  console.log("const timeout = await config.get('application.api_timeout', 30000);");
  console.log('```\n');
  
  console.log('Frontend (React):');
  console.log('```javascript');
  console.log('// Old');
  console.log('const baseUrl = process.env.NEXT_PUBLIC_APP_URL;');
  console.log('');
  console.log('// New');
  console.log("import { useConfig } from '../services/configClient';");
  console.log("const baseUrl = useConfig('application.base_url');");
  console.log('```\n');
  
  // Save detailed report
  const reportPath = path.join(__dirname, `env-usage-report-${Date.now()}.json`);
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n💾 Detailed report saved to: ${reportPath}`);
}

async function main() {
  try {
    console.log('🚀 Analyzing codebase for environment variable usage...\n');
    
    const report = await generateReport();
    await printReport(report);
    
    console.log('\n\n✅ Analysis complete!');
    console.log('\n📋 Next steps:');
    console.log('1. Run the migration script to populate database settings');
    console.log('2. Update code files to use config.get() instead of process.env');
    console.log('3. Test thoroughly in development');
    console.log('4. Update .env.example to remove migrated variables');
    console.log('5. Deploy with confidence!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { analyzeFile, generateReport };