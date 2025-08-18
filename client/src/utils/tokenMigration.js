/**
 * Token Migration Utility
 * Migrates tokens from localStorage to tokenService for consistency
 */

import tokenService from '../services/tokenService';

/**
 * Migrate token from localStorage to tokenService
 * This ensures all parts of the app use the same token storage
 */
export const migrateTokenStorage = () => {
  try {
    // Check if there's a token in localStorage
    const localStorageToken = localStorage.getItem('token');

    if (localStorageToken && !tokenService.getToken()) {
      // Token exists in localStorage but not in tokenService
      console.log('Migrating token from localStorage to tokenService');

      // Try to parse the token to get expiration
      try {
        const payload = JSON.parse(atob(localStorageToken.split('.')[1]));
        const exp = payload.exp;
        const iat = payload.iat || (Date.now() / 1000);
        const expiresIn = exp - iat;

        // Store in tokenService
        tokenService.setToken(localStorageToken, null, expiresIn);

        // Remove from localStorage after successful migration
        localStorage.removeItem('token');

        console.log('Token migration completed successfully');
      } catch (error) {
        console.error('Failed to parse token during migration:', error);
        // If parsing fails, store with default expiration
        tokenService.setToken(localStorageToken);
        localStorage.removeItem('token');
      }
    }
  } catch (error) {
    console.error('Token migration failed:', error);
  }
};

/**
 * Get token from the appropriate source
 * Prefers tokenService but falls back to localStorage for backward compatibility
 */
export const getAuthToken = () => {
  // First try tokenService
  const token = tokenService.getToken();
  if (token) return token;

  // Fallback to localStorage and migrate if found
  const localStorageToken = localStorage.getItem('token');
  if (localStorageToken) {
    migrateTokenStorage();
    return tokenService.getToken() || localStorageToken;
  }

  return null;
};
