#!/usr/bin/env node

/**
 * Visual Baseline Generator
 * Creates initial screenshots for visual regression testing
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('📸 Generating visual regression baselines...\n');

// Ensure screenshots directory exists
const screenshotsDir = path.join(__dirname, '..', 'tests', 'e2e', 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

console.log('⚠️  This will update all visual regression baselines.');
console.log('   Make sure the application is in the correct state!\n');

try {
  // Run visual tests with update flag
  console.log('🎬 Running visual regression tests...\n');
  execSync('npx playwright test visual-accessibility.spec.ts --grep "Visual Regression" --update-snapshots', {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
  
  console.log('\n✅ Visual baselines generated successfully!');
  console.log(`📁 Screenshots saved to: ${screenshotsDir}`);
  console.log('\n⚡ Quick tips:');
  console.log('  - Review the generated screenshots before committing');
  console.log('  - Run tests without --update-snapshots to compare against baselines');
  console.log('  - Use npm run test:e2e:playwright:update-snapshots to update specific tests');
  
} catch (error) {
  console.error('\n❌ Failed to generate baselines:', error.message);
  console.error('\n💡 Make sure:');
  console.error('  1. The dev server is running (npm run dev)');
  console.error('  2. Playwright is installed (npx playwright install)');
  console.error('  3. The application is accessible at http://localhost:3000');
  process.exit(1);
}

// Check if any screenshots were generated
const screenshots = fs.readdirSync(screenshotsDir).filter(f => f.endsWith('.png'));
if (screenshots.length > 0) {
  console.log(`\n📸 Generated ${screenshots.length} baseline screenshots:`);
  screenshots.forEach(file => {
    console.log(`   - ${file}`);
  });
} else {
  console.log('\n⚠️  No screenshots were generated. Check if visual tests are running correctly.');
}