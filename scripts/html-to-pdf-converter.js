#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Simple approach: Use wkhtmltopdf if available, or Chrome/Chromium headless
async function convertHtmlToPdfWithChrome(htmlPath, pdfPath) {
  try {
    // Try to use Chrome/Chromium in headless mode (most systems have this)
    const commands = [
      `google-chrome --headless --disable-gpu --print-to-pdf="${pdfPath}" "${htmlPath}"`,
      `chromium-browser --headless --disable-gpu --print-to-pdf="${pdfPath}" "${htmlPath}"`,
      `chromium --headless --disable-gpu --print-to-pdf="${pdfPath}" "${htmlPath}"`,
      `/usr/bin/chromium --headless --disable-gpu --print-to-pdf="${pdfPath}" "${htmlPath}"`
    ];

    for (const cmd of commands) {
      try {
        await execPromise(cmd + ' 2>/dev/null');
        // Check if PDF was created
        await fs.access(pdfPath);
        return { success: true };
      } catch (e) {
        // Try next command
        continue;
      }
    }
    
    throw new Error('No Chrome/Chromium found');
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Alternative: Use wkhtmltopdf if installed
async function convertHtmlToPdfWithWkhtml(htmlPath, pdfPath) {
  try {
    const cmd = `wkhtmltopdf --quiet --enable-local-file-access "${htmlPath}" "${pdfPath}"`;
    await execPromise(cmd);
    return { success: true };
  } catch (error) {
    return { success: false, error: 'wkhtmltopdf not available' };
  }
}

// Fallback: Create a simple PDF with just the content using Node.js
async function convertHtmlToPdfFallback(htmlPath, pdfPath) {
  try {
    const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
    const htmlContent = await fs.readFile(htmlPath, 'utf-8');
    
    // Extract text content from HTML (very basic)
    const textContent = htmlContent
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
    
    // Create PDF
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    
    // Add pages and text
    const lines = textContent.match(/.{1,100}/g) || [];
    let page = pdfDoc.addPage();
    let { width, height } = page.getSize();
    let y = height - 50;
    
    for (const line of lines) {
      if (y < 50) {
        page = pdfDoc.addPage();
        y = height - 50;
      }
      
      try {
        page.drawText(line, {
          x: 50,
          y: y,
          size: 11,
          font: font,
          color: rgb(0, 0, 0),
          maxWidth: width - 100
        });
      } catch (e) {
        // Skip lines with unsupported characters
      }
      
      y -= 14;
    }
    
    const pdfBytes = await pdfDoc.save();
    await fs.writeFile(pdfPath, pdfBytes);
    return { success: true, fallback: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Smart converter that tries multiple methods
async function smartConvertHtmlToPdf(htmlPath) {
  const pdfPath = htmlPath.replace(/\.html$/, '.pdf');
  
  // Skip if PDF already exists and is newer than HTML
  try {
    const htmlStat = await fs.stat(htmlPath);
    const pdfStat = await fs.stat(pdfPath);
    if (pdfStat.mtime > htmlStat.mtime) {
      return { success: true, skipped: true };
    }
  } catch (e) {
    // PDF doesn't exist, continue
  }
  
  // Try Chrome/Chromium first (best quality)
  let result = await convertHtmlToPdfWithChrome(htmlPath, pdfPath);
  if (result.success) return result;
  
  // Try wkhtmltopdf (good quality)
  result = await convertHtmlToPdfWithWkhtml(htmlPath, pdfPath);
  if (result.success) return result;
  
  // Use fallback (basic quality)
  result = await convertHtmlToPdfFallback(htmlPath, pdfPath);
  return result;
}

async function main() {
  console.log('🚀 Smart HTML to PDF Converter\n');
  console.log('=' .repeat(60));
  
  const docsDir = path.join(process.cwd(), 'docs');
  
  // Find all HTML files
  console.log('🔍 Finding HTML files...');
  const htmlFiles = [];
  
  async function findHtmlFiles(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        await findHtmlFiles(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.html')) {
        htmlFiles.push(fullPath);
      }
    }
  }
  
  await findHtmlFiles(docsDir);
  console.log(`📁 Found ${htmlFiles.length} HTML files\n`);
  
  // Check which method is available
  console.log('🔧 Checking available PDF tools...');
  let method = 'fallback';
  
  try {
    await execPromise('which chromium 2>/dev/null || which google-chrome 2>/dev/null || which chromium-browser 2>/dev/null');
    method = 'chrome';
    console.log('✅ Chrome/Chromium detected - will use high-quality rendering\n');
  } catch (e) {
    try {
      await execPromise('which wkhtmltopdf 2>/dev/null');
      method = 'wkhtmltopdf';
      console.log('✅ wkhtmltopdf detected - will use good quality rendering\n');
    } catch (e2) {
      console.log('⚠️  No browser or wkhtmltopdf found - using basic fallback\n');
    }
  }
  
  // Convert files
  let success = 0, failed = 0, skipped = 0;
  
  for (let i = 0; i < htmlFiles.length; i++) {
    const htmlFile = htmlFiles[i];
    const relativePath = path.relative(docsDir, htmlFile);
    
    process.stdout.write(`[${i + 1}/${htmlFiles.length}] ${relativePath.substring(0, 50)}... `);
    
    const result = await smartConvertHtmlToPdf(htmlFile);
    
    if (result.skipped) {
      console.log('⏭️  (already exists)');
      skipped++;
    } else if (result.success) {
      if (result.fallback) {
        console.log('✅ (basic)');
      } else {
        console.log('✅');
      }
      success++;
    } else {
      console.log('❌');
      failed++;
    }
  }
  
  // Summary
  console.log('\n' + '=' .repeat(60));
  console.log('📊 Conversion Summary:');
  console.log('=' .repeat(60));
  console.log(`✅ Converted: ${success} files`);
  console.log(`⏭️  Skipped: ${skipped} files (already up-to-date)`);
  if (failed > 0) {
    console.log(`❌ Failed: ${failed} files`);
  }
  
  console.log(`\n🎯 Method used: ${method}`);
  
  if (method === 'fallback') {
    console.log('\n💡 For better PDF quality, install one of:');
    console.log('   - Chrome/Chromium: sudo apt-get install chromium-browser');
    console.log('   - wkhtmltopdf: sudo apt-get install wkhtmltopdf');
  }
  
  console.log('\n✨ PDF generation complete!');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { smartConvertHtmlToPdf };