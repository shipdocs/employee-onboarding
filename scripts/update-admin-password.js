#!/usr/bin/env node

const bcrypt = require('bcrypt');
const { Client } = require('pg');
require('dotenv').config();

async function updateAdminPassword() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'postgres'
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Hash the new password
    const password = 'Password123!';
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Update the admin user
    const query = `
      UPDATE users 
      SET 
        password_hash = $1,
        first_name = 'Admin',
        last_name = 'User',
        failed_login_attempts = 0,
        locked_until = NULL,
        updated_at = NOW()
      WHERE email = 'admin@admin.com' 
      RETURNING id, email, first_name, last_name, role;
    `;
    
    const result = await client.query(query, [hashedPassword]);
    
    if (result.rows.length > 0) {
      console.log('✅ Admin password updated successfully!');
      console.log('User details:', result.rows[0]);
      console.log('\nLogin credentials:');
      console.log('Email: admin@admin.com');
      console.log('Password: Password123!');
    } else {
      console.error('❌ Admin user not found');
    }
    
  } catch (error) {
    console.error('Error updating password:', error);
  } finally {
    await client.end();
  }
}

updateAdminPassword();