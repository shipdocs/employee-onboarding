// Test script for manager welcome email functionality
require('dotenv').config({ path: '.env.local' });

const { unifiedEmailService: EmailService } = require('../../lib/unifiedEmailService');

async function testManagerWelcomeEmail() {
  console.log('🧪 Testing Manager Welcome Email Functionality');
  console.log('================================================');
  
  // Check if MailerSend is configured
  console.log('📧 Email Configuration Check:');
  console.log(`MAILERSEND_API_KEY: ${process.env.MAILERSEND_API_KEY ? '✅ Configured' : '❌ Missing'}`);
  console.log(`EMAIL_FROM: ${process.env.EMAIL_FROM || 'Not set'}`);
  console.log(`EMAIL_FROM_NAME: ${process.env.EMAIL_FROM_NAME || 'Not set'}`);
  
  // Mock manager data
  const mockManager = {
    id: 999,
    email: 'oleg@shipdocs.app',
    first_name: 'Oleg',
    last_name: 'Test Manager',
    position: 'Fleet Manager'
  };
  
  const mockPassword = 'TempPass123!';
  
  try {
    console.log('\n📤 Testing sendManagerWelcomeEmail...');
    console.log(`Manager: ${mockManager.first_name} ${mockManager.last_name} (${mockManager.email})`);
    console.log(`Temporary Password: ${mockPassword}`);
    
    const result = await EmailService.sendManagerWelcomeEmail(mockManager, mockPassword);
    
    console.log('\n✅ Email test completed successfully!');
    console.log('Result:', result);
    
    if (result.messageId) {
      console.log(`📧 Message ID: ${result.messageId}`);
    }
    
    return { success: true, result };
    
  } catch (error) {
    console.error('\n❌ Email test failed:', error);
    return { success: false, error: error.message };
  }
}

// Run the test
if (require.main === module) {
  testManagerWelcomeEmail()
    .then(result => {
      if (result.success) {
        console.log('\n🎉 Manager welcome email test passed!');
        process.exit(0);
      } else {
        console.error('\n💥 Manager welcome email test failed!');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n💥 Unexpected error:', error);
      process.exit(1);
    });
}

module.exports = { testManagerWelcomeEmail };
