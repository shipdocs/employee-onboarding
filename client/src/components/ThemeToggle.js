import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { isEnabled } from '../services/featureFlags';

const ThemeToggle = ({
  className = '',
  size = 'md',
  showLabel = false
}) => {
  const { theme, toggleTheme, isDarkMode } = useTheme();

  // Check if dark mode feature is enabled
  const isDarkModeEnabled = isEnabled('DARK_MODE_ENABLED');

  // Don't render if feature is disabled
  if (!isDarkModeEnabled) {
    return null;
  }

  // Size configurations
  const sizeClasses = {
    sm: {
      button: 'w-8 h-8 p-1.5',
      icon: 'w-4 h-4',
      text: 'text-xs'
    },
    md: {
      button: 'w-10 h-10 p-2',
      icon: 'w-5 h-5',
      text: 'text-sm'
    },
    lg: {
      button: 'w-12 h-12 p-2.5',
      icon: 'w-6 h-6',
      text: 'text-base'
    }
  };

  const currentSize = sizeClasses[size] || sizeClasses.md;

  // Icons as SVG components for better control
  const SunIcon = () => (
    <svg
      className={`${currentSize.icon} transition-all duration-300 ${isDarkMode ? 'rotate-180 opacity-0' : 'rotate-0 opacity-100'}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  );

  const MoonIcon = () => (
    <svg
      className={`${currentSize.icon} transition-all duration-300 ${isDarkMode ? 'rotate-0 opacity-100' : '-rotate-180 opacity-0'}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
      />
    </svg>
  );

  const handleToggle = () => {
    toggleTheme();
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleToggle();
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className={`
          ${currentSize.button}
          relative
          glass-button
          rounded-full
          flex items-center justify-center
          text-white
          transition-all duration-300 ease-in-out
          hover:scale-110 hover:shadow-lg
          focus:outline-none focus:ring-2 focus:ring-burando-teal focus:ring-opacity-50
          active:scale-95
          group
        `}
        aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        aria-pressed={isDarkMode}
        role="switch"
        title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {/* Background overlay for smooth transitions */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-burando-teal to-burando-teal-light opacity-90 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Icon container */}
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 flex items-center justify-center">
            <SunIcon />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <MoonIcon />
          </div>
        </div>
      </button>

      {showLabel && (
        <span className={`
          ${currentSize.text}
          font-medium
          text-gray-700 dark:text-gray-300
          transition-colors duration-300
        `}>
          {isDarkMode ? 'Dark' : 'Light'}
        </span>
      )}
    </div>
  );
};

export default ThemeToggle;
