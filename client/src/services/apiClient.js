import axios from 'axios';
import toast from 'react-hot-toast';
import errorHandler from './errorHandlingService';
import tokenService from './tokenService';

// Token expiration utilities
export const isTokenExpired = (token) => {
  if (!token) return true;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;
    return payload.exp < currentTime;
  } catch (error) {
    return true;
  }
};

export const getTokenExpirationTime = (token) => {
  if (!token) return null;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000; // Convert to milliseconds
  } catch (error) {
    return null;
  }
};

export const isTokenExpiringSoon = (token, minutesThreshold = 5) => {
  const expirationTime = getTokenExpirationTime(token);
  if (!expirationTime) return false;

  const currentTime = Date.now();
  const timeUntilExpiration = expirationTime - currentTime;
  const thresholdMs = minutesThreshold * 60 * 1000;

  return timeUntilExpiration <= thresholdMs && timeUntilExpiration > 0;
};

// Create axios instance
const baseURL = process.env.REACT_APP_API_URL || '/api';

const api = axios.create({
  baseURL: baseURL.trim(), // Trim any whitespace
  timeout: 30000 // Increased to 30 seconds for slow database queries
});

// Track if we're already redirecting to prevent multiple redirects
let isRedirecting = false;

// Request interceptor to add auth token and check expiration
api.interceptors.request.use(
  (config) => {
    const token = tokenService.getToken();
    
    if (token) {
      // Check if token is expired
      if (isTokenExpired(token)) {
        tokenService.clearToken();
        
        // Only redirect if we're not already redirecting and not on login page
        if (!isRedirecting && !window.location.pathname.includes('/login')) {
          isRedirecting = true;
          toast.error('Your session has expired. Please log in again.');
          // Use React Router navigation instead of window.location
          setTimeout(() => {
            window.location.replace('/login');
          }, 100);
        }
        return Promise.reject(new Error('Token expired'));
      }
      
      // Check if token is expiring soon
      if (isTokenExpiringSoon(token, 5)) {
        toast.error('Your session will expire soon. Please save your work and log in again.', {
          duration: 8000,
          id: 'token-expiring-warning'
        });
      }
      
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Reset redirect flag when on login page
    if (window.location.pathname.includes('/login')) {
      isRedirecting = false;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    // Reset redirect flag on successful response
    isRedirecting = false;
    return response;
  },
  (error) => {
    const response = error.response;
    
    // Handle authentication errors
    if (response?.status === 401) {
      // Clear token
      tokenService.clearToken();
      
      // Only redirect if we're not already redirecting and not on login page
      if (!isRedirecting && !window.location.pathname.includes('/login')) {
        isRedirecting = true;
        errorHandler.showError(error, 'authentication');
        
        // Use replace to avoid adding to browser history
        setTimeout(() => {
          window.location.replace('/login');
        }, 500);
      }
    } else if (response?.status === 403) {
      errorHandler.showError(error, 'authorization');
    } else if (response?.status >= 500) {
      errorHandler.showError(error, 'server');
    } else if (!response) {
      // Check if user is offline
      if (errorHandler.isOffline()) {
        errorHandler.handleOfflineError();
      } else {
        errorHandler.showError(error, 'network');
      }
    } else {
      // Generic error handling
      errorHandler.showError(error, 'general');
    }

    return Promise.reject(error);
  }
);

export default api;