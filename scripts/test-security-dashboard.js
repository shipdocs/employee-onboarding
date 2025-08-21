const { supabase } = require('../lib/database-supabase-compat');
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function addTestSecurityEvents() {
  console.log('Adding test security events...');
  
  const testEvents = [
    {
      event_id: `evt_test_001_${Date.now()}`,
      type: 'authentication_failure',
      severity: 'high',
      user_id: null,
      ip_address: '192.168.1.100',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      threats: ['brute_force_attempt', 'suspicious_ip'],
      details: {
        email: 'test@example.com',
        reason: 'Invalid password',
        attempts: 5
      }
    },
    {
      event_id: `evt_test_002_${Date.now()}`,
      type: 'unauthorized_access',
      severity: 'critical',
      user_id: null,
      ip_address: '10.0.0.50',
      user_agent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
      threats: ['privilege_escalation'],
      details: {
        resource: '/api/admin/users',
        method: 'DELETE',
        blocked: true
      }
    },
    {
      event_id: `evt_test_003_${Date.now()}`,
      type: 'rate_limit_exceeded',
      severity: 'medium',
      user_id: null,
      ip_address: '172.16.0.25',
      user_agent: 'Python/3.9 requests/2.28.0',
      threats: ['api_abuse'],
      details: {
        endpoint: '/api/auth/login',
        requests_count: 150,
        time_window: '1 minute'
      }
    },
    {
      event_id: `evt_test_004_${Date.now()}`,
      type: 'suspicious_activity',
      severity: 'low',
      user_id: null,
      ip_address: '192.168.1.200',
      user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      threats: ['unusual_pattern'],
      details: {
        activity: 'Multiple login attempts from different locations',
        locations: ['Netherlands', 'Germany', 'France']
      }
    },
    {
      event_id: `evt_test_005_${Date.now()}`,
      type: 'security_configuration_change',
      severity: 'low',
      user_id: null,
      ip_address: '192.168.1.1',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0.4472.124',
      threats: [],
      details: {
        setting: 'password_policy',
        old_value: 'min_length: 8',
        new_value: 'min_length: 12',
        changed_by: 'admin@example.com'
      }
    }
  ];
  
  // Insert test events
  const { data, error } = await supabase
    .from('security_events')
    .insert(testEvents);
    
  if (error) {
    console.error('Error inserting test events:', error);
    return;
  }
  
  console.log('Successfully added', testEvents.length, 'test security events');
  
  // Verify the events were inserted
  const { data: verifyData, error: verifyError } = await supabase
    .from('security_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);
    
  if (verifyError) {
    console.error('Error verifying events:', verifyError);
    return;
  }
  
  console.log('\nCurrent security events in database:');
  console.log('Total events:', verifyData.length);
  verifyData.forEach(event => {
    console.log(`- ${event.type} (${event.severity}) - ${event.created_at}`);
  });
}

// Run the test
addTestSecurityEvents().catch(console.error);