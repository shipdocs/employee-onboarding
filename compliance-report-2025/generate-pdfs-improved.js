#!/usr/bin/env node

/**
 * Improved PDF Generation Script for Compliance Documentation
 * Uses marked library for better markdown parsing
 */

const fs = require('fs');
const path = require('path');

// Files to convert
const FILES_TO_CONVERT = [
  'COMPLIANCE_ASSESSMENT_REPORT.md',
  'APPENDIX_A_SECURITY_CONTROL_MATRIX.md',
  'APPENDIX_B_DATA_FLOW_DIAGRAMS.md',
  'APPENDIX_C_TECHNICAL_ARCHITECTURE.md',
  'APPENDIX_D_DATA_PROCESSING_AGREEMENT.md',
  'APPENDIX_E_INCIDENT_RESPONSE_PROCEDURES.md'
];

console.log('🚀 Maritime Onboarding System - Enhanced PDF Generation');
console.log('=========================================================\n');

// First, let's install marked if not available
const { execSync } = require('child_process');

try {
  require.resolve('marked');
  console.log('✅ Marked library available\n');
} catch(e) {
  console.log('📦 Installing marked library...');
  try {
    execSync('npm install marked', { stdio: 'inherit', cwd: __dirname });
    console.log('✅ Marked installed successfully\n');
  } catch(err) {
    console.log('⚠️  Could not install marked, using fallback converter\n');
  }
}

// Try to load marked
let marked;
try {
  marked = require('marked');
  
  // Configure marked for better output
  marked.setOptions({
    breaks: true,
    gfm: true,
    tables: true,
    sanitize: false,
    smartLists: true,
    smartypants: true
  });
} catch(e) {
  console.log('Using basic converter...');
}

// Professional HTML template
function generateHTML(title, content) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.7;
            color: #2c3e50;
            background: white;
            padding: 0;
            margin: 0;
        }
        
        .container {
            max-width: 210mm;
            margin: 0 auto;
            padding: 20mm;
        }
        
        @media print {
            .container {
                max-width: 100%;
                padding: 15mm;
            }
        }
        
        /* Headers */
        h1 {
            color: #1a5490;
            font-size: 2.5em;
            font-weight: 700;
            margin: 0 0 0.5em 0;
            padding-bottom: 0.3em;
            border-bottom: 3px solid #1a5490;
            page-break-after: avoid;
        }
        
        h2 {
            color: #2c5282;
            font-size: 1.8em;
            font-weight: 600;
            margin: 1.5em 0 0.7em 0;
            padding-bottom: 0.2em;
            border-bottom: 1px solid #e2e8f0;
            page-break-after: avoid;
        }
        
        h3 {
            color: #2d3748;
            font-size: 1.4em;
            font-weight: 600;
            margin: 1.2em 0 0.6em 0;
            page-break-after: avoid;
        }
        
        h4 {
            color: #4a5568;
            font-size: 1.2em;
            font-weight: 500;
            margin: 1em 0 0.5em 0;
            page-break-after: avoid;
        }
        
        /* Paragraphs and text */
        p {
            margin: 0.8em 0;
            text-align: justify;
        }
        
        strong {
            font-weight: 600;
            color: #1a202c;
        }
        
        em {
            font-style: italic;
        }
        
        /* Lists */
        ul, ol {
            margin: 0.8em 0 0.8em 2em;
        }
        
        li {
            margin: 0.3em 0;
        }
        
        /* Tables */
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 1.5em 0;
            font-size: 0.95em;
            page-break-inside: avoid;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        thead {
            background: linear-gradient(135deg, #1a5490 0%, #2c5282 100%);
        }
        
        th {
            color: white;
            font-weight: 600;
            text-align: left;
            padding: 12px 15px;
            letter-spacing: 0.5px;
        }
        
        td {
            padding: 10px 15px;
            border-bottom: 1px solid #e2e8f0;
        }
        
        tbody tr:hover {
            background-color: #f8fafc;
        }
        
        tbody tr:nth-child(even) {
            background-color: #f7fafc;
        }
        
        /* Code blocks */
        code {
            font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
            font-size: 0.9em;
            padding: 2px 6px;
            background-color: #f1f5f9;
            border: 1px solid #e2e8f0;
            border-radius: 3px;
            color: #e53e3e;
        }
        
        pre {
            background-color: #2d3748;
            color: #e2e8f0;
            padding: 1em;
            border-radius: 6px;
            overflow-x: auto;
            margin: 1em 0;
            page-break-inside: avoid;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        pre code {
            background: none;
            border: none;
            color: #e2e8f0;
            padding: 0;
        }
        
        /* Blockquotes */
        blockquote {
            border-left: 4px solid #1a5490;
            padding-left: 1.5em;
            margin: 1em 0;
            font-style: italic;
            color: #4a5568;
            background-color: #f7fafc;
            padding: 1em 1.5em;
            border-radius: 0 4px 4px 0;
        }
        
        /* Links */
        a {
            color: #1a5490;
            text-decoration: none;
            border-bottom: 1px solid transparent;
            transition: border-color 0.2s;
        }
        
        a:hover {
            border-bottom-color: #1a5490;
        }
        
        /* Horizontal rules */
        hr {
            border: none;
            border-top: 2px solid #e2e8f0;
            margin: 2em 0;
        }
        
        /* Special elements */
        .badge {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 0.85em;
            font-weight: 600;
            margin: 0 2px;
        }
        
        .badge-success {
            background-color: #48bb78;
            color: white;
        }
        
        .badge-warning {
            background-color: #ed8936;
            color: white;
        }
        
        .badge-info {
            background-color: #4299e1;
            color: white;
        }
        
        /* Checkboxes */
        input[type="checkbox"] {
            margin-right: 0.5em;
        }
        
        /* Mermaid diagram placeholder */
        .mermaid-placeholder {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 2em;
            border-radius: 8px;
            text-align: center;
            margin: 1.5em 0;
            font-weight: 500;
        }
        
        .mermaid-placeholder code {
            display: block;
            margin-top: 1em;
            padding: 1em;
            background: rgba(255,255,255,0.1);
            border: 1px solid rgba(255,255,255,0.2);
            color: white;
            font-size: 0.85em;
            text-align: left;
            white-space: pre-wrap;
        }
        
        /* Print specific styles */
        @media print {
            body {
                font-size: 11pt;
            }
            
            h1 { 
                font-size: 20pt; 
                page-break-before: always;
            }
            
            h1:first-child {
                page-break-before: avoid;
            }
            
            h2 { font-size: 16pt; }
            h3 { font-size: 14pt; }
            h4 { font-size: 12pt; }
            
            table, pre, blockquote {
                page-break-inside: avoid;
            }
            
            .mermaid-placeholder {
                background: #f0f0f0 !important;
                color: #333 !important;
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
            }
        }
        
        /* Page header/footer for print */
        @page {
            margin: 2cm;
            @top-center {
                content: "Maritime Onboarding System 2025 - Compliance Documentation";
                font-size: 10pt;
                color: #666;
            }
            @bottom-center {
                content: "Page " counter(page) " of " counter(pages);
                font-size: 10pt;
                color: #666;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        ${content}
    </div>
</body>
</html>`;
}

// Enhanced markdown processing
function processMarkdown(markdown) {
  // Handle mermaid diagrams
  markdown = markdown.replace(/```mermaid\n([\s\S]*?)```/g, (match, diagram) => {
    return `<div class="mermaid-placeholder">
      📊 Diagram (View in PDF for best rendering)
      <code>${diagram.trim()}</code>
    </div>`;
  });
  
  // Handle checkboxes
  markdown = markdown.replace(/\[x\]/gi, '☑');
  markdown = markdown.replace(/\[ \]/gi, '☐');
  
  // Handle special badges
  markdown = markdown.replace(/✅/g, '<span class="badge badge-success">✓</span>');
  markdown = markdown.replace(/⚠️/g, '<span class="badge badge-warning">!</span>');
  markdown = markdown.replace(/❌/g, '<span class="badge badge-danger">✗</span>');
  markdown = markdown.replace(/📋/g, '<span class="badge badge-info">📋</span>');
  
  return markdown;
}

// Main conversion function
function convertFile(filename) {
  const filepath = path.join(__dirname, filename);
  
  if (!fs.existsSync(filepath)) {
    console.log(`  ⚠️  ${filename} not found`);
    return;
  }
  
  console.log(`  📝 Processing ${filename}...`);
  
  let markdown = fs.readFileSync(filepath, 'utf8');
  markdown = processMarkdown(markdown);
  
  let htmlContent;
  
  if (marked) {
    // Use marked for better conversion
    htmlContent = marked.parse(markdown);
  } else {
    // Fallback to basic conversion
    htmlContent = basicMarkdownToHTML(markdown);
  }
  
  const title = filename.replace('.md', '').replace(/_/g, ' ');
  const fullHTML = generateHTML(title, htmlContent);
  
  const outputFile = filename.replace('.md', '.html');
  fs.writeFileSync(path.join(__dirname, outputFile), fullHTML);
  
  console.log(`     ✅ Generated ${outputFile}`);
}

// Basic markdown to HTML converter (fallback)
function basicMarkdownToHTML(markdown) {
  let html = markdown;
  
  // Headers
  html = html.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  
  // Bold and italic
  html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  
  // Code
  html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // Lists
  html = html.replace(/^\* (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
  
  // Tables (very basic)
  const lines = html.split('\n');
  let inTable = false;
  let processedLines = [];
  
  for (let line of lines) {
    if (line.includes('|')) {
      if (!inTable) {
        processedLines.push('<table>');
        inTable = true;
      }
      
      const cells = line.split('|').filter(c => c.trim());
      if (cells.every(c => c.match(/^[\-:]+$/))) {
        // Skip separator rows
        continue;
      }
      
      const row = '<tr>' + cells.map(c => `<td>${c.trim()}</td>`).join('') + '</tr>';
      processedLines.push(row);
    } else if (inTable) {
      processedLines.push('</table>');
      inTable = false;
      processedLines.push(line);
    } else {
      processedLines.push(line);
    }
  }
  
  if (inTable) {
    processedLines.push('</table>');
  }
  
  html = processedLines.join('\n');
  
  // Paragraphs
  html = html.replace(/\n\n/g, '</p><p>');
  html = '<p>' + html + '</p>';
  
  // Clean up
  html = html.replace(/<p><h/g, '<h');
  html = html.replace(/<\/h(\d)><\/p>/g, '</h$1>');
  html = html.replace(/<p><\/p>/g, '');
  
  return html;
}

// Main execution
console.log('📄 Converting documents to HTML...\n');

for (const file of FILES_TO_CONVERT) {
  convertFile(file);
}

console.log('\n✨ Conversion complete!\n');
console.log('📌 Next steps:');
console.log('  1. Open any HTML file in your browser');
console.log('  2. Press Ctrl+P (or Cmd+P on Mac) to print');
console.log('  3. Select "Save as PDF" as the printer');
console.log('  4. Ensure "Background graphics" is enabled');
console.log('  5. Save the PDF file');
console.log('\n📧 Professional PDFs ready for Burando Atlantic Group!');