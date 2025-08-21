#!/usr/bin/env node

/**
 * Setup Git Configuration for Online Agents
 * 
 * This script configures git with the correct user credentials
 * for the shipdocs organization to ensure commits are properly
 * attributed and pass Vercel checks.
 */

const { execSync } = require('child_process');

const GIT_USER_NAME = 'shipdocs';
const GIT_USER_EMAIL = 'info@shipdocs.app';

function setupGitConfig() {
  try {
    console.log('🔧 Setting up Git configuration...');
    
    // Set user name
    execSync(`git config user.name "${GIT_USER_NAME}"`, { stdio: 'inherit' });
    console.log(`✅ Set git user.name to: ${GIT_USER_NAME}`);
    
    // Set user email
    execSync(`git config user.email "${GIT_USER_EMAIL}"`, { stdio: 'inherit' });
    console.log(`✅ Set git user.email to: ${GIT_USER_EMAIL}`);
    
    // Verify configuration
    const userName = execSync('git config user.name', { encoding: 'utf8' }).trim();
    const userEmail = execSync('git config user.email', { encoding: 'utf8' }).trim();
    
    console.log('\n📋 Current Git Configuration:');
    console.log(`   Name:  ${userName}`);
    console.log(`   Email: ${userEmail}`);
    
    if (userName === GIT_USER_NAME && userEmail === GIT_USER_EMAIL) {
      console.log('\n🎉 Git configuration setup complete!');
    } else {
      console.error('\n❌ Git configuration verification failed');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Failed to setup git configuration:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  setupGitConfig();
}

module.exports = { setupGitConfig };
