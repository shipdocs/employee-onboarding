#!/usr/bin/env node

/**
 * Documentation Preservation and Reorganization Script
 * 
 * This script automates the preservation and intelligent reorganization of documentation
 * while maintaining all content and fixing broken links.
 * 
 * Usage: node preserve-and-reorganize-docs.js [--dry-run] [--phase=1|2|3|4|5]
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const DOCS_ROOT = path.join(__dirname, '..', 'docs');
const ARCHIVE_DIR = path.join(DOCS_ROOT, '_archive', `${new Date().toISOString().split('T')[0]}-snapshot`);
const PRESERVATION_DIR = path.join(DOCS_ROOT, '_preservation');

// Configuration for the new structure
const NEW_STRUCTURE = {
  'getting-started': {
    description: 'Quick start guides and installation',
    files: []
  },
  'for-developers': {
    description: 'Developer documentation',
    subdirs: ['architecture', 'api-reference', 'implementation-guides', 'development-workflow'],
    files: []
  },
  'for-administrators': {
    description: 'Administrator documentation',
    subdirs: ['deployment', 'maintenance', 'security'],
    files: []
  },
  'for-users': {
    description: 'End-user documentation',
    subdirs: ['training-materials'],
    files: []
  },
  'features': {
    description: 'Feature-specific documentation',
    subdirs: ['authentication', 'training-system', 'certificate-generation', 'multilingual-support', 'offline-functionality'],
    files: []
  },
  'project-history': {
    description: 'Historical documentation and sprint summaries',
    subdirs: ['sprint-summaries'],
    files: []
  },
  '_internal': {
    description: 'Internal reports and audits',
    subdirs: ['reports', 'audits'],
    files: []
  }
};

// File mapping rules for reorganization
const FILE_MAPPINGS = {
  // Getting Started
  'INSTALLATION_SETUP.md': 'getting-started/installation.md',
  'getting-started/installation.md': 'getting-started/installation.md',
  'QUICK_START_GUIDE.md': 'getting-started/first-steps.md',
  
  // Developer Docs - Architecture
  'ARCHITECTURE_OVERVIEW.md': 'for-developers/architecture/overview.md',
  'architecture/README.md': 'for-developers/architecture/overview.md',
  'DATABASE_ARCHITECTURE.md': 'for-developers/architecture/database-design.md',
  'RLS_IMPLEMENTATION.md': 'for-developers/architecture/database-design.md',
  'RLS_IMPLEMENTATION_GUIDE.md': 'for-developers/architecture/database-design.md',
  
  // Developer Docs - API
  'API_DOCUMENTATION.md': 'for-developers/api-reference/README.md',
  'API_REFERENCE.md': 'for-developers/api-reference/endpoints/overview.md',
  'developers/api-reference-generated.md': 'for-developers/api-reference/endpoints/generated-reference.md',
  'API_ERROR_HANDLING.md': 'for-developers/api-reference/error-handling.md',
  'API-RESPONSE-STANDARD.md': 'for-developers/api-reference/response-standards.md',
  
  // Developer Docs - Guides
  'DEVELOPER-GUIDE.md': 'for-developers/README.md',
  'DEVELOPER_QUICK_REFERENCE.md': 'for-developers/quick-reference.md',
  'DEVELOPMENT_WORKFLOW.md': 'for-developers/development-workflow/workflow.md',
  'development/environment-setup.md': 'for-developers/development-workflow/environment-setup.md',
  
  // Admin Docs
  'USER_GUIDE_ADMIN.md': 'for-administrators/user-guide.md',
  'DEPLOYMENT_PROCEDURES.md': 'for-administrators/deployment/README.md',
  'deployment/README.md': 'for-administrators/deployment/overview.md',
  'guides/VERCEL_DEPLOYMENT_GUIDE.md': 'for-administrators/deployment/vercel-deployment.md',
  
  // User Docs
  'USER_GUIDE_MANAGER.md': 'for-users/manager-guide.md',
  'USER_GUIDE_CREW.md': 'for-users/crew-guide.md',
  
  // Security
  'COMPREHENSIVE_SECURITY_REPORT.md': 'for-administrators/security/security-overview.md',
  'SECURITY_IMPLEMENTATION_GUIDE.md': 'for-administrators/security/implementation-guide.md',
  'FINAL_SECURITY_VALIDATION.md': 'for-administrators/security/validation-report.md',
  
  // Sprint History
  'SPRINT-1-SUMMARY.md': 'project-history/sprint-summaries/sprint-1.md',
  'sprints/S03_COMPLETION_SUMMARY.md': 'project-history/sprint-summaries/sprint-3.md',
};

// Link update rules
const LINK_UPDATES = {
  'docs/docs/': 'docs/',  // Fix double docs path
  '../api/reference.md': '../for-developers/api-reference/',
  '../api/authentication.md': '../for-developers/api-reference/authentication.md',
  '../architecture/database.md': '../for-developers/architecture/database-design.md',
  '../features/authentication.md': '../features/authentication/README.md',
};

class DocumentationReorganizer {
  constructor(options = {}) {
    this.dryRun = options.dryRun || false;
    this.phase = options.phase || 'all';
    this.stats = {
      filesProcessed: 0,
      filesMoved: 0,
      linksFixed: 0,
      duplicatesFound: 0,
      errors: []
    };
  }

  async run() {
    console.log('🚀 Starting Documentation Preservation and Reorganization');
    console.log(`Mode: ${this.dryRun ? 'DRY RUN' : 'LIVE'}`);
    console.log(`Phase: ${this.phase}`);
    console.log('');

    try {
      if (this.phase === 'all' || this.phase === '1') {
        await this.phase1_preservation();
      }
      if (this.phase === 'all' || this.phase === '2') {
        await this.phase2_createStructure();
      }
      if (this.phase === 'all' || this.phase === '3') {
        await this.phase3_reorganize();
      }
      if (this.phase === 'all' || this.phase === '4') {
        await this.phase4_fixLinks();
      }
      if (this.phase === 'all' || this.phase === '5') {
        await this.phase5_validate();
      }

      this.printReport();
    } catch (error) {
      console.error('❌ Error during reorganization:', error);
      this.stats.errors.push(error.message);
    }
  }

  async phase1_preservation() {
    console.log('📦 Phase 1: Content Preservation and Cataloging');
    
    // Create preservation directory
    if (!this.dryRun) {
      await this.ensureDir(PRESERVATION_DIR);
      await this.ensureDir(ARCHIVE_DIR);
    }

    // Create content inventory
    const inventory = await this.createInventory(DOCS_ROOT);
    console.log(`  ✓ Found ${inventory.files.length} documentation files`);
    
    if (!this.dryRun) {
      await fs.writeFile(
        path.join(PRESERVATION_DIR, 'content-inventory.json'),
        JSON.stringify(inventory, null, 2)
      );
    }

    // Archive current state
    console.log('  📸 Creating snapshot of current documentation...');
    await this.createArchive(DOCS_ROOT, ARCHIVE_DIR);
    console.log('  ✓ Archive created');
  }

  async phase2_createStructure() {
    console.log('\n🏗️  Phase 2: Creating New Directory Structure');
    
    for (const [dir, config] of Object.entries(NEW_STRUCTURE)) {
      const dirPath = path.join(DOCS_ROOT, dir);
      
      if (!this.dryRun) {
        await this.ensureDir(dirPath);
      }
      console.log(`  ✓ Created ${dir}/`);
      
      // Create subdirectories
      if (config.subdirs) {
        for (const subdir of config.subdirs) {
          const subdirPath = path.join(dirPath, subdir);
          if (!this.dryRun) {
            await this.ensureDir(subdirPath);
          }
          console.log(`    ✓ Created ${dir}/${subdir}/`);
        }
      }
      
      // Create README
      const readmePath = path.join(dirPath, 'README.md');
      const readmeContent = this.generateReadme(dir, config);
      
      if (!this.dryRun) {
        await fs.writeFile(readmePath, readmeContent);
      }
    }
  }

  async phase3_reorganize() {
    console.log('\n📁 Phase 3: Reorganizing Documentation');
    
    for (const [oldPath, newPath] of Object.entries(FILE_MAPPINGS)) {
      const sourcePath = path.join(DOCS_ROOT, oldPath);
      const destPath = path.join(DOCS_ROOT, newPath);
      
      try {
        await fs.access(sourcePath);
        console.log(`  Moving ${oldPath} → ${newPath}`);
        
        if (!this.dryRun) {
          await this.ensureDir(path.dirname(destPath));
          
          // Check if destination exists (potential duplicate)
          try {
            await fs.access(destPath);
            console.log(`    ⚠️  Destination exists, merging content...`);
            await this.mergeFiles(sourcePath, destPath);
            this.stats.duplicatesFound++;
          } catch {
            // Destination doesn't exist, simple move
            await fs.rename(sourcePath, destPath);
          }
        }
        
        this.stats.filesMoved++;
      } catch (error) {
        // Source file doesn't exist, skip
        console.log(`  ⏭️  Skipping ${oldPath} (not found)`);
      }
    }
  }

  async phase4_fixLinks() {
    console.log('\n🔗 Phase 4: Fixing Broken Links');
    
    const mdFiles = await this.findMarkdownFiles(DOCS_ROOT);
    
    for (const file of mdFiles) {
      const content = await fs.readFile(file, 'utf8');
      let updatedContent = content;
      let linksFixed = 0;
      
      // Fix known broken link patterns
      for (const [oldLink, newLink] of Object.entries(LINK_UPDATES)) {
        const regex = new RegExp(oldLink.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        const matches = updatedContent.match(regex);
        
        if (matches) {
          updatedContent = updatedContent.replace(regex, newLink);
          linksFixed += matches.length;
        }
      }
      
      // Fix links to moved files
      for (const [oldPath, newPath] of Object.entries(FILE_MAPPINGS)) {
        const oldLink = oldPath.replace(/\.md$/, '');
        const newLink = newPath.replace(/\.md$/, '');
        const regex = new RegExp(`\\]\\([^)]*${oldLink}[^)]*\\)`, 'g');
        
        updatedContent = updatedContent.replace(regex, (match) => {
          linksFixed++;
          return match.replace(oldLink, newLink);
        });
      }
      
      if (linksFixed > 0) {
        console.log(`  ✓ Fixed ${linksFixed} links in ${path.relative(DOCS_ROOT, file)}`);
        this.stats.linksFixed += linksFixed;
        
        if (!this.dryRun) {
          await fs.writeFile(file, updatedContent);
        }
      }
      
      this.stats.filesProcessed++;
    }
  }

  async phase5_validate() {
    console.log('\n✅ Phase 5: Validation');
    
    // Check for remaining broken links
    const brokenLinks = await this.findBrokenLinks(DOCS_ROOT);
    console.log(`  Found ${brokenLinks.length} remaining broken links`);
    
    if (brokenLinks.length > 0 && !this.dryRun) {
      await fs.writeFile(
        path.join(PRESERVATION_DIR, 'remaining-broken-links.json'),
        JSON.stringify(brokenLinks, null, 2)
      );
    }
    
    // Verify no content was lost
    const originalCount = await this.countMarkdownFiles(ARCHIVE_DIR);
    const newCount = await this.countMarkdownFiles(DOCS_ROOT);
    
    console.log(`  Original files: ${originalCount}`);
    console.log(`  Current files: ${newCount}`);
    
    if (originalCount !== newCount) {
      console.log(`  ⚠️  Warning: File count mismatch!`);
      this.stats.errors.push(`File count mismatch: ${originalCount} → ${newCount}`);
    }
  }

  // Helper methods
  async ensureDir(dirPath) {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
    }
  }

  async createInventory(dir) {
    const inventory = { files: [], directories: [] };
    const items = await fs.readdir(dir, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      
      if (item.isDirectory() && !item.name.startsWith('_') && !item.name.startsWith('.')) {
        inventory.directories.push(item.name);
        const subInventory = await this.createInventory(fullPath);
        inventory.files.push(...subInventory.files);
      } else if (item.isFile() && item.name.endsWith('.md')) {
        const stats = await fs.stat(fullPath);
        inventory.files.push({
          path: path.relative(DOCS_ROOT, fullPath),
          size: stats.size,
          modified: stats.mtime
        });
      }
    }
    
    return inventory;
  }

  async createArchive(source, dest) {
    if (this.dryRun) return;
    
    const items = await fs.readdir(source, { withFileTypes: true });
    await this.ensureDir(dest);
    
    for (const item of items) {
      const sourcePath = path.join(source, item.name);
      const destPath = path.join(dest, item.name);
      
      if (item.name.startsWith('_archive')) continue;
      
      if (item.isDirectory()) {
        await this.createArchive(sourcePath, destPath);
      } else {
        await fs.copyFile(sourcePath, destPath);
      }
    }
  }

  async findMarkdownFiles(dir) {
    const files = [];
    const items = await fs.readdir(dir, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      
      if (item.isDirectory() && !item.name.startsWith('.')) {
        files.push(...await this.findMarkdownFiles(fullPath));
      } else if (item.isFile() && item.name.endsWith('.md')) {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  async countMarkdownFiles(dir) {
    try {
      const files = await this.findMarkdownFiles(dir);
      return files.length;
    } catch {
      return 0;
    }
  }

  async findBrokenLinks(dir) {
    const brokenLinks = [];
    const mdFiles = await this.findMarkdownFiles(dir);
    
    for (const file of mdFiles) {
      const content = await fs.readFile(file, 'utf8');
      const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
      let match;
      
      while ((match = linkRegex.exec(content)) !== null) {
        const linkPath = match[2];
        
        // Skip external links
        if (linkPath.startsWith('http') || linkPath.startsWith('#')) continue;
        
        // Resolve relative links
        const resolvedPath = path.resolve(path.dirname(file), linkPath.replace(/#.*$/, ''));
        
        try {
          await fs.access(resolvedPath);
        } catch {
          brokenLinks.push({
            file: path.relative(DOCS_ROOT, file),
            link: linkPath,
            linkText: match[1]
          });
        }
      }
    }
    
    return brokenLinks;
  }

  async mergeFiles(source, dest) {
    const sourceContent = await fs.readFile(source, 'utf8');
    const destContent = await fs.readFile(dest, 'utf8');

    // Simple merge strategy: append source to dest with a separator
    const mergedContent = `${destContent}\n\n---\n\n## Merged Content\n\n${sourceContent}`;

    try {
      await fs.writeFile(dest, mergedContent);
      await fs.unlink(source);
    } catch (error) {
      console.error(`❌ Failed to merge ${source} into ${dest}: ${error.message}`);
      throw error;
    }
  }

  generateReadme(dir, config) {
    const title = dir.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
    
    let content = `# ${title}\n\n${config.description}\n\n## Contents\n\n`;
    
    if (config.subdirs) {
      content += '### Sections\n\n';
      for (const subdir of config.subdirs) {
        const subdirTitle = subdir.split('-').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
        content += `- [${subdirTitle}](./${subdir}/)\n`;
      }
      content += '\n';
    }
    
    content += '### Documents\n\n';
    content += '_Documents will be listed here after reorganization_\n';
    
    return content;
  }

  printReport() {
    console.log('\n📊 Reorganization Report');
    console.log('========================');
    console.log(`Files Processed: ${this.stats.filesProcessed}`);
    console.log(`Files Moved: ${this.stats.filesMoved}`);
    console.log(`Links Fixed: ${this.stats.linksFixed}`);
    console.log(`Duplicates Found: ${this.stats.duplicatesFound}`);
    
    if (this.stats.errors.length > 0) {
      console.log(`\n❌ Errors (${this.stats.errors.length}):`);
      this.stats.errors.forEach(error => console.log(`  - ${error}`));
    }
    
    console.log('\n✅ Reorganization complete!');
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  dryRun: args.includes('--dry-run'),
  phase: 'all'
};

const phaseArg = args.find(arg => arg.startsWith('--phase='));
if (phaseArg) {
  options.phase = phaseArg.split('=')[1];
}

// Run the reorganizer
const reorganizer = new DocumentationReorganizer(options);
reorganizer.run().catch(console.error);