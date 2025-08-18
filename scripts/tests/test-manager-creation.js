// Test script for end-to-end manager creation workflow
//
// SECURITY NOTE: This script requires admin credentials via environment variables.
// Set ADMIN_PASSWORD in your .env.local file (never commit passwords to git!)
//
// Usage:
//   echo "ADMIN_PASSWORD=your_secure_password" >> .env.local
//   node test-manager-creation.js
//
require('dotenv').config({ path: '.env.local' });

const axios = require('axios');

// Test configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'adminmartexx@shipdocs.app';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

class ManagerCreationTest {
  constructor() {
    this.authToken = null;
    this.client = axios.create({
      baseURL: BASE_URL,
      timeout: 30000
    });
  }

  async authenticateAsAdmin() {
    try {
      if (!ADMIN_PASSWORD) {
        throw new Error('ADMIN_PASSWORD environment variable is required for testing');
      }

      console.log('🔐 Authenticating as admin...');
      const response = await this.client.post('/api/auth/admin-login', {
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD
      });

      this.authToken = response.data.token;
      this.client.defaults.headers.common['Authorization'] = `Bearer ${this.authToken}`;
      
      console.log('✅ Admin authentication successful');
      return true;
    } catch (error) {
      console.error('❌ Admin authentication failed:', error.response?.data || error.message);
      return false;
    }
  }

  async createTestManager() {
    try {
      console.log('\n👤 Creating test manager...');
      
      const managerData = {
        email: 'test.manager@shipdocs.app',
        firstName: 'Test',
        lastName: 'Manager',
        position: 'Fleet Manager'
      };

      const response = await this.client.post('/api/admin/managers', managerData);
      
      console.log('✅ Manager created successfully:');
      console.log(`   - ID: ${response.data.manager.id}`);
      console.log(`   - Email: ${response.data.manager.email}`);
      console.log(`   - Name: ${response.data.manager.first_name} ${response.data.manager.last_name}`);
      console.log(`   - Position: ${response.data.manager.position}`);
      
      return response.data.manager;
    } catch (error) {
      if (error.response?.status === 409) {
        console.log('ℹ️ Manager already exists, that\'s okay for testing');
        return { email: 'test.manager@shipdocs.app' };
      }
      console.error('❌ Manager creation failed:', error.response?.data || error.message);
      throw error;
    }
  }

  async listManagers() {
    try {
      console.log('\n📋 Listing all managers...');
      const response = await this.client.get('/api/admin/managers');
      
      console.log(`✅ Found ${response.data.managers.length} managers:`);
      response.data.managers.forEach(manager => {
        console.log(`   - ${manager.first_name} ${manager.last_name} (${manager.email}) - ${manager.status}`);
      });
      
      return response.data.managers;
    } catch (error) {
      console.error('❌ Failed to list managers:', error.response?.data || error.message);
      throw error;
    }
  }

  async testManagerLogin(email, password) {
    try {
      console.log(`\n🔑 Testing manager login for ${email}...`);
      
      // Create a new client without auth headers for login test
      const loginClient = axios.create({
        baseURL: BASE_URL,
        timeout: 10000
      });

      const response = await loginClient.post('/api/auth/manager-login', {
        email: email,
        password: password
      });

      console.log('✅ Manager login successful');
      console.log(`   - Token received: ${response.data.token ? 'Yes' : 'No'}`);
      console.log(`   - User role: ${response.data.user?.role}`);
      
      return response.data;
    } catch (error) {
      console.log('ℹ️ Manager login failed (expected if password not set):', error.response?.data?.error || error.message);
      return null;
    }
  }

  async runFullTest() {
    console.log('🧪 Starting Manager Creation End-to-End Test');
    console.log('===========================================');

    try {
      // Step 1: Authenticate as admin
      const authSuccess = await this.authenticateAsAdmin();
      if (!authSuccess) {
        throw new Error('Admin authentication failed');
      }

      // Step 2: List existing managers
      await this.listManagers();

      // Step 3: Create a test manager (this should trigger welcome email)
      const manager = await this.createTestManager();

      // Step 4: List managers again to confirm creation
      await this.listManagers();

      // Step 5: Test manager login (will likely fail since password needs to be set)
      await this.testManagerLogin('test.manager@shipdocs.app', 'defaultpassword');

      console.log('\n🎉 Manager creation workflow test completed successfully!');
      console.log('\n📧 Check the email inbox for test.manager@shipdocs.app to verify welcome email was sent.');
      console.log('📝 The manager should receive an email with login credentials and setup instructions.');

      return { success: true, manager };

    } catch (error) {
      console.error('\n💥 Manager creation workflow test failed:', error.message);
      return { success: false, error: error.message };
    }
  }
}

// Run the test
if (require.main === module) {
  const test = new ManagerCreationTest();
  
  test.runFullTest()
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

module.exports = { ManagerCreationTest };
