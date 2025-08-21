#!/usr/bin/env node

/**
 * Set Admin Password Script
 * Sets a known password for the admin user for testing
 */

const bcrypt = require('bcrypt');
const { supabase } = require('../lib/database-supabase-compat');
require('dotenv').config();

// Create Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setAdminPassword() {
  try {
    console.log('🔐 Setting Admin & Manager Passwords for Testing...');
    console.log('==================================================');

    const adminEmail = process.env.ADMIN_EMAIL || 'adminmartexx@shipdocs.app';
    const adminPassword = process.env.ADMIN_PASSWORD;

    const managerEmail = process.env.MANAGER_EMAIL || 'martin.splinter@maritime-example.com';
    const managerPassword = process.env.MANAGER_PASSWORD;
    
    if (!adminPassword || !managerPassword) {
      console.error('Both ADMIN_PASSWORD and MANAGER_PASSWORD environment variables are required');
      console.log('Usage: ADMIN_PASSWORD="your-password" MANAGER_PASSWORD="your-password" node set-admin-password.js');
      process.exit(1);
    }

    // Hash the passwords
    const saltRounds = 12;
    const adminPasswordHash = await bcrypt.hash(adminPassword, saltRounds);
    const managerPasswordHash = await bcrypt.hash(managerPassword, saltRounds);

    // Update the admin user's password
    const { error: adminUpdateError } = await supabase
      .from('users')
      .update({
        password_hash: adminPasswordHash,
        updated_at: new Date().toISOString()
      })
      .eq('email', adminEmail)
      .eq('role', 'admin');

    if (adminUpdateError) {
      throw adminUpdateError;
    }

    // Update the manager user's password
    const { error: managerUpdateError } = await supabase
      .from('users')
      .update({
        password_hash: managerPasswordHash,
        updated_at: new Date().toISOString()
      })
      .eq('email', managerEmail)
      .eq('role', 'manager');

    if (managerUpdateError) {
      throw managerUpdateError;
    }

    console.log('✅ Admin password updated successfully!');
    console.log(`📧 Admin Email: ${adminEmail}`);
    console.log('🔑 Admin Password: [Set via ADMIN_PASSWORD environment variable]');
    console.log('');
    console.log('✅ Manager password updated successfully!');
    console.log(`📧 Manager Email: ${managerEmail}`);
    console.log('🔑 Manager Password: [Set via MANAGER_PASSWORD environment variable]');
    console.log('');
    console.log('🚀 You can now test both admin and manager APIs with these credentials');

  } catch (error) {
    console.error('❌ Failed to set passwords:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  setAdminPassword().then(() => {
    console.log('✅ Password setup completed!');
    process.exit(0);
  }).catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
}

module.exports = { setAdminPassword };
