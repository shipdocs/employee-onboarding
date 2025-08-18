#!/usr/bin/env node

/**
 * HSTS Headers Production Test
 * Tests HSTS headers on the production domain
 */

const https = require('https');
const http = require('http');

const PRODUCTION_URL = 'https://onboarding.burando.online';
const TEST_ENDPOINTS = [
  '/',
  '/api/health',
  '/api/auth/login-with-mfa'
];

function testHSTSHeaders(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname,
      method: 'GET',
      headers: {
        'User-Agent': 'HSTS-Test-Script/1.0'
      }
    };

    const req = client.request(options, (res) => {
      const headers = res.headers;
      
      resolve({
        url,
        statusCode: res.statusCode,
        headers: {
          'strict-transport-security': headers['strict-transport-security'],
          'x-frame-options': headers['x-frame-options'],
          'x-content-type-options': headers['x-content-type-options'],
          'referrer-policy': headers['referrer-policy'],
          'content-security-policy': headers['content-security-policy']
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error(`Request timeout for ${url}`));
    });
    
    req.end();
  });
}

function analyzeHSTSHeader(hstsHeader) {
  if (!hstsHeader) {
    return {
      present: false,
      issues: ['HSTS header is missing']
    };
  }

  const issues = [];
  const analysis = {
    present: true,
    header: hstsHeader,
    issues
  };

  // Check max-age
  const maxAgeMatch = hstsHeader.match(/max-age=(\d+)/);
  if (!maxAgeMatch) {
    issues.push('Missing max-age directive');
  } else {
    const maxAge = parseInt(maxAgeMatch[1]);
    analysis.maxAge = maxAge;
    
    if (maxAge < 31536000) { // Less than 1 year
      issues.push(`max-age is too short: ${maxAge} seconds (recommended: 31536000+)`);
    }
  }

  // Check includeSubDomains
  if (!hstsHeader.includes('includeSubDomains')) {
    issues.push('Missing includeSubDomains directive (recommended for security)');
  } else {
    analysis.includeSubDomains = true;
  }

  // Check preload
  if (!hstsHeader.includes('preload')) {
    issues.push('Missing preload directive (recommended for production)');
  } else {
    analysis.preload = true;
  }

  return analysis;
}

async function runTests() {
  console.log('🔒 Testing HSTS Headers on Production');
  console.log('=====================================');
  console.log(`Target: ${PRODUCTION_URL}`);
  console.log('');

  const results = [];
  
  for (const endpoint of TEST_ENDPOINTS) {
    const url = `${PRODUCTION_URL}${endpoint}`;
    
    try {
      console.log(`Testing: ${endpoint}`);
      const result = await testHSTSHeaders(url);
      results.push(result);
      
      const hstsAnalysis = analyzeHSTSHeader(result.headers['strict-transport-security']);
      
      if (hstsAnalysis.present) {
        console.log(`  ✅ HSTS header present: ${hstsAnalysis.header}`);
        
        if (hstsAnalysis.maxAge) {
          console.log(`  📅 Max-age: ${hstsAnalysis.maxAge} seconds (${Math.round(hstsAnalysis.maxAge / 86400)} days)`);
        }
        
        if (hstsAnalysis.includeSubDomains) {
          console.log(`  🌐 includeSubDomains: Yes`);
        }
        
        if (hstsAnalysis.preload) {
          console.log(`  🚀 preload: Yes`);
        }
        
        if (hstsAnalysis.issues.length > 0) {
          console.log(`  ⚠️  Issues:`);
          hstsAnalysis.issues.forEach(issue => {
            console.log(`     - ${issue}`);
          });
        }
      } else {
        console.log(`  ❌ HSTS header missing!`);
        hstsAnalysis.issues.forEach(issue => {
          console.log(`     - ${issue}`);
        });
      }
      
      // Check other security headers
      const otherHeaders = ['x-frame-options', 'x-content-type-options', 'referrer-policy'];
      otherHeaders.forEach(header => {
        if (result.headers[header]) {
          console.log(`  ✅ ${header}: ${result.headers[header]}`);
        } else {
          console.log(`  ❌ ${header}: Missing`);
        }
      });
      
      console.log('');
      
    } catch (error) {
      console.log(`  ❌ Error testing ${endpoint}: ${error.message}`);
      console.log('');
    }
  }

  // Summary
  console.log('Summary');
  console.log('=======');
  
  const hstsResults = results.map(r => analyzeHSTSHeader(r.headers['strict-transport-security']));
  const hstsPresent = hstsResults.filter(r => r.present).length;
  const totalTests = results.length;
  
  console.log(`HSTS Headers: ${hstsPresent}/${totalTests} endpoints`);
  
  if (hstsPresent === totalTests) {
    console.log('🎉 All endpoints have HSTS headers configured!');
  } else {
    console.log('⚠️  Some endpoints are missing HSTS headers');
  }
  
  // Check for common issues
  const allIssues = hstsResults.flatMap(r => r.issues);
  const uniqueIssues = [...new Set(allIssues)];
  
  if (uniqueIssues.length > 0) {
    console.log('\n🔧 Recommendations:');
    uniqueIssues.forEach(issue => {
      console.log(`   - ${issue}`);
    });
  }
}

if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testHSTSHeaders, analyzeHSTSHeader };
