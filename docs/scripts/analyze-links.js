#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

const DOCS_DIR = process.argv[2] || path.join(__dirname, '..', '..');

// Regular expressions to find different types of links
const LINK_PATTERNS = {
  // [text](url)
  markdownLinks: /\[([^\]]+)\]\(([^)]+)\)/g,
  // [[wiki-style]]
  wikiLinks: /\[\[([^\]]+)\]\]/g,
  // Reference-style links [text][ref]
  referenceLinks: /\[([^\]]+)\]\[([^\]]+)\]/g,
  // Link definitions [ref]: url
  linkDefinitions: /^\[([^\]]+)\]:\s*(.+)$/gm
};

async function findAllMarkdownFiles(dir) {
  const files = [];
  
  async function walk(currentPath) {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        await walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        files.push(fullPath);
      }
    }
  }
  
  await walk(dir);
  return files;
}

async function extractLinks(filePath) {
  const content = await fs.readFile(filePath, 'utf-8');
  const links = [];
  const linkDefinitions = new Map();
  
  // Extract link definitions first
  let match;
  while ((match = LINK_PATTERNS.linkDefinitions.exec(content)) !== null) {
    linkDefinitions.set(match[1], match[2]);
  }
  
  // Extract markdown links
  LINK_PATTERNS.markdownLinks.lastIndex = 0;
  while ((match = LINK_PATTERNS.markdownLinks.exec(content)) !== null) {
    const [fullMatch, text, url] = match;
    const lineNumber = content.substring(0, match.index).split('\n').length;
    links.push({
      type: 'markdown',
      text,
      url,
      line: lineNumber,
      raw: fullMatch
    });
  }
  
  // Extract reference links
  LINK_PATTERNS.referenceLinks.lastIndex = 0;
  while ((match = LINK_PATTERNS.referenceLinks.exec(content)) !== null) {
    const [fullMatch, text, ref] = match;
    const lineNumber = content.substring(0, match.index).split('\n').length;
    const url = linkDefinitions.get(ref) || ref;
    links.push({
      type: 'reference',
      text,
      url,
      ref,
      line: lineNumber,
      raw: fullMatch
    });
  }
  
  // Extract wiki-style links
  LINK_PATTERNS.wikiLinks.lastIndex = 0;
  while ((match = LINK_PATTERNS.wikiLinks.exec(content)) !== null) {
    const [fullMatch, page] = match;
    const lineNumber = content.substring(0, match.index).split('\n').length;
    links.push({
      type: 'wiki',
      text: page,
      url: page,
      line: lineNumber,
      raw: fullMatch
    });
  }
  
  return links;
}

function isInternalLink(url) {
  if (!url) return false;
  
  // Skip external links
  if (url.startsWith('http://') || url.startsWith('https://')) return false;
  if (url.startsWith('mailto:')) return false;
  if (url.startsWith('tel:')) return false;
  if (url.startsWith('#')) return false; // Skip anchor links
  
  return true;
}

function normalizeLink(url, sourceFile) {
  // Remove anchor parts
  const cleanUrl = url.split('#')[0];
  
  // If it's an absolute path, use it directly
  if (cleanUrl.startsWith('/')) {
    return path.join(DOCS_DIR, cleanUrl.substring(1));
  }
  
  // Otherwise, resolve relative to the source file
  return path.resolve(path.dirname(sourceFile), cleanUrl);
}

async function checkLinkExists(linkPath) {
  try {
    const stats = await fs.stat(linkPath);
    return stats.isFile() || stats.isDirectory();
  } catch (error) {
    return false;
  }
}

async function analyzeLinks() {
  console.log('Analyzing markdown files for broken links...\n');
  
  const markdownFiles = await findAllMarkdownFiles(DOCS_DIR);
  console.log(`Found ${markdownFiles.length} markdown files\n`);
  
  const brokenLinks = [];
  const allInternalLinks = new Map(); // Track all internal links for orphan detection
  const filesMentioned = new Set(); // Track all files that are linked to
  
  for (const file of markdownFiles) {
    const relativeFile = path.relative(DOCS_DIR, file);
    const links = await extractLinks(file);
    const internalLinks = links.filter(link => isInternalLink(link.url));
    
    if (internalLinks.length > 0) {
      allInternalLinks.set(file, internalLinks);
      
      for (const link of internalLinks) {
        const targetPath = normalizeLink(link.url, file);
        const exists = await checkLinkExists(targetPath);
        
        if (exists) {
          filesMentioned.add(targetPath);
        } else {
          brokenLinks.push({
            source: relativeFile,
            target: link.url,
            line: link.line,
            text: link.text,
            type: link.type,
            normalizedPath: targetPath
          });
        }
      }
    }
  }
  
  // Find orphaned files (files not linked from anywhere)
  const orphanedFiles = [];
  for (const file of markdownFiles) {
    if (!filesMentioned.has(file)) {
      const relativeFile = path.relative(DOCS_DIR, file);
      // Skip certain files that are expected to not be linked
      if (!relativeFile.includes('README.md') && 
          !relativeFile.includes('CLAUDE.md') &&
          !relativeFile.includes('scripts/')) {
        orphanedFiles.push(relativeFile);
      }
    }
  }
  
  // Generate report
  console.log('=== BROKEN LINKS REPORT ===\n');
  
  if (brokenLinks.length === 0) {
    console.log('No broken links found!\n');
  } else {
    console.log(`Found ${brokenLinks.length} broken links:\n`);
    
    // Group broken links by source file
    const linksBySource = {};
    for (const link of brokenLinks) {
      if (!linksBySource[link.source]) {
        linksBySource[link.source] = [];
      }
      linksBySource[link.source].push(link);
    }
    
    for (const [source, links] of Object.entries(linksBySource)) {
      console.log(`\n📄 ${source}:`);
      for (const link of links) {
        console.log(`  Line ${link.line}: [${link.text}](${link.target})`);
        console.log(`    Expected at: ${link.normalizedPath}`);
      }
    }
  }
  
  // Pattern analysis
  console.log('\n\n=== PATTERN ANALYSIS ===\n');
  
  const patterns = {};
  for (const link of brokenLinks) {
    const dir = path.dirname(link.target);
    if (!patterns[dir]) {
      patterns[dir] = 0;
    }
    patterns[dir]++;
  }
  
  if (Object.keys(patterns).length > 0) {
    console.log('Common directories with broken links:');
    for (const [dir, count] of Object.entries(patterns)) {
      console.log(`  ${dir}: ${count} broken links`);
    }
  }
  
  // Orphaned files
  console.log('\n\n=== ORPHANED FILES ===\n');
  
  if (orphanedFiles.length === 0) {
    console.log('No orphaned files found!\n');
  } else {
    console.log(`Found ${orphanedFiles.length} orphaned files (not linked from anywhere):\n`);
    for (const file of orphanedFiles) {
      console.log(`  📄 ${file}`);
    }
  }
  
  // Summary statistics
  const linksBySource = {};
  for (const link of brokenLinks) {
    if (!linksBySource[link.source]) {
      linksBySource[link.source] = [];
    }
    linksBySource[link.source].push(link);
  }
  
  console.log('\n\n=== SUMMARY ===\n');
  console.log(`Total markdown files: ${markdownFiles.length}`);
  console.log(`Total broken links: ${brokenLinks.length}`);
  console.log(`Files with broken links: ${Object.keys(linksBySource).length}`);
  console.log(`Orphaned files: ${orphanedFiles.length}`);
  
  // Export detailed JSON report
  const report = {
    timestamp: new Date().toISOString(),
    statistics: {
      totalFiles: markdownFiles.length,
      totalBrokenLinks: brokenLinks.length,
      filesWithBrokenLinks: Object.keys(linksBySource).length,
      orphanedFiles: orphanedFiles.length
    },
    brokenLinks,
    orphanedFiles,
    patterns
  };
  
  await fs.writeFile(
    path.join(DOCS_DIR, 'broken-links-report.json'),
    JSON.stringify(report, null, 2)
  );
  
  console.log('\nDetailed report saved to: broken-links-report.json');
}

// Run the analysis
analyzeLinks().catch(console.error);