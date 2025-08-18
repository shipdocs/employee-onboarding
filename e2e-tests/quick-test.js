const TestRunner = require('./src/TestRunner');

async function quickTest() {
  console.log('🧪 Quick Maritime E2E Test Demo');
  console.log('=================================\n');

  const runner = new TestRunner('./config.json');
  
  // Override to run only magic link tests
  runner.results.startTime = new Date();
  
  try {
    // Import and run just the authentication module
    const AuthenticationModule = require('./src/modules/AuthenticationModule');
    const auth = new AuthenticationModule(runner.config);
    
    // Setup browser
    await auth.setup({ headless: false, recordVideo: true });
    
    console.log('🔐 Testing Magic Link Requests...\n');
    
    // Test crew magic link
    const crewResult = await auth.performMagicLinkRequest(
      runner.config.credentials.crew, 
      'crew'
    );
    
    // Test manager magic link  
    const managerResult = await auth.performMagicLinkRequest(
      runner.config.credentials.manager,
      'manager'
    );
    
    console.log('\n✅ Quick Test Results:');
    console.log(`   Crew Magic Link: ${crewResult ? 'PASS' : 'FAIL'}`);
    console.log(`   Manager Magic Link: ${managerResult ? 'PASS' : 'FAIL'}`);
    
    await auth.takeScreenshot('quick-test-complete');
    
    // Cleanup
    await auth.teardown();
    
    console.log('\n🎉 Quick test completed successfully!');
    console.log('📸 Screenshots saved to reports/screenshots/');
    
  } catch (error) {
    console.error('\n❌ Quick test failed:', error.message);
  }
}

quickTest();