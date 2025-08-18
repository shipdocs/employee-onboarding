import createCache from '@emotion/cache';

/**
 * Creates an Emotion cache with nonce support for CSP compliance
 * This allows Material-UI to work with strict Content Security Policy
 */
export function createEmotionCache() {
  // Get nonce from meta tag (set by server)
  const nonceElement = document.querySelector('meta[property="csp-nonce"]');
  const nonce = nonceElement ? nonceElement.getAttribute('content') : undefined;

  return createCache({
    key: 'mui',
    nonce,
    prepend: true
  });
}

// Create default cache instance
export const emotionCache = createEmotionCache();
