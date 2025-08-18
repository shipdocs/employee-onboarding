import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ThemeToggle from '../ThemeToggle';
import { ThemeProvider } from '../../contexts/ThemeContext';
import * as featureFlags from '../../services/featureFlags';

// Mock the feature flags service
jest.mock('../../services/featureFlags', () => ({
  isEnabled: jest.fn()
}));

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
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn()
  }))
});

const renderThemeToggle = (props = {}) => {
  return render(
    <ThemeProvider>
      <ThemeToggle {...props} />
    </ThemeProvider>
  );
};

describe('ThemeToggle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    featureFlags.isEnabled.mockReturnValue(true);
  });

  afterEach(() => {
    document.documentElement.className = '';
    document.documentElement.removeAttribute('data-theme');
  });

  it('should render theme toggle button when feature is enabled', () => {
    featureFlags.isEnabled.mockReturnValue(true);

    renderThemeToggle();

    const toggleButton = screen.getByRole('switch');
    expect(toggleButton).toBeInTheDocument();
    expect(toggleButton).toHaveAttribute('aria-label', 'Switch to dark mode');
  });

  it('should not render when dark mode feature is disabled', () => {
    featureFlags.isEnabled.mockReturnValue(false);

    renderThemeToggle();

    const toggleButton = screen.queryByRole('switch');
    expect(toggleButton).not.toBeInTheDocument();
  });

  it('should toggle theme when clicked', () => {
    renderThemeToggle();

    const toggleButton = screen.getByRole('switch');

    // Initially should be light mode
    expect(toggleButton).toHaveAttribute('aria-label', 'Switch to dark mode');
    expect(toggleButton).toHaveAttribute('aria-pressed', 'false');

    // Click to toggle to dark mode
    fireEvent.click(toggleButton);

    expect(toggleButton).toHaveAttribute('aria-label', 'Switch to light mode');
    expect(toggleButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('should handle keyboard navigation', () => {
    renderThemeToggle();

    const toggleButton = screen.getByRole('switch');

    // Test Enter key
    fireEvent.keyDown(toggleButton, { key: 'Enter' });
    expect(toggleButton).toHaveAttribute('aria-pressed', 'true');

    // Test Space key
    fireEvent.keyDown(toggleButton, { key: ' ' });
    expect(toggleButton).toHaveAttribute('aria-pressed', 'false');
  });

  it('should render with different sizes', () => {
    const { rerender } = renderThemeToggle({ size: 'sm' });

    let toggleButton = screen.getByRole('switch');
    expect(toggleButton).toHaveClass('w-8', 'h-8');

    rerender(
      <ThemeProvider>
        <ThemeToggle size="lg" />
      </ThemeProvider>
    );

    toggleButton = screen.getByRole('switch');
    expect(toggleButton).toHaveClass('w-12', 'h-12');
  });

  it('should show label when showLabel is true', () => {
    renderThemeToggle({ showLabel: true });

    expect(screen.getByText('Light')).toBeInTheDocument();

    // Toggle to dark mode
    const toggleButton = screen.getByRole('switch');
    fireEvent.click(toggleButton);

    expect(screen.getByText('Dark')).toBeInTheDocument();
  });

  it('should have proper accessibility attributes', () => {
    renderThemeToggle();

    const toggleButton = screen.getByRole('switch');

    expect(toggleButton).toHaveAttribute('role', 'switch');
    expect(toggleButton).toHaveAttribute('aria-label');
    expect(toggleButton).toHaveAttribute('aria-pressed');
    expect(toggleButton).toHaveAttribute('title');
  });

  it('should apply custom className', () => {
    renderThemeToggle({ className: 'custom-class' });

    const container = screen.getByRole('switch').parentElement;
    expect(container).toHaveClass('custom-class');
  });

  it('should check DARK_MODE_ENABLED feature flag', () => {
    renderThemeToggle();

    expect(featureFlags.isEnabled).toHaveBeenCalledWith('DARK_MODE_ENABLED');
  });

  it('should prevent default on keyboard events', () => {
    renderThemeToggle();

    const toggleButton = screen.getByRole('switch');
    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    const preventDefaultSpy = jest.spyOn(event, 'preventDefault');

    fireEvent.keyDown(toggleButton, event);

    expect(preventDefaultSpy).toHaveBeenCalled();
  });
});
