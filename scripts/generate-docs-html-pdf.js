#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const { marked } = require('marked');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

// Configure marked for better output
marked.setOptions({
  breaks: true,
  gfm: true,
  tables: true,
  sanitize: false,
  smartLists: true,
  smartypants: true
});

// HTML template
const htmlTemplate = (title, content) => `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - Maritime Onboarding System 2025</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
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
        code {
            background: #f4f4f4;
            padding: 2px 6px;
            border-radius: 3px;
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
        }
        table {
            border-collapse: collapse;
            width: 100%;
            margin: 20px 0;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
        }
        th {
            background: #3498db;
            color: white;
        }
        tr:nth-child(even) {
            background: #f9f9f9;
        }
        blockquote {
            border-left: 4px solid #3498db;
            margin: 20px 0;
            padding-left: 20px;
            color: #666;
        }
        a {
            color: #3498db;
            text-decoration: none;
        }
        a:hover {
            text-decoration: underline;
        }
        ul, ol {
            margin: 15px 0;
            padding-left: 30px;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ecf0f1;
            color: #7f8c8d;
            font-size: 0.9em;
            text-align: center;
        }
        @media print {
            body {
                background: white;
            }
            .container {
                box-shadow: none;
                padding: 0;
            }
            .footer {
                page-break-before: avoid;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        ${content}
    </div>
    <div class="footer">
        <p>Maritime Onboarding System 2025 - Documentation</p>
        <p>Generated: ${new Date().toISOString()}</p>
    </div>
</body>
</html>`;

// Convert MD to HTML
async function convertMdToHtml(mdFilePath) {
  try {
    const mdContent = await fs.readFile(mdFilePath, 'utf-8');
    
    // Extract title
    let title = path.basename(mdFilePath, '.md');
    const titleMatch = mdContent.match(/^#\s+(.+)$/m);
    if (titleMatch) {
      title = titleMatch[1];
    }
    
    // Convert to HTML
    const htmlContent = marked(mdContent);
    const fullHtml = htmlTemplate(title, htmlContent);
    
    // Save HTML
    const htmlPath = mdFilePath.replace(/\.md$/, '.html');
    await fs.writeFile(htmlPath, fullHtml, 'utf-8');
    
    return { success: true, path: htmlPath, title };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Convert MD to simple PDF using pdf-lib
async function convertMdToPdf(mdFilePath) {
  try {
    const mdContent = await fs.readFile(mdFilePath, 'utf-8');
    
    // Extract title
    let title = path.basename(mdFilePath, '.md');
    const titleMatch = mdContent.match(/^#\s+(.+)$/m);
    if (titleMatch) {
      title = titleMatch[1];
    }
    
    // Create PDF document
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    // Process content line by line
    const lines = mdContent.split('\n');
    let page = pdfDoc.addPage();
    let { width, height } = page.getSize();
    let yPosition = height - 50;
    const margin = 50;
    const lineHeight = 14;
    const fontSize = 11;
    
    // Add title
    page.drawText(title, {
      x: margin,
      y: yPosition,
      size: 20,
      font: boldFont,
      color: rgb(0.17, 0.24, 0.31)
    });
    yPosition -= 30;
    
    // Add date
    page.drawText(`Generated: ${new Date().toLocaleDateString()}`, {
      x: margin,
      y: yPosition,
      size: 10,
      font,
      color: rgb(0.5, 0.5, 0.5)
    });
    yPosition -= 30;
    
    // Process markdown content (simplified)
    for (const line of lines) {
      // Check if we need a new page
      if (yPosition < margin + 50) {
        page = pdfDoc.addPage();
        yPosition = height - margin;
      }
      
      let textLine = line;
      let currentFont = font;
      let currentSize = fontSize;
      
      // Basic markdown processing
      if (line.startsWith('# ')) {
        textLine = line.substring(2);
        currentFont = boldFont;
        currentSize = 18;
        yPosition -= 10;
      } else if (line.startsWith('## ')) {
        textLine = line.substring(3);
        currentFont = boldFont;
        currentSize = 16;
        yPosition -= 8;
      } else if (line.startsWith('### ')) {
        textLine = line.substring(4);
        currentFont = boldFont;
        currentSize = 14;
        yPosition -= 6;
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        textLine = '• ' + line.substring(2);
      }
      
      // Remove markdown formatting (simplified)
      textLine = textLine
        .replace(/\*\*(.*?)\*\*/g, '$1')  // Bold
        .replace(/\*(.*?)\*/g, '$1')       // Italic
        .replace(/`(.*?)`/g, '$1')         // Code
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'); // Links
      
      // Draw text with wrapping
      const maxWidth = width - (margin * 2);
      const words = textLine.split(' ');
      let currentLine = '';
      
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const textWidth = currentFont.widthOfTextAtSize(testLine, currentSize);
        
        if (textWidth > maxWidth && currentLine) {
          // Draw current line
          page.drawText(currentLine, {
            x: margin,
            y: yPosition,
            size: currentSize,
            font: currentFont,
            color: rgb(0.2, 0.2, 0.2)
          });
          yPosition -= lineHeight;
          currentLine = word;
          
          // Check for new page
          if (yPosition < margin) {
            page = pdfDoc.addPage();
            yPosition = height - margin;
          }
        } else {
          currentLine = testLine;
        }
      }
      
      // Draw remaining text
      if (currentLine) {
        page.drawText(currentLine, {
          x: margin,
          y: yPosition,
          size: currentSize,
          font: currentFont,
          color: rgb(0.2, 0.2, 0.2)
        });
        yPosition -= lineHeight;
      }
      
      // Add spacing after headings
      if (line.startsWith('#')) {
        yPosition -= 10;
      }
    }
    
    // Save PDF
    const pdfBytes = await pdfDoc.save();
    const pdfPath = mdFilePath.replace(/\.md$/, '.pdf');
    await fs.writeFile(pdfPath, pdfBytes);
    
    return { success: true, path: pdfPath };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Find all MD files
async function findMdFiles(dir) {
  const files = [];
  
  async function scan(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        await scan(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        files.push(fullPath);
      }
    }
  }
  
  await scan(dir);
  return files;
}

// Main function
async function main() {
  console.log('📚 Maritime Onboarding System - Documentation Generator\n');
  console.log('=' .repeat(60));
  
  const docsDir = path.join(process.cwd(), 'docs');
  const generatePdf = process.argv.includes('--pdf');
  
  try {
    // Find MD files
    console.log('🔍 Scanning for Markdown files...');
    const mdFiles = await findMdFiles(docsDir);
    console.log(`📁 Found ${mdFiles.length} Markdown files\n`);
    
    let htmlSuccess = 0, htmlError = 0;
    let pdfSuccess = 0, pdfError = 0;
    
    // Process each file
    for (let i = 0; i < mdFiles.length; i++) {
      const mdFile = mdFiles[i];
      const relativePath = path.relative(docsDir, mdFile);
      
      // Convert to HTML
      process.stdout.write(`[${i + 1}/${mdFiles.length}] ${relativePath}`);
      
      const htmlResult = await convertMdToHtml(mdFile);
      if (htmlResult.success) {
        process.stdout.write(' ✅ HTML');
        htmlSuccess++;
      } else {
        process.stdout.write(' ❌ HTML');
        htmlError++;
      }
      
      // Convert to PDF if requested
      if (generatePdf) {
        const pdfResult = await convertMdToPdf(mdFile);
        if (pdfResult.success) {
          process.stdout.write(' ✅ PDF');
          pdfSuccess++;
        } else {
          process.stdout.write(' ❌ PDF');
          pdfError++;
        }
      }
      
      console.log();
    }
    
    // Summary
    console.log('\n' + '=' .repeat(60));
    console.log('📊 Generation Summary:');
    console.log('=' .repeat(60));
    console.log(`HTML: ✅ ${htmlSuccess} successful, ❌ ${htmlError} failed`);
    if (generatePdf) {
      console.log(`PDF:  ✅ ${pdfSuccess} successful, ❌ ${pdfError} failed`);
    }
    console.log('\n✨ Documentation generation complete!');
    
    if (!generatePdf) {
      console.log('\n💡 Tip: Run with --pdf flag to also generate PDF files');
    }
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  }
}

// Run
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { convertMdToHtml, convertMdToPdf };