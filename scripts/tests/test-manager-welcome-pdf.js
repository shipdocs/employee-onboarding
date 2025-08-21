// Test script for Manager Welcome PDF functionality
require('dotenv').config({ path: '.env.local' });

const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:3000';
const ADMIN_EMAIL = 'admin@shipdocs.app';
const ADMIN_PASSWORD = 'admin123';

async function testManagerWelcomePDF() {
  console.log('🧪 Testing Manager Welcome PDF Functionality');
  console.log('==============================================');
  
  try {
    // Step 1: Login as admin
    console.log('\n🔐 Step 1: Admin Login...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/admin-login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });

    if (!loginResponse.data.token) {
      throw new Error('Failed to get admin token');
    }

    const adminToken = loginResponse.data.token;
    console.log('✅ Admin login successful');

    // Step 2: Create a test manager (this should trigger welcome email with PDF)
    console.log('\n👔 Step 2: Creating test manager...');
    const managerData = {
      email: 'test.manager.pdf@shipdocs.app',
      firstName: 'Test',
      lastName: 'Manager PDF',
      position: 'Fleet Manager',
      password: 'TempPassword123!',
      permissions: [
        'view_crew_list',
        'manage_crew_members',
        'review_quiz_results'
      ]
    };

    const createManagerResponse = await axios.post(`${BASE_URL}/api/admin/managers`, managerData, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (createManagerResponse.data.manager) {
      console.log('✅ Manager created successfully:', createManagerResponse.data.manager.email);
      console.log('📧 Welcome email with PDF should have been sent');
      
      // Step 3: Test PDF generation endpoint directly
      console.log('\n📋 Step 3: Testing PDF generation endpoint...');
      const pdfResponse = await axios.post(`${BASE_URL}/api/pdf/generate-manager-welcome`, {
        managerId: createManagerResponse.data.manager.id
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (pdfResponse.data.success) {
        console.log('✅ PDF generation successful:', pdfResponse.data.pdf.filename);
      } else {
        console.log('❌ PDF generation failed');
      }

      // Step 4: Clean up - delete test manager
      console.log('\n🧹 Step 4: Cleaning up test manager...');
      try {
        await axios.delete(`${BASE_URL}/api/admin/managers/${createManagerResponse.data.manager.id}`, {
          headers: {
            'Authorization': `Bearer ${adminToken}`
          }
        });
        console.log('✅ Test manager cleaned up');
      } catch (cleanupError) {
        console.log('⚠️ Cleanup failed (manager may need manual removal)');
      }

    } else {
      throw new Error('Manager creation failed');
    }

    console.log('\n🎉 Manager Welcome PDF test completed successfully!');
    console.log('\n📧 Check the email inbox for test.manager.pdf@shipdocs.app');
    console.log('📎 The email should contain a Manager Welcome Guide PDF attachment');

    return { success: true };

  } catch (error) {
    console.error('\n❌ Manager Welcome PDF test failed:', error.message);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    
    return { success: false, error: error.message };
  }
}

// Run the test
if (require.main === module) {
  testManagerWelcomePDF()
    .then(result => {
      if (result.success) {
        console.log('\n✅ All tests passed!');
        process.exit(0);
      } else {
        console.error('\n❌ Tests failed!');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n💥 Unexpected error:', error);
      process.exit(1);
    });
}

module.exports = { testManagerWelcomePDF };
