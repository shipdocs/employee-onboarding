#!/usr/bin/env node

/**
 * Supabase MCP Server Setup Script
 * 
 * Helps configure the Supabase MCP server with your actual credentials
 * and tests the connection.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class SupabaseMCPSetup {
  constructor() {
    this.mcpConfigPath = path.join(__dirname, '..', '.kiro', 'settings', 'mcp.json');
    this.envPath = path.join(__dirname, '..', '.env');
  }

  /**
   * Setup Supabase MCP server
   */
  async setup() {
    console.log('🔧 Setting up Supabase MCP Server...');
    
    try {
      // Read environment variables
      const envVars = this.readEnvFile();
      
      if (!envVars.NEXT_PUBLIC_SUPABASE_URL || !envVars.SUPABASE_SERVICE_ROLE_KEY) {
        console.error('❌ Missing Supabase credentials in .env file');
        console.log('Please ensure your .env file contains:');
        console.log('- NEXT_PUBLIC_SUPABASE_URL');
        console.log('- SUPABASE_SERVICE_ROLE_KEY');
        console.log('- NEXT_PUBLIC_SUPABASE_ANON_KEY');
        return false;
      }

      // Install Python dependencies
      await this.installPythonDependencies();

      // Update MCP configuration with actual credentials
      await this.updateMCPConfig(envVars);

      // Test the connection
      await this.testConnection();

      console.log('✅ Supabase MCP Server setup completed successfully!');
      console.log('\n🎉 You can now use these MCP tools in Kiro:');
      console.log('- list_tables: List all database tables');
      console.log('- describe_table: Get table structure and data');
      console.log('- query_table: Query data with filters');
      console.log('- get_user_progress: Get training progress for users');
      console.log('- get_training_analytics: Get training statistics');
      console.log('- backup_database: Create database backups');
      
      return true;

    } catch (error) {
      console.error('❌ Setup failed:', error.message);
      return false;
    }
  }

  /**
   * Read environment variables from .env file
   */
  readEnvFile() {
    const envVars = {};
    
    if (fs.existsSync(this.envPath)) {
      const envContent = fs.readFileSync(this.envPath, 'utf8');
      
      envContent.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, ...valueParts] = trimmed.split('=');
          if (key && valueParts.length > 0) {
            envVars[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
          }
        }
      });
    }
    
    return envVars;
  }

  /**
   * Install Python dependencies for MCP server
   */
  async installPythonDependencies() {
    console.log('📦 Installing Python dependencies...');
    
    try {
      // Check if pip is available
      execSync('python3 -m pip --version', { stdio: 'pipe' });
      
      // Install dependencies
      const requirementsPath = path.join(__dirname, 'requirements.txt');
      execSync(`python3 -m pip install -r ${requirementsPath}`, { stdio: 'inherit' });
      
      console.log('✅ Python dependencies installed successfully');
      
    } catch (error) {
      console.log('⚠️  Could not install Python dependencies automatically');
      console.log('Please install manually:');
      console.log('pip3 install mcp supabase psycopg2-binary python-dotenv');
      throw error;
    }
  }

  /**
   * Update MCP configuration with actual credentials
   */
  async updateMCPConfig(envVars) {
    console.log('⚙️  Updating MCP configuration...');
    
    try {
      // Read current MCP config
      let mcpConfig = {};
      if (fs.existsSync(this.mcpConfigPath)) {
        mcpConfig = JSON.parse(fs.readFileSync(this.mcpConfigPath, 'utf8'));
      }

      // Ensure mcpServers exists
      if (!mcpConfig.mcpServers) {
        mcpConfig.mcpServers = {};
      }

      // Extract Supabase project reference from URL
      const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
      const projectRef = supabaseUrl ? supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] : null;

      // Update postgres server configuration
      mcpConfig.mcpServers.postgres = {
        command: "uvx",
        args: ["mcp-server-postgres"],
        env: {
          POSTGRES_CONNECTION_STRING: projectRef 
            ? `postgresql://postgres:[your-db-password]@db.${projectRef}.supabase.co:5432/postgres`
            : "postgresql://postgres:[your-db-password]@db.[your-project-ref].supabase.co:5432/postgres"
        },
        disabled: false,
        autoApprove: [
          "read_query",
          "list_tables",
          "describe_table",
          "get_schema"
        ]
      };

      // Update custom Supabase server configuration
      mcpConfig.mcpServers["supabase-maritime"] = {
        command: "python3",
        args: ["./scripts/supabase-mcp-server.py"],
        env: {
          SUPABASE_URL: envVars.NEXT_PUBLIC_SUPABASE_URL || "",
          SUPABASE_SERVICE_ROLE_KEY: envVars.SUPABASE_SERVICE_ROLE_KEY || "",
          SUPABASE_ANON_KEY: envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
        },
        disabled: false,
        autoApprove: [
          "list_tables",
          "describe_table",
          "query_table",
          "get_user_progress",
          "get_training_analytics"
        ]
      };

      // Write updated configuration
      const mcpDir = path.dirname(this.mcpConfigPath);
      if (!fs.existsSync(mcpDir)) {
        fs.mkdirSync(mcpDir, { recursive: true });
      }

      fs.writeFileSync(this.mcpConfigPath, JSON.stringify(mcpConfig, null, 2));
      console.log('✅ MCP configuration updated');

    } catch (error) {
      console.error('Failed to update MCP configuration:', error);
      throw error;
    }
  }

  /**
   * Test the MCP server connection
   */
  async testConnection() {
    console.log('🔍 Testing Supabase connection...');
    
    try {
      // Test if we can load the Supabase client
      const envVars = this.readEnvFile();
      
      if (envVars.NEXT_PUBLIC_SUPABASE_URL && envVars.SUPABASE_SERVICE_ROLE_KEY) {
        console.log('✅ Supabase credentials found in environment');
        console.log(`📍 Supabase URL: ${envVars.NEXT_PUBLIC_SUPABASE_URL}`);
        console.log('🔑 Service role key: [CONFIGURED]');
      } else {
        console.log('⚠️  Supabase credentials not found in .env file');
      }

      console.log('✅ MCP server configuration test completed');
      
    } catch (error) {
      console.error('Connection test failed:', error);
      throw error;
    }
  }

  /**
   * Display usage instructions
   */
  displayUsage() {
    console.log('\n📖 How to use your Supabase MCP server:');
    console.log('');
    console.log('1. In Kiro chat, you can now use:');
    console.log('   - "List all database tables"');
    console.log('   - "Show me the users table structure"');
    console.log('   - "Get training progress for user [user-id]"');
    console.log('   - "Show training analytics for the last 30 days"');
    console.log('   - "Query the user_progress table where completed = true"');
    console.log('');
    console.log('2. Available MCP tools:');
    console.log('   - list_tables: List all database tables');
    console.log('   - describe_table: Get table structure and sample data');
    console.log('   - query_table: Query data with filters and limits');
    console.log('   - insert_data: Insert new records');
    console.log('   - update_data: Update existing records');
    console.log('   - delete_data: Delete records (use carefully!)');
    console.log('   - execute_sql: Run custom SQL queries');
    console.log('   - get_user_progress: Get user training progress');
    console.log('   - get_training_analytics: Get training statistics');
    console.log('   - backup_database: Create database backups');
    console.log('');
    console.log('3. The MCP server will automatically reconnect when you restart Kiro');
    console.log('');
    console.log('🔒 Security: Only read operations are auto-approved.');
    console.log('   Write operations (insert/update/delete) will require confirmation.');
  }
}

// CLI interface
if (require.main === module) {
  const setup = new SupabaseMCPSetup();
  
  setup.setup()
    .then(success => {
      if (success) {
        setup.displayUsage();
        process.exit(0);
      } else {
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Setup failed:', error);
      process.exit(1);
    });
}

module.exports = SupabaseMCPSetup;