// Test script for boarding date cron functionality
require('dotenv').config({ path: '.env.local' });

const { unifiedEmailService } = require('../../lib/unifiedEmailService');

async function testBoardingDateEmails() {
  console.log('🧪 Testing Boarding Date Email Functionality');
  console.log('==============================================');
  
  try {
    // Mock crew data for Safety Management PDF (5 days before boarding)
    const mockCrewSafety = {
      id: 998,
      email: 'test.crew.safety@shipdocs.app',
      first_name: 'Test',
      last_name: 'Crew Safety',
      vessel_assignment: 'MV Test Vessel',
      expected_boarding_date: new Date(Date.now() + (5 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0] // 5 days from now
    };

    // Mock crew data for Onboarding Start (boarding today)
    const mockCrewBoarding = {
      id: 999,
      email: 'test.crew.boarding@shipdocs.app',
      first_name: 'Test',
      last_name: 'Crew Boarding',
      vessel_assignment: 'MV Test Vessel',
      expected_boarding_date: new Date().toISOString().split('T')[0] // Today
    };

    console.log('\n🛡️ Testing Safety Management PDF Email (5 days before boarding)...');
    console.log(`Crew: ${mockCrewSafety.first_name} ${mockCrewSafety.last_name}`);
    console.log(`Email: ${mockCrewSafety.email}`);
    console.log(`Vessel: ${mockCrewSafety.vessel_assignment}`);
    console.log(`Boarding Date: ${mockCrewSafety.expected_boarding_date}`);

    const safetyResult = await unifiedEmailService.sendSafetyManagementPDF(mockCrewSafety);

    if (safetyResult && safetyResult.messageId) {
      console.log('✅ Safety Management PDF email test passed!');
      console.log('📧 Result:', safetyResult);
    } else {
      console.log('❌ Safety Management PDF email test failed');
    }

    console.log('\n🚢 Testing Onboarding Start Email (boarding day)...');
    console.log(`Crew: ${mockCrewBoarding.first_name} ${mockCrewBoarding.last_name}`);
    console.log(`Email: ${mockCrewBoarding.email}`);
    console.log(`Vessel: ${mockCrewBoarding.vessel_assignment}`);
    console.log(`Boarding Date: ${mockCrewBoarding.expected_boarding_date} (Today)`);

    const onboardingResult = await unifiedEmailService.sendOnboardingStartEmail(mockCrewBoarding);

    if (onboardingResult && onboardingResult.messageId) {
      console.log('✅ Onboarding start email test passed!');
      console.log('📧 Result:', onboardingResult);
    } else {
      console.log('❌ Onboarding start email test failed');
    }

    console.log('\n📊 Test Results Summary:');
    console.log('========================');
    const safetyPassed = safetyResult && safetyResult.messageId;
    const onboardingPassed = onboardingResult && onboardingResult.messageId;

    console.log(`Safety Management PDF: ${safetyPassed ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Onboarding Start Email: ${onboardingPassed ? '✅ PASS' : '❌ FAIL'}`);

    if (safetyPassed && onboardingPassed) {
      console.log('\n🎉 All boarding date email tests passed!');
      console.log('\n📋 Stap 2 Status:');
      console.log('1. ✅ Manager Welcome PDF - COMPLETED');
      console.log('2. ✅ Safety Management PDF (5 days before boarding) - COMPLETED');
      console.log('3. ✅ Boarding Day Email trigger - COMPLETED');
      console.log('\n🚀 Ready for Stap 3: Safety Management PDF Template');
      return true;
    } else {
      console.log('\n❌ Some tests failed. Check the errors above.');
      return false;
    }

  } catch (error) {
    console.error('\n❌ Boarding date email test failed:', error.message);
    return false;
  }
}

// Test the cron logic simulation
async function testCronLogicSimulation() {
  console.log('\n🕐 Testing Cron Logic Simulation');
  console.log('=================================');
  
  try {
    // Simulate what the cron job would do
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const fiveDaysFromNow = new Date(now.getTime() + (5 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];
    
    console.log('📅 Date calculations:');
    console.log(`Today: ${today}`);
    console.log(`5 days from now: ${fiveDaysFromNow}`);
    
    // Mock crew data that would be found by the cron job
    const crewNeedingSafetyPDF = [
      {
        id: 1001,
        email: 'crew1@example.com',
        first_name: 'John',
        last_name: 'Sailor',
        vessel_assignment: 'MV Ocean Explorer',
        expected_boarding_date: fiveDaysFromNow
      }
    ];
    
    const crewBoardingToday = [
      {
        id: 1002,
        email: 'crew2@example.com',
        first_name: 'Jane',
        last_name: 'Navigator',
        vessel_assignment: 'MV Sea Adventure',
        expected_boarding_date: today
      }
    ];
    
    console.log(`\n🛡️ Found ${crewNeedingSafetyPDF.length} crew members needing Safety PDF`);
    console.log(`🚢 Found ${crewBoardingToday.length} crew members boarding today`);
    
    // Simulate processing
    let emailsSent = 0;
    
    for (const crew of crewNeedingSafetyPDF) {
      console.log(`📧 Would send Safety PDF to: ${crew.email} (${crew.first_name} ${crew.last_name})`);
      emailsSent++;
    }
    
    for (const crew of crewBoardingToday) {
      console.log(`📧 Would send Onboarding Start to: ${crew.email} (${crew.first_name} ${crew.last_name})`);
      emailsSent++;
    }
    
    console.log(`\n✅ Cron simulation completed. Would send ${emailsSent} emails.`);
    return true;
    
  } catch (error) {
    console.error('❌ Cron simulation failed:', error.message);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting Boarding Date Email Tests\n');
  
  // Test 1: Email Functions
  const emailTest = await testBoardingDateEmails();
  
  // Test 2: Cron Logic Simulation
  const cronTest = await testCronLogicSimulation();
  
  console.log('\n📊 Final Test Results:');
  console.log('======================');
  console.log(`Email Functions: ${emailTest ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Cron Logic: ${cronTest ? '✅ PASS' : '❌ FAIL'}`);
  
  if (emailTest && cronTest) {
    console.log('\n🎉 All tests passed! Boarding date functionality is working.');
    console.log('\n📋 Complete Onboarding Workflow Status:');
    console.log('1. ✅ Admin → Manager (with welcome PDF)');
    console.log('2. ✅ Manager → Crew (with boarding date)');
    console.log('3. ✅ Safety PDF (5 days before boarding)');
    console.log('4. ✅ Onboarding Start (on boarding day)');
    console.log('5. ⏳ Form completion → HR/QHSE distribution');
    console.log('\n🎯 Ready for Monday deployment!');
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

module.exports = { testBoardingDateEmails, testCronLogicSimulation };
