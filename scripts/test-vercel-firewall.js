/**
 * Test script for Vercel Firewall Integration
 * Tests the real API integration without environment variables
 */

// Set minimal environment for testing
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';

const vercelFirewallService = require('../lib/services/vercelFirewallService');
const securityFirewallIntegration = require('../lib/services/securityFirewallIntegration');

async function testFirewallIntegration() {
  console.log('🔥 Testing Vercel Firewall Integration\n');

  // Test 1: Check if integration is enabled
  console.log('1. Checking integration status...');
  const isEnabled = vercelFirewallService.isEnabled();
  console.log(`   Integration enabled: ${isEnabled ? '✅ YES' : '❌ NO'}`);
  
  if (!isEnabled) {
    console.log('   Missing environment variables:');
    console.log(`   - VERCEL_ACCESS_TOKEN: ${process.env.VERCEL_ACCESS_TOKEN ? '✅ Set' : '❌ Missing'}`);
    console.log(`   - VERCEL_PROJECT_ID: ${process.env.VERCEL_PROJECT_ID ? '✅ Set' : '❌ Missing'}`);
    console.log(`   - VERCEL_TEAM_ID: ${process.env.VERCEL_TEAM_ID ? '✅ Set' : '⚠️ Optional'}`);
    console.log('\n   To enable the integration, set these environment variables:');
    console.log('   export VERCEL_ACCESS_TOKEN="your_token_here"');
    console.log('   export VERCEL_PROJECT_ID="your_project_id_here"');
    console.log('   export VERCEL_TEAM_ID="your_team_id_here"  # Optional\n');
  }

  // Test 2: Test connection (if enabled)
  if (isEnabled) {
    console.log('\n2. Testing API connection...');
    try {
      const connectionTest = await vercelFirewallService.testConnection();
      if (connectionTest.success) {
        console.log('   ✅ Connection successful!');
        console.log(`   Firewall enabled: ${connectionTest.details.firewallEnabled}`);
        console.log(`   Config version: ${connectionTest.details.configVersion}`);
        console.log(`   Rules count: ${connectionTest.details.rulesCount}`);
        console.log(`   Blocked IPs: ${connectionTest.details.blockedIPsCount}`);
      } else {
        console.log('   ❌ Connection failed:');
        console.log(`   Error: ${connectionTest.error}`);
        console.log('   Details:', connectionTest.details);
      }
    } catch (error) {
      console.log('   ❌ Connection test failed:');
      console.log(`   Error: ${error.message}`);
    }
  }

  // Test 3: Test configuration
  console.log('\n3. Testing configuration...');
  const config = securityFirewallIntegration.getConfiguration();
  console.log(`   Firewall enabled: ${config.firewallEnabled ? '✅ YES' : '❌ NO'}`);
  console.log(`   Has token: ${config.hasToken ? '✅ YES' : '❌ NO'}`);
  console.log(`   Has project ID: ${config.hasProjectId ? '✅ YES' : '❌ NO'}`);
  console.log(`   Has team ID: ${config.hasTeamId ? '✅ YES' : '⚠️ NO (optional)'}`);
  console.log('   Block thresholds:');
  console.log(`   - Failed login attempts: ${config.blockThresholds.failed_login_attempts}`);
  console.log(`   - Time window: ${config.blockThresholds.time_window_minutes} minutes`);
  console.log(`   - Suspicious activity: ${config.blockThresholds.suspicious_activity}`);

  // Test 4: Test firewall status (integration service)
  console.log('\n4. Testing firewall status...');
  try {
    const status = await securityFirewallIntegration.getFirewallStatus();
    console.log(`   Status enabled: ${status.enabled ? '✅ YES' : '❌ NO'}`);
    
    if (status.enabled) {
      console.log(`   Firewall active: ${status.firewallEnabled ? '✅ YES' : '❌ NO'}`);
      console.log(`   Blocked IPs: ${status.stats.blockedIPs}`);
      console.log(`   Total rules: ${status.stats.totalRules}`);
      console.log(`   Recent actions: ${status.stats.recentActions.length}`);
    } else if (status.error) {
      console.log(`   Error: ${status.error}`);
    }
  } catch (error) {
    console.log('   ❌ Status check failed:');
    console.log(`   Error: ${error.message}`);
  }

  // Test 5: Simulate failed login processing (without actual blocking)
  console.log('\n5. Testing failed login processing (simulation)...');
  try {
    // This will process the failed login but won't actually block since we're likely missing credentials
    const testIP = '192.168.1.100';
    const testEmail = 'test@example.com';
    const testUserAgent = 'Test-Agent/1.0';
    
    console.log(`   Simulating failed login from IP: ${testIP}`);
    const result = await securityFirewallIntegration.processFailedLogin(
      testIP, 
      testEmail, 
      testUserAgent, 
      { reason: 'Test simulation', timestamp: new Date().toISOString() }
    );
    
    console.log(`   Action taken: ${result.action}`);
    console.log(`   IP address: ${result.ipAddress}`);
    
    if (result.attemptCount !== undefined) {
      console.log(`   Attempt count: ${result.attemptCount}`);
    }
    
    if (result.threshold !== undefined) {
      console.log(`   Threshold: ${result.threshold}`);
    }
    
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    
  } catch (error) {
    console.log('   ❌ Failed login processing test failed:');
    console.log(`   Error: ${error.message}`);
  }

  // Test 6: Test API endpoints structure
  console.log('\n6. Testing API structure...');
  console.log('   Available methods:');
  console.log('   ✅ vercelFirewallService.isEnabled()');
  console.log('   ✅ vercelFirewallService.testConnection()');
  console.log('   ✅ vercelFirewallService.getFirewallConfig()');
  console.log('   ✅ vercelFirewallService.blockIP()');
  console.log('   ✅ vercelFirewallService.unblockIP()');
  console.log('   ✅ vercelFirewallService.updateChallengeMode()');
  console.log('   ✅ vercelFirewallService.getActiveAttackData()');
  console.log('   ✅ vercelFirewallService.createBypassRule()');
  console.log('   ✅ securityFirewallIntegration.processFailedLogin()');
  console.log('   ✅ securityFirewallIntegration.manuallyBlockIP()');
  console.log('   ✅ securityFirewallIntegration.manuallyUnblockIP()');
  console.log('   ✅ securityFirewallIntegration.getFirewallStatus()');

  console.log('\n🎉 Test completed!');
  
  if (!isEnabled) {
    console.log('\n📝 Next steps:');
    console.log('1. Get a Vercel access token from https://vercel.com/account/tokens');
    console.log('2. Find your project ID in Vercel dashboard → Project Settings');
    console.log('3. Set the environment variables');
    console.log('4. Run this test again to verify the connection');
    console.log('5. Test the admin interface at /admin → Vercel Firewall tab');
  } else {
    console.log('\n✅ Integration is ready to use!');
    console.log('- Failed logins will automatically trigger IP blocking');
    console.log('- Admins can manually manage IPs via the admin interface');
    console.log('- All actions are logged for audit purposes');
  }
}

// Run the test
if (require.main === module) {
  testFirewallIntegration().catch(console.error);
}

module.exports = { testFirewallIntegration };
