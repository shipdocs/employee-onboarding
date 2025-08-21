#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const { marked } = require('marked');

// Configure marked options for better HTML output
marked.setOptions({
  breaks: true,
  gfm: true,
  tables: true,
  sanitize: false,
  smartLists: true,
  smartypants: true,
  xhtml: true
});

// HTML template for generated files
const htmlTemplate = (title, content) => `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - Maritime Onboarding System 2025</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 900px;
            margin: 0 auto;
            padding: 20px;
            background: #f9f9f9;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1, h2, h3, h4, h5, h6 {
            color: #2c3e50;
            margin-top: 24px;
            margin-bottom: 16px;
        }
        h1 {
            border-bottom: 2px solid #3498db;
            padding-bottom: 10px;
        }
        h2 {
            border-bottom: 1px solid #ecf0f1;
            padding-bottom: 8px;
        }
        a {
            color: #3498db;
            text-decoration: none;
        }
        a:hover {
            text-decoration: underline;
        }
        code {
            background: #f4f4f4;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', Courier, monospace;
        }
        pre {
            background: #2c3e50;
            color: #ecf0f1;
            padding: 15px;
            border-radius: 5px;
            overflow-x: auto;
        }
        pre code {
            background: none;
            color: inherit;
            padding: 0;
        }
        table {
            border-collapse: collapse;
            width: 100%;
            margin: 20px 0;
        }
        table th,
        table td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
        }
        table th {
            background: #3498db;
            color: white;
            font-weight: bold;
        }
        table tr:nth-child(even) {
            background: #f9f9f9;
        }
        blockquote {
            border-left: 4px solid #3498db;
            margin: 20px 0;
            padding-left: 20px;
            color: #666;
            font-style: italic;
        }
        ul, ol {
            margin: 15px 0;
            padding-left: 30px;
        }
        li {
            margin: 5px 0;
        }
        hr {
            border: none;
            border-top: 2px solid #ecf0f1;
            margin: 30px 0;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ecf0f1;
            color: #7f8c8d;
            font-size: 0.9em;
            text-align: center;
        }
        .badge {
            display: inline-block;
            padding: 3px 8px;
            font-size: 0.85em;
            font-weight: bold;
            border-radius: 3px;
            margin: 0 4px;
        }
        .badge-success {
            background: #27ae60;
            color: white;
        }
        .badge-warning {
            background: #f39c12;
            color: white;
        }
        .badge-danger {
            background: #e74c3c;
            color: white;
        }
        .badge-info {
            background: #3498db;
            color: white;
        }
        /* Enhance checkmarks and status indicators */
        p:contains("✅") {
            color: #27ae60;
        }
        p:contains("❌") {
            color: #e74c3c;
        }
        p:contains("⚠️") {
            color: #f39c12;
        }
    </style>
</head>
<body>
    <div class="container">
        ${content}
    </div>
    <div class="footer">
        <p>Generated from Markdown | Maritime Onboarding System 2025</p>
        <p>Last updated: ${new Date().toLocaleDateString()}</p>
    </div>
</body>
</html>`;

async function convertMdToHtml(mdFilePath) {
  try {
    // Read the markdown file
    const mdContent = await fs.readFile(mdFilePath, 'utf-8');
    
    // Extract title from first H1 or filename
    let title = path.basename(mdFilePath, '.md');
    const titleMatch = mdContent.match(/^#\s+(.+)$/m);
    if (titleMatch) {
      title = titleMatch[1];
    }
    
    // Convert markdown to HTML
    const htmlContent = marked(mdContent);
    
    // Wrap in template
    const fullHtml = htmlTemplate(title, htmlContent);
    
    // Generate output path (same location, .html extension)
    const htmlFilePath = mdFilePath.replace(/\.md$/, '.html');
    
    // Write the HTML file
    await fs.writeFile(htmlFilePath, fullHtml, 'utf-8');
    
    return { success: true, path: htmlFilePath };
  } catch (error) {
    return { success: false, error: error.message, path: mdFilePath };
  }
}

async function findMdFiles(dir) {
  const files = [];
  
  async function scan(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      
      if (entry.isDirectory()) {
        // Skip hidden directories and node_modules
        if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
          await scan(fullPath);
        }
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        files.push(fullPath);
      }
    }
  }
  
  await scan(dir);
  return files;
}

async function main() {
  console.log('🚀 Starting Markdown to HTML conversion...\n');
  
  const docsDir = path.join(process.cwd(), 'docs');
  
  try {
    // Find all MD files
    console.log('📁 Scanning for Markdown files in docs directory...');
    const mdFiles = await findMdFiles(docsDir);
    console.log(`Found ${mdFiles.length} Markdown files\n`);
    
    // Convert each file
    const results = [];
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < mdFiles.length; i++) {
      const mdFile = mdFiles[i];
      const relativePath = path.relative(docsDir, mdFile);
      
      process.stdout.write(`[${i + 1}/${mdFiles.length}] Converting ${relativePath}... `);
      
      const result = await convertMdToHtml(mdFile);
      results.push(result);
      
      if (result.success) {
        console.log('✅');
        successCount++;
      } else {
        console.log(`❌ (${result.error})`);
        errorCount++;
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Conversion Summary:');
    console.log('='.repeat(60));
    console.log(`✅ Successfully converted: ${successCount} files`);
    if (errorCount > 0) {
      console.log(`❌ Failed conversions: ${errorCount} files`);
      console.log('\nFailed files:');
      results
        .filter(r => !r.success)
        .forEach(r => console.log(`  - ${path.relative(docsDir, r.path)}: ${r.error}`));
    }
    console.log('\n✨ HTML generation complete!');
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
}

module.exports = { convertMdToHtml, findMdFiles };