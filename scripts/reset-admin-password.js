// Script to reset admin password
const db = require('../lib/database-direct');
const bcrypt = require('bcrypt');

async function resetAdminPassword() {
  try {
    console.log('Starting admin password reset...');
    
    const adminEmail = process.env.ADMIN_EMAIL || 'adminmartexx@shipdocs.app';
    const newPassword = process.env.ADMIN_PASSWORD;
    
    if (!newPassword) {
      console.error('ADMIN_PASSWORD environment variable is required');
      process.exit(1);
    }
    
    // Generate new password hash
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);
    console.log('Generated new password hash');
    
    // Update admin user password
    const { data, error } = await supabase
      .from('users')
      .update({ 
        password_hash: passwordHash,
        updated_at: new Date().toISOString()
      })
      .eq('email', adminEmail)
      .eq('role', 'admin')
      .select();
    
    if (error) {
      console.error('Error updating password:', error);
      return;
    }
    
    if (!data || data.length === 0) {
      console.error('Admin user not found');
      return;
    }
    
    console.log('✅ Password reset successful for:', adminEmail);
    console.log('New password has been set from environment variable');
    console.log('User details:', {
      id: data[0].id,
      email: data[0].email,
      role: data[0].role,
      status: data[0].status
    });
    
    // Log the password reset in audit log
    await supabase
      .from('audit_log')
      .insert({
        user_id: data[0].id,
        action: 'admin_password_reset',
        resource_type: 'authentication',
        details: {
          reset_by: 'script',
          reason: 'password_correction'
        }
      });
    
    console.log('Audit log entry created');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  } finally {
    process.exit(0);
  }
}

// Run the reset
resetAdminPassword();