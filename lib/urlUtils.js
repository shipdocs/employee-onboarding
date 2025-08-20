// lib/urlUtils.js - Dynamic URL detection for all environments
// Handles automatic BASE_URL detection for Vercel deployments, localhost, and production

/**
 * Get the base URL with automatic environment detection
 * Works across development, preview, and production environments without manual configuration
 * 
 * Priority order:
 * 1. Localhost detection (development)
 * 2. Production domain (main branch)
 * 3. Vercel preview URLs (feature branches)
 * 4. Fallback to environment variable
 */
function getBaseUrl() {
  // Debug logging for troubleshooting
  const debug = process.env.NODE_ENV !== 'production';
  
  if (debug) {

  }

  // PRIORITY 1: Localhost detection (development environment)
  if (isLocalhostEnvironment()) {
    const baseUrl = getLocalhostUrl();
    if (debug) {
      
    }
    return baseUrl;
  }

  // PRIORITY 2: Production environment (main branch)
  if (isProductionEnvironment()) {
    const baseUrl = 'https://maritime-onboarding.example.com';
    if (debug) {
      
    }
    return baseUrl;
  }

  // PRIORITY 3: Vercel preview deployments (feature branches)
  if (isVercelPreviewEnvironment()) {
    const baseUrl = getVercelPreviewUrl();
    if (debug) {
      
    }
    return baseUrl;
  }

  // PRIORITY 4: Fallback to environment variable
  const fallbackUrl = process.env.BASE_URL || 'http://localhost:3000';
  if (debug) {
    
  }
  return fallbackUrl;
}

/**
 * Check if running in localhost environment
 */
function isLocalhostEnvironment() {
  // Check if VERCEL_URL contains localhost (Vercel dev)
  if (process.env.VERCEL_URL?.includes('localhost')) {
    return true;
  }
  
  // Check if no Vercel environment (local development)
  if (!process.env.VERCEL_URL && !process.env.VERCEL_ENV) {
    return true;
  }
  
  // Check BASE_URL for localhost
  if (process.env.BASE_URL?.includes('localhost')) {
    return true;
  }
  
  return false;
}

/**
 * Get localhost URL with correct port detection
 */
function getLocalhostUrl() {
  // Extract port from VERCEL_URL if available
  if (process.env.VERCEL_URL?.includes('localhost')) {
    const match = process.env.VERCEL_URL.match(/localhost:(\d+)/);
    if (match) {
      return `http://localhost:${match[1]}`;
    }
  }
  
  // Check PORT environment variable
  if (process.env.PORT) {
    return `http://localhost:${process.env.PORT}`;
  }
  
  // Default development port
  return 'http://localhost:3000';
}

/**
 * Check if running in production environment
 */
function isProductionEnvironment() {
  // Check if main branch on Vercel
  if (process.env.VERCEL_GIT_COMMIT_REF === 'main') {
    return true;
  }
  
  // Check if production domain
  if (process.env.VERCEL_URL?.includes('maritime-onboarding.example.com')) {
    return true;
  }
  
  // Check VERCEL_ENV
  if (process.env.VERCEL_ENV === 'production') {
    return true;
  }
  
  return false;
}

/**
 * Check if running in Vercel preview environment
 */
function isVercelPreviewEnvironment() {
  // Must have VERCEL_URL and not be localhost or production
  return process.env.VERCEL_URL && 
         !isLocalhostEnvironment() && 
         !isProductionEnvironment();
}

/**
 * Get Vercel preview URL
 */
function getVercelPreviewUrl() {
  // Use VERCEL_URL directly for preview deployments
  if (process.env.VERCEL_URL) {
    // Ensure HTTPS for Vercel deployments
    if (process.env.VERCEL_URL.startsWith('http://')) {
      return process.env.VERCEL_URL.replace('http://', 'https://');
    }
    
    // Add https if no protocol
    if (!process.env.VERCEL_URL.startsWith('http')) {
      return `https://${process.env.VERCEL_URL}`;
    }
    
    return process.env.VERCEL_URL;
  }
  
  // Fallback construction for preview URLs
  const branch = process.env.VERCEL_GIT_COMMIT_REF;
  if (branch && branch !== 'main') {
    return `https://new-onboarding-2025-git-${branch.replace(/[^a-z0-9]/gi, '-')}-shipdocs-projects.vercel.app`;
  }
  
  // Final fallback
  return 'https://new-onboarding-2025-shipdocs-projects.vercel.app';
}

/**
 * Check if current environment is localhost
 * @returns {boolean}
 */
function isLocalhost() {
  const baseUrl = getBaseUrl();
  return baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1') || baseUrl.includes('0.0.0.0');
}

/**
 * Get environment type for logging/debugging
 * @returns {string}
 */
function getEnvironmentType() {
  if (isLocalhostEnvironment()) return 'localhost';
  if (isProductionEnvironment()) return 'production';
  if (isVercelPreviewEnvironment()) return 'preview';
  return 'unknown';
}

/**
 * Generate magic link URL
 * @param {string} token - Magic link token
 * @returns {string} - Complete magic link URL
 */
function generateMagicLinkUrl(token) {
  const baseUrl = getBaseUrl();
  return `${baseUrl}/login?token=${token}`;
}

/**
 * Generate dashboard URL for specific role
 * @param {string} role - User role (admin, manager, crew)
 * @returns {string} - Dashboard URL
 */
function generateDashboardUrl(role = '') {
  const baseUrl = getBaseUrl();
  if (role === 'admin') return `${baseUrl}/admin`;
  if (role === 'manager') return `${baseUrl}/manager`;
  if (role === 'crew') return `${baseUrl}/crew`;
  return `${baseUrl}/login`;
}

/**
 * Generate training URL
 * @returns {string} - Training portal URL
 */
function generateTrainingUrl() {
  const baseUrl = getBaseUrl();
  return `${baseUrl}/training`;
}

module.exports = {
  getBaseUrl,
  isLocalhost,
  getEnvironmentType,
  generateMagicLinkUrl,
  generateDashboardUrl,
  generateTrainingUrl
};
