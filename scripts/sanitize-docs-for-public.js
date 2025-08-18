#!/usr/bin/env node

/**
 * Documentation Sanitization Script
 * 
 * This script removes sensitive data from documentation files before
 * publishing to a public repository.
 * 
 * Usage: node sanitize-docs-for-public.js [--source docs] [--output docs-public]
 */

const fs = require('fs').promises;
const path = require('path');

const SOURCE_DIR = process.argv.includes('--source') 
  ? process.argv[process.argv.indexOf('--source') + 1]
  : path.join(__dirname, '..', 'docs');

const OUTPUT_DIR = process.argv.includes('--output')
  ? process.argv[process.argv.indexOf('--output') + 1]  
  : path.join(__dirname, '..', 'docs-public');

// Sensitive patterns to replace
const REPLACEMENTS = [
  // Email addresses
  { pattern: /[\w.-]+@shipdocs\.app/gi, replacement: 'user@example.com' },
  { pattern: /adminmartexx@shipdocs\.app/gi, replacement: 'admin@example.com' },
  { pattern: /manager@shipdocs\.app/gi, replacement: 'manager@example.com' },
  { pattern: /crew\.test@shipdocs\.app/gi, replacement: 'crew@example.com' },
  { pattern: /hr@shipdocs\.app/gi, replacement: 'hr@example.com' },
  { pattern: /noreply@shipdocs\.app/gi, replacement: 'noreply@example.com' },
  { pattern: /security@shipdocs\.app/gi, replacement: 'security@example.com' },
  { pattern: /burando_onboarding_[\w]+@shipdocs\.app/gi, replacement: 'onboarding@example.com' },
  { pattern: /@shipdocs\.app/gi, replacement: '@example.com' }, // Generic catch-all for any remaining @shipdocs.app

  // Passwords
  { pattern: /Yumminova21!@#/g, replacement: 'YOUR_ADMIN_PASSWORD' },
  { pattern: /Yumminova21/g, replacement: 'YOUR_ADMIN_PASSWORD' }, // Catch partial password patterns
  { pattern: /TestPass123!/g, replacement: 'YOUR_TEST_PASSWORD' },
  { pattern: /password123/gi, replacement: 'your-password' },
  { pattern: /securepassword/gi, replacement: 'your-secure-password' },
  
  // API Keys
  { pattern: /mlsn\.[a-f0-9]{64}/g, replacement: 'mlsn.YOUR_MAILERSEND_API_KEY' },
  { pattern: /eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/g, replacement: 'YOUR_JWT_TOKEN' },
  { pattern: /12028afbd79ca9eeb0a16f4454030f959940191637059b93d073a59e416dbb84/g, replacement: 'YOUR_JWT_SECRET' },
  
  // Supabase URLs (comprehensive patterns)
  { pattern: /https:\/\/ocqnnyxnqaedarcohywe\.supabase\.co/g, replacement: 'https://YOUR_PROJECT.supabase.co' },
  { pattern: /https:\/\/awylsjqmqhsegvvrkiim\.supabase\.co/g, replacement: 'https://YOUR_PROJECT.supabase.co' },
  { pattern: /https:\/\/atonfoxqfdfmraucwygt\.supabase\.co/g, replacement: 'https://YOUR_PROJECT.supabase.co' },
  { pattern: /ocqnnyxnqaedarcohywe\.supabase\.co/g, replacement: 'YOUR_PROJECT.supabase.co' },
  { pattern: /awylsjqmqhsegvvrkiim\.supabase\.co/g, replacement: 'YOUR_DEV_PROJECT.supabase.co' },
  { pattern: /atonfoxqfdfmraucwygt\.supabase\.co/g, replacement: 'YOUR_TEST_PROJECT.supabase.co' },
  { pattern: /ocqnnyxnqaedarcohywe/g, replacement: 'YOUR_PROJECT_ID' },
  { pattern: /awylsjqmqhsegvvrkiim/g, replacement: 'YOUR_DEV_PROJECT_ID' },
  { pattern: /atonfoxqfdfmraucwygt/g, replacement: 'YOUR_TEST_PROJECT_ID' },
  
  // Vercel URLs
  { pattern: /new-onboarding-2025-git-[\w-]+\.vercel\.app/g, replacement: 'your-project.vercel.app' },
  
  // Custom domain
  { pattern: /onboarding\.burando\.online/g, replacement: 'your-domain.com' },
  
  // Supabase keys (if any appear in examples)
  { pattern: /anon-key:\s*[\w-]+/g, replacement: 'anon-key: YOUR_ANON_KEY' },
  { pattern: /service-role:\s*[\w-]+/g, replacement: 'service-role: YOUR_SERVICE_ROLE_KEY' },
];

// Directories to skip (but we'll process _archive separately for completeness)
const SKIP_DIRS = ['node_modules', '.git'];

// Files to skip entirely
const SKIP_FILES = ['.env', '.env.local', '.env.test'];

class DocumentationSanitizer {
  constructor() {
    this.stats = {
      filesProcessed: 0,
      replacementsMade: 0,
      filesSkipped: 0,
      errors: []
    };
  }

  async sanitize() {
    console.log('🧹 Starting Documentation Sanitization');
    console.log(`Source: ${SOURCE_DIR}`);
    console.log(`Output: ${OUTPUT_DIR}\n`);

    try {
      // Create output directory
      await this.ensureDir(OUTPUT_DIR);

      // Process all files
      await this.processDirectory(SOURCE_DIR, OUTPUT_DIR);

      // Create sanitization report
      await this.createReport();

      this.printStats();
    } catch (error) {
      console.error('❌ Error during sanitization:', error);
      this.stats.errors.push(error.message);
    }
  }

  async processDirectory(sourceDir, outputDir, relativePath = '') {
    const items = await fs.readdir(sourceDir, { withFileTypes: true });

    for (const item of items) {
      const sourcePath = path.join(sourceDir, item.name);
      const outputPath = path.join(outputDir, item.name);
      const relPath = path.join(relativePath, item.name);

      // Skip certain directories
      if (item.isDirectory() && SKIP_DIRS.includes(item.name)) {
        console.log(`⏭️  Skipping directory: ${relPath}`);
        this.stats.filesSkipped++;
        continue;
      }

      if (item.isDirectory()) {
        await this.ensureDir(outputPath);
        await this.processDirectory(sourcePath, outputPath, relPath);
      } else if (item.name.endsWith('.md')) {
        await this.processFile(sourcePath, outputPath, relPath);
      } else if (item.name === 'README.md' || item.name.endsWith('.json')) {
        // Copy other relevant files but sanitize them too
        await this.processFile(sourcePath, outputPath, relPath);
      }
    }
  }

  async processFile(sourcePath, outputPath, relativePath) {
    // Skip certain files
    if (SKIP_FILES.includes(path.basename(sourcePath))) {
      console.log(`⏭️  Skipping file: ${relativePath}`);
      this.stats.filesSkipped++;
      return;
    }

    try {
      console.log(`📄 Processing: ${relativePath}`);
      
      let content = await fs.readFile(sourcePath, 'utf8');
      let replacements = 0;

      // Apply all replacements
      for (const rule of REPLACEMENTS) {
        const matches = content.match(rule.pattern);
        if (matches) {
          content = content.replace(rule.pattern, rule.replacement);
          replacements += matches.length;
        }
      }

      // Add header to sanitized files
      if (replacements > 0 && path.extname(sourcePath) === '.md') {
        const header = `<!-- This documentation has been sanitized for public viewing. Sensitive data has been replaced with placeholders. -->\n\n`;
        content = header + content;
      }

      await fs.writeFile(outputPath, content);
      
      this.stats.filesProcessed++;
      this.stats.replacementsMade += replacements;
      
      if (replacements > 0) {
        console.log(`  ✓ Made ${replacements} replacements`);
      }
    } catch (error) {
      console.error(`  ❌ Error processing ${relativePath}:`, error.message);
      this.stats.errors.push(`${relativePath}: ${error.message}`);
    }
  }

  async ensureDir(dirPath) {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
    }
  }

  async createReport() {
    const report = {
      timestamp: new Date().toISOString(),
      source: SOURCE_DIR,
      output: OUTPUT_DIR,
      stats: this.stats,
      replacementPatterns: REPLACEMENTS.map(r => ({
        pattern: r.pattern.toString(),
        replacement: r.replacement
      }))
    };

    const reportPath = path.join(OUTPUT_DIR, 'SANITIZATION_REPORT.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  }

  printStats() {
    console.log('\n📊 Sanitization Complete');
    console.log('=======================');
    console.log(`Files Processed: ${this.stats.filesProcessed}`);
    console.log(`Total Replacements: ${this.stats.replacementsMade}`);
    console.log(`Files Skipped: ${this.stats.filesSkipped}`);
    
    if (this.stats.errors.length > 0) {
      console.log(`\n❌ Errors (${this.stats.errors.length}):`);
      this.stats.errors.forEach(error => console.log(`  - ${error}`));
    }

    console.log('\n✅ Sanitized documentation ready at:', OUTPUT_DIR);
    console.log('\n⚠️  IMPORTANT: Review the output before publishing!');
    console.log('   Check SANITIZATION_REPORT.json for details.');
  }
}

// Run sanitization
const sanitizer = new DocumentationSanitizer();
sanitizer.sanitize().catch(console.error);