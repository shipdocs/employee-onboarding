/**
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
    if (this.memoryStorage.token && this.memoryStorage.token !== 'null') {
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
        if (stored && stored !== 'null') {
          const tokenData = JSON.parse(stored);
          if (tokenData.token && tokenData.token !== 'null' && Date.now() < tokenData.expiresAt) {
            // Restore to memory storage
            this.memoryStorage.token = tokenData.token;
            this.memoryStorage.expiresAt = tokenData.expiresAt;
            return tokenData.token;
          } else {
            // Token expired or invalid
            this.clearToken();
          }
        }
      }
    } catch (error) {
      console.error('Failed to retrieve token:', error);
      // Clear corrupted storage
      this.clearToken();
    }

    // Last resort: check localStorage for legacy tokens
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const legacyToken = localStorage.getItem('token');
        if (legacyToken && legacyToken !== 'null' && legacyToken !== 'undefined') {
          console.log('🔄 Migrating legacy token from localStorage');
          // Migrate to new storage system
          this.setToken(legacyToken);
          // Clean up old storage
          localStorage.removeItem('token');
          return legacyToken;
        }
      }
    } catch (error) {
      console.error('Failed to check legacy token:', error);
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
