// Simple migration script
const { supabase } = require('../lib/database-supabase-compat');
const bcrypt = require('bcrypt');
require('dotenv').config();

console.log('🚀 Starting migration...');
console.log('Supabase URL:', process.env.SUPABASE_URL ? 'Set' : 'Not set');
console.log('Service Key:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Not set');

// Create Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runMigration() {
  try {
    console.log('📝 Running role-based access control migration...');

    // 1. Update users table to support admin role
    console.log('1. Updating users table constraints...');
    const { error: constraintError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
        ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'manager', 'crew'));
      `
    });
    if (constraintError) console.log('Constraint update:', constraintError.message);

    // 2. Add new columns to users table
    console.log('2. Adding new columns to users table...');
    const { error: columnsError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
      `
    });
    if (columnsError) console.log('Columns update:', columnsError.message);

    // 3. Create admin_settings table
    console.log('3. Creating admin_settings table...');
    const { error: adminSettingsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS admin_settings (
          id BIGSERIAL PRIMARY KEY,
          setting_key TEXT UNIQUE NOT NULL,
          setting_value JSONB NOT NULL,
          description TEXT,
          created_by BIGINT REFERENCES users(id),
          updated_by BIGINT REFERENCES users(id),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    });
    if (adminSettingsError) console.log('Admin settings table:', adminSettingsError.message);

    // 4. Create manager_permissions table
    console.log('4. Creating manager_permissions table...');
    const { error: permissionsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS manager_permissions (
          id BIGSERIAL PRIMARY KEY,
          manager_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
          permission_key TEXT NOT NULL,
          permission_value BOOLEAN DEFAULT TRUE,
          granted_by BIGINT REFERENCES users(id),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(manager_id, permission_key)
        );
      `
    });
    if (permissionsError) console.log('Manager permissions table:', permissionsError.message);

    // 5. Create audit_log table
    console.log('5. Creating audit_log table...');
    const { error: auditError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS audit_log (
          id BIGSERIAL PRIMARY KEY,
          user_id BIGINT REFERENCES users(id),
          action TEXT NOT NULL,
          resource_type TEXT NOT NULL,
          resource_id TEXT,
          details JSONB,
          ip_address INET,
          user_agent TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    });
    if (auditError) console.log('Audit log table:', auditError.message);

    // 6. Create indexes
    console.log('6. Creating indexes...');
    const { error: indexError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
        CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
        CREATE INDEX IF NOT EXISTS idx_admin_settings_key ON admin_settings(setting_key);
        CREATE INDEX IF NOT EXISTS idx_manager_permissions_manager ON manager_permissions(manager_id);
        CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
        CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);
      `
    });
    if (indexError) console.log('Indexes:', indexError.message);

    // 7. Insert default admin settings
    console.log('7. Inserting default admin settings...');
    const { error: settingsInsertError } = await supabase
      .from('admin_settings')
      .upsert([
        {
          setting_key: 'system_name',
          setting_value: '"Maritime Onboarding System"',
          description: 'System display name'
        },
        {
          setting_key: 'max_managers',
          setting_value: '10',
          description: 'Maximum number of manager accounts'
        },
        {
          setting_key: 'template_retention_days',
          setting_value: '365',
          description: 'How long to keep old template versions'
        }
      ], { onConflict: 'setting_key' });
    
    if (settingsInsertError) console.log('Settings insert:', settingsInsertError.message);

    console.log('✅ Migration completed successfully!');
    return true;

  } catch (error) {
    console.error('❌ Migration failed:', error);
    return false;
  }
}

async function createAdminUser() {
  try {
    console.log('👤 Creating admin user...');
    
    const email = process.env.ADMIN_EMAIL || 'martexx@shipdocs.app';
    const password = process.env.ADMIN_PASSWORD;
    const firstName = process.env.ADMIN_FIRST_NAME || 'Martin';
    const lastName = process.env.ADMIN_LAST_NAME || 'Administrator';
    
    if (!password) {
      console.error('ADMIN_PASSWORD environment variable is required');
      process.exit(1);
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Check if admin user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (existingUser) {
      console.log('📝 Updating existing admin user...');
      const { error: updateError } = await supabase
        .from('users')
        .update({
          role: 'admin',
          status: 'active',
          is_active: true,
          password_hash: passwordHash,
          position: 'System Administrator'
        })
        .eq('email', email);

      if (updateError) {
        console.error('❌ Failed to update admin user:', updateError);
        return false;
      }
      console.log('✅ Admin user updated successfully!');
    } else {
      console.log('🆕 Creating new admin user...');
      const { error: createError } = await supabase
        .from('users')
        .insert({
          email: email,
          first_name: firstName,
          last_name: lastName,
          role: 'admin',
          status: 'active',
          is_active: true,
          password_hash: passwordHash,
          position: 'System Administrator',
          preferred_language: 'en'
        });

      if (createError) {
        console.error('❌ Failed to create admin user:', createError);
        return false;
      }
      console.log('✅ Admin user created successfully!');
    }

    console.log('📧 Admin user created:');
    console.log(`   Email: ${email}`);
    console.log('   Password: [Set via ADMIN_PASSWORD environment variable]');
    console.log('🔗 Login at: /login → "Administrator Login"');

    return true;

  } catch (error) {
    console.error('❌ Admin user creation failed:', error);
    return false;
  }
}

async function main() {
  console.log('🎯 Starting complete setup...');
  
  const migrationSuccess = await runMigration();
  if (!migrationSuccess) {
    console.error('❌ Migration failed, stopping...');
    process.exit(1);
  }

  const adminSuccess = await createAdminUser();
  if (!adminSuccess) {
    console.error('❌ Admin user creation failed, stopping...');
    process.exit(1);
  }

  console.log('🎉 Setup completed successfully!');
  console.log('');
  console.log('📋 Next steps:');
  console.log('1. Test admin login at /login');
  console.log('2. Access admin dashboard at /admin');
  console.log('3. Create manager accounts through admin interface');
}

main().catch(console.error);
