// Email test with proper delays to avoid rate limiting
require('dotenv').config({ path: '.env' });

const { unifiedEmailService } = require('../../lib/unifiedEmailService');

// Helper function to wait
function wait(seconds) {
  return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

async function testEmailsWithDelays() {
  console.log('📧 EMAIL TEST WITH PROPER DELAYS');
  console.log('================================');
  console.log('⏰ Adding delays between emails to avoid rate limiting');
  console.log('');

  const results = {
    managerWelcome: false,
    safetyPDF: false,
    onboardingStart: false
  };

  try {
    // TEST 1: Manager Welcome Email with PDF
    console.log('📋 TEST 1: Manager Welcome Email + PDF');
    console.log('======================================');
    
    const mockManager = {
      id: 4001,
      email: 'manager-test-delayed@shipdocs.app',
      first_name: 'Martin',
      last_name: 'Manager Delayed',
      position: 'Fleet Operations Manager',
      created_at: new Date().toISOString()
    };

    console.log(`👔 Manager: ${mockManager.first_name} ${mockManager.last_name}`);
    console.log(`📧 Email: ${mockManager.email}`);
    console.log(`💼 Position: ${mockManager.position}`);
    console.log('📎 Will include: Manager Welcome Guide PDF');
    console.log('');
    console.log('🚀 Sending Manager Welcome Email...');

    const managerResult = await unifiedEmailService.sendManagerWelcomeEmail(mockManager, 'TempPassword123!');
    
    if (managerResult && (managerResult.messageId || managerResult.statusCode === 202)) {
      console.log('✅ Manager Welcome Email sent successfully!');
      console.log(`📧 Status: ${managerResult.statusCode || 'Sent'}`);
      results.managerWelcome = true;
    } else {
      console.log('❌ Manager Welcome Email failed');
    }

    console.log('');
    console.log('⏳ Waiting 30 seconds before next email to avoid rate limiting...');
    await wait(30);

    // TEST 2: Safety Management PDF Email
    console.log('📋 TEST 2: Safety Management PDF Email');
    console.log('=====================================');
    
    const mockCrew = {
      id: 4002,
      email: 'crew-safety-delayed@shipdocs.app',
      first_name: 'Martin',
      last_name: 'Crew Safety Delayed',
      vessel_assignment: 'MV Delayed Test Explorer',
      expected_boarding_date: new Date(Date.now() + (5 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]
    };

    console.log(`⚓ Crew: ${mockCrew.first_name} ${mockCrew.last_name}`);
    console.log(`📧 Email: ${mockCrew.email}`);
    console.log(`🚢 Vessel: ${mockCrew.vessel_assignment}`);
    console.log(`📅 Boarding Date: ${mockCrew.expected_boarding_date} (5 days from now)`);
    console.log('📎 Will include: Safety Management System PDF');
    console.log('');
    console.log('🚀 Sending Safety Management PDF Email...');

    const safetyResult = await unifiedEmailService.sendSafetyManagementPDF(mockCrew);
    
    if (safetyResult && (safetyResult.messageId || safetyResult.statusCode === 202)) {
      console.log('✅ Safety Management PDF Email sent successfully!');
      console.log(`📧 Status: ${safetyResult.statusCode || 'Sent'}`);
      results.safetyPDF = true;
    } else {
      console.log('❌ Safety Management PDF Email failed');
    }

    console.log('');
    console.log('⏳ Waiting 30 seconds before final email...');
    await wait(30);

    // TEST 3: Onboarding Start Email
    console.log('📋 TEST 3: Onboarding Start Email');
    console.log('=================================');
    
    const boardingCrew = {
      id: 4003,
      email: 'crew-boarding-delayed@shipdocs.app',
      first_name: 'Martin',
      last_name: 'Crew Boarding Delayed',
      vessel_assignment: 'MV Delayed Test Explorer',
      expected_boarding_date: new Date().toISOString().split('T')[0] // Today
    };

    console.log(`🚢 Crew: ${boardingCrew.first_name} ${boardingCrew.last_name}`);
    console.log(`📧 Email: ${boardingCrew.email}`);
    console.log(`🚢 Vessel: ${boardingCrew.vessel_assignment}`);
    console.log(`📅 Boarding Date: ${boardingCrew.expected_boarding_date} (Today)`);
    console.log('');
    console.log('🚀 Sending Onboarding Start Email...');

    const onboardingResult = await unifiedEmailService.sendOnboardingStartEmail(boardingCrew);
    
    if (onboardingResult && (onboardingResult.messageId || onboardingResult.statusCode === 202)) {
      console.log('✅ Onboarding Start Email sent successfully!');
      console.log(`📧 Status: ${onboardingResult.statusCode || 'Sent'}`);
      results.onboardingStart = true;
    } else {
      console.log('❌ Onboarding Start Email failed');
    }

    console.log('');

    // RESULTS SUMMARY
    console.log('📊 DELAYED EMAIL TEST RESULTS');
    console.log('=============================');
    const totalSent = Object.values(results).filter(Boolean).length;
    console.log(`✅ Emails sent successfully: ${totalSent}/3`);
    console.log('');
    console.log('Individual Results:');
    console.log(`1. Manager Welcome + PDF:     ${results.managerWelcome ? '✅ SENT' : '❌ FAILED'}`);
    console.log(`2. Safety Management PDF:     ${results.safetyPDF ? '✅ SENT' : '❌ FAILED'}`);
    console.log(`3. Onboarding Start Email:    ${results.onboardingStart ? '✅ SENT' : '❌ FAILED'}`);
    console.log('');

    if (totalSent === 3) {
      console.log('🎉 ALL EMAILS SENT SUCCESSFULLY WITH DELAYS!');
      console.log('');
      console.log('📬 CHECK YOUR INBOX IN 2-3 MINUTES:');
      console.log('📧 manager-test-delayed@shipdocs.app');
      console.log('📧 crew-safety-delayed@shipdocs.app'); 
      console.log('📧 crew-boarding-delayed@shipdocs.app');
      console.log('');
      console.log('📋 You should receive:');
      console.log('1. 📎 Manager Welcome Email with PDF attachment');
      console.log('2. 🛡️ Safety Management System email with PDF');
      console.log('3. 🚢 Onboarding Start email (boarding day)');
      console.log('');
      console.log('⏰ TIMING RECOMMENDATIONS FOR PRODUCTION:');
      console.log('• Add 10-30 second delays between bulk emails');
      console.log('• Use email queuing for large batches');
      console.log('• Monitor MailerSend rate limits');
      console.log('• Consider using email scheduling for cron jobs');
      
      return true;
    } else {
      console.log('❌ SOME EMAILS FAILED TO SEND');
      return false;
    }

  } catch (error) {
    console.error('💥 DELAYED EMAIL TEST ERROR:', error.message);
    return false;
  }
}

// Update cron job recommendations
async function showCronJobRecommendations() {
  console.log('\n🕐 CRON JOB EMAIL TIMING RECOMMENDATIONS');
  console.log('=======================================');
  console.log('');
  console.log('📋 For Production Cron Jobs:');
  console.log('');
  console.log('1. **Batch Processing with Delays:**');
  console.log('   • Process emails in batches of 10-20');
  console.log('   • Add 5-10 second delays between emails');
  console.log('   • Add 30-60 second delays between batches');
  console.log('');
  console.log('2. **Email Queue System:**');
  console.log('   • Queue emails instead of sending immediately');
  console.log('   • Process queue with controlled rate');
  console.log('   • Retry failed emails with exponential backoff');
  console.log('');
  console.log('3. **MailerSend Rate Limits:**');
  console.log('   • Free plan: 3,000 emails/month');
  console.log('   • Rate limit: 120 emails/minute');
  console.log('   • Monitor quota usage in dashboard');
  console.log('');
  console.log('4. **Cron Job Timing:**');
  console.log('   • Safety PDFs: 9:00 AM (5 days before boarding)');
  console.log('   • Onboarding Start: 8:00 AM (boarding day)');
  console.log('   • Spread different email types across time');
  console.log('');
  console.log('🔧 IMPLEMENTATION SUGGESTION:');
  console.log('Update cron job to add delays between emails');
}

// Run the delayed email test
async function runDelayedEmailTest() {
  console.log('🚀 STARTING DELAYED EMAIL TEST');
  console.log('==============================');
  console.log('⚠️  This test will take ~2 minutes due to delays');
  console.log('');

  const success = await testEmailsWithDelays();
  await showCronJobRecommendations();

  console.log('\n📊 FINAL DELAYED EMAIL TEST RESULT');
  console.log('==================================');
  
  if (success) {
    console.log('🎉 SUCCESS: All emails sent with proper delays!');
    console.log('📬 Check your inbox in 2-3 minutes');
    console.log('🚀 Ready to implement delays in production cron jobs');
    return true;
  } else {
    console.log('❌ FAILED: Some emails failed even with delays');
    return false;
  }
}

if (require.main === module) {
  runDelayedEmailTest()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('\n💥 Unexpected error:', error);
      process.exit(1);
    });
}

module.exports = { testEmailsWithDelays, showCronJobRecommendations };
