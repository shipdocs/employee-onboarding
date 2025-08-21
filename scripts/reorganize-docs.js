#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class DocumentationReorganizer {
    constructor() {
        this.docsPath = './docs';
        this.backupPath = './docs-backup';
        this.migrationMap = new Map();
        this.setupMigrationRules();
    }

    setupMigrationRules() {
        // Define smart migration rules
        this.migrationMap.set('archive', [
            // Sprint and temporal content
            /SPRINT.*\.md$/i,
            /week\d+.*\.md$/i,
            /\d{4}-\d{2}-\d{2}.*\.md$/i,
            /.*summary\.md$/i,
            /.*report\.md$/i,
            /REFACTORING_SUMMARY\.md$/i,
            /MIGRATION_.*SUMMARY\.md$/i,
            /.*COMPLETION_SUMMARY\.md$/i,
            /.*IMPLEMENTATION_SUMMARY\.md$/i
        ]);

        this.migrationMap.set('users', [
            /USER_GUIDE_.*\.md$/i,
            /CREW_.*\.md$/i,
            /ROLE_BASED_ACCESS_CONTROL\.md$/i
        ]);

        this.migrationMap.set('developers', [
            /API_.*\.md$/i,
            /DEVELOPER.*\.md$/i,
            /DEVELOPMENT.*\.md$/i,
            /TYPESCRIPT.*\.md$/i,
            /CLAUDE.*\.md$/i,
            /ERROR_HANDLING.*\.md$/i
        ]);

        this.migrationMap.set('operations', [
            /DEPLOYMENT.*\.md$/i,
            /SECURITY.*\.md$/i,
            /PERFORMANCE.*\.md$/i,
            /MONITORING.*\.md$/i,
            /INCIDENT.*\.md$/i
        ]);

        this.migrationMap.set('quickstart', [
            /INSTALLATION.*\.md$/i,
            /SETUP.*\.md$/i,
            /QUICK.*\.md$/i,
            /GETTING.*STARTED.*\.md$/i
        ]);
    }

    async reorganize() {
        console.log('🔄 Starting intelligent documentation reorganization...\n');
        
        // Create backup
        await this.createBackup();
        
        // Create new structure
        await this.createNewStructure();
        
        // Migrate files
        await this.migrateFiles();
        
        // Update links
        await this.updateLinks();
        
        // Generate new README
        await this.generateNewReadme();
        
        console.log('✅ Reorganization complete!\n');
        this.generateReport();
    }

    async createBackup() {
        console.log('💾 Creating backup...');
        if (fs.existsSync(this.backupPath)) {
            fs.rmSync(this.backupPath, { recursive: true });
        }
        fs.cpSync(this.docsPath, this.backupPath, { recursive: true });
        console.log(`   Backup created at ${this.backupPath}\n`);
    }

    async createNewStructure() {
        console.log('🏗️ Creating new directory structure...');
        
        const newDirs = [
            'docs/quickstart',
            'docs/users', 
            'docs/developers',
            'docs/operations',
            'docs/archive/sprints',
            'docs/archive/reports',
            'docs/archive/summaries',
            'docs/archive/deprecated'
        ];

        for (const dir of newDirs) {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                console.log(`   Created ${dir}`);
            }
        }
        console.log();
    }

    async migrateFiles() {
        console.log('📦 Migrating files...');
        
        const files = this.getAllMarkdownFiles(this.docsPath);
        const migrations = {
            archive: [],
            users: [],
            developers: [],
            operations: [],
            quickstart: [],
            unmapped: []
        };

        // Categorize files
        for (const file of files) {
            const fileName = path.basename(file);
            let category = 'unmapped';

            // Skip if already in new structure
            if (file.includes('/quickstart/') || file.includes('/users/') || 
                file.includes('/developers/') || file.includes('/operations/') ||
                file.includes('/archive/')) {
                continue;
            }

            // Find matching category
            for (const [cat, patterns] of this.migrationMap.entries()) {
                if (patterns.some(pattern => pattern.test(fileName))) {
                    category = cat;
                    break;
                }
            }

            migrations[category].push(file);
        }

        // Move files
        for (const [category, fileList] of Object.entries(migrations)) {
            if (fileList.length === 0) continue;
            
            console.log(`   Moving ${fileList.length} files to ${category}/`);
            
            for (const file of fileList) {
                const fileName = path.basename(file);
                let targetDir = `docs/${category}`;
                
                // Special handling for archive
                if (category === 'archive') {
                    if (/SPRINT|sprint/i.test(fileName)) {
                        targetDir = 'docs/archive/sprints';
                    } else if (/report/i.test(fileName)) {
                        targetDir = 'docs/archive/reports';
                    } else if (/summary/i.test(fileName)) {
                        targetDir = 'docs/archive/summaries';
                    } else {
                        targetDir = 'docs/archive/deprecated';
                    }
                }

                const targetPath = path.join(targetDir, fileName);
                
                try {
                    await fs.promises.rename(file, targetPath);
                } catch (error) {
                    console.log(`     Warning: Could not move ${file} - ${error.message}`);
                }
            }
        }

        // Report unmapped files
        if (migrations.unmapped.length > 0) {
            console.log(`   ⚠️  ${migrations.unmapped.length} files need manual review:`);
            migrations.unmapped.forEach(file => {
                console.log(`     - ${path.basename(file)}`);
            });
        }
        
        console.log();
    }

    async updateLinks() {
        console.log('🔗 Updating internal links...');
        
        // This would be a complex operation - for now, just log what needs to be done
        console.log('   Note: Link updates require manual review due to complexity');
        console.log('   Recommendation: Use find-and-replace for common patterns\n');
    }

    async generateNewReadme() {
        console.log('📝 Generating new README...');
        
        const newReadme = `# Maritime Onboarding System - Documentation

Welcome to the Maritime Onboarding System documentation. This documentation is organized by audience and task to help you find what you need quickly.

## 🚀 Quick Start

New to the system? Start here:
- **[Installation Guide](quickstart/installation.md)** - Get the system running
- **[First Login](quickstart/first-login.md)** - Initial setup and configuration
- **[Common Tasks](quickstart/common-tasks.md)** - Frequently needed procedures

## 👥 User Guides

Documentation for system users:
- **[Admin Guide](users/admin-guide.md)** - Complete admin functionality
- **[Manager Guide](users/manager-guide.md)** - Manager tools and workflows  
- **[Crew Guide](users/crew-guide.md)** - Crew member training process

## 💻 Developer Documentation

Technical documentation for developers:
- **[Development Setup](developers/setup.md)** - Local development environment
- **[API Reference](developers/api-reference.md)** - Complete API documentation
- **[Architecture](developers/architecture.md)** - System design and patterns
- **[Contributing](developers/contributing.md)** - Development workflow

## 🔧 Operations

Deployment and maintenance documentation:
- **[Deployment Guide](operations/deployment.md)** - Production deployment
- **[Monitoring](operations/monitoring.md)** - System monitoring and alerts
- **[Troubleshooting](operations/troubleshooting.md)** - Common issues and solutions

## 📚 Archive

Historical documentation and reports:
- **[Sprint Reports](archive/sprints/)** - Development sprint summaries
- **[System Reports](archive/reports/)** - Technical reports and audits
- **[Implementation Summaries](archive/summaries/)** - Feature implementation logs

## 🎯 Find What You Need

**I want to...**
- **Set up the system locally** → [Development Setup](developers/setup.md)
- **Deploy to production** → [Deployment Guide](operations/deployment.md)
- **Understand user roles** → [Admin Guide](users/admin-guide.md)
- **Use the API** → [API Reference](developers/api-reference.md)
- **Troubleshoot an issue** → [Troubleshooting](operations/troubleshooting.md)

## 🏢 System Overview

The Maritime Onboarding System is a comprehensive platform for managing crew training and certification:

- **Three-tier role system** (Admin, Manager, Crew)
- **Phase-based training workflow** with automated progression
- **Interactive quiz system** with manager review
- **PDF certificate generation** with custom templates
- **Multi-language support** (English/Dutch)
- **Offline capability** for maritime environments

## 🔄 Documentation Maintenance

This documentation is actively maintained. If you find issues or have suggestions:

1. Check the [troubleshooting guide](operations/troubleshooting.md)
2. Review [archived reports](archive/) for historical context
3. Contact the development team for updates

---

*Last updated: ${new Date().toISOString().split('T')[0]}*
*Documentation reorganized for improved usability and maintenance*
`;

        fs.writeFileSync('docs/README.md', newReadme);
        console.log('   New README.md generated\n');
    }

    getAllMarkdownFiles(dir) {
        const files = [];
        const items = fs.readdirSync(dir);
        
        for (const item of items) {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                files.push(...this.getAllMarkdownFiles(fullPath));
            } else if (item.endsWith('.md')) {
                files.push(fullPath);
            }
        }
        
        return files;
    }

    generateReport() {
        console.log('📊 REORGANIZATION REPORT');
        console.log('='.repeat(40));
        console.log('✅ Backup created at docs-backup/');
        console.log('✅ New structure implemented');
        console.log('✅ Files migrated by category');
        console.log('✅ New README.md generated');
        console.log('\n🔄 NEXT STEPS:');
        console.log('1. Review migrated files in each category');
        console.log('2. Consolidate similar content within categories');
        console.log('3. Update internal links manually');
        console.log('4. Test navigation and fix broken links');
        console.log('5. Remove or update outdated content');
        console.log('\n💡 TIP: Use the backup to restore if needed');
    }
}

// Run reorganization
if (require.main === module) {
    const reorganizer = new DocumentationReorganizer();
    reorganizer.reorganize().catch(console.error);
}

module.exports = DocumentationReorganizer;
