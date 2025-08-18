#!/usr/bin/env node

/**
 * Generate a test JWT token for API testing
 */

const jwt = require('jsonwebtoken');
require('dotenv').config();

// Test manager user data
const testUser = {
  id: 84, // Martin's user ID from the database
  email: 'martin.splinter@burando.eu',
  role: 'manager',
  first_name: 'Martin',
  last_name: 'Splinter'
};

// Generate JWT token
function generateTestToken(user) {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    firstName: user.first_name,
    lastName: user.last_name
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '24h',
    issuer: 'crew-onboarding-app'
  });
}

// Generate and display the token
const token = generateTestToken(testUser);
console.log('Generated test JWT token:');
console.log(token);
console.log('\nUse this token in API requests:');
console.log(`Authorization: Bearer ${token}`);
console.log('\nExample curl command:');
console.log(`curl -X GET "http://localhost:3001/api/manager/certificates" -H "Authorization: Bearer ${token}" -H "Content-Type: application/json"`);
