import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, useTheme } from '../ThemeContext';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
global.localStorage = localStorageMock;

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn()
  }))
});

// Test component that uses the theme context
const TestComponent = () => {
  const { theme, toggleTheme, isDarkMode, isLightMode } = useTheme();

  return (
    <div>
      <div data-testid="current-theme">{theme}</div>
      <div data-testid="is-dark-mode">{isDarkMode.toString()}</div>
      <div data-testid="is-light-mode">{isLightMode.toString()}</div>
      <button data-testid="toggle-theme" onClick={toggleTheme}>
        Toggle Theme
      </button>
    </div>
  );
};

describe('ThemeContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    // Clean up DOM
    document.documentElement.className = '';
    document.documentElement.removeAttribute('data-theme');
  });

  it('should provide default light theme', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    expect(screen.getByTestId('current-theme')).toHaveTextContent('light');
    expect(screen.getByTestId('is-dark-mode')).toHaveTextContent('false');
    expect(screen.getByTestId('is-light-mode')).toHaveTextContent('true');
  });

  it('should toggle theme when toggleTheme is called', async () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    const toggleButton = screen.getByTestId('toggle-theme');

    // Initially light
    expect(screen.getByTestId('current-theme')).toHaveTextContent('light');

    // Toggle to dark
    fireEvent.click(toggleButton);

    await waitFor(() => {
      expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');
      expect(screen.getByTestId('is-dark-mode')).toHaveTextContent('true');
      expect(screen.getByTestId('is-light-mode')).toHaveTextContent('false');
    });

    // Toggle back to light
    fireEvent.click(toggleButton);

    await waitFor(() => {
      expect(screen.getByTestId('current-theme')).toHaveTextContent('light');
      expect(screen.getByTestId('is-dark-mode')).toHaveTextContent('false');
      expect(screen.getByTestId('is-light-mode')).toHaveTextContent('true');
    });
  });

  it('should apply theme classes to document element', async () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    const toggleButton = screen.getByTestId('toggle-theme');

    // Initially should have light class
    await waitFor(() => {
      expect(document.documentElement.classList.contains('light')).toBe(true);
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });

    // Toggle to dark
    fireEvent.click(toggleButton);

    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(document.documentElement.classList.contains('light')).toBe(false);
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });
  });

  it('should persist theme preference to localStorage', async () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    const toggleButton = screen.getByTestId('toggle-theme');

    // Toggle to dark
    fireEvent.click(toggleButton);

    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'burando-theme-preference',
        expect.stringContaining('"theme":"dark"')
      );
    });
  });

  it('should load theme preference from localStorage', () => {
    const storedTheme = JSON.stringify({
      theme: 'dark',
      timestamp: Date.now(),
      version: '1.0'
    });

    localStorageMock.getItem.mockReturnValue(storedTheme);

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');
    expect(screen.getByTestId('is-dark-mode')).toHaveTextContent('true');
  });

  it('should fallback to light theme for invalid localStorage data', () => {
    localStorageMock.getItem.mockReturnValue('invalid-json');

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    expect(screen.getByTestId('current-theme')).toHaveTextContent('light');
  });

  it('should fallback to light theme for outdated version', () => {
    const outdatedTheme = JSON.stringify({
      theme: 'dark',
      timestamp: Date.now(),
      version: '0.9' // outdated version
    });

    localStorageMock.getItem.mockReturnValue(outdatedTheme);

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    expect(screen.getByTestId('current-theme')).toHaveTextContent('light');
  });

  it('should detect system dark mode preference when no stored preference', () => {
    // Mock system dark mode preference
    window.matchMedia = jest.fn().mockImplementation(query => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn()
    }));

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');
  });

  it('should throw error when useTheme is used outside ThemeProvider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useTheme must be used within a ThemeProvider');

    consoleSpy.mockRestore();
  });
});
