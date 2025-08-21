const fetch = require('node-fetch');
require('dotenv').config();

const API_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function testSecurityAPIs() {
  console.log('Testing Security APIs...\n');
  
  // First, we need to login as admin to get a token
  console.log('1. Logging in as admin...');
  
  const loginResponse = await fetch(`${API_URL}/api/auth/admin-login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: 'adminmartexx@shipdocs.app',
      password: 'Admin123!@#'  // You may need to update this password
    })
  });
  
  if (!loginResponse.ok) {
    console.error('Login failed:', await loginResponse.text());
    console.log('\nPlease ensure you have an admin account created.');
    console.log('Run: npm run setup:admin');
    return;
  }
  
  const { token } = await loginResponse.json();
  console.log('✓ Login successful, got token\n');
  
  // Test security events endpoint
  console.log('2. Testing /api/admin/security/events...');
  
  const eventsResponse = await fetch(`${API_URL}/api/admin/security/events?timeRange=30d`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!eventsResponse.ok) {
    console.error('Events API failed:', eventsResponse.status, await eventsResponse.text());
  } else {
    const eventsData = await eventsResponse.json();
    console.log('✓ Events API Response:', {
      status: eventsResponse.status,
      eventsCount: eventsData.events?.length || 0,
      timeRange: eventsData.timeRange
    });
    
    if (eventsData.events?.length > 0) {
      console.log('\nSample events:');
      eventsData.events.slice(0, 3).forEach(event => {
        console.log(`  - ${event.type} (${event.severity}) at ${event.timestamp}`);
      });
    }
  }
  
  console.log('\n3. Testing /api/admin/security/metrics...');
  
  const metricsResponse = await fetch(`${API_URL}/api/admin/security/metrics?timeRange=30d`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!metricsResponse.ok) {
    console.error('Metrics API failed:', metricsResponse.status, await metricsResponse.text());
  } else {
    const metricsData = await metricsResponse.json();
    console.log('✓ Metrics API Response:', {
      status: metricsResponse.status,
      activeThreats: metricsData.activeThreats,
      authenticationEvents: metricsData.authenticationEvents,
      failedLogins: metricsData.failedLogins,
      criticalEvents: metricsData.criticalEvents,
      securityScore: metricsData.securityScore
    });
  }
  
  console.log('\n✅ API testing complete!');
}

testSecurityAPIs().catch(console.error);