const { authRateLimit } = require('../../lib/rateLimit');

/**
 * Debug Storage Endpoint
 * GET /api/auth/debug-storage
 *
 * Helps debug token storage issues by checking what's in browser storage
 */
async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // This endpoint doesn't need authentication since we're debugging auth issues
  return res.status(200).json({
    success: true,
    message: 'Check browser console for storage debug script',
    script: `
// Run this in your browser console to debug storage:

console.log('=== STORAGE DEBUG ===');

// Check localStorage
console.log('📦 localStorage:');
console.log('  token:', localStorage.getItem('token'));
console.log('  user:', localStorage.getItem('user'));
console.log('  tokenExpiration:', localStorage.getItem('tokenExpiration'));

// Check sessionStorage  
console.log('📦 sessionStorage:');
console.log('  auth_token:', sessionStorage.getItem('auth_token'));
console.log('  refresh_token:', sessionStorage.getItem('refresh_token'));
console.log('  user:', sessionStorage.getItem('user'));

// Check tokenService
if (window.tokenService) {
  console.log('🔧 tokenService:');
  console.log('  getToken():', window.tokenService.getToken());
  console.log('  isExpired():', window.tokenService.isExpired());
} else {
  console.log('❌ tokenService not available on window');
}

// Check if we can import tokenService
try {
  // This might not work depending on module system
  console.log('🔧 Trying to access tokenService...');
} catch (error) {
  console.log('❌ Cannot access tokenService:', error.message);
}

console.log('=== END STORAGE DEBUG ===');
    `
  });
}

module.exports = authRateLimit(handler);
