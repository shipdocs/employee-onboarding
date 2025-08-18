const fs = require('fs');
const path = require('path');

// Load and test translation files
const translationPaths = [
  'client/src/locales/en/manager.json',
  'client/src/locales/nl/manager.json',
  'client/src/locales/en/common.json',
  'client/src/locales/nl/common.json'
];

console.log('=== Translation Files Debug ===\n');

translationPaths.forEach(filePath => {
  const fullPath = path.join(__dirname, filePath);
  try {
    const content = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    console.log(`✅ ${filePath}:`);
    console.log(`   Keys: ${Object.keys(content).length}`);
    
    // Check for specific keys we're looking for
    const testKeys = [
      'dashboard.sections.crew.title',
      'dashboard.sections.crew.description',
      'dashboard.filters.allStatus',
      'dashboard.table.headers.name'
    ];
    
    testKeys.forEach(key => {
      const keyExists = key.split('.').reduce((obj, k) => obj && obj[k], content);
      console.log(`   ${key}: ${keyExists ? '✅' : '❌'}`);
    });
    
  } catch (error) {
    console.log(`❌ ${filePath}: Error - ${error.message}`);
  }
  console.log('');
});

// Test for common.json manager keys
console.log('=== Common.json Manager Keys ===');
try {
  const commonEn = JSON.parse(fs.readFileSync(path.join(__dirname, 'client/src/locales/en/common.json'), 'utf8'));
  const managerKeys = commonEn.manager || {};
  console.log('Manager keys in common.json:');
  Object.keys(managerKeys).forEach(key => {
    console.log(`  ${key}: ${managerKeys[key]}`);
  });
} catch (error) {
  console.log('Error reading common.json:', error.message);
}