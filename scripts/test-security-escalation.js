/**
 * Test Security Event Escalation
 * Process existing high-severity security events and create incidents
 */

const { supabase } = require('../lib/supabase');
const { SecurityEventEscalationService } = require('../lib/services/securityEventEscalationService');

async function testSecurityEscalation() {
  console.log('Testing security event escalation...');
  
  const escalationService = new SecurityEventEscalationService();
  
  try {
    // Get recent high-severity security events
    const { data: securityEvents, error } = await supabase
      .from('security_events')
      .select('*')
      .eq('severity', 'high')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      throw new Error(`Failed to fetch security events: ${error.message}`);
    }

    if (!securityEvents || securityEvents.length === 0) {
      console.log('No high-severity security events found');
      return;
    }

    console.log(`Found ${securityEvents.length} high-severity security events`);

    // Process each event
    for (const event of securityEvents) {
      console.log(`\nProcessing security event: ${event.event_id}`);
      console.log(`- Type: ${event.type}`);
      console.log(`- Severity: ${event.severity}`);
      console.log(`- Threats: ${JSON.stringify(event.threats)}`);
      
      try {
        const result = await escalationService.processSecurityEvent(event);
        
        if (result.escalated) {
          console.log(`✅ Escalated to incident: ${result.incident_id}`);
        } else {
          console.log(`❌ Not escalated: ${result.reason}`);
        }
      } catch (escalationError) {
        console.error(`❌ Error escalating event ${event.event_id}:`, escalationError.message);
      }
    }

    // Check created incidents
    console.log('\n--- Checking created incidents ---');
    const { data: incidents } = await supabase
      .from('incidents')
      .select('incident_id, type, severity, title, source_system, source_event_id, created_at')
      .eq('source_system', 'security_monitor')
      .order('created_at', { ascending: false })
      .limit(10);

    if (incidents && incidents.length > 0) {
      console.log(`Found ${incidents.length} incidents from security monitor:`);
      incidents.forEach(incident => {
        console.log(`- ${incident.incident_id}: ${incident.title} (${incident.severity})`);
      });
    } else {
      console.log('No incidents found from security monitor');
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
if (require.main === module) {
  testSecurityEscalation()
    .then(() => {
      console.log('\nTest completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testSecurityEscalation };
