// Test script for certificate generation system
require('dotenv').config({ path: '.env.local' });

const AutomatedCertificateService = require('./services/automated-certificate-service');

async function testCertificateGeneration() {
  console.log('🧪 Testing Certificate Generation System');
  console.log('=======================================');
  
  // Check environment configuration
  console.log('📧 Environment Configuration Check:');
  console.log(`SUPABASE_URL: ${process.env.SUPABASE_URL ? '✅ Configured' : '❌ Missing'}`);
  console.log(`SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Configured' : '❌ Missing'}`);
  console.log(`MAILERSEND_API_KEY: ${process.env.MAILERSEND_API_KEY ? '✅ Configured' : '❌ Missing'}`);
  
  // Mock user data for testing
  const mockUser = {
    id: 999,
    first_name: 'Test',
    last_name: 'User',
    email: 'oleg@shipdocs.app',
    vessel_assignment: 'Test Vessel',
    position: 'Crew Member',
    expected_boarding_date: new Date().toISOString()
  };

  const mockQuizResults = [
    {
      phase: 1,
      score: 8,
      total_questions: 10,
      status: 'passed',
      completed_at: new Date().toISOString()
    },
    {
      phase: 2,
      score: 9,
      total_questions: 10,
      status: 'passed',
      completed_at: new Date().toISOString()
    },
    {
      phase: 3,
      score: 10,
      total_questions: 10,
      status: 'passed',
      completed_at: new Date().toISOString()
    }
  ];

  const mockTrainingSessions = [
    {
      phase: 1,
      status: 'completed',
      started_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      completed_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      phase: 2,
      status: 'completed',
      started_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      completed_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      phase: 3,
      status: 'completed',
      started_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      completed_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];

  try {
    console.log('\n📋 Testing template data preparation...');
    
    // Test preparing data for template
    const templateData = AutomatedCertificateService.prepareDataForTemplate(
      mockUser,
      mockQuizResults,
      mockTrainingSessions
    );
    
    console.log('✅ Template data prepared successfully:');
    console.log('   - User:', `${templateData.user_name}`);
    console.log('   - Vessel:', templateData.vessel_assignment);
    console.log('   - Completion Date:', templateData.completion_date);
    console.log('   - Total Score:', `${templateData.total_score}/${templateData.total_possible_score}`);
    
    console.log('\n📄 Testing PDF generation (without storage/email)...');
    
    // Mock the data fetching methods to use our test data
    const originalGetUserData = AutomatedCertificateService.getUserData;
    const originalGetQuizResults = AutomatedCertificateService.getQuizResults;
    const originalGetTrainingSessions = AutomatedCertificateService.getTrainingSessions;
    const originalStoreCertificate = AutomatedCertificateService.storeCertificate;
    const originalCreateCertificateRecord = AutomatedCertificateService.createCertificateRecord;
    const originalDistributeCertificate = AutomatedCertificateService.distributeCertificate;
    const originalDistributeIntroKapitein = AutomatedCertificateService.distributeIntroKapiteinCertificate;
    
    // Mock methods to use test data
    AutomatedCertificateService.getUserData = async () => mockUser;
    AutomatedCertificateService.getQuizResults = async () => mockQuizResults;
    AutomatedCertificateService.getTrainingSessions = async () => mockTrainingSessions;
    // Only mock email distribution - keep real storage and database operations
    AutomatedCertificateService.distributeCertificate = async (user, storagePath) => {
      console.log(`   📧 [MOCK] Would distribute certificate to ${user.email} from ${storagePath}`);
      return { success: true, mock: true };
    };
    AutomatedCertificateService.distributeIntroKapiteinCertificate = async (user, storagePath, certData) => {
      console.log(`   📧 [MOCK] Would distribute Intro Kapitein certificate to ${user.email} from ${storagePath}`);
      return { success: true, mock: true };
    };
    
    // Test standard certificate generation
    console.log('\n🔄 Testing standard certificate generation...');
    const standardResult = await AutomatedCertificateService.generateAndDistributeCertificate(999, 'standard');
    
    console.log('✅ Standard certificate test completed:');
    console.log(`   - Certificate ID: ${standardResult.certificateId}`);
    console.log(`   - Certificate Number: ${standardResult.certificateNumber}`);
    console.log(`   - Filename: ${standardResult.filename}`);
    
    // Test intro kapitein certificate generation
    console.log('\n🔄 Testing intro kapitein certificate generation...');
    const introResult = await AutomatedCertificateService.generateAndDistributeCertificate(999, 'intro_kapitein');
    
    console.log('✅ Intro Kapitein certificate test completed:');
    console.log(`   - Certificate ID: ${introResult.certificateId}`);
    console.log(`   - Certificate Number: ${introResult.certificateNumber}`);
    console.log(`   - Filename: ${introResult.filename}`);
    
    // Restore original methods
    AutomatedCertificateService.getUserData = originalGetUserData;
    AutomatedCertificateService.getQuizResults = originalGetQuizResults;
    AutomatedCertificateService.getTrainingSessions = originalGetTrainingSessions;
    AutomatedCertificateService.distributeCertificate = originalDistributeCertificate;
    AutomatedCertificateService.distributeIntroKapiteinCertificate = originalDistributeIntroKapitein;
    
    return { success: true };
    
  } catch (error) {
    console.error('\n❌ Certificate generation test failed:', error);
    return { success: false, error: error.message };
  }
}

// Run the test
if (require.main === module) {
  testCertificateGeneration()
    .then(result => {
      if (result.success) {
        console.log('\n🎉 Certificate generation system test passed!');
        process.exit(0);
      } else {
        console.error('\n💥 Certificate generation system test failed!');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n💥 Unexpected error:', error);
      process.exit(1);
    });
}

module.exports = { testCertificateGeneration };
