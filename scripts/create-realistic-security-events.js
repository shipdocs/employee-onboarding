const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// More realistic IP addresses from various sources
const REALISTIC_IPS = [
  '45.134.140.62',     // Netherlands
  '185.220.101.34',    // Germany (TOR exit node)
  '162.142.125.193',   // USA (Censys scanner)
  '89.248.165.50',     // Russia
  '167.94.138.41',     // USA (Shodan scanner)
  '218.92.0.107',      // China
  '51.75.64.23',       // France (OVH)
  '193.169.255.78',    // UK
  '5.188.62.214',      // Russia (known botnet)
  '141.98.10.125'      // Germany (Hetzner)
];

async function createRealisticSecurityEvents() {
  console.log('Creating realistic security events...');
  
  // First, get some real user IDs
  const { data: users } = await supabase
    .from('profiles')
    .select('id, email')
    .in('role', ['admin', 'manager'])
    .limit(5);
  
  const userIds = users ? users.map(u => u.id) : [];
  console.log('Found', userIds.length, 'users for realistic events');
  
  const now = new Date();
  const events = [];
  
  // 1. Failed login attempts (brute force pattern)
  for (let i = 0; i < 5; i++) {
    const timestamp = new Date(now.getTime() - (i * 2 * 60 * 1000)); // 2 minutes apart
    events.push({
      event_id: `evt_realistic_001_${i}_${Date.now()}`,
      type: 'authentication_failure',
      severity: i > 2 ? 'high' : 'medium', // Escalate after 3 attempts
      user_id: null,
      ip_address: REALISTIC_IPS[1], // Same IP for brute force
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      threats: i > 2 ? ['brute_force_attempt', 'repeated_failures'] : ['authentication_failure'],
      details: {
        email: 'admin@shipdocs.app',
        reason: 'Invalid password',
        attempt_number: i + 1,
        country: 'Germany',
        city: 'Frankfurt'
      },
      created_at: timestamp.toISOString()
    });
  }
  
  // 2. Successful admin action (should have user)
  if (userIds.length > 0) {
    events.push({
      event_id: `evt_realistic_002_${Date.now()}`,
      type: 'security_configuration_change',
      severity: 'info',
      user_id: userIds[0],
      ip_address: '84.241.45.78', // Netherlands corporate IP
      user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      threats: [],
      details: {
        action: 'Updated password policy',
        setting: 'minimum_password_length',
        old_value: 8,
        new_value: 12,
        country: 'Netherlands',
        city: 'Amsterdam',
        organization: 'KPN B.V.'
      },
      created_at: new Date(now.getTime() - (30 * 60 * 1000)).toISOString()
    });
  }
  
  // 3. SQL injection attempt
  events.push({
    event_id: `evt_realistic_003_${Date.now()}`,
    type: 'injection_attempt',
    severity: 'critical',
    user_id: null,
    ip_address: REALISTIC_IPS[4], // Shodan scanner
    user_agent: 'sqlmap/1.5.2#stable (http://sqlmap.org)',
    threats: ['sql_injection', 'automated_attack', 'known_scanner'],
    details: {
      endpoint: '/api/crew/profile',
      payload: "' OR '1'='1' --",
      method: 'GET',
      blocked: true,
      country: 'USA',
      scanner_type: 'Shodan'
    },
    created_at: new Date(now.getTime() - (2 * 60 * 60 * 1000)).toISOString()
  });
  
  // 4. Rate limit from API abuse
  events.push({
    event_id: `evt_realistic_004_${Date.now()}`,
    type: 'rate_limit_exceeded',
    severity: 'medium',
    user_id: null,
    ip_address: REALISTIC_IPS[5], // China
    user_agent: 'python-requests/2.28.0',
    threats: ['api_abuse', 'automated_scraping'],
    details: {
      endpoint: '/api/public/vessels',
      requests_in_window: 500,
      window_minutes: 5,
      country: 'China',
      city: 'Beijing',
      asn: 'AS4134 Chinanet'
    },
    created_at: new Date(now.getTime() - (3 * 60 * 60 * 1000)).toISOString()
  });
  
  // 5. Suspicious geographic anomaly
  if (userIds.length > 1) {
    events.push({
      event_id: `evt_realistic_005_${Date.now()}`,
      type: 'suspicious_activity',
      severity: 'high',
      user_id: userIds[1],
      ip_address: REALISTIC_IPS[8], // Russia
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0.4472.124',
      threats: ['geographic_anomaly', 'impossible_travel'],
      details: {
        reason: 'Login from unusual location',
        previous_location: 'Netherlands',
        current_location: 'Russia',
        time_between_logins: '15 minutes',
        distance: '2100 km',
        vpn_detected: true
      },
      created_at: new Date(now.getTime() - (4 * 60 * 60 * 1000)).toISOString()
    });
  }
  
  // 6. Port scanning attempt
  events.push({
    event_id: `evt_realistic_006_${Date.now()}`,
    type: 'reconnaissance',
    severity: 'medium',
    user_id: null,
    ip_address: REALISTIC_IPS[2], // Censys scanner
    user_agent: 'Mozilla/5.0 (compatible; CensysInspect/1.1)',
    threats: ['port_scanning', 'automated_reconnaissance'],
    details: {
      scan_type: 'TCP SYN',
      ports_scanned: [22, 80, 443, 3306, 5432, 8080],
      scanner: 'Censys',
      country: 'USA',
      organization: 'Censys, Inc.'
    },
    created_at: new Date(now.getTime() - (6 * 60 * 60 * 1000)).toISOString()
  });
  
  // Insert events with proper timestamps
  for (const event of events) {
    const { created_at, ...eventData } = event;
    const { error } = await supabase
      .from('security_events')
      .insert({ ...eventData, created_at });
    
    if (error) {
      console.error('Error inserting event:', error);
    }
  }
  
  console.log('Successfully created', events.length, 'realistic security events');
  
  // Show summary
  console.log('\nEvent Summary:');
  console.log('- Brute force attack from Germany (5 attempts)');
  console.log('- Security configuration change by admin');
  console.log('- SQL injection attempt from Shodan scanner');
  console.log('- API rate limiting from China');
  console.log('- Geographic anomaly detection');
  console.log('- Port scanning from Censys');
}

// Run the script
createRealisticSecurityEvents().catch(console.error);