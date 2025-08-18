#!/usr/bin/env node

/**
 * Run Onboarding Tests
 * 
 * This script executes the comprehensive onboarding functionality tests
 * and automatically opens the generated report in the default browser.
 */

const { runTests } = require('./test-onboarding-functionality');
const { exec } = require('child_process');
const path = require('path');
const os = require('os');

// Function to open a file in the default application
function openFile(filePath) {
  const platform = os.platform();
  const absolutePath = path.resolve(filePath);
  
  console.log(`Opening report: ${absolutePath}`);
  
  let command;
  switch (platform) {
    case 'darwin': // macOS
      command = `open "${absolutePath}"`;
      break;
    case 'win32': // Windows
      command = `start "" "${absolutePath}"`;
      break;
    default: // Linux and others
      command = `xdg-open "${absolutePath}"`;
      break;
  }
  
  exec(command, (error) => {
    if (error) {
      console.error(`Error opening report: ${error.message}`);
    }
  });
}

// Main function
async function main() {
  console.log('🚀 Starting Comprehensive Onboarding Functionality Tests...');
  console.log('📋 This will create test accounts, execute all test cases, and generate a report.');
  console.log('🧹 All test accounts will be automatically purged after testing.');
  console.log('\n⏳ Please wait while tests are running...\n');
  
  try {
    // Run the tests
    const reportFile = await runTests();
    
    console.log(`\n🎉 Tests completed successfully!`);
    console.log(`📊 Report generated: ${reportFile}`);
    
    // Open the report in the default browser
    openFile(reportFile);
    
    console.log('\n📝 See ONBOARDING_TEST_PROTOCOL.md for detailed information about the test protocol.');
  } catch (error) {
    console.error(`\n❌ Test execution failed: ${error.message}`);
    process.exit(1);
  }
}

// Execute the main function
main();