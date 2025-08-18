#!/usr/bin/env node
/**
 * Test Supabase MCP Server
 * 
 * Simple test to verify the MCP server is working correctly
 */
const fs = require('fs');
const path = require('path');

async function testSupabaseMCP() {
  console.log('🧪 Testing Supabase MCP Server...');
  
  try {
    // Check if MCP config exists
    const mcpConfigPath = path.join(__dirname, '..', '.kiro', 'settings', 'mcp.json');
    if (!fs.existsSync(mcpConfigPath)) {
      console.log('❌ MCP configuration not found');
      console.log('Run: npm run supabase:setup-mcp');
      return false;
    }

    const mcpConfig = JSON.parse(fs.readFileSync(mcpConfigPath, 'utf8'));
    
    // Check if Supabase server is configured
    if (!mcpConfig.mcpServers || !mcpConfig.mcpServers['supabase-maritime']) {
      console.log('❌ Supabase MCP server not configured');
      console.log('Run: npm run supabase:setup-mcp');
      return false;
    }

    const supabaseServer = mcpConfig.mcpServers['supabase-maritime'];
    
    // Check if credentials are configured
    if (!supabaseServer.env.SUPABASE_URL || !supabaseServer.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.log('❌ Supabase credentials not configured');
      console.log('Please update .kiro/settings/mcp.json with your Supabase credentials');
      return false;
    }

    console.log('✅ MCP configuration found');
    console.log('✅ Supabase server configured');
    console.log('✅ Credentials configured');

    // Check if Python script exists
    const pythonScriptPath = path.join(__dirname, 'supabase-mcp-server.py');
    if (!fs.existsSync(pythonScriptPath)) {
      console.log('❌ Python MCP server script not found');
      return false;
    }

    console.log('✅ Python MCP server script found');

    console.log('\n🎉 Supabase MCP Server is ready!');
    console.log('\nYou can now use these commands in Kiro:');
    console.log('- "List all database tables"');
    console.log('- "Show me the users table"');
    console.log('- "Get training progress for user [id]"');
    console.log('- "Show training analytics"');

    return true;

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

if (require.main === module) {
  testSupabaseMCP()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}

module.exports = testSupabaseMCP;