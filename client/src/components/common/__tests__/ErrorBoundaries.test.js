/**
 * Error Boundary Tests
 * Tests for React Error Boundaries and error handling
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import { EnhancedErrorBoundary } from '../EnhancedErrorBoundary';
import {
  TrainingErrorBoundary,
  UserManagementErrorBoundary,
  SettingsErrorBoundary,
  withErrorBoundary
} from '../ComponentErrorBoundaries';
import frontendErrorLogger from '../../../services/frontendErrorLogging';

// Mock the error logging service
jest.mock('../../../services/frontendErrorLogging', () => ({
  logReactError: jest.fn(),
  logCustomError: jest.fn(),
  getErrorStats: jest.fn(() => ({
    sessionId: 'test-session',
    queuedErrors: 0,
    isOnline: true,
    totalErrors: 0
  }))
}));

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key
  })
}));

// Component that throws an error
function ThrowError({ shouldThrow = false, errorMessage = 'Test error' }) {
  if (shouldThrow) {
    throw new Error(errorMessage);
  }
  return <div>No error</div>;
}

// Component that throws async error
function ThrowAsyncError({ shouldThrow = false }) {
  React.useEffect(() => {
    if (shouldThrow) {
      Promise.reject(new Error('Async test error'));
    }
  }, [shouldThrow]);

  return <div>No async error</div>;
}

describe('EnhancedErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console.error for tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  test('renders children when there is no error', () => {
    render(
      <EnhancedErrorBoundary>
        <div>Test content</div>
      </EnhancedErrorBoundary>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  test('catches and displays error when child component throws', () => {
    render(
      <EnhancedErrorBoundary>
        <ThrowError shouldThrow={true} errorMessage="Test error message" />
      </EnhancedErrorBoundary>
    );

    expect(screen.getByText(/errors:user_friendly.something_went_wrong/)).toBeInTheDocument();
    expect(frontendErrorLogger.logReactError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String)
      }),
      'ErrorBoundaryClass'
    );
  });

  test('provides retry functionality', async () => {
    const { rerender } = render(
      <EnhancedErrorBoundary>
        <ThrowError shouldThrow={true} />
      </EnhancedErrorBoundary>
    );

    // Error should be displayed
    expect(screen.getByText(/errors:user_friendly.something_went_wrong/)).toBeInTheDocument();

    // Click retry button
    const retryButton = screen.getByText(/errors:actions.retry/);
    fireEvent.click(retryButton);

    // Re-render with no error
    rerender(
      <EnhancedErrorBoundary>
        <ThrowError shouldThrow={false} />
      </EnhancedErrorBoundary>
    );

    await waitFor(() => {
      expect(screen.getByText('No error')).toBeInTheDocument();
    });
  });

  test('shows different UI after multiple retries', () => {
    const { rerender } = render(
      <EnhancedErrorBoundary>
        <ThrowError shouldThrow={true} />
      </EnhancedErrorBoundary>
    );

    // Simulate multiple retries
    for (let i = 0; i < 3; i++) {
      const retryButton = screen.getByText(/errors:actions.retry/);
      fireEvent.click(retryButton);

      rerender(
        <EnhancedErrorBoundary>
          <ThrowError shouldThrow={true} />
        </EnhancedErrorBoundary>
      );
    }

    // After 3 retries, should show different message
    expect(screen.getByText(/errors:user_friendly.technical_difficulties/)).toBeInTheDocument();
  });
});

describe('TrainingErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  test('renders training-specific error UI', () => {
    render(
      <TrainingErrorBoundary moduleName="Safety Training">
        <ThrowError shouldThrow={true} />
      </TrainingErrorBoundary>
    );

    expect(screen.getByText(/errors:training.module_error/)).toBeInTheDocument();
  });

  test('provides skip module functionality', () => {
    // Mock window.location.href
    delete window.location;
    window.location = { href: '' };

    render(
      <TrainingErrorBoundary moduleName="Safety Training">
        <ThrowError shouldThrow={true} />
      </TrainingErrorBoundary>
    );

    const skipButton = screen.getByText(/errors:actions.skip_module/);
    fireEvent.click(skipButton);

    expect(frontendErrorLogger.logCustomError).toHaveBeenCalledWith(
      'Training module skipped due to error',
      expect.objectContaining({
        moduleName: 'Safety Training',
        action: 'skip_module'
      })
    );
  });
});

describe('UserManagementErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  test('renders user management specific error UI', () => {
    render(
      <UserManagementErrorBoundary>
        <ThrowError shouldThrow={true} />
      </UserManagementErrorBoundary>
    );

    expect(screen.getByText(/errors:user_management.error/)).toBeInTheDocument();
  });

  test('provides navigation to dashboard', () => {
    delete window.location;
    window.location = { href: '' };

    render(
      <UserManagementErrorBoundary>
        <ThrowError shouldThrow={true} />
      </UserManagementErrorBoundary>
    );

    const dashboardButton = screen.getByText(/errors:actions.go_to_dashboard/);
    fireEvent.click(dashboardButton);

    expect(window.location.href).toBe('/dashboard');
  });
});

describe('withErrorBoundary HOC', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  test('wraps component with error boundary', () => {
    const TestComponent = () => <div>Test Component</div>;
    const WrappedComponent = withErrorBoundary(TestComponent);

    render(<WrappedComponent />);

    expect(screen.getByText('Test Component')).toBeInTheDocument();
  });

  test('catches errors in wrapped component', () => {
    const ErrorComponent = () => {
      throw new Error('HOC test error');
    };
    const WrappedComponent = withErrorBoundary(ErrorComponent);

    render(<WrappedComponent />);

    expect(screen.getByText(/errors:user_friendly.something_went_wrong/)).toBeInTheDocument();
  });

  test('uses specific boundary type', () => {
    const ErrorComponent = () => {
      throw new Error('Training error');
    };
    const WrappedComponent = withErrorBoundary(ErrorComponent, 'training');

    render(<WrappedComponent />);

    expect(screen.getByText(/errors:training.module_error/)).toBeInTheDocument();
  });
});

describe('Error Logging Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  test('logs errors to frontend error logger', () => {
    render(
      <EnhancedErrorBoundary>
        <ThrowError shouldThrow={true} errorMessage="Integration test error" />
      </EnhancedErrorBoundary>
    );

    expect(frontendErrorLogger.logReactError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Integration test error'
      }),
      expect.objectContaining({
        componentStack: expect.any(String)
      }),
      'ErrorBoundaryClass'
    );
  });

  test('handles async errors', async () => {
    // Mock unhandledrejection event
    const unhandledRejectionEvent = new Event('unhandledrejection');
    unhandledRejectionEvent.reason = new Error('Async error');

    render(
      <EnhancedErrorBoundary>
        <ThrowAsyncError shouldThrow={true} />
      </EnhancedErrorBoundary>
    );

    // Simulate unhandled rejection
    act(() => {
      window.dispatchEvent(unhandledRejectionEvent);
    });

    // The error should be logged (this would be handled by the global error handler)
    // In a real scenario, this would trigger the frontend error logger
  });
});

describe('Error Recovery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  test('resets error state on successful retry', async () => {
    let shouldThrow = true;

    const { rerender } = render(
      <EnhancedErrorBoundary>
        <ThrowError shouldThrow={shouldThrow} />
      </EnhancedErrorBoundary>
    );

    // Error should be displayed
    expect(screen.getByText(/errors:user_friendly.something_went_wrong/)).toBeInTheDocument();

    // Change the error condition
    shouldThrow = false;

    // Click retry
    const retryButton = screen.getByText(/errors:actions.retry/);
    fireEvent.click(retryButton);

    // Re-render without error
    rerender(
      <EnhancedErrorBoundary>
        <ThrowError shouldThrow={shouldThrow} />
      </EnhancedErrorBoundary>
    );

    await waitFor(() => {
      expect(screen.getByText('No error')).toBeInTheDocument();
    });
  });

  test('maintains retry count across attempts', () => {
    const { rerender } = render(
      <EnhancedErrorBoundary>
        <ThrowError shouldThrow={true} />
      </EnhancedErrorBoundary>
    );

    // First retry
    fireEvent.click(screen.getByText(/errors:actions.retry/));
    rerender(
      <EnhancedErrorBoundary>
        <ThrowError shouldThrow={true} />
      </EnhancedErrorBoundary>
    );

    // Second retry
    fireEvent.click(screen.getByText(/errors:actions.retry/));
    rerender(
      <EnhancedErrorBoundary>
        <ThrowError shouldThrow={true} />
      </EnhancedErrorBoundary>
    );

    // Third retry
    fireEvent.click(screen.getByText(/errors:actions.retry/));
    rerender(
      <EnhancedErrorBoundary>
        <ThrowError shouldThrow={true} />
      </EnhancedErrorBoundary>
    );

    // After 3 retries, should show different UI
    expect(screen.getByText(/errors:user_friendly.technical_difficulties/)).toBeInTheDocument();
  });
});
