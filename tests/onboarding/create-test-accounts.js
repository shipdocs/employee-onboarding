#!/usr/bin/env node

/**
 * Create Test Accounts
 * 
 * This script creates real test accounts in the shipdocs.app system for testing purposes.
 * It creates both crew and manager accounts with @shipdocs.app domain emails.
 */

require('dotenv').config();
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const BASE_URL = process.env.BASE_URL || 'https://shipdocs.app';
const API_KEY = process.env.API_KEY;
const TEST_EMAIL_DOMAIN = process.env.TEST_EMAIL_DOMAIN || 'shipdocs.app';

// Test account configuration
const TEST_ACCOUNTS = [
  { 
    email: `testuser1@${TEST_EMAIL_DOMAIN}`, 
    firstName: 'Test', 
    lastName: 'User1', 
    position: 'Deck Officer',
    vesselAssignment: 'Test Vessel 1',
    expectedBoardingDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  },
  { 
    email: `testuser2@${TEST_EMAIL_DOMAIN}`, 
    firstName: 'Test', 
    lastName: 'User2', 
    position: 'Engineer',
    vesselAssignment: 'Test Vessel 2',
    expectedBoardingDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
  },
  { 
    email: `testuser3@${TEST_EMAIL_DOMAIN}`, 
    firstName: 'Test', 
    lastName: 'User3', 
    position: 'Captain',
    vesselAssignment: 'Test Vessel 3',
    expectedBoardingDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString()
  },
  { 
    email: `testuser4@${TEST_EMAIL_DOMAIN}`, 
    firstName: 'Test', 
    lastName: 'User4', 
    position: 'Chief Engineer',
    vesselAssignment: 'Test Vessel 4',
    expectedBoardingDate: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString()
  },
  { 
    email: `testuser5@${TEST_EMAIL_DOMAIN}`, 
    firstName: 'Test', 
    lastName: 'User5', 
    position: 'Deck Cadet',
    vesselAssignment: 'Test Vessel 5',
    expectedBoardingDate: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString()
  }
];

const TEST_MANAGER = {
  email: `testmanager@${TEST_EMAIL_DOMAIN}`,
  firstName: 'Test',
  lastName: 'Manager',
  position: 'HR Manager'
};

// API client
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_KEY}`
  }
});

// Results storage
const TEST_RESULTS = {
  manager: null,
  crew: [],
  errors: []
};

/**
 * Create a manager account
 */
async function createManagerAccount() {
  console.log(`\n🧪 Creating manager account: ${TEST_MANAGER.email}`);
  
  try {
    const response = await api.post('/api/admin/managers', {
      email: TEST_MANAGER.email,
      firstName: TEST_MANAGER.firstName,
      lastName: TEST_MANAGER.lastName,
      position: TEST_MANAGER.position
    });
    
    if (response.data && response.data.user) {
      console.log(`✅ Manager account created successfully: ${TEST_MANAGER.email}`);
      TEST_RESULTS.manager = response.data.user;
      return response.data.user;
    } else {
      throw new Error('Invalid response format');
    }
  } catch (error) {
    console.error(`❌ Failed to create manager account: ${error.message}`);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Data:`, error.response.data);
    }
    TEST_RESULTS.errors.push({
      type: 'manager_creation',
      email: TEST_MANAGER.email,
      error: error.message,
      response: error.response ? error.response.data : null
    });
    return null;
  }
}

/**
 * Create a crew account
 */
async function createCrewAccount(account) {
  console.log(`\n🧪 Creating crew account: ${account.email}`);
  
  try {
    const response = await api.post('/api/manager/crew', {
      email: account.email,
      firstName: account.firstName,
      lastName: account.lastName,
      position: account.position,
      vesselAssignment: account.vesselAssignment,
      expectedBoardingDate: account.expectedBoardingDate
    });
    
    if (response.data && response.data.user) {
      console.log(`✅ Crew account created successfully: ${account.email}`);
      TEST_RESULTS.crew.push(response.data.user);
      return response.data.user;
    } else {
      throw new Error('Invalid response format');
    }
  } catch (error) {
    console.error(`❌ Failed to create crew account: ${error.message}`);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Data:`, error.response.data);
    }
    TEST_RESULTS.errors.push({
      type: 'crew_creation',
      email: account.email,
      error: error.message,
      response: error.response ? error.response.data : null
    });
    return null;
  }
}

/**
 * Save test results to file
 */
async function saveTestResults() {
  const resultsFile = path.join(__dirname, 'test-accounts.json');
  await fs.writeFile(resultsFile, JSON.stringify(TEST_RESULTS, null, 2));
  console.log(`\n📝 Test results saved to: ${resultsFile}`);
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Starting Test Account Creation');
  console.log(`📋 Creating accounts with domain: ${TEST_EMAIL_DOMAIN}`);
  console.log(`🔗 API Base URL: ${BASE_URL}`);
  
  try {
    // Create manager account
    const manager = await createManagerAccount();
    
    if (!manager) {
      console.error('❌ Failed to create manager account. Cannot proceed with crew creation.');
      await saveTestResults();
      process.exit(1);
    }
    
    // Create crew accounts
    for (const account of TEST_ACCOUNTS) {
      await createCrewAccount(account);
    }
    
    // Save test results
    await saveTestResults();
    
    // Summary
    console.log('\n📊 Account Creation Summary:');
    console.log(`✅ Manager accounts created: ${TEST_RESULTS.manager ? 1 : 0}`);
    console.log(`✅ Crew accounts created: ${TEST_RESULTS.crew.length}`);
    console.log(`❌ Errors encountered: ${TEST_RESULTS.errors.length}`);
    
    if (TEST_RESULTS.errors.length > 0) {
      console.log('\n⚠️ Some accounts could not be created. Check the test results file for details.');
      process.exit(1);
    } else {
      console.log('\n🎉 All accounts created successfully!');
    }
  } catch (error) {
    console.error(`\n💥 Unexpected error: ${error.message}`);
    TEST_RESULTS.errors.push({
      type: 'unexpected',
      error: error.message,
      stack: error.stack
    });
    await saveTestResults();
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  main();
}

module.exports = { createManagerAccount, createCrewAccount, TEST_ACCOUNTS, TEST_MANAGER };