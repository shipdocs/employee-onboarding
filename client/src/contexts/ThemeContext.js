import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

const THEME_STORAGE_KEY = 'maritime-theme-preference';
const THEME_VERSION = '1.0';

// Theme configuration
const themeConfig = {
  light: {
    name: 'Light Mode',
    icon: 'sun',
    cssClass: 'light'
  },
  dark: {
    name: 'Dark Mode',
    icon: 'moon',
    cssClass: 'dark'
  }
};

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState('light');
  const [isInitialized, setIsInitialized] = useState(false);

  // Get system color scheme preference
  const getSystemPreference = useCallback(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  }, []);

  // Load theme preference from localStorage
  const loadThemePreference = useCallback(() => {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Validate stored theme preference
        if (parsed.version === THEME_VERSION &&
            (parsed.theme === 'light' || parsed.theme === 'dark')) {
          return parsed.theme;
        }
      }
    } catch (error) {
      console.warn('Failed to load theme preference from localStorage:', error);
    }

    // Fallback to system preference
    return getSystemPreference();
  }, [getSystemPreference]);

  // Save theme preference to localStorage
  const saveThemePreference = useCallback((newTheme) => {
    try {
      const themeData = {
        theme: newTheme,
        timestamp: Date.now(),
        version: THEME_VERSION
      };
      localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(themeData));
    } catch (error) {
      console.warn('Failed to save theme preference to localStorage:', error);
    }
  }, []);

  // Apply theme to document
  const applyTheme = useCallback((newTheme) => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;

      // Remove existing theme classes
      root.classList.remove('light', 'dark');

      // Add new theme class
      root.classList.add(newTheme);

      // Set data attribute for CSS custom properties
      root.setAttribute('data-theme', newTheme);
    }
  }, []);

  // Set theme with persistence and DOM updates
  const setTheme = useCallback((newTheme) => {
    if (newTheme !== 'light' && newTheme !== 'dark') {
      console.warn('Invalid theme:', newTheme, 'Defaulting to light');
      newTheme = 'light';
    }

    setThemeState(newTheme);
    applyTheme(newTheme);
    saveThemePreference(newTheme);
  }, [applyTheme, saveThemePreference]);

  // Toggle between light and dark themes
  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  }, [theme, setTheme]);

  // Initialize theme on mount
  useEffect(() => {
    const initialTheme = loadThemePreference();
    setThemeState(initialTheme);
    applyTheme(initialTheme);
    setIsInitialized(true);
  }, [loadThemePreference, applyTheme]);

  // Listen for system color scheme changes
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

      const handleChange = (e) => {
        // Only auto-switch if user hasn't manually set a preference
        try {
          const stored = localStorage.getItem(THEME_STORAGE_KEY);
          if (!stored) {
            const systemTheme = e.matches ? 'dark' : 'light';
            setTheme(systemTheme);
          }
        } catch (error) {
          // If localStorage fails, don't auto-switch
        }
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [setTheme]);

  const value = {
    theme,
    setTheme,
    toggleTheme,
    isDarkMode: theme === 'dark',
    isLightMode: theme === 'light',
    themeConfig,
    isInitialized
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;
