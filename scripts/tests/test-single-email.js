// Single email test to verify delivery
require('dotenv').config({ path: '.env' });

const { unifiedEmailService } = require('../../lib/unifiedEmailService');

async function testSingleEmail() {
  console.log('📧 SINGLE EMAIL TEST');
  console.log('===================');
  console.log('Testing one email to verify delivery...');
  console.log('');

  try {
    const testCrew = {
      id: 9999,
      email: 'final-test@shipdocs.app',
      first_name: 'Final',
      last_name: 'Test',
      vessel_assignment: 'MV Final Test',
      expected_boarding_date: new Date().toISOString().split('T')[0]
    };

    console.log('🚢 Sending Onboarding Start Email...');
    console.log(`📧 To: ${testCrew.email}`);
    console.log(`👤 Name: ${testCrew.first_name} ${testCrew.last_name}`);
    console.log(`🚢 Vessel: ${testCrew.vessel_assignment}`);
    console.log('');

    const result = await unifiedEmailService.sendOnboardingStartEmail(testCrew);
    
    console.log('📊 Result:', result);
    
    if (result && (result.messageId || result.statusCode === 202)) {
      console.log('✅ Email sent successfully!');
      console.log('📬 Check your inbox for: final-test@shipdocs.app');
      console.log('⏰ Email should arrive within 1-2 minutes');
      return true;
    } else {
      console.log('❌ Email failed to send');
      return false;
    }

  } catch (error) {
    console.error('💥 Error:', error.message);
    return false;
  }
}

if (require.main === module) {
  testSingleEmail()
    .then(success => {
      if (success) {
        console.log('\n🎉 Test completed! Check your inbox.');
      } else {
        console.log('\n❌ Test failed.');
      }
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('\n💥 Unexpected error:', error);
      process.exit(1);
    });
}
