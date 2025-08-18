#!/usr/bin/env node

/**
 * Test Form Completion
 * 
 * This script tests the form completion functionality by:
 * 1. Submitting form data for test accounts
 * 2. Testing partial and complete submissions
 * 3. Verifying data storage and state preservation
 */

require('dotenv').config();
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const BASE_URL = process.env.BASE_URL || 'https://shipdocs.app';
const API_KEY = process.env.API_KEY;

// Results storage
const TEST_RESULTS = {
  partialSubmissions: [],
  completeSubmissions: [],
  errors: []
};

// Form test data
const FORM_DATA = {
  personalInfo: {
    dateOfBirth: '1990-01-01',
    nationality: 'Dutch',
    passportNumber: 'TEST123456',
    passportExpiry: '2030-01-01'
  },
  contactInfo: {
    phoneNumber: '+31612345678',
    emergencyContactName: 'Emergency Contact',
    emergencyContactPhone: '+31687654321',
    homeAddress: 'Test Street 123, Amsterdam'
  },
  qualifications: {
    certifications: ['Basic Safety Training', 'Medical First Aid'],
    languages: ['English', 'Dutch'],
    specialSkills: 'Firefighting, Navigation'
  },
  healthInfo: {
    medicalCertificateDate: '2024-01-01',
    medicalCertificateExpiry: '2026-01-01',
    allergies: 'None',
    medications: 'None'
  },
  acknowledgements: {
    safetyPoliciesReviewed: true,
    emergencyProceduresUnderstood: true,
    dataPrivacyConsent: true
  }
};

// Partial form data (for testing state preservation)
const PARTIAL_FORM_DATA = {
  personalInfo: {
    dateOfBirth: '1990-01-01',
    nationality: 'Dutch',
    passportNumber: '',
    passportExpiry: ''
  },
  contactInfo: {
    phoneNumber: '+31612345678',
    emergencyContactName: '',
    emergencyContactPhone: '',
    homeAddress: ''
  },
  qualifications: {
    certifications: [],
    languages: [],
    specialSkills: ''
  },
  healthInfo: {
    medicalCertificateDate: '',
    medicalCertificateExpiry: '',
    allergies: '',
    medications: ''
  },
  acknowledgements: {
    safetyPoliciesReviewed: false,
    emergencyProceduresUnderstood: false,
    dataPrivacyConsent: false
  }
};

// Load test accounts
async function loadTestAccounts() {
  try {
    const accountsFile = path.join(__dirname, 'test-accounts.json');
    const data = await fs.readFile(accountsFile, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`❌ Failed to load test accounts: ${error.message}`);
    throw new Error('Test accounts not found. Run create-test-accounts.js first.');
  }
}

// Load authentication results
async function loadAuthResults() {
  try {
    const authFile = path.join(__dirname, 'email-auth-results.json');
    const data = await fs.readFile(authFile, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`❌ Failed to load authentication results: ${error.message}`);
    return { authentication: [] };
  }
}

/**
 * Submit partial form data
 */
async function submitPartialForm(authToken, userId) {
  console.log(`\n🧪 Submitting partial form data for user: ${userId}`);
  
  try {
    // Create a copy of partial form data with user's name
    const formData = JSON.parse(JSON.stringify(PARTIAL_FORM_DATA));
    
    // Submit partial form
    const response = await axios.post(`${BASE_URL}/api/crew/forms/partial`, {
      formType: '05_03a',
      formData: formData,
      userId: userId
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (response.data && response.data.success) {
      console.log(`✅ Partial form submission successful for user: ${userId}`);
      
      const result = {
        userId: userId,
        formId: response.data.formId,
        timestamp: new Date().toISOString(),
        success: true
      };
      
      TEST_RESULTS.partialSubmissions.push(result);
      return result;
    } else {
      throw new Error('Invalid response format');
    }
  } catch (error) {
    console.error(`❌ Partial form submission failed for ${userId}: ${error.message}`);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Data:`, error.response.data);
    }
    
    const result = {
      userId: userId,
      success: false,
      error: error.message,
      response: error.response ? error.response.data : null
    };
    
    TEST_RESULTS.partialSubmissions.push(result);
    TEST_RESULTS.errors.push({
      type: 'partial_submission',
      userId: userId,
      error: error.message,
      response: error.response ? error.response.data : null
    });
    
    return result;
  }
}

/**
 * Submit complete form data
 */
async function submitCompleteForm(authToken, userId, userName) {
  console.log(`\n🧪 Submitting complete form data for user: ${userId}`);
  
  try {
    // Create a copy of form data with user's name
    const formData = JSON.parse(JSON.stringify(FORM_DATA));
    formData.personalInfo.fullName = userName;
    
    // Submit complete form
    const response = await axios.post(`${BASE_URL}/api/crew/forms/complete`, {
      formType: '05_03a',
      formData: formData,
      generatePDF: true
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (response.data && response.data.success) {
      console.log(`✅ Complete form submission successful for user: ${userId}`);
      
      const result = {
        userId: userId,
        formCompletion: response.data.formCompletion,
        pdfGenerated: response.data.formCompletion.pdfGenerated,
        timestamp: new Date().toISOString(),
        success: true
      };
      
      TEST_RESULTS.completeSubmissions.push(result);
      return result;
    } else {
      throw new Error('Invalid response format');
    }
  } catch (error) {
    console.error(`❌ Complete form submission failed for ${userId}: ${error.message}`);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Data:`, error.response.data);
    }
    
    const result = {
      userId: userId,
      success: false,
      error: error.message,
      response: error.response ? error.response.data : null
    };
    
    TEST_RESULTS.completeSubmissions.push(result);
    TEST_RESULTS.errors.push({
      type: 'complete_submission',
      userId: userId,
      error: error.message,
      response: error.response ? error.response.data : null
    });
    
    return result;
  }
}

/**
 * Verify form data storage
 */
async function verifyFormStorage(authToken, userId) {
  console.log(`\n🧪 Verifying form data storage for user: ${userId}`);
  
  try {
    // Get user's form data
    const response = await axios.get(`${BASE_URL}/api/crew/forms/${userId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (response.data && response.data.forms) {
      const form = response.data.forms.find(f => f.form_type === '05_03a');
      
      if (form) {
        console.log(`✅ Form data verified for user: ${userId}`);
        return true;
      } else {
        console.log(`❌ Form data not found for user: ${userId}`);
        return false;
      }
    } else {
      throw new Error('Invalid response format');
    }
  } catch (error) {
    console.error(`❌ Form data verification failed for ${userId}: ${error.message}`);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Data:`, error.response.data);
    }
    
    TEST_RESULTS.errors.push({
      type: 'form_verification',
      userId: userId,
      error: error.message,
      response: error.response ? error.response.data : null
    });
    
    return false;
  }
}

/**
 * Save test results to file
 */
async function saveTestResults() {
  const resultsFile = path.join(__dirname, 'form-completion-results.json');
  await fs.writeFile(resultsFile, JSON.stringify(TEST_RESULTS, null, 2));
  console.log(`\n📝 Test results saved to: ${resultsFile}`);
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Starting Form Completion Tests');
  
  try {
    // Load test accounts
    const testAccounts = await loadTestAccounts();
    console.log(`✅ Loaded ${testAccounts.crew.length} crew accounts`);
    
    // Load authentication results
    const authResults = await loadAuthResults();
    console.log(`✅ Loaded ${authResults.authentication ? authResults.authentication.length : 0} authentication results`);
    
    // Filter successful authentications
    const successfulAuths = authResults.authentication ? 
      authResults.authentication.filter(auth => auth.success) : [];
    
    if (successfulAuths.length === 0) {
      console.error('❌ No successful authentications found. Run test-email-auth.js first.');
      process.exit(1);
    }
    
    // Test partial form submission with first account
    if (successfulAuths.length > 0) {
      const firstAuth = successfulAuths[0];
      await submitPartialForm(firstAuth.token, firstAuth.user.id);
      
      // Wait a bit to simulate user coming back later
      console.log('⏱️ Waiting to simulate user returning later...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Verify form storage
      await verifyFormStorage(firstAuth.token, firstAuth.user.id);
    }
    
    // Test complete form submission with remaining accounts
    for (let i = 0; i < successfulAuths.length; i++) {
      const auth = successfulAuths[i];
      
      // Skip the first account if we already used it for partial submission
      if (i === 0 && TEST_RESULTS.partialSubmissions.length > 0) {
        // Complete the form for the first account
        await submitCompleteForm(auth.token, auth.user.id, `${auth.user.firstName} ${auth.user.lastName}`);
      } else {
        // Submit complete form directly for other accounts
        await submitCompleteForm(auth.token, auth.user.id, `${auth.user.firstName} ${auth.user.lastName}`);
      }
    }
    
    // Save test results
    await saveTestResults();
    
    // Summary
    console.log('\n📊 Form Completion Test Summary:');
    console.log(`✅ Partial form submissions: ${TEST_RESULTS.partialSubmissions.length}`);
    console.log(`✅ Successful partial submissions: ${TEST_RESULTS.partialSubmissions.filter(s => s.success).length}`);
    console.log(`✅ Complete form submissions: ${TEST_RESULTS.completeSubmissions.length}`);
    console.log(`✅ Successful complete submissions: ${TEST_RESULTS.completeSubmissions.filter(s => s.success).length}`);
    console.log(`❌ Errors encountered: ${TEST_RESULTS.errors.length}`);
    
    if (TEST_RESULTS.errors.length > 0) {
      console.log('\n⚠️ Some tests failed. Check the test results file for details.');
      process.exit(1);
    } else {
      console.log('\n🎉 All tests completed successfully!');
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

module.exports = { submitPartialForm, submitCompleteForm, verifyFormStorage };