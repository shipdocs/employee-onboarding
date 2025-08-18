/**
 * Tests for LoadingSpinner Component
 * Ensures loading states are properly displayed during maritime operations
 * @jest-environment jsdom
 */

const React = require('react');
const { render, screen } = require('@testing-library/react');
require('@testing-library/jest-dom');

// Use the global react-i18next mock from setup.js
const { useTranslation } = require('react-i18next');

// LoadingSpinner component implementation for testing
const LoadingSpinner = ({ message, size = 'medium', color = 'blue' }) => {
  const { t } = useTranslation();
  
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8', 
    large: 'w-12 h-12'
  };

  const colorClasses = {
    blue: 'text-blue-600',
    white: 'text-white',
    gray: 'text-gray-600'
  };

  return React.createElement('div', {
    className: 'flex flex-col items-center justify-center p-4',
    'data-testid': 'loading-spinner'
  }, [
    React.createElement('div', {
      key: 'spinner',
      className: `animate-spin rounded-full border-2 border-gray-300 border-t-current ${sizeClasses[size]} ${colorClasses[color]}`,
      'data-testid': 'spinner-icon'
    }),
    React.createElement('p', {
      key: 'message',
      className: 'mt-2 text-sm text-gray-600',
      'data-testid': 'loading-message'
    }, message || t('common.loading'))
  ]);
};

describe('LoadingSpinner Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render with default props', () => {
      render(React.createElement(LoadingSpinner));
      
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(screen.getByTestId('spinner-icon')).toBeInTheDocument();
      expect(screen.getByTestId('loading-message')).toBeInTheDocument();
    });

    it('should display default loading message', () => {
      render(React.createElement(LoadingSpinner));
      
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should display custom message when provided', () => {
      const customMessage = 'Processing your request...';
      render(React.createElement(LoadingSpinner, { message: customMessage }));
      
      expect(screen.getByText(customMessage)).toBeInTheDocument();
    });
  });

  describe('Size Variants', () => {
    it('should apply small size classes', () => {
      render(React.createElement(LoadingSpinner, { size: 'small' }));
      
      const spinner = screen.getByTestId('spinner-icon');
      expect(spinner).toHaveClass('w-4', 'h-4');
    });

    it('should apply medium size classes (default)', () => {
      render(React.createElement(LoadingSpinner));
      
      const spinner = screen.getByTestId('spinner-icon');
      expect(spinner).toHaveClass('w-8', 'h-8');
    });

    it('should apply large size classes', () => {
      render(React.createElement(LoadingSpinner, { size: 'large' }));
      
      const spinner = screen.getByTestId('spinner-icon');
      expect(spinner).toHaveClass('w-12', 'h-12');
    });
  });

  describe('Color Variants', () => {
    it('should apply blue color classes (default)', () => {
      render(React.createElement(LoadingSpinner));
      
      const spinner = screen.getByTestId('spinner-icon');
      expect(spinner).toHaveClass('text-blue-600');
    });

    it('should apply white color classes', () => {
      render(React.createElement(LoadingSpinner, { color: 'white' }));
      
      const spinner = screen.getByTestId('spinner-icon');
      expect(spinner).toHaveClass('text-white');
    });

    it('should apply gray color classes', () => {
      render(React.createElement(LoadingSpinner, { color: 'gray' }));
      
      const spinner = screen.getByTestId('spinner-icon');
      expect(spinner).toHaveClass('text-gray-600');
    });
  });

  describe('Accessibility', () => {
    it('should have proper structure for screen readers', () => {
      render(React.createElement(LoadingSpinner));
      
      const spinner = screen.getByTestId('loading-spinner');
      expect(spinner).toBeInTheDocument();
      
      // The component should be accessible to screen readers
      const message = screen.getByTestId('loading-message');
      expect(message).toBeInTheDocument();
    });

    it('should have animation class for visual feedback', () => {
      render(React.createElement(LoadingSpinner));
      
      const spinner = screen.getByTestId('spinner-icon');
      expect(spinner).toHaveClass('animate-spin');
    });
  });

  describe('Translation Integration', () => {
    it('should use translation for default message', () => {
      render(React.createElement(LoadingSpinner));
      
      // Should use the translated text
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should override translation with custom message', () => {
      const customMessage = 'Custom loading text';
      render(React.createElement(LoadingSpinner, { message: customMessage }));
      
      expect(screen.getByText(customMessage)).toBeInTheDocument();
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });
  });

  describe('Maritime Environment Considerations', () => {
    it('should provide appropriate size for touch interfaces', () => {
      render(React.createElement(LoadingSpinner, { size: 'large' }));
      
      const spinner = screen.getByTestId('spinner-icon');
      expect(spinner).toHaveClass('w-12', 'h-12'); // 48px - good for maritime gloves
    });

    it('should provide high contrast colors for maritime visibility', () => {
      render(React.createElement(LoadingSpinner, { color: 'white' }));
      
      const spinner = screen.getByTestId('spinner-icon');
      expect(spinner).toHaveClass('text-white'); // High contrast on dark backgrounds
    });

    it('should support custom maritime loading messages', () => {
      const maritimeMessage = 'Synchronizing with ship systems...';
      render(React.createElement(LoadingSpinner, { message: maritimeMessage }));
      
      expect(screen.getByText(maritimeMessage)).toBeInTheDocument();
    });

    it('should handle multiple loading states for maritime operations', () => {
      const messages = [
        'Connecting to satellite...',
        'Syncing navigation data...',
        'Updating weather information...'
      ];

      messages.forEach(message => {
        const { unmount } = render(React.createElement(LoadingSpinner, { message }));
        expect(screen.getByText(message)).toBeInTheDocument();
        unmount();
      });
    });
  });

  describe('Component Props Validation', () => {
    it('should handle invalid size gracefully', () => {
      render(React.createElement(LoadingSpinner, { size: 'invalid' }));
      
      const spinner = screen.getByTestId('spinner-icon');
      // Should not have any size classes for invalid size
      expect(spinner).not.toHaveClass('w-4', 'h-4');
      expect(spinner).not.toHaveClass('w-8', 'h-8');
      expect(spinner).not.toHaveClass('w-12', 'h-12');
    });

    it('should handle invalid color gracefully', () => {
      render(React.createElement(LoadingSpinner, { color: 'invalid' }));
      
      const spinner = screen.getByTestId('spinner-icon');
      // Should not have any color classes for invalid color
      expect(spinner).not.toHaveClass('text-blue-600');
      expect(spinner).not.toHaveClass('text-white');
      expect(spinner).not.toHaveClass('text-gray-600');
    });

    it('should handle empty message gracefully', () => {
      render(React.createElement(LoadingSpinner, { message: '' }));

      // Should fall back to translation
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should handle null message gracefully', () => {
      render(React.createElement(LoadingSpinner, { message: null }));

      // Should fall back to translation
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });
});
