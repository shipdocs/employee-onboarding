// scripts/setup-manager-password.js - Set up proper manager authentication
require('dotenv').config();
const bcrypt = require('bcrypt');
const { supabase } = require('../lib/database-supabase-compat');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase environment variables');
  console.log('Make sure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function setupManagerPassword() {
  try {
    console.log('🔐 Setting up manager authentication...');
    
    // Get password from environment variable
    const defaultPassword = process.env.MANAGER_PASSWORD;
    
    if (!defaultPassword) {
      console.error('MANAGER_PASSWORD environment variable is required');
      console.log('Usage: MANAGER_PASSWORD="your-password" node setup-manager-password.js');
      process.exit(1);
    }
    
    // Hash the password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(defaultPassword, saltRounds);
    
    console.log('🔒 Password hashed successfully');
    
    // Update the manager user with hashed password
    const { data, error } = await supabase
      .from('users')
      .update({ 
        password_hash: passwordHash,
        updated_at: new Date().toISOString()
      })
      .eq('role', 'manager')
      .eq('email', 'manager@shipdocs.app')
      .select();
    
    if (error) {
      throw error;
    }
    
    if (!data || data.length === 0) {
      throw new Error('Manager user not found');
    }
    
    console.log('✅ Manager password updated successfully!');
    console.log('\n📋 Manager Login Credentials:');
    console.log('   Email: manager@shipdocs.app');
    console.log('   Password: [Set via MANAGER_PASSWORD environment variable]');
    console.log('\n⚠️  IMPORTANT: Change this password after first login!');
    console.log('\n🌐 Login at: new-onboarding-2025-git-testing-shipdocs-projects.vercel.app');
    
    // Verify the setup by testing the hash
    const isValid = await bcrypt.compare(defaultPassword, passwordHash);
    if (isValid) {
      console.log('✅ Password verification test passed');
    } else {
      console.log('❌ Password verification test failed');
    }
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

// Run the setup
setupManagerPassword();
