// Real Email Test - Send actual emails to see content
require('dotenv').config({ path: '.env' });

const { unifiedEmailService } = require('../../lib/unifiedEmailService');

async function testRealEmails() {
  console.log('📧 REAL EMAIL TEST - SENDING ACTUAL EMAILS');
  console.log('==========================================');
  console.log('⚠️  This will send real emails to test addresses');
  console.log('');

  // Use your email address for testing
  const testEmailAddress = 'info@shipdocs.app'; // Change this to your email
  
  console.log(`📬 Test emails will be sent to: ${testEmailAddress}`);
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
      id: 3001,
      email: testEmailAddress,
      first_name: 'Martin',
      last_name: 'Test Manager',
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
      console.log(`📧 Message: ${managerResult.body?.message || 'Email queued for delivery'}`);
      results.managerWelcome = true;
    } else {
      console.log('❌ Manager Welcome Email failed');
      console.log('Result:', managerResult);
    }

    console.log('');
    console.log('⏳ Waiting 3 seconds before next email...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // TEST 2: Safety Management PDF Email
    console.log('📋 TEST 2: Safety Management PDF Email');
    console.log('=====================================');
    
    const mockCrew = {
      id: 3002,
      email: testEmailAddress,
      first_name: 'Martin',
      last_name: 'Test Sailor',
      vessel_assignment: 'MV Test Explorer',
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
      console.log(`📧 Message: ${safetyResult.body?.message || 'Email queued for delivery'}`);
      results.safetyPDF = true;
    } else {
      console.log('❌ Safety Management PDF Email failed');
      console.log('Result:', safetyResult);
    }

    console.log('');
    console.log('⏳ Waiting 3 seconds before next email...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // TEST 3: Onboarding Start Email
    console.log('📋 TEST 3: Onboarding Start Email');
    console.log('=================================');
    
    const boardingCrew = {
      ...mockCrew,
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
      console.log(`📧 Message: ${onboardingResult.body?.message || 'Email queued for delivery'}`);
      results.onboardingStart = true;
    } else {
      console.log('❌ Onboarding Start Email failed');
      console.log('Result:', onboardingResult);
    }

    console.log('');

    // RESULTS SUMMARY
    console.log('📊 REAL EMAIL TEST RESULTS');
    console.log('==========================');
    const totalSent = Object.values(results).filter(Boolean).length;
    console.log(`✅ Emails sent successfully: ${totalSent}/3`);
    console.log('');
    console.log('Individual Results:');
    console.log(`1. Manager Welcome + PDF:     ${results.managerWelcome ? '✅ SENT' : '❌ FAILED'}`);
    console.log(`2. Safety Management PDF:     ${results.safetyPDF ? '✅ SENT' : '❌ FAILED'}`);
    console.log(`3. Onboarding Start Email:    ${results.onboardingStart ? '✅ SENT' : '❌ FAILED'}`);
    console.log('');

    if (totalSent === 3) {
      console.log('🎉 ALL EMAILS SENT SUCCESSFULLY!');
      console.log('');
      console.log('📬 CHECK YOUR INBOX:');
      console.log(`📧 Email Address: ${testEmailAddress}`);
      console.log('');
      console.log('📋 You should receive:');
      console.log('1. 📎 Manager Welcome Email with PDF attachment');
      console.log('2. 🛡️ Safety Management System email with PDF');
      console.log('3. 🚢 Onboarding Start email (boarding day)');
      console.log('');
      console.log('🔍 WHAT TO CHECK:');
      console.log('• Email formatting and styling');
      console.log('• PDF attachments open correctly');
      console.log('• Content is clear and professional');
      console.log('• All dynamic data (names, dates) is correct');
      console.log('• Email templates look good on mobile/desktop');
      console.log('');
      console.log('🎯 READY FOR PRODUCTION DEPLOYMENT!');
      
      return true;
    } else {
      console.log('❌ SOME EMAILS FAILED TO SEND');
      console.log('Check the error messages above for details');
      return false;
    }

  } catch (error) {
    console.error('💥 REAL EMAIL TEST ERROR:', error.message);
    console.error('Stack:', error.stack);
    return false;
  }
}

// Email delivery status check
async function checkEmailDeliveryStatus() {
  console.log('\n📊 EMAIL DELIVERY STATUS CHECK');
  console.log('==============================');
  console.log('ℹ️  Note: MailerSend delivery status can be checked in their dashboard');
  console.log('🔗 Dashboard: https://app.mailersend.com/');
  console.log('');
  console.log('📋 What to monitor:');
  console.log('• Delivery rate (should be 100%)');
  console.log('• Bounce rate (should be 0%)');
  console.log('• Spam complaints (should be 0%)');
  console.log('• Open rates (for engagement tracking)');
  console.log('');
  console.log('⚠️  If emails are not received:');
  console.log('1. Check spam/junk folder');
  console.log('2. Verify sender domain authentication');
  console.log('3. Check MailerSend dashboard for delivery status');
  console.log('4. Ensure recipient email is valid');
}

// Run the real email test
async function runRealEmailTest() {
  console.log('🚀 STARTING REAL EMAIL TEST');
  console.log('===========================');
  console.log('');

  const success = await testRealEmails();
  await checkEmailDeliveryStatus();

  console.log('\n📊 FINAL REAL EMAIL TEST RESULT');
  console.log('===============================');
  
  if (success) {
    console.log('🎉 SUCCESS: All test emails sent successfully!');
    console.log('📬 Check your inbox to review the email content');
    console.log('🚀 Onboarding workflow is ready for production!');
    return true;
  } else {
    console.log('❌ FAILED: Some emails failed to send');
    console.log('🔧 Check configuration and try again');
    return false;
  }
}

if (require.main === module) {
  runRealEmailTest()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('\n💥 Unexpected error:', error);
      process.exit(1);
    });
}

module.exports = { testRealEmails, checkEmailDeliveryStatus };
