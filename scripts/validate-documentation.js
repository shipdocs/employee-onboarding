#!/usr/bin/env node

/**
 * Documentation Validation Script
 * 
 * This script validates the documentation structure, checks for broken links,
 * identifies orphaned files, and ensures documentation integrity.
 * 
 * Usage: node validate-documentation.js [--fix] [--report=json|markdown]
 */

const fs = require('fs').promises;
const path = require('path');

const DOCS_ROOT = path.join(__dirname, '..', 'docs');

class DocumentationValidator {
  constructor(options = {}) {
    this.fix = options.fix || false;
    this.reportFormat = options.report || 'console';
    this.results = {
      totalFiles: 0,
      brokenLinks: [],
      orphanedFiles: [],
      missingFiles: [],
      duplicateContent: [],
      emptyFiles: [],
      largeFiles: [],
      validationTime: new Date().toISOString()
    };
  }

  async validate() {
    console.log('🔍 Starting Documentation Validation...\n');

    const startTime = Date.now();

    // Run all validation checks
    await this.findAllMarkdownFiles();
    await this.checkBrokenLinks();
    await this.findOrphanedFiles();
    await this.checkFileIntegrity();
    await this.findDuplicateContent();
    await this.validateStructure();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    this.results.validationDuration = `${duration}s`;

    // Generate report
    await this.generateReport();
  }

  async findAllMarkdownFiles() {
    console.log('📄 Scanning for markdown files...');
    const files = await this.scanDirectory(DOCS_ROOT);
    this.allFiles = files.filter(f => f.endsWith('.md'));
    this.results.totalFiles = this.allFiles.length;
    console.log(`  Found ${this.results.totalFiles} markdown files\n`);
  }

  async checkBrokenLinks() {
    console.log('🔗 Checking for broken links...');
    let totalLinks = 0;

    for (const file of this.allFiles) {
      const content = await fs.readFile(file, 'utf8');
      const links = this.extractLinks(content);
      
      for (const link of links) {
        totalLinks++;
        
        if (link.type === 'internal') {
          const isValid = await this.validateInternalLink(file, link);
          
          if (!isValid) {
            this.results.brokenLinks.push({
              file: path.relative(DOCS_ROOT, file),
              link: link.href,
              linkText: link.text,
              line: link.line,
              suggestion: this.suggestFix(link.href)
            });
          }
        }
      }
    }

    console.log(`  Checked ${totalLinks} links`);
    console.log(`  Found ${this.results.brokenLinks.length} broken links\n`);

    if (this.fix && this.results.brokenLinks.length > 0) {
      await this.fixBrokenLinks();
    }
  }

  async findOrphanedFiles() {
    console.log('🏝️  Finding orphaned files...');
    
    // Build a map of all files that are referenced
    const referencedFiles = new Set();
    
    // Always include README files as they're entry points
    for (const file of this.allFiles) {
      if (path.basename(file).toLowerCase() === 'readme.md') {
        referencedFiles.add(path.relative(DOCS_ROOT, file));
      }
    }

    // Find all internal links
    for (const file of this.allFiles) {
      const content = await fs.readFile(file, 'utf8');
      const links = this.extractLinks(content);
      
      for (const link of links) {
        if (link.type === 'internal') {
          const linkedFile = this.resolveLink(file, link.href);
          if (linkedFile) {
            referencedFiles.add(path.relative(DOCS_ROOT, linkedFile));
          }
        }
      }
    }

    // Find orphaned files
    for (const file of this.allFiles) {
      const relativePath = path.relative(DOCS_ROOT, file);
      if (!referencedFiles.has(relativePath)) {
        this.results.orphanedFiles.push({
          file: relativePath,
          size: (await fs.stat(file)).size,
          modified: (await fs.stat(file)).mtime
        });
      }
    }

    console.log(`  Found ${this.results.orphanedFiles.length} orphaned files\n`);
  }

  async checkFileIntegrity() {
    console.log('🏥 Checking file integrity...');

    for (const file of this.allFiles) {
      const content = await fs.readFile(file, 'utf8');
      const stats = await fs.stat(file);
      const relativePath = path.relative(DOCS_ROOT, file);

      // Check for empty files
      if (content.trim().length === 0) {
        this.results.emptyFiles.push(relativePath);
      }

      // Check for unusually large files (> 100KB)
      if (stats.size > 100 * 1024) {
        this.results.largeFiles.push({
          file: relativePath,
          size: stats.size,
          sizeFormatted: this.formatFileSize(stats.size)
        });
      }
    }

    console.log(`  Found ${this.results.emptyFiles.length} empty files`);
    console.log(`  Found ${this.results.largeFiles.length} large files (>100KB)\n`);
  }

  async findDuplicateContent() {
    console.log('👯 Checking for duplicate content...');
    
    const contentHashes = new Map();

    for (const file of this.allFiles) {
      const content = await fs.readFile(file, 'utf8');
      const normalizedContent = this.normalizeContent(content);
      const hash = this.hashContent(normalizedContent);
      
      if (contentHashes.has(hash)) {
        const existing = contentHashes.get(hash);
        let duplicateGroup = this.results.duplicateContent.find(
          group => group.files.includes(existing)
        );
        
        if (!duplicateGroup) {
          duplicateGroup = {
            hash,
            files: [existing],
            similarity: 'exact'
          };
          this.results.duplicateContent.push(duplicateGroup);
        }
        
        duplicateGroup.files.push(path.relative(DOCS_ROOT, file));
      } else {
        contentHashes.set(hash, path.relative(DOCS_ROOT, file));
      }
    }

    console.log(`  Found ${this.results.duplicateContent.length} groups of duplicate files\n`);
  }

  async validateStructure() {
    console.log('🏗️  Validating documentation structure...');
    
    const expectedDirs = [
      'api', 'architecture', 'deployment', 'development', 
      'features', 'getting-started', 'guides', 'maintenance',
      'migration', 'reports', 'security', 'testing'
    ];

    const missingDirs = [];
    for (const dir of expectedDirs) {
      try {
        await fs.access(path.join(DOCS_ROOT, dir));
      } catch {
        missingDirs.push(dir);
      }
    }

    if (missingDirs.length > 0) {
      console.log(`  ⚠️  Missing directories: ${missingDirs.join(', ')}`);
    } else {
      console.log(`  ✓ All expected directories present`);
    }

    // Check for required files
    const requiredFiles = [
      'README.md',
      'WHERE_TO_FIND_THINGS.md'
    ];

    for (const file of requiredFiles) {
      try {
        await fs.access(path.join(DOCS_ROOT, file));
      } catch {
        this.results.missingFiles.push(file);
      }
    }

    if (this.results.missingFiles.length > 0) {
      console.log(`  ⚠️  Missing required files: ${this.results.missingFiles.join(', ')}`);
    } else {
      console.log(`  ✓ All required files present`);
    }
    
    console.log('');
  }

  // Helper methods
  async scanDirectory(dir) {
    const files = [];
    const items = await fs.readdir(dir, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      
      if (item.isDirectory() && !item.name.startsWith('.') && !item.name.startsWith('_')) {
        files.push(...await this.scanDirectory(fullPath));
      } else if (item.isFile()) {
        files.push(fullPath);
      }
    }

    return files;
  }

  extractLinks(content) {
    const links = [];
    const lines = content.split('\n');
    
    // Match markdown links: [text](href)
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    
    lines.forEach((line, lineIndex) => {
      let match;
      while ((match = linkRegex.exec(line)) !== null) {
        const href = match[2];
        const text = match[1];
        
        links.push({
          text,
          href,
          line: lineIndex + 1,
          type: href.startsWith('http') ? 'external' : 'internal'
        });
      }
    });

    return links;
  }

  async validateInternalLink(sourceFile, link) {
    // Skip anchor links
    if (link.href.startsWith('#')) return true;
    
    // Remove anchor from href
    const href = link.href.split('#')[0];
    
    // Resolve the link relative to the source file
    const resolvedPath = path.resolve(path.dirname(sourceFile), href);
    
    try {
      // Check if file exists
      await fs.access(resolvedPath);
      return true;
    } catch {
      // Try adding .md extension
      try {
        await fs.access(resolvedPath + '.md');
        return true;
      } catch {
        return false;
      }
    }
  }

  resolveLink(sourceFile, href) {
    if (href.startsWith('#')) return null;
    
    const cleanHref = href.split('#')[0];
    const resolvedPath = path.resolve(path.dirname(sourceFile), cleanHref);
    
    // Try exact path first
    try {
      if (fs.existsSync(resolvedPath)) {
        return resolvedPath;
      }
    } catch {}
    
    // Try with .md extension
    try {
      const mdPath = resolvedPath + '.md';
      if (fs.existsSync(mdPath)) {
        return mdPath;
      }
    } catch {}
    
    return null;
  }

  suggestFix(brokenLink) {
    // Remove leading ../
    const searchTerm = brokenLink.replace(/^\.\.\//, '').replace(/\.md$/, '');
    
    // Find similar files
    const candidates = this.allFiles
      .map(file => ({
        file: path.relative(DOCS_ROOT, file),
        score: this.similarity(searchTerm, path.basename(file, '.md'))
      }))
      .filter(candidate => candidate.score > 0.5)
      .sort((a, b) => b.score - a.score);
    
    if (candidates.length > 0) {
      return candidates[0].file;
    }
    
    return null;
  }

  similarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  normalizeContent(content) {
    return content
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s]/g, '')
      .trim();
  }

  hashContent(content) {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(content).digest('hex');
  }

  formatFileSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  async fixBrokenLinks() {
    console.log('\n🔧 Attempting to fix broken links...');
    
    const fixes = {};
    
    for (const brokenLink of this.results.brokenLinks) {
      if (brokenLink.suggestion) {
        if (!fixes[brokenLink.file]) {
          fixes[brokenLink.file] = [];
        }
        
        fixes[brokenLink.file].push({
          old: brokenLink.link,
          new: brokenLink.suggestion,
          line: brokenLink.line
        });
      }
    }
    
    for (const [file, fileFixes] of Object.entries(fixes)) {
      const filePath = path.join(DOCS_ROOT, file);
      let content = await fs.readFile(filePath, 'utf8');
      
      for (const fix of fileFixes) {
        const oldLink = fix.old.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\]\\(${oldLink}\\)`, 'g');
        content = content.replace(regex, `](${fix.new})`);
      }
      
      await fs.writeFile(filePath, content);
      console.log(`  ✓ Fixed ${fileFixes.length} links in ${file}`);
    }
  }

  async generateReport() {
    console.log('\n📊 Generating validation report...\n');

    if (this.reportFormat === 'console') {
      this.printConsoleReport();
    } else if (this.reportFormat === 'json') {
      await this.generateJsonReport();
    } else if (this.reportFormat === 'markdown') {
      await this.generateMarkdownReport();
    }
  }

  printConsoleReport() {
    console.log('=== Documentation Validation Report ===\n');
    
    console.log(`📊 Summary:`);
    console.log(`  Total Files: ${this.results.totalFiles}`);
    console.log(`  Broken Links: ${this.results.brokenLinks.length}`);
    console.log(`  Orphaned Files: ${this.results.orphanedFiles.length}`);
    console.log(`  Empty Files: ${this.results.emptyFiles.length}`);
    console.log(`  Large Files: ${this.results.largeFiles.length}`);
    console.log(`  Duplicate Groups: ${this.results.duplicateContent.length}`);
    console.log(`  Missing Required Files: ${this.results.missingFiles.length}`);
    
    if (this.results.brokenLinks.length > 0) {
      console.log('\n❌ Broken Links:');
      this.results.brokenLinks.slice(0, 10).forEach(link => {
        console.log(`  ${link.file}:${link.line}`);
        console.log(`    "${link.linkText}" → ${link.link}`);
        if (link.suggestion) {
          console.log(`    💡 Suggestion: ${link.suggestion}`);
        }
      });
      
      if (this.results.brokenLinks.length > 10) {
        console.log(`  ... and ${this.results.brokenLinks.length - 10} more`);
      }
    }
    
    if (this.results.orphanedFiles.length > 0) {
      console.log('\n🏝️  Orphaned Files (not linked from anywhere):');
      this.results.orphanedFiles.slice(0, 10).forEach(file => {
        console.log(`  ${file.file} (${this.formatFileSize(file.size)})`);
      });
      
      if (this.results.orphanedFiles.length > 10) {
        console.log(`  ... and ${this.results.orphanedFiles.length - 10} more`);
      }
    }
    
    if (this.results.duplicateContent.length > 0) {
      console.log('\n👯 Duplicate Content:');
      this.results.duplicateContent.forEach(group => {
        console.log(`  Group (${group.files.length} files):`);
        group.files.forEach(file => console.log(`    - ${file}`));
      });
    }
    
    console.log(`\n✅ Validation completed in ${this.results.validationDuration}`);
  }

  async generateJsonReport() {
    const reportPath = path.join(DOCS_ROOT, '_preservation', 'validation-report.json');
    await this.ensureDir(path.dirname(reportPath));
    await fs.writeFile(reportPath, JSON.stringify(this.results, null, 2));
    console.log(`✓ JSON report saved to: ${reportPath}`);
  }

  async generateMarkdownReport() {
    const reportPath = path.join(DOCS_ROOT, '_preservation', 'validation-report.md');
    await this.ensureDir(path.dirname(reportPath));
    
    let content = `# Documentation Validation Report\n\n`;
    content += `Generated: ${this.results.validationTime}\n\n`;
    content += `## Summary\n\n`;
    content += `- **Total Files**: ${this.results.totalFiles}\n`;
    content += `- **Broken Links**: ${this.results.brokenLinks.length}\n`;
    content += `- **Orphaned Files**: ${this.results.orphanedFiles.length}\n`;
    content += `- **Empty Files**: ${this.results.emptyFiles.length}\n`;
    content += `- **Large Files**: ${this.results.largeFiles.length}\n`;
    content += `- **Duplicate Groups**: ${this.results.duplicateContent.length}\n\n`;
    
    if (this.results.brokenLinks.length > 0) {
      content += `## Broken Links\n\n`;
      this.results.brokenLinks.forEach(link => {
        content += `- \`${link.file}:${link.line}\` - [${link.linkText}](${link.link})`;
        if (link.suggestion) {
          content += ` → suggested: \`${link.suggestion}\``;
        }
        content += `\n`;
      });
      content += `\n`;
    }
    
    if (this.results.orphanedFiles.length > 0) {
      content += `## Orphaned Files\n\n`;
      content += `Files not referenced from any other documentation:\n\n`;
      this.results.orphanedFiles.forEach(file => {
        content += `- \`${file.file}\` (${this.formatFileSize(file.size)})\n`;
      });
      content += `\n`;
    }
    
    await fs.writeFile(reportPath, content);
    console.log(`✓ Markdown report saved to: ${reportPath}`);
  }

  async ensureDir(dirPath) {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
    }
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  fix: args.includes('--fix'),
  report: 'console'
};

const reportArg = args.find(arg => arg.startsWith('--report='));
if (reportArg) {
  options.report = reportArg.split('=')[1];
}

// Run the validator
const validator = new DocumentationValidator(options);
validator.validate().catch(console.error);