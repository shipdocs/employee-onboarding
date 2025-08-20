import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';
import errorHandler from '../services/errorHandlingService';
import authService from '../services/authService';
import tokenService from '../services/tokenService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Token utility functions
const isTokenExpired = (token) => {
  if (!token || typeof token !== 'string') return true;

  try {
    // Validate JWT format before parsing
    if (!token.includes('.') || token.split('.').length !== 3) {
      return true;
    }

    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;
    return payload.exp < currentTime;
  } catch (error) {
    return true;
  }
};

const getTokenExpirationTime = (token) => {
  if (!token || typeof token !== 'string') return null;

  try {
    // Validate JWT format before parsing
    if (!token.includes('.') || token.split('.').length !== 3) {
      return null;
    }

    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000; // Convert to milliseconds
  } catch (error) {
    return null;
  }
};

const getTimeUntilExpiration = (token) => {
  const expirationTime = getTokenExpirationTime(token);
  if (!expirationTime) return 0;

  return Math.max(0, expirationTime - Date.now());
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  // Allow dev mode when REACT_APP_DEV_MODE is true, regardless of NODE_ENV
  const [isDevMode] = useState(process.env.REACT_APP_DEV_MODE === 'true');
  const [tokenExpirationWarningShown, setTokenExpirationWarningShown] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Check token validity and set up monitoring
  const checkTokenValidity = useCallback(async (savedToken) => {
    if (!savedToken || isTokenExpired(savedToken)) {
      logout();
      return false;
    }

    try {
      // Verify token with server
      const response = await axios.get('/api/auth/verify', {
        headers: {
          Authorization: `Bearer ${savedToken}`
        }
      });
      setUser(response.data.user);
      setToken(savedToken);
      return true;
    } catch (error) {
      // console.error('Token verification failed:', error);
      logout();
      return false;
    }
  }, []);

  // Monitor token expiration
  useEffect(() => {
    if (!token) return;

    const checkExpiration = () => {
      const timeUntilExpiration = getTimeUntilExpiration(token);
      const minutesUntilExpiration = timeUntilExpiration / (1000 * 60);

      // Show warning when 5 minutes remain
      if (minutesUntilExpiration <= 5 && minutesUntilExpiration > 0 && !tokenExpirationWarningShown) {
        setTokenExpirationWarningShown(true);
        toast.error(
          `Your session will expire in ${Math.ceil(minutesUntilExpiration)} minutes. Please save your work and log in again.`,
          {
            duration: 10000,
            id: 'session-expiring-warning'
          }
        );
      }

      // Auto-logout when expired
      if (timeUntilExpiration <= 0) {
        // Only show toast if not already logging out
        if (!isLoggingOut) {
          toast.error('Your session has expired. Please log in again.');
          logout();
        }
      }
    };

    // Check immediately
    checkExpiration();

    // Set up interval to check every minute
    const interval = setInterval(checkExpiration, 60000);

    return () => clearInterval(interval);
  }, [token, tokenExpirationWarningShown]);

  useEffect(() => {
    // Check for existing token on mount
    const savedToken = tokenService.getToken();
    if (savedToken) {
      checkTokenValidity(savedToken);
    }
    setIsLoading(false);
  }, [checkTokenValidity]);

  // Check if user needs onboarding
  const checkOnboardingStatus = useCallback((userData) => {
    const hasCompletedOnboarding = sessionStorage.getItem(`onboarding_completed_${userData.id}`);
    if (!hasCompletedOnboarding && userData.role === 'crew') {
      setNeedsOnboarding(true);
      setOnboardingStep(0);
    } else {
      setNeedsOnboarding(false);
    }
  }, []);

  const login = useCallback((userData, authToken) => {
    // Validate token format before processing
    if (!authToken || typeof authToken !== 'string') {
      return;
    }

    setUser(userData);
    setToken(authToken);
    setTokenExpirationWarningShown(false);

    // Extract expiration time from JWT token
    let expiresIn = 3600; // Default to 1 hour
    try {
      // Additional validation before split
      if (!authToken.includes('.') || authToken.split('.').length !== 3) {
        throw new Error('Invalid JWT format - not 3 parts separated by dots');
      }

      const payload = JSON.parse(atob(authToken.split('.')[1]));
      const exp = payload.exp;
      const iat = payload.iat || (Date.now() / 1000);
      expiresIn = exp - iat; // Calculate seconds until expiration
    } catch (error) {
      console.error('Failed to parse token expiration:', error);
    }

    tokenService.setToken(authToken, null, expiresIn);

    // Check if user needs onboarding
    checkOnboardingStatus(userData);
  }, [checkOnboardingStatus]);

  const logout = useCallback(async () => {
    // Prevent multiple logout calls
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);

    try {
      // Call logout endpoint to blacklist the token
      await authService.logout();
    } catch (error) {
      // Log error but continue with local logout
      console.error('Logout API call failed:', error);
    }

    // Clear local state
    setUser(null);
    setToken(null);
    setTokenExpirationWarningShown(false);
    setNeedsOnboarding(false);
    setOnboardingStep(0);

    // Clear all token storage locations
    tokenService.clearToken();

    // Clear any legacy localStorage items
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('refresh_token');

      // Clear any sessionStorage items that might exist
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('auth_token');
      sessionStorage.removeItem('refresh_token');

      // Clear all onboarding-related session storage
      const sessionKeys = Object.keys(sessionStorage);
      sessionKeys.forEach(key => {
        if (key.startsWith('onboarding_')) {
          sessionStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Failed to clear storage:', error);
    }

    // Reset logout flag after a delay
    setTimeout(() => {
      setIsLoggingOut(false);
    }, 2000);
  }, [isLoggingOut]);

  // Onboarding management functions
  const completeOnboarding = useCallback(() => {
    if (user) {
      sessionStorage.setItem(`onboarding_completed_${user.id}`, 'true');
      setNeedsOnboarding(false);
      setOnboardingStep(0);
    }
  }, [user]);

  const nextOnboardingStep = useCallback(() => {
    setOnboardingStep(prev => prev + 1);
  }, []);

  const skipOnboarding = useCallback(() => {
    completeOnboarding();
  }, [completeOnboarding]);

  // Dev mode login function
  const devLogin = useCallback(async (email) => {
    if (!isDevMode) {
      throw new Error('Dev mode is not enabled');
    }

    try {
      const response = await authService.devLogin(email);
      const { token, user } = response;

      // Extract expiration time from JWT token
      let expiresIn = 3600; // Default to 1 hour
      try {
        // Validate token format before parsing
        if (!token || typeof token !== 'string') {
          throw new Error('Invalid token format in devLogin');
        }
        if (!token.includes('.') || token.split('.').length !== 3) {
          throw new Error('Invalid JWT format in devLogin');
        }

        const payload = JSON.parse(atob(token.split('.')[1]));
        const exp = payload.exp;
        const iat = payload.iat || (Date.now() / 1000);
        expiresIn = exp - iat; // Calculate seconds until expiration
      } catch (error) {
        // Token parsing failed, use default expiration
      }

      // Store securely
      tokenService.setToken(token, null, expiresIn);
      // Note: User data and dev mode preferences are less sensitive, can use sessionStorage
      sessionStorage.setItem('user', JSON.stringify(user));
      sessionStorage.setItem('devModeLastUser', email);

      // Update state
      setToken(token);
      setUser(user);

      // Set auth header for future requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      // Check onboarding status
      checkOnboardingStatus(user);

      toast.success(`Switched to ${user.role}: ${user.firstName} ${user.lastName}`);

      return response;
    } catch (error) {
      toast.error('Dev login failed');
      throw error;
    }
  }, [isDevMode, checkOnboardingStatus]);

  const getTokenTimeRemaining = () => {
    if (!token) return 0;
    return getTimeUntilExpiration(token);
  };

  const isTokenExpiringSoon = (minutesThreshold = 5) => {
    const timeRemaining = getTokenTimeRemaining();
    return timeRemaining > 0 && timeRemaining <= (minutesThreshold * 60 * 1000);
  };

  const value = {
    user,
    token,
    isLoading,
    login,
    logout,
    devLogin,
    isDevMode,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isManager: user?.role === 'manager',
    isCrew: user?.role === 'crew',
    isManagerOrAdmin: user?.role === 'manager' || user?.role === 'admin',
    hasRoleAccess: (requiredRole) => {
      const roleHierarchy = { 'admin': 3, 'manager': 2, 'crew': 1 };
      return roleHierarchy[user?.role] >= roleHierarchy[requiredRole];
    },
    getTokenTimeRemaining,
    isTokenExpiringSoon,
    tokenExpirationTime: token ? getTokenExpirationTime(token) : null,
    // Onboarding state and functions
    needsOnboarding,
    onboardingStep,
    completeOnboarding,
    nextOnboardingStep,
    skipOnboarding
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
