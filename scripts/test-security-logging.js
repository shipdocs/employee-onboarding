#!/usr/bin/env node

/**
 * Test Script for Comprehensive Security Logging
 * 
 * This script tests all new security event types added to the system:
 * - Password change events
 * - MFA setup events
 * - Authorization failures
 * - Admin operations
 * - File upload security events
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ANSI color codes for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

async function addTestSecurityEvents() {
  console.log(`${colors.cyan}${colors.bright}🔒 Adding Test Security Events for New Logging Features${colors.reset}\n`);

  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);

  const testEvents = [
    // Password Change Events
    {
      event_id: `pwd_change_${Date.now()}_test1`,
      type: 'password_change_success',
      severity: 'low',
      user_id: 'manager_001',
      ip_address: '192.168.1.100',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      details: {
        email: 'manager@company.com',
        success: true,
        reason: null,
        timestamp: oneHourAgo.toISOString()
      },
      threats: [],
      created_at: oneHourAgo.toISOString()
    },
    {
      event_id: `pwd_change_${Date.now()}_test2`,
      type: 'password_change_failure',
      severity: 'medium',
      user_id: 'manager_002',
      ip_address: '10.0.0.50',
      user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      details: {
        email: 'john.doe@company.com',
        success: false,
        reason: 'incorrect_current_password',
        timestamp: twoHoursAgo.toISOString()
      },
      threats: ['account_security_breach_attempt'],
      created_at: twoHoursAgo.toISOString()
    },

    // MFA Setup Events
    {
      event_id: `mfa_${Date.now()}_test1`,
      type: 'mfa_setup_success',
      severity: 'low',
      user_id: 'admin_001',
      ip_address: '172.16.0.100',
      user_agent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
      details: {
        email: 'admin@company.com',
        success: true,
        reason: null,
        timestamp: oneHourAgo.toISOString()
      },
      threats: [],
      created_at: oneHourAgo.toISOString()
    },
    {
      event_id: `mfa_${Date.now()}_test2`,
      type: 'mfa_setup_failure',
      severity: 'medium',
      user_id: 'manager_003',
      ip_address: '192.168.100.25',
      user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X)',
      details: {
        email: 'sarah.smith@company.com',
        success: false,
        reason: 'invalid_verification_token',
        timestamp: threeHoursAgo.toISOString()
      },
      threats: ['mfa_bypass_attempt'],
      created_at: threeHoursAgo.toISOString()
    },

    // Authorization Failure Events
    {
      event_id: `auth_fail_${Date.now()}_test1`,
      type: 'authorization_failure',
      severity: 'medium',
      user_id: 'crew_001',
      ip_address: '192.168.1.150',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0.4472.124',
      details: {
        endpoint: '/api/admin/users',
        method: 'GET',
        required_role: 'admin',
        actual_role: 'crew',
        timestamp: oneHourAgo.toISOString()
      },
      threats: ['privilege_escalation_attempt'],
      created_at: oneHourAgo.toISOString()
    },
    {
      event_id: `auth_fail_${Date.now()}_test2`,
      type: 'authorization_failure',
      severity: 'medium',
      user_id: null,
      ip_address: '203.0.113.77',
      user_agent: 'Python/3.9 requests/2.26.0',
      details: {
        endpoint: '/api/manager/crew',
        method: 'POST',
        required_role: 'authenticated',
        actual_role: 'unauthenticated',
        timestamp: twoHoursAgo.toISOString()
      },
      threats: ['privilege_escalation_attempt'],
      created_at: twoHoursAgo.toISOString()
    },

    // Admin Operation Events
    {
      event_id: `admin_op_${Date.now()}_test1`,
      type: 'admin_operation',
      severity: 'low',
      user_id: 'admin_001',
      ip_address: '10.0.0.10',
      user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15',
      details: {
        email: 'admin@company.com',
        operation: 'create_manager',
        target_id: 'manager_new_001',
        details: {
          manager_email: 'newmanager@company.com',
          manager_name: 'John Newmanager',
          permissions_granted: ['view_crew_list', 'manage_crew_members']
        },
        timestamp: oneHourAgo.toISOString()
      },
      threats: [],
      created_at: oneHourAgo.toISOString()
    },

    // File Upload Events
    {
      event_id: `file_upload_${Date.now()}_test1`,
      type: 'file_upload_success',
      severity: 'low',
      user_id: 'admin_001',
      ip_address: '192.168.1.10',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Edge/91.0.864.59',
      details: {
        email: 'admin@company.com',
        file_name: 'training-document.pdf',
        file_size: 2048576,
        success: true,
        reason: 'successful_upload',
        timestamp: twoHoursAgo.toISOString()
      },
      threats: [],
      created_at: twoHoursAgo.toISOString()
    },
    {
      event_id: `file_upload_${Date.now()}_test2`,
      type: 'file_upload_rejected',
      severity: 'medium',
      user_id: 'manager_002',
      ip_address: '192.168.2.50',
      user_agent: 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:89.0) Firefox/89.0',
      details: {
        email: 'john.doe@company.com',
        file_name: 'suspicious.exe',
        file_size: 5242880,
        success: false,
        reason: 'invalid_file_type',
        timestamp: threeHoursAgo.toISOString()
      },
      threats: ['malicious_file_upload_attempt'],
      created_at: threeHoursAgo.toISOString()
    },
    {
      event_id: `file_upload_${Date.now()}_test3`,
      type: 'file_upload_rejected',
      severity: 'medium',
      user_id: 'crew_001',
      ip_address: '10.0.0.200',
      user_agent: 'Mozilla/5.0 (iPad; CPU OS 14_7_1 like Mac OS X) Safari/604.1',
      details: {
        email: 'crew@company.com',
        file_name: 'large-file.jpg',
        file_size: 15728640,
        success: false,
        reason: 'insufficient_permissions',
        timestamp: oneHourAgo.toISOString()
      },
      threats: ['malicious_file_upload_attempt'],
      created_at: oneHourAgo.toISOString()
    },

    // Suspicious Activity Event
    {
      event_id: `suspicious_${Date.now()}_test1`,
      type: 'suspicious_activity_detected',
      severity: 'high',
      user_id: 'unknown_001',
      ip_address: '185.220.101.45', // Known Tor exit node
      user_agent: 'curl/7.64.0',
      details: {
        activity_type: 'multiple_role_escalation_attempts',
        details: {
          attempts: 15,
          endpoints_targeted: ['/api/admin/users', '/api/admin/security', '/api/admin/settings'],
          time_window_minutes: 5
        },
        timestamp: oneHourAgo.toISOString()
      },
      threats: ['suspicious_behavior', 'multiple_role_escalation_attempts'],
      created_at: oneHourAgo.toISOString()
    }
  ];

  // Insert all test events
  let successCount = 0;
  let errorCount = 0;

  for (const event of testEvents) {
    const { error } = await supabase
      .from('security_events')
      .insert(event);

    if (error) {
      console.error(`${colors.red}❌ Failed to insert ${event.type}:${colors.reset}`, error.message);
      errorCount++;
    } else {
      console.log(`${colors.green}✓${colors.reset} Added ${colors.yellow}${event.type}${colors.reset} event`);
      successCount++;
    }
  }

  console.log(`\n${colors.cyan}📊 Summary:${colors.reset}`);
  console.log(`${colors.green}✓ Successfully added: ${successCount} events${colors.reset}`);
  if (errorCount > 0) {
    console.log(`${colors.red}✗ Failed: ${errorCount} events${colors.reset}`);
  }

  // Verify events in database
  console.log(`\n${colors.cyan}🔍 Verifying New Event Types in Database:${colors.reset}`);

  const eventTypes = [
    'password_change_success',
    'password_change_failure',
    'mfa_setup_success',
    'mfa_setup_failure',
    'authorization_failure',
    'admin_operation',
    'file_upload_success',
    'file_upload_rejected',
    'suspicious_activity_detected'
  ];

  for (const eventType of eventTypes) {
    const { data, error } = await supabase
      .from('security_events')
      .select('count')
      .eq('type', eventType)
      .limit(1);

    if (!error && data && data.length > 0) {
      console.log(`${colors.green}✓${colors.reset} ${colors.magenta}${eventType}${colors.reset} events exist in database`);
    } else {
      console.log(`${colors.yellow}⚠${colors.reset} No ${eventType} events found`);
    }
  }

  console.log(`\n${colors.green}${colors.bright}✅ Security event testing complete!${colors.reset}`);
  console.log(`${colors.cyan}Check your security dashboard to see the new events.${colors.reset}\n`);
}

// Run the script
addTestSecurityEvents()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(`${colors.red}Error:${colors.reset}`, error);
    process.exit(1);
  });