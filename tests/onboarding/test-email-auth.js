#!/usr/bin/env node

/**
 * Test Email and Authentication
 * 
 * This script tests email delivery and authentication functionality by:
 * 1. Monitoring the catch-all email inbox for @shipdocs.app
 * 2. Extracting magic links from emails
 * 3. Testing authentication with the extracted links
 */

require('dotenv').config();
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { ImapFlow } = require('imapflow');
const simpleParser = require('mailparser').simpleParser;

// Configuration
const BASE_URL = process.env.BASE_URL || 'https://shipdocs.app';
const API_KEY = process.env.API_KEY;
const TEST_EMAIL_DOMAIN = process.env.TEST_EMAIL_DOMAIN || 'shipdocs.app';
const EMAIL_VERIFICATION_ENABLED = process.env.EMAIL_VERIFICATION_ENABLED === 'true';
const EMAIL_VERIFICATION_TIMEOUT = parseInt(process.env.EMAIL_VERIFICATION_TIMEOUT || '60000');

// Email server configuration
const EMAIL_SERVER = process.env.EMAIL_SERVER;
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD;
const EMAIL_PORT = parseInt(process.env.EMAIL_PORT || '993');
const EMAIL_TLS = process.env.EMAIL_TLS !== 'false';

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
  emails: [],
  authentication: [],
  errors: []
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

/**
 * Connect to email server and monitor for new emails
 */
async function monitorEmails(testAccounts, timeout = EMAIL_VERIFICATION_TIMEOUT) {
  if (!EMAIL_VERIFICATION_ENABLED) {
    console.log('⚠️ Email verification is disabled. Skipping email monitoring.');
    return [];
  }
  
  console.log(`\n📧 Monitoring emails for domain: ${TEST_EMAIL_DOMAIN}`);
  console.log(`⏱️ Timeout: ${timeout / 1000} seconds`);
  
  // Create a list of email addresses to monitor
  const emailAddresses = [
    ...testAccounts.crew.map(crew => crew.email),
    testAccounts.manager ? testAccounts.manager.email : null
  ].filter(Boolean);
  
  console.log(`📧 Monitoring ${emailAddresses.length} email addresses:`);
  emailAddresses.forEach(email => console.log(`   - ${email}`));
  
  // Connect to email server
  const client = new ImapFlow({
    host: EMAIL_SERVER,
    port: EMAIL_PORT,
    secure: EMAIL_TLS,
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASSWORD
    }
  });
  
  const emails = [];
  
  try {
    await client.connect();
    console.log('✅ Connected to email server');
    
    // Select inbox
    await client.mailboxOpen('INBOX');
    
    // Set up event listener for new emails
    client.on('exists', async (data) => {
      console.log(`📧 New email detected: ${data.count}`);
      
      // Fetch the new email
      const message = await client.fetchOne(data.count, { source: true });
      const parsed = await simpleParser(message.source);
      
      // Check if the email is for one of our test accounts
      const to = parsed.to.text;
      const testAccount = emailAddresses.find(email => to.includes(email));
      
      if (testAccount) {
        console.log(`📧 Email received for test account: ${testAccount}`);
        
        // Extract magic link if present
        const magicLink = extractMagicLink(parsed.html || parsed.text);
        
        const email = {
          to: testAccount,
          from: parsed.from.text,
          subject: parsed.subject,
          date: parsed.date,
          magicLink: magicLink,
          body: parsed.html || parsed.text
        };
        
        emails.push(email);
        TEST_RESULTS.emails.push(email);
        
        console.log(`✅ Email processed: ${email.subject}`);
        if (magicLink) {
          console.log(`🔗 Magic link extracted: ${magicLink}`);
        }
      }
    });
    
    // Wait for emails
    console.log(`⏱️ Waiting for emails (${timeout / 1000} seconds)...`);
    await new Promise(resolve => setTimeout(resolve, timeout));
    
    // Close connection
    await client.logout();
    console.log('✅ Email monitoring completed');
    
    return emails;
  } catch (error) {
    console.error(`❌ Email monitoring error: ${error.message}`);
    TEST_RESULTS.errors.push({
      type: 'email_monitoring',
      error: error.message,
      stack: error.stack
    });
    
    // Try to close connection
    try {
      await client.logout();
    } catch (e) {
      // Ignore
    }
    
    return emails;
  }
}

/**
 * Extract magic link from email body
 */
function extractMagicLink(body) {
  if (!body) return null;
  
  // Look for magic link pattern
  const magicLinkRegex = new RegExp(`${BASE_URL}[^"'\\s]+token=[^"'\\s]+`, 'i');
  const match = body.match(magicLinkRegex);
  
  return match ? match[0] : null;
}

/**
 * Test authentication with magic links
 */
async function testAuthentication(emails) {
  console.log('\n🔐 Testing authentication with magic links');
  
  const authResults = [];
  
  for (const email of emails) {
    if (!email.magicLink) {
      console.log(`⚠️ No magic link found in email to: ${email.to}`);
      continue;
    }
    
    console.log(`🧪 Testing authentication for: ${email.to}`);
    
    try {
      // Extract token from magic link
      const url = new URL(email.magicLink);
      const token = url.searchParams.get('token');
      
      if (!token) {
        throw new Error('Invalid magic link format');
      }
      
      // Authenticate with token
      const response = await api.post('/api/auth/magic-login', { token });
      
      if (response.data && response.data.token) {
        console.log(`✅ Authentication successful for: ${email.to}`);
        
        const authResult = {
          email: email.to,
          token: response.data.token,
          user: response.data.user,
          success: true
        };
        
        authResults.push(authResult);
        TEST_RESULTS.authentication.push(authResult);
      } else {
        throw new Error('Invalid authentication response');
      }
    } catch (error) {
      console.error(`❌ Authentication failed for ${email.to}: ${error.message}`);
      if (error.response) {
        console.error(`Status: ${error.response.status}`);
        console.error(`Data:`, error.response.data);
      }
      
      const authResult = {
        email: email.to,
        success: false,
        error: error.message,
        response: error.response ? error.response.data : null
      };
      
      authResults.push(authResult);
      TEST_RESULTS.authentication.push(authResult);
      TEST_RESULTS.errors.push({
        type: 'authentication',
        email: email.to,
        error: error.message,
        response: error.response ? error.response.data : null
      });
    }
  }
  
  return authResults;
}

/**
 * Save test results to file
 */
async function saveTestResults() {
  const resultsFile = path.join(__dirname, 'email-auth-results.json');
  await fs.writeFile(resultsFile, JSON.stringify(TEST_RESULTS, null, 2));
  console.log(`\n📝 Test results saved to: ${resultsFile}`);
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Starting Email and Authentication Tests');
  
  try {
    // Load test accounts
    const testAccounts = await loadTestAccounts();
    console.log(`✅ Loaded ${testAccounts.crew.length} crew accounts and ${testAccounts.manager ? 1 : 0} manager account`);
    
    // Monitor emails
    const emails = await monitorEmails(testAccounts);
    console.log(`✅ Received ${emails.length} emails`);
    
    // Test authentication
    if (emails.length > 0) {
      const authResults = await testAuthentication(emails);
      console.log(`✅ Tested authentication for ${authResults.length} accounts`);
    } else {
      console.log('⚠️ No emails received, skipping authentication tests');
    }
    
    // Save test results
    await saveTestResults();
    
    // Summary
    console.log('\n📊 Email and Authentication Test Summary:');
    console.log(`✅ Emails received: ${TEST_RESULTS.emails.length}`);
    console.log(`✅ Authentication tests: ${TEST_RESULTS.authentication.length}`);
    console.log(`✅ Successful authentications: ${TEST_RESULTS.authentication.filter(a => a.success).length}`);
    console.log(`❌ Failed authentications: ${TEST_RESULTS.authentication.filter(a => !a.success).length}`);
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

module.exports = { monitorEmails, testAuthentication, extractMagicLink };