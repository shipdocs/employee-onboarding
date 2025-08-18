// Simple test for Manager Welcome PDF generation
require('dotenv').config({ path: '.env.local' });

const { unifiedEmailService } = require('../../lib/unifiedEmailService');

async function testManagerPDFGeneration() {
  console.log('🧪 Testing Manager Welcome PDF Generation');
  console.log('==========================================');
  
  try {
    // Mock manager data
    const mockManager = {
      id: 999,
      email: 'test.manager@shipdocs.app',
      first_name: 'Test',
      last_name: 'Manager',
      position: 'Fleet Manager'
    };
    
    console.log('📋 Testing PDF generation...');
    console.log(`Manager: ${mockManager.first_name} ${mockManager.last_name}`);
    
    // Test PDF generation using the unifiedEmailService instance
    const pdfBytes = await unifiedEmailService.generateManagerWelcomePDF(mockManager);
    
    if (pdfBytes && pdfBytes.length > 0) {
      console.log('✅ PDF generated successfully!');
      console.log(`📄 PDF size: ${pdfBytes.length} bytes`);
      
      // Save PDF to temp file for verification
      const fs = require('fs');
      const path = require('path');
      const tempPath = path.join('/tmp', `test_manager_welcome_${Date.now()}.pdf`);
      fs.writeFileSync(tempPath, pdfBytes);
      console.log(`💾 PDF saved to: ${tempPath}`);
      
      return { success: true, pdfSize: pdfBytes.length, tempPath };
    } else {
      throw new Error('PDF generation returned empty result');
    }
    
  } catch (error) {
    console.error('❌ PDF generation failed:', error.message);
    return { success: false, error: error.message };
  }
}

async function testManagerWelcomeEmail() {
  console.log('\n📧 Testing Manager Welcome Email with PDF...');
  
  try {
    // Mock manager data
    const mockManager = {
      id: 999,
      email: 'test.manager@shipdocs.app',
      first_name: 'Test',
      last_name: 'Manager',
      position: 'Fleet Manager'
    };
    
    const mockPassword = 'TempPassword123!';
    
    // Test email sending (will be in dev mode)
    const result = await unifiedEmailService.sendManagerWelcomeEmail(mockManager, mockPassword);
    
    console.log('✅ Email test completed!');
    console.log('📧 Result:', result);
    
    return { success: true, result };
    
  } catch (error) {
    console.error('❌ Email test failed:', error.message);
    return { success: false, error: error.message };
  }
}

// Run the tests
async function runAllTests() {
  console.log('🚀 Starting Manager Welcome PDF Tests\n');
  
  // Test 1: PDF Generation
  const pdfTest = await testManagerPDFGeneration();
  
  // Test 2: Email with PDF
  const emailTest = await testManagerWelcomeEmail();
  
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  console.log(`PDF Generation: ${pdfTest.success ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Email with PDF: ${emailTest.success ? '✅ PASS' : '❌ FAIL'}`);
  
  if (pdfTest.success && emailTest.success) {
    console.log('\n🎉 All tests passed! Manager Welcome PDF functionality is working.');
    console.log('\n📋 Next steps:');
    console.log('1. ✅ Manager Welcome PDF - COMPLETED');
    console.log('2. ⏳ Safety Management PDF (5 days before boarding)');
    console.log('3. ⏳ Boarding Day Email trigger');
    return true;
  } else {
    console.log('\n❌ Some tests failed. Check the errors above.');
    return false;
  }
}

if (require.main === module) {
  runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('\n💥 Unexpected error:', error);
      process.exit(1);
    });
}

module.exports = { testManagerPDFGeneration, testManagerWelcomeEmail };
