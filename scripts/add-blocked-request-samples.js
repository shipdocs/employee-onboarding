#!/usr/bin/env node

/**
 * Add Sample Blocked Request Events
 * 
 * This script adds realistic blocked request and rate limiting events
 * to demonstrate the security dashboard blocked requests functionality.
 */

const { supabase } = require('../lib/database-supabase-compat');
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function addBlockedRequestSamples() {
  console.log('Adding sample blocked request events...\n');

  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);

  const blockedEvents = [
    // Rate limiting events
    {
      event_id: `rate_limit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'rate_limit_exceeded',
      severity: 'medium',
      user_id: null,
      ip_address: '203.0.113.45', // TEST-NET-3 IP
      user_agent: 'curl/7.68.0',
      details: {
        endpoint: '/api/auth/admin-login',
        requests_per_minute: 25,
        limit: 10,
        blocked: true,
        time_window: '1 minute'
      },
      threats: ['rate_limit_exceeded', 'brute_force_attempt'],
      created_at: oneHourAgo.toISOString()
    },
    
    // SQL Injection attempt (blocked)
    {
      event_id: `injection_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'injection_attempt',
      severity: 'critical',
      user_id: null,
      ip_address: '198.51.100.42', // TEST-NET-2 IP
      user_agent: 'python-requests/2.25.1',
      details: {
        endpoint: '/api/admin/managers',
        payload: "'; DROP TABLE users; --",
        blocked: true,
        detection_method: 'WAF'
      },
      threats: ['sql_injection', 'malicious_payload'],
      created_at: twoHoursAgo.toISOString()
    },

    // Unauthorized access attempt (blocked)
    {
      event_id: `unauthorized_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'unauthorized_access',
      severity: 'high',
      user_id: null,
      ip_address: '192.0.2.15', // TEST-NET-1 IP
      user_agent: 'Mozilla/5.0 (compatible; SecurityScanner/1.0)',
      details: {
        endpoint: '/api/admin/settings',
        method: 'DELETE',
        blocked: true,
        reason: 'No valid authentication token'
      },
      threats: ['unauthorized_access', 'privilege_escalation'],
      created_at: threeHoursAgo.toISOString()
    },

    // Another rate limit event
    {
      event_id: `rate_limit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'rate_limit_exceeded',
      severity: 'medium',
      user_id: null,
      ip_address: '203.0.113.67',
      user_agent: 'PostmanRuntime/7.28.4',
      details: {
        endpoint: '/api/auth/request-magic-link',
        requests_per_minute: 15,
        limit: 3,
        blocked: true,
        time_window: '5 minutes'
      },
      threats: ['rate_limit_exceeded', 'email_flooding'],
      created_at: new Date(now.getTime() - 30 * 60 * 1000).toISOString() // 30 minutes ago
    }
  ];

  try {
    const { data, error } = await supabase
      .from('security_events')
      .insert(blockedEvents);

    if (error) {
      console.error('Error inserting blocked request events:', error);
      return;
    }

    console.log(`✅ Successfully added ${blockedEvents.length} blocked request events`);
    console.log('\nEvents added:');
    blockedEvents.forEach((event, index) => {
      console.log(`${index + 1}. ${event.type} - ${event.severity} severity`);
      console.log(`   IP: ${event.ip_address}`);
      console.log(`   Details: ${event.details.blocked ? 'BLOCKED' : 'ALLOWED'}`);
      console.log(`   Time: ${event.created_at}`);
      console.log('');
    });

    console.log('🎯 Expected dashboard updates:');
    console.log('- Blocked Requests: Should show 4 (all events have blocked=true or are rate limits)');
    console.log('- Active Threats: Should increase (critical and high severity events)');
    console.log('- Security Score: May decrease due to new threats');
    console.log('\n📋 Next steps:');
    console.log('1. Refresh your security dashboard');
    console.log('2. Check the "Blocked Requests" metric');
    console.log('3. Verify events appear in the security events table');
    console.log('4. Test the "View Details" functionality');

  } catch (error) {
    console.error('Failed to add blocked request events:', error);
  }
}

// Run the script
addBlockedRequestSamples();
