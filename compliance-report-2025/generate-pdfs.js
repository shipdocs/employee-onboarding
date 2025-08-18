#!/usr/bin/env node

/**
 * PDF Generation Script for Compliance Documentation
 * Converts Markdown files to PDF with proper formatting and diagram rendering
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const DOCS_DIR = __dirname;
const PDF_OPTIONS = {
  format: 'A4',
  margin: {
    top: '2cm',
    right: '2cm',
    bottom: '2cm',
    left: '2cm'
  },
  printBackground: true,
  displayHeaderFooter: true,
  headerTemplate: '<div style="font-size: 10px; text-align: center; width: 100%;">Maritime Onboarding System 2025 - Compliance Documentation</div>',
  footerTemplate: '<div style="font-size: 10px; text-align: center; width: 100%;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>'
};

// Files to convert
const FILES_TO_CONVERT = [
  'COMPLIANCE_ASSESSMENT_REPORT.md',
  'APPENDIX_A_SECURITY_CONTROL_MATRIX.md',
  'APPENDIX_B_DATA_FLOW_DIAGRAMS.md',
  'APPENDIX_C_TECHNICAL_ARCHITECTURE.md',
  'APPENDIX_D_DATA_PROCESSING_AGREEMENT.md',
  'APPENDIX_E_INCIDENT_RESPONSE_PROCEDURES.md'
];

console.log('🚀 Maritime Onboarding System - PDF Generation Tool');
console.log('====================================================\n');

// Check if necessary tools are available
function checkDependencies() {
  console.log('📋 Checking dependencies...\n');
  
  // Check for Node.js
  try {
    const nodeVersion = process.version;
    console.log(`✅ Node.js ${nodeVersion} detected`);
  } catch (error) {
    console.error('❌ Node.js not properly configured');
    process.exit(1);
  }

  // Check if we can use markdown-pdf or suggest alternatives
  try {
    execSync('which wkhtmltopdf', { stdio: 'ignore' });
    console.log('✅ wkhtmltopdf is available');
    return 'wkhtmltopdf';
  } catch {
    try {
      execSync('which pandoc', { stdio: 'ignore' });
      console.log('✅ Pandoc is available');
      return 'pandoc';
    } catch {
      console.log('⚠️  No PDF converter found. Generating HTML versions instead.');
      return 'html';
    }
  }
}

// Convert Markdown to HTML with styling
function convertToHTML(markdownFile) {
  const markdown = fs.readFileSync(path.join(DOCS_DIR, markdownFile), 'utf8');
  const htmlFile = markdownFile.replace('.md', '.html');
  
  // Basic HTML template with professional styling
  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${markdownFile.replace('.md', '').replace(/_/g, ' ')}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap');
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #2c3e50;
            max-width: 210mm;
            margin: 0 auto;
            padding: 20mm;
            background: white;
        }
        
        h1 {
            color: #1a5490;
            border-bottom: 3px solid #1a5490;
            padding-bottom: 10px;
            margin-top: 0;
            page-break-after: avoid;
        }
        
        h2 {
            color: #2c5282;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 8px;
            margin-top: 30px;
            page-break-after: avoid;
        }
        
        h3 {
            color: #2d3748;
            margin-top: 25px;
            page-break-after: avoid;
        }
        
        h4 {
            color: #4a5568;
            margin-top: 20px;
            page-break-after: avoid;
        }
        
        table {
            border-collapse: collapse;
            width: 100%;
            margin: 20px 0;
            page-break-inside: avoid;
        }
        
        th {
            background-color: #1a5490;
            color: white;
            padding: 12px;
            text-align: left;
            font-weight: 600;
        }
        
        td {
            padding: 10px 12px;
            border: 1px solid #e2e8f0;
        }
        
        tr:nth-child(even) {
            background-color: #f7fafc;
        }
        
        code {
            background-color: #f7fafc;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
        }
        
        pre {
            background-color: #2d3748;
            color: #e2e8f0;
            padding: 15px;
            border-radius: 5px;
            overflow-x: auto;
            page-break-inside: avoid;
        }
        
        pre code {
            background-color: transparent;
            color: #e2e8f0;
            padding: 0;
        }
        
        blockquote {
            border-left: 4px solid #1a5490;
            padding-left: 20px;
            margin-left: 0;
            font-style: italic;
            color: #4a5568;
        }
        
        a {
            color: #1a5490;
            text-decoration: none;
        }
        
        a:hover {
            text-decoration: underline;
        }
        
        .page-break {
            page-break-after: always;
        }
        
        .badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.85em;
            font-weight: 600;
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
        
        @media print {
            body {
                padding: 0;
            }
            
            .page-break {
                page-break-after: always;
            }
            
            h1, h2, h3, h4 {
                page-break-after: avoid;
            }
            
            table, pre, blockquote {
                page-break-inside: avoid;
            }
        }
        
        /* Mermaid diagram placeholder styling */
        .mermaid {
            background: #f7fafc;
            border: 1px solid #e2e8f0;
            padding: 20px;
            border-radius: 5px;
            text-align: center;
            font-family: monospace;
            font-size: 0.9em;
            color: #4a5568;
        }
    </style>
</head>
<body>
    <div class="content">
        ${convertMarkdownToHTML(markdown)}
    </div>
    <script>
        // Add page numbers for printing
        window.onload = function() {
            if (window.location.protocol === 'file:') {
                console.log('Document ready for printing or PDF export');
            }
        };
    </script>
</body>
</html>`;

  fs.writeFileSync(path.join(DOCS_DIR, htmlFile), htmlContent);
  console.log(`  ✅ Generated ${htmlFile}`);
  return htmlFile;
}

// Basic Markdown to HTML converter
function convertMarkdownToHTML(markdown) {
  let html = markdown;
  
  // Convert headers
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  
  // Convert bold and italic
  html = html.replace(/\*\*\*(.*)\*\*\*/gim, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>');
  html = html.replace(/\*(.*)\*/gim, '<em>$1</em>');
  
  // Convert links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2">$1</a>');
  
  // Convert line breaks
  html = html.replace(/\n\n/gim, '</p><p>');
  html = '<p>' + html + '</p>';
  
  // Convert code blocks
  html = html.replace(/```([^`]+)```/gim, '<pre><code>$1</code></pre>');
  html = html.replace(/`([^`]+)`/gim, '<code>$1</code>');
  
  // Convert lists
  html = html.replace(/^\* (.+)/gim, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
  
  // Convert tables (basic)
  html = html.replace(/\|(.+)\|/gim, function(match) {
    const cells = match.split('|').filter(cell => cell.trim());
    const row = cells.map(cell => `<td>${cell.trim()}</td>`).join('');
    return `<tr>${row}</tr>`;
  });
  
  // Convert horizontal rules
  html = html.replace(/^---$/gim, '<hr>');
  
  // Convert checkboxes
  html = html.replace(/\[x\]/gim, '☑');
  html = html.replace(/\[ \]/gim, '☐');
  
  // Handle mermaid diagrams
  html = html.replace(/```mermaid([^`]+)```/gim, '<div class="mermaid">Diagram: $1<br><em>Note: Please view PDF version for rendered diagrams</em></div>');
  
  return html;
}

// Main execution
async function main() {
  const converter = checkDependencies();
  
  console.log('\n📄 Converting documents...\n');
  
  for (const file of FILES_TO_CONVERT) {
    if (!fs.existsSync(path.join(DOCS_DIR, file))) {
      console.log(`  ⚠️  ${file} not found, skipping...`);
      continue;
    }
    
    console.log(`  📝 Processing ${file}...`);
    
    if (converter === 'html') {
      convertToHTML(file);
    } else if (converter === 'pandoc') {
      const outputFile = file.replace('.md', '.pdf');
      try {
        execSync(`pandoc ${file} -o ${outputFile} --pdf-engine=xelatex`, { cwd: DOCS_DIR });
        console.log(`  ✅ Generated ${outputFile}`);
      } catch (error) {
        console.log(`  ⚠️  Failed to generate PDF, creating HTML instead`);
        convertToHTML(file);
      }
    } else if (converter === 'wkhtmltopdf') {
      const htmlFile = convertToHTML(file);
      const pdfFile = file.replace('.md', '.pdf');
      try {
        execSync(`wkhtmltopdf --enable-local-file-access ${htmlFile} ${pdfFile}`, { cwd: DOCS_DIR });
        console.log(`  ✅ Generated ${pdfFile}`);
      } catch (error) {
        console.log(`  ⚠️  PDF generation failed, HTML version available`);
      }
    }
  }
  
  console.log('\n✨ Document generation complete!\n');
  console.log('📁 Available formats:');
  console.log('  - Markdown (.md) - Original source files');
  console.log('  - HTML (.html) - Printable web format');
  
  if (converter !== 'html') {
    console.log('  - PDF (.pdf) - Professional presentation format');
  } else {
    console.log('\n💡 Tip: To generate PDFs, you can:');
    console.log('  1. Open the HTML files in a browser and print to PDF');
    console.log('  2. Install pandoc: sudo apt-get install pandoc texlive-xetex');
    console.log('  3. Install wkhtmltopdf: sudo apt-get install wkhtmltopdf');
  }
  
  console.log('\n📧 Ready to share with Burando Atlantic Group!');
}

// Run the script
main().catch(console.error);