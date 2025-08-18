// Script to set up the admin user with proper password hash
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');
const readline = require('readline');
require('dotenv').config();

// Create Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

function askPassword(question) {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    const stdout = process.stdout;

    stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    let password = '';

    stdin.on('data', function(char) {
      char = char + '';

      switch(char) {
        case '\n':
        case '\r':
        case '\u0004':
          stdin.setRawMode(false);
          stdin.pause();
          stdout.write('\n');
          resolve(password);
          break;
        case '\u0003':
          process.exit();
          break;
        case '\u007f': // backspace
          if (password.length > 0) {
            password = password.slice(0, -1);
            stdout.write('\b \b');
          }
          break;
        default:
          password += char;
          stdout.write('*');
          break;
      }
    });
  });
}

async function setupAdminUser() {
  try {
    console.log('🔐 Admin User Setup');
    console.log('==================');
    console.log('');

    // Check if admin user already exists
    const { data: existingAdmin, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'admin')
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    if (existingAdmin) {
      console.log('✅ Admin user already exists:');
      console.log(`   Email: ${existingAdmin.email}`);
      console.log(`   Name: ${existingAdmin.first_name} ${existingAdmin.last_name}`);
      console.log('');

      const updatePassword = await askQuestion('Do you want to update the admin password? (y/N): ');

      if (updatePassword.toLowerCase() === 'y' || updatePassword.toLowerCase() === 'yes') {
        const newPassword = await askPassword('Enter new admin password: ');

        if (newPassword.length < 8) {
          console.log('❌ Password must be at least 8 characters long');
          process.exit(1);
        }

        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(newPassword, saltRounds);

        const { error: updateError } = await supabase
          .from('users')
          .update({
            password_hash: passwordHash,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingAdmin.id);

        if (updateError) {
          throw updateError;
        }

        console.log('✅ Admin password updated successfully');
      }
    } else {
      console.log('No admin user found. Creating new admin user...');
      console.log('');

      const email = await askQuestion('Enter admin email: ');
      const firstName = await askQuestion('Enter admin first name: ');
      const lastName = await askQuestion('Enter admin last name: ');
      const password = await askPassword('Enter admin password (min 8 characters): ');

      if (!email || !firstName || !lastName || !password) {
        console.log('❌ All fields are required');
        process.exit(1);
      }

      if (password.length < 8) {
        console.log('❌ Password must be at least 8 characters long');
        process.exit(1);
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        console.log('❌ Invalid email format');
        process.exit(1);
      }

      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create admin user
      const { data: newAdmin, error: createError } = await supabase
        .from('users')
        .insert({
          email: email.toLowerCase(),
          first_name: firstName,
          last_name: lastName,
          role: 'admin',
          status: 'active',
          is_active: true,
          password_hash: passwordHash,
          position: 'System Administrator',
          preferred_language: 'en'
        })
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      console.log('✅ Admin user created successfully:');
      console.log(`   ID: ${newAdmin.id}`);
      console.log(`   Email: ${newAdmin.email}`);
      console.log(`   Name: ${newAdmin.first_name} ${newAdmin.last_name}`);
    }

    console.log('');
    console.log('🎉 Admin user setup completed!');
    console.log('');
    console.log('📋 Next steps:');
    console.log('1. Test admin login at /login');
    console.log('2. Access admin dashboard at /admin');
    console.log('3. Create manager accounts through the admin interface');

  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run the setup if this script is executed directly
if (require.main === module) {
  setupAdminUser()
    .then(() => {
      console.log('Setup completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Setup failed:', error);
      process.exit(1);
    });
}

module.exports = { setupAdminUser };
