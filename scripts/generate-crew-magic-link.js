#!/usr/bin/env node

/**
 * Script to generate a magic link for a crew member for testing
 */

require('dotenv').config();
const { supabase } = require('../lib/supabase');
const crypto = require('crypto');

// Generate magic token locally
function generateMagicToken() {
  return crypto.randomBytes(32).toString('hex');
}

async function generateCrewMagicLink() {
  console.log('🔗 Generating Magic Link for Crew Member');
  console.log('=====================================\n');

  try {
    // Get the first test crew member
    const { data: crewMember, error: crewError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'test-crew-001@shipdocs.app')
      .single();

    if (crewError || !crewMember) {
      console.error('❌ Test crew member not found. Run: node scripts/setup-test-accounts.js');
      process.exit(1);
    }

    console.log('👤 Crew member found:', crewMember.email);
    console.log('Details:', {
      id: crewMember.id,
      name: `${crewMember.first_name} ${crewMember.last_name}`,
      status: crewMember.status
    });

    // Generate a magic token
    const token = generateMagicToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    console.log('\n🔑 Generated token:', token);

    // Store the magic link in the database
    const { data: magicLink, error: linkError } = await supabase
      .from('magic_links')
      .insert({
        user_id: crewMember.id,
        email: crewMember.email,
        token: token,
        expires_at: expiresAt.toISOString(),
        used: false
      })
      .select()
      .single();

    if (linkError) {
      console.error('❌ Failed to store magic link:', linkError);
      process.exit(1);
    }

    console.log('✅ Magic link stored in database');

    // Generate the login URL
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : process.env.NEXT_PUBLIC_APP_URL 
      || 'https://maritime-onboarding.example.com';
    
    const loginUrl = `${baseUrl}/login?token=${token}`;

    console.log('\n🌐 Magic Link URL:');
    console.log('==================');
    console.log(loginUrl);
    console.log('\n📋 Instructions:');
    console.log('1. Copy the URL above');
    console.log('2. Open it in your browser');
    console.log('3. You should be automatically logged in as the crew member');
    console.log('4. Navigate to /crew to see the dashboard');
    console.log('\n⏰ Link expires in 24 hours');

  } catch (error) {
    console.error('❌ Error generating magic link:', error);
    process.exit(1);
  }
}

// Run the script
generateCrewMagicLink();
