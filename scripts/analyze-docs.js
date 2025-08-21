#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class DocumentationAnalyzer {
    constructor(docsPath = './docs') {
        this.docsPath = docsPath;
        this.results = {
            files: [],
            brokenLinks: [],
            duplicateContent: [],
            outdatedFiles: [],
            orphanedFiles: [],
            statistics: {}
        };
    }

    async analyze() {
        console.log('🔍 Analyzing documentation structure...\n');
        
        await this.scanFiles();
        await this.checkLinks();
        await this.findDuplicates();
        await this.identifyOutdated();
        await this.findOrphans();
        await this.generateStatistics();
        
        this.generateReport();
    }

    async scanFiles() {
        console.log('📁 Scanning files...');
        this.results.files = this.getAllMarkdownFiles(this.docsPath);
        console.log(`   Found ${this.results.files.length} markdown files\n`);
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
                const content = fs.readFileSync(fullPath, 'utf8');
                files.push({
                    path: fullPath,
                    name: item,
                    size: stat.size,
                    modified: stat.mtime,
                    lines: content.split('\n').length,
                    content: content,
                    wordCount: content.split(/\s+/).length
                });
            }
        }
        
        return files;
    }

    async checkLinks() {
        console.log('🔗 Checking internal links...');
        const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
        
        for (const file of this.results.files) {
            let match;
            while ((match = linkPattern.exec(file.content)) !== null) {
                const [fullMatch, text, url] = match;
                
                // Skip external links
                if (url.startsWith('http') || url.startsWith('mailto:')) continue;
                
                // Check if internal link exists
                const targetPath = path.resolve(path.dirname(file.path), url);
                if (!fs.existsSync(targetPath)) {
                    this.results.brokenLinks.push({
                        file: file.path,
                        link: url,
                        text: text,
                        line: this.getLineNumber(file.content, match.index)
                    });
                }
            }
        }
        
        console.log(`   Found ${this.results.brokenLinks.length} broken links\n`);
    }

    async findDuplicates() {
        console.log('🔄 Finding duplicate content...');
        
        // Simple content similarity check
        for (let i = 0; i < this.results.files.length; i++) {
            for (let j = i + 1; j < this.results.files.length; j++) {
                const file1 = this.results.files[i];
                const file2 = this.results.files[j];
                
                const similarity = this.calculateSimilarity(file1.content, file2.content);
                if (similarity > 0.7) { // 70% similarity threshold
                    this.results.duplicateContent.push({
                        file1: file1.path,
                        file2: file2.path,
                        similarity: Math.round(similarity * 100)
                    });
                }
            }
        }
        
        console.log(`   Found ${this.results.duplicateContent.length} potential duplicates\n`);
    }

    async identifyOutdated() {
        console.log('📅 Identifying outdated files...');
        
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        
        // Check for temporal naming patterns
        const temporalPatterns = [
            /week\d+/i,
            /sprint-?\d+/i,
            /\d{4}-\d{2}-\d{2}/,
            /phase-?\d+/i,
            /summary/i,
            /report/i
        ];
        
        for (const file of this.results.files) {
            const isOld = file.modified < sixMonthsAgo;
            const hasTemporal = temporalPatterns.some(pattern => pattern.test(file.name));
            const hasDateInContent = /\d{4}-\d{2}-\d{2}/.test(file.content);
            
            if (isOld || hasTemporal || hasDateInContent) {
                this.results.outdatedFiles.push({
                    path: file.path,
                    modified: file.modified,
                    reasons: [
                        isOld && 'Old modification date',
                        hasTemporal && 'Temporal naming pattern',
                        hasDateInContent && 'Contains dates'
                    ].filter(Boolean)
                });
            }
        }
        
        console.log(`   Found ${this.results.outdatedFiles.length} potentially outdated files\n`);
    }

    async findOrphans() {
        console.log('🏝️ Finding orphaned files...');
        
        // Files that are never referenced by other files
        const allContent = this.results.files.map(f => f.content).join(' ');
        
        for (const file of this.results.files) {
            const fileName = path.basename(file.path);
            const relativePath = path.relative(this.docsPath, file.path);
            
            // Check if file is referenced anywhere
            const isReferenced = this.results.files.some(otherFile => 
                otherFile.path !== file.path && 
                (otherFile.content.includes(fileName) || otherFile.content.includes(relativePath))
            );
            
            if (!isReferenced && fileName !== 'README.md') {
                this.results.orphanedFiles.push({
                    path: file.path,
                    size: file.size,
                    modified: file.modified
                });
            }
        }
        
        console.log(`   Found ${this.results.orphanedFiles.length} orphaned files\n`);
    }

    async generateStatistics() {
        console.log('📊 Generating statistics...');
        
        const totalSize = this.results.files.reduce((sum, file) => sum + file.size, 0);
        const totalLines = this.results.files.reduce((sum, file) => sum + file.lines, 0);
        const totalWords = this.results.files.reduce((sum, file) => sum + file.wordCount, 0);
        
        // Categorize by directory
        const categories = {};
        for (const file of this.results.files) {
            const dir = path.dirname(path.relative(this.docsPath, file.path));
            const category = dir === '.' ? 'root' : dir.split('/')[0];
            
            if (!categories[category]) {
                categories[category] = { count: 0, size: 0, lines: 0 };
            }
            
            categories[category].count++;
            categories[category].size += file.size;
            categories[category].lines += file.lines;
        }
        
        this.results.statistics = {
            totalFiles: this.results.files.length,
            totalSize: totalSize,
            totalLines: totalLines,
            totalWords: totalWords,
            averageFileSize: Math.round(totalSize / this.results.files.length),
            categories: categories
        };
        
        console.log(`   Processed ${this.results.statistics.totalFiles} files\n`);
    }

    generateReport() {
        console.log('📋 DOCUMENTATION ANALYSIS REPORT');
        console.log('='.repeat(50));
        
        // Statistics
        console.log('\n📊 STATISTICS:');
        console.log(`   Total files: ${this.results.statistics.totalFiles}`);
        console.log(`   Total size: ${(this.results.statistics.totalSize / 1024).toFixed(1)} KB`);
        console.log(`   Total lines: ${this.results.statistics.totalLines.toLocaleString()}`);
        console.log(`   Total words: ${this.results.statistics.totalWords.toLocaleString()}`);
        console.log(`   Average file size: ${(this.results.statistics.averageFileSize / 1024).toFixed(1)} KB`);
        
        // Categories
        console.log('\n📁 BY CATEGORY:');
        Object.entries(this.results.statistics.categories)
            .sort(([,a], [,b]) => b.count - a.count)
            .forEach(([category, stats]) => {
                console.log(`   ${category}: ${stats.count} files, ${(stats.size/1024).toFixed(1)} KB`);
            });
        
        // Issues
        console.log('\n🚨 ISSUES FOUND:');
        console.log(`   Broken links: ${this.results.brokenLinks.length}`);
        console.log(`   Duplicate content: ${this.results.duplicateContent.length}`);
        console.log(`   Outdated files: ${this.results.outdatedFiles.length}`);
        console.log(`   Orphaned files: ${this.results.orphanedFiles.length}`);
        
        // Top issues
        if (this.results.brokenLinks.length > 0) {
            console.log('\n🔗 TOP BROKEN LINKS:');
            this.results.brokenLinks.slice(0, 5).forEach(link => {
                console.log(`   ${path.relative('.', link.file)}: ${link.link}`);
            });
        }
        
        if (this.results.duplicateContent.length > 0) {
            console.log('\n🔄 TOP DUPLICATES:');
            this.results.duplicateContent.slice(0, 3).forEach(dup => {
                console.log(`   ${dup.similarity}% similar:`);
                console.log(`     - ${path.relative('.', dup.file1)}`);
                console.log(`     - ${path.relative('.', dup.file2)}`);
            });
        }
        
        if (this.results.orphanedFiles.length > 0) {
            console.log('\n🏝️ ORPHANED FILES:');
            this.results.orphanedFiles.slice(0, 5).forEach(file => {
                console.log(`   ${path.relative('.', file.path)} (${(file.size/1024).toFixed(1)} KB)`);
            });
        }
        
        console.log('\n💡 RECOMMENDATIONS:');
        console.log('   1. Fix broken links to improve navigation');
        console.log('   2. Consolidate or remove duplicate content');
        console.log('   3. Archive or update outdated files');
        console.log('   4. Review orphaned files for relevance');
        console.log('   5. Reorganize by audience and topic, not time');
    }

    // Helper methods
    calculateSimilarity(text1, text2) {
        const words1 = new Set(text1.toLowerCase().split(/\s+/));
        const words2 = new Set(text2.toLowerCase().split(/\s+/));
        const intersection = new Set([...words1].filter(x => words2.has(x)));
        const union = new Set([...words1, ...words2]);
        return intersection.size / union.size;
    }

    getLineNumber(content, index) {
        return content.substring(0, index).split('\n').length;
    }
}

// Run analysis
if (require.main === module) {
    const analyzer = new DocumentationAnalyzer();
    analyzer.analyze().catch(console.error);
}

module.exports = DocumentationAnalyzer;
