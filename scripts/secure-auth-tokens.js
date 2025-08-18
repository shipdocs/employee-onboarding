#!/usr/bin/env node

/**
 * Script to help migrate from localStorage to more secure token storage
 * This script updates the AuthContext to use sessionStorage or a secure token service
 */

const fs = require('fs').promises;
const path = require('path');

const AUTH_CONTEXT_PATH = path.join(__dirname, '..', 'client', 'src', 'contexts', 'AuthContext.js');
const TOKEN_SERVICE_PATH = path.join(__dirname, '..', 'client', 'src', 'services', 'tokenService.js');

// Secure token service implementation
const SECURE_TOKEN_SERVICE = `/**
 * Secure Token Service
 * Manages authentication tokens with enhanced security
 */

class TokenService {
  constructor() {
    // Use in-memory storage as primary storage
    this.memoryStorage = {
      token: null,
      refreshToken: null,
      expiresAt: null
    };
    
    // Use sessionStorage as fallback (clears on browser close)
    this.storageKey = 'auth_token';
    this.refreshKey = 'refresh_token';
  }

  /**
   * Store authentication token securely
   * @param {string} token - JWT token
   * @param {string} refreshToken - Refresh token (optional)
   * @param {number} expiresIn - Token expiration in seconds
   */
  setToken(token, refreshToken = null, expiresIn = 3600) {
    try {
      // Store in memory
      this.memoryStorage.token = token;
      this.memoryStorage.refreshToken = refreshToken;
      this.memoryStorage.expiresAt = Date.now() + (expiresIn * 1000);
      
      // Store in sessionStorage as backup
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const tokenData = {
          token,
          expiresAt: this.memoryStorage.expiresAt
        };
        sessionStorage.setItem(this.storageKey, JSON.stringify(tokenData));
        
        if (refreshToken) {
          sessionStorage.setItem(this.refreshKey, refreshToken);
        }
      }
    } catch (error) {
      console.error('Failed to store token:', error);
    }
  }

  /**
   * Retrieve authentication token
   * @returns {string|null} JWT token or null if not found/expired
   */
  getToken() {
    // First check memory storage
    if (this.memoryStorage.token) {
      if (Date.now() < this.memoryStorage.expiresAt) {
        return this.memoryStorage.token;
      } else {
        // Token expired, clear it
        this.clearToken();
        return null;
      }
    }
    
    // Fallback to sessionStorage
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const stored = sessionStorage.getItem(this.storageKey);
        if (stored) {
          const tokenData = JSON.parse(stored);
          if (Date.now() < tokenData.expiresAt) {
            // Restore to memory storage
            this.memoryStorage.token = tokenData.token;
            this.memoryStorage.expiresAt = tokenData.expiresAt;
            return tokenData.token;
          } else {
            // Token expired
            this.clearToken();
          }
        }
      }
    } catch (error) {
      console.error('Failed to retrieve token:', error);
    }
    
    return null;
  }

  /**
   * Get refresh token
   * @returns {string|null} Refresh token or null
   */
  getRefreshToken() {
    if (this.memoryStorage.refreshToken) {
      return this.memoryStorage.refreshToken;
    }
    
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        return sessionStorage.getItem(this.refreshKey);
      }
    } catch (error) {
      console.error('Failed to retrieve refresh token:', error);
    }
    
    return null;
  }

  /**
   * Clear all tokens
   */
  clearToken() {
    // Clear memory storage
    this.memoryStorage = {
      token: null,
      refreshToken: null,
      expiresAt: null
    };
    
    // Clear sessionStorage
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.removeItem(this.storageKey);
        sessionStorage.removeItem(this.refreshKey);
      }
    } catch (error) {
      console.error('Failed to clear tokens:', error);
    }
  }

  /**
   * Check if token is about to expire
   * @param {number} threshold - Seconds before expiration to consider "about to expire"
   * @returns {boolean}
   */
  isTokenExpiringSoon(threshold = 300) {
    if (!this.memoryStorage.expiresAt) {
      return true;
    }
    
    const timeUntilExpiry = (this.memoryStorage.expiresAt - Date.now()) / 1000;
    return timeUntilExpiry < threshold;
  }

  /**
   * Decode JWT token (without verification)
   * @param {string} token - JWT token
   * @returns {object|null} Decoded payload or null
   */
  decodeToken(token) {
    try {
      const payload = token.split('.')[1];
      const decoded = JSON.parse(atob(payload));
      return decoded;
    } catch (error) {
      console.error('Failed to decode token:', error);
      return null;
    }
  }
}

// Export singleton instance
const tokenService = new TokenService();
export default tokenService;
`;

// Script to show how to update AuthContext
const UPDATE_INSTRUCTIONS = `
# Secure Authentication Token Migration Guide

## Overview
This script helps migrate from localStorage (XSS vulnerable) to more secure token storage methods.

## Security Improvements

### 1. Replace localStorage with sessionStorage
- Tokens cleared when browser closes
- Still vulnerable to XSS but reduces attack window

### 2. Use In-Memory Storage (Recommended)
- Primary storage in JavaScript memory
- SessionStorage as fallback only
- Implement refresh token rotation

### 3. HttpOnly Cookies (Best Security)
- Requires backend changes
- Immune to XSS attacks
- CSRF protection needed

## Implementation Steps

### Step 1: Create Token Service
The provided tokenService.js implements:
- In-memory token storage
- SessionStorage fallback
- Automatic expiration handling
- Refresh token support

### Step 2: Update AuthContext
Replace all localStorage calls:

\`\`\`javascript
// OLD (vulnerable)
localStorage.setItem('token', token);
const token = localStorage.getItem('token');
localStorage.removeItem('token');

// NEW (secure)
import tokenService from '../services/tokenService';
tokenService.setToken(token, refreshToken, expiresIn);
const token = tokenService.getToken();
tokenService.clearToken();
\`\`\`

### Step 3: Add Token Refresh Logic
\`\`\`javascript
useEffect(() => {
  const interval = setInterval(() => {
    if (tokenService.isTokenExpiringSoon()) {
      refreshAuthToken();
    }
  }, 60000); // Check every minute
  
  return () => clearInterval(interval);
}, []);
\`\`\`

### Step 4: Update API Service
Modify api.js to use tokenService:
\`\`\`javascript
const token = tokenService.getToken();
if (token) {
  config.headers.Authorization = \`Bearer \${token}\`;
}
\`\`\`

## Backend Requirements

For full security, implement:

1. **Refresh Token Endpoint**
   - POST /api/auth/refresh
   - Returns new access token

2. **HttpOnly Cookie Support** (optional but recommended)
   - Set cookies with httpOnly, secure, sameSite flags
   - Implement CSRF protection

3. **Token Expiration**
   - Short-lived access tokens (15-30 minutes)
   - Long-lived refresh tokens (7-30 days)

## Testing

1. Verify tokens are not in localStorage:
   - Open DevTools > Application > Local Storage
   - Should be empty

2. Test session persistence:
   - Login and navigate
   - Close tab (not browser) and reopen
   - Should remain logged in

3. Test security:
   - Close entire browser
   - Reopen and navigate to app
   - Should require login

## Rollback Plan

If issues occur:
1. Keep localStorage code commented
2. Switch back by uncommenting
3. Clear both storages during transition
`;

async function createTokenService() {
  try {
    const servicesDir = path.dirname(TOKEN_SERVICE_PATH);
    await fs.mkdir(servicesDir, { recursive: true });
    
    await fs.writeFile(TOKEN_SERVICE_PATH, SECURE_TOKEN_SERVICE, 'utf8');
    console.log('✅ Created secure token service at:', TOKEN_SERVICE_PATH);
    
    // Also create the migration guide
    const guidePath = path.join(__dirname, '..', 'client', 'SECURE_AUTH_MIGRATION.md');
    await fs.writeFile(guidePath, UPDATE_INSTRUCTIONS, 'utf8');
    console.log('✅ Created migration guide at:', guidePath);
    
    return true;
  } catch (error) {
    console.error('❌ Failed to create token service:', error.message);
    return false;
  }
}

async function analyzeAuthContext() {
  try {
    const content = await fs.readFile(AUTH_CONTEXT_PATH, 'utf8');
    
    // Find localStorage usage
    const localStorageUses = [];
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      if (line.includes('localStorage')) {
        localStorageUses.push({
          line: index + 1,
          content: line.trim()
        });
      }
    });
    
    return localStorageUses;
  } catch (error) {
    console.error('❌ Failed to analyze AuthContext:', error.message);
    return [];
  }
}

async function main() {
  console.log('🔐 Secure Authentication Token Migration Tool\n');
  
  // Analyze current usage
  console.log('📊 Analyzing current token storage...\n');
  const localStorageUses = await analyzeAuthContext();
  
  if (localStorageUses.length > 0) {
    console.log(`Found ${localStorageUses.length} localStorage uses in AuthContext.js:\n`);
    localStorageUses.forEach(use => {
      console.log(`  Line ${use.line}: ${use.content}`);
    });
    console.log('');
  }
  
  // Create token service
  console.log('📝 Creating secure token service...\n');
  const created = await createTokenService();
  
  if (created) {
    console.log('\n✅ Success! Next steps:\n');
    console.log('1. Review the created tokenService.js');
    console.log('2. Follow the migration guide in SECURE_AUTH_MIGRATION.md');
    console.log('3. Update AuthContext.js to use tokenService');
    console.log('4. Update api.js to use tokenService');
    console.log('5. Test thoroughly before deploying');
    console.log('\n⚠️  Important: This is a breaking change that will log out all users!');
  }
}

// Run the script
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});