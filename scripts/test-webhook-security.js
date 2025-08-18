#!/usr/bin/env node

/**
 * Test script for webhook security hardening
 * Tests authentication, rate limiting, and error handling
 */

const crypto = require('crypto');

// Test configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const WEBHOOK_URL = `${BASE_URL}/api/incidents/webhook`;
const TEST_SECRET = 'test-webhook-secret-123';

async function testWebhookSecurity() {
  console.log('🔒 Testing Webhook Security Hardening...\n');

  const tests = [
    testUnauthenticatedRequest,
    testInvalidSignature,
    testValidSignature,
    testRateLimit,
    testTimestampValidation,
    testDuplicateIncident
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      console.log(`Running: ${test.name}...`);
      await test();
      console.log(`✅ ${test.name} passed\n`);
      passed++;
    } catch (error) {
      console.log(`❌ ${test.name} failed: ${error.message}\n`);
      failed++;
    }
  }

  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

async function testUnauthenticatedRequest() {
  const payload = {
    event_type: 'incident.triggered',
    incident_id: 'test-incident-1',
    external_reference: 'PD-TEST-UNAUTH',
    source_system: 'pagerduty',
    title: 'Test Unauthenticated Request',
    severity: 'high',
    status: 'triggered'
  };

  const response = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  // Should pass if no secret is configured, or fail with 401 if secret is configured
  if (process.env.PAGERDUTY_WEBHOOK_SECRET) {
    if (response.status !== 401) {
      throw new Error(`Expected 401 for unauthenticated request, got ${response.status}`);
    }
  } else {
    if (!response.ok) {
      throw new Error(`Expected success when no secret configured, got ${response.status}`);
    }
  }
}

async function testInvalidSignature() {
  if (!process.env.PAGERDUTY_WEBHOOK_SECRET) {
    console.log('⏭️  Skipping signature test - no secret configured');
    return;
  }

  const payload = {
    event_type: 'incident.triggered',
    incident_id: 'test-incident-2',
    external_reference: 'PD-TEST-INVALID-SIG',
    source_system: 'pagerduty',
    title: 'Test Invalid Signature',
    severity: 'high',
    status: 'triggered'
  };

  const response = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-PagerDuty-Signature': 'sha256=invalid-signature'
    },
    body: JSON.stringify(payload)
  });

  if (response.status !== 401) {
    throw new Error(`Expected 401 for invalid signature, got ${response.status}`);
  }
}

async function testValidSignature() {
  if (!process.env.PAGERDUTY_WEBHOOK_SECRET) {
    console.log('⏭️  Skipping signature test - no secret configured');
    return;
  }

  const payload = {
    event_type: 'incident.triggered',
    incident_id: 'test-incident-3',
    external_reference: 'PD-TEST-VALID-SIG',
    source_system: 'pagerduty',
    title: 'Test Valid Signature',
    severity: 'high',
    status: 'triggered'
  };

  const payloadString = JSON.stringify(payload);
  const signature = crypto
    .createHmac('sha256', process.env.PAGERDUTY_WEBHOOK_SECRET)
    .update(payloadString)
    .digest('hex');

  const response = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-PagerDuty-Signature': `sha256=${signature}`,
      'X-PagerDuty-Timestamp': Math.floor(Date.now() / 1000).toString()
    },
    body: payloadString
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Expected success for valid signature, got ${response.status}: ${errorText}`);
  }
}

async function testRateLimit() {
  console.log('Testing rate limiting (this may take a moment)...');
  
  const payload = {
    event_type: 'incident.triggered',
    incident_id: 'test-rate-limit',
    external_reference: 'PD-TEST-RATE-LIMIT',
    source_system: 'pagerduty',
    title: 'Test Rate Limit',
    severity: 'low',
    status: 'triggered'
  };

  // Send requests rapidly to trigger rate limit
  const promises = [];
  for (let i = 0; i < 105; i++) { // Exceed the 100 request limit
    promises.push(
      fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          external_reference: `PD-TEST-RATE-LIMIT-${i}`
        })
      })
    );
  }

  const responses = await Promise.all(promises);
  const rateLimitedResponses = responses.filter(r => r.status === 401);
  
  if (rateLimitedResponses.length === 0) {
    throw new Error('Expected some requests to be rate limited');
  }

  console.log(`Rate limited ${rateLimitedResponses.length} out of ${responses.length} requests`);
}

async function testTimestampValidation() {
  if (!process.env.PAGERDUTY_WEBHOOK_SECRET) {
    console.log('⏭️  Skipping timestamp test - no secret configured');
    return;
  }

  const payload = {
    event_type: 'incident.triggered',
    incident_id: 'test-incident-4',
    external_reference: 'PD-TEST-OLD-TIMESTAMP',
    source_system: 'pagerduty',
    title: 'Test Old Timestamp',
    severity: 'high',
    status: 'triggered'
  };

  const payloadString = JSON.stringify(payload);
  const signature = crypto
    .createHmac('sha256', process.env.PAGERDUTY_WEBHOOK_SECRET)
    .update(payloadString)
    .digest('hex');

  // Use timestamp from 10 minutes ago (should be rejected)
  const oldTimestamp = Math.floor((Date.now() - 10 * 60 * 1000) / 1000);

  const response = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-PagerDuty-Signature': `sha256=${signature}`,
      'X-PagerDuty-Timestamp': oldTimestamp.toString()
    },
    body: payloadString
  });

  if (response.status !== 401) {
    throw new Error(`Expected 401 for old timestamp, got ${response.status}`);
  }
}

async function testDuplicateIncident() {
  const payload = {
    event_type: 'incident.triggered',
    incident_id: 'test-incident-5',
    external_reference: 'PD-TEST-DUPLICATE',
    source_system: 'pagerduty',
    title: 'Test Duplicate Incident',
    severity: 'high',
    status: 'triggered'
  };

  // Send the same incident twice
  const response1 = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const response2 = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  // Both should succeed (second one should be silently ignored)
  if (!response1.ok || !response2.ok) {
    throw new Error(`Expected both requests to succeed, got ${response1.status} and ${response2.status}`);
  }
}

// Run tests if called directly
if (require.main === module) {
  testWebhookSecurity().catch(console.error);
}

module.exports = { testWebhookSecurity };
