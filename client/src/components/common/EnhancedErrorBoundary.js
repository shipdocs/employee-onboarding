// Enhanced Error Boundary for Phase 3.3
// Provides maritime-friendly error handling with internationalization

import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, RefreshCw, Home, Mail } from 'lucide-react';
import errorHandler from '../../services/errorHandlingService';
import frontendErrorLogger from '../../services/frontendErrorLogging';

class ErrorBoundaryClass extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Log error for debugging (existing service)
    errorHandler.logError(error, 'react_error_boundary', {
      componentStack: errorInfo.componentStack,
      errorBoundary: this.constructor.name
    });

    // Log to new frontend error logging service
    frontendErrorLogger.logReactError(error, errorInfo, this.constructor.name);

    // Report to error tracking service in production
    if (process.env.NODE_ENV === 'production') {
      // console.error('React Error Boundary caught an error:', error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }));
  };

  handleRefresh = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          retryCount={this.state.retryCount}
          onRetry={this.handleRetry}
          onRefresh={this.handleRefresh}
          onGoHome={this.handleGoHome}
          {...this.props}
        />
      );
    }

    return this.props.children;
  }
}

// Error fallback component with internationalization
function ErrorFallback({
  error,
  errorInfo,
  retryCount,
  onRetry,
  onRefresh,
  onGoHome,
  context = 'general'
}) {
  const { t } = useTranslation(['errors', 'common']);

  const getErrorTitle = () => {
    if (retryCount > 2) {
      return t('errors:user_friendly.technical_difficulties');
    }
    return t('errors:user_friendly.something_went_wrong');
  };

  const getErrorMessage = () => {
    if (error?.message?.includes('ChunkLoadError') || error?.message?.includes('Loading chunk')) {
      return t('errors:network.slow_connection');
    }

    if (error?.message?.includes('Network')) {
      return t('errors:network.connection_lost');
    }

    if (retryCount > 2) {
      return t('errors:user_friendly.working_on_it');
    }

    return t('errors:user_friendly.please_try_again');
  };

  const getRecoveryActions = () => {
    const actions = [];

    if (retryCount < 3) {
      actions.push({
        label: t('errors:actions.retry'),
        action: onRetry,
        primary: true,
        icon: RefreshCw
      });
    }

    actions.push({
      label: t('errors:actions.refresh'),
      action: onRefresh,
      primary: retryCount >= 3,
      icon: RefreshCw
    });

    actions.push({
      label: t('errors:actions.go_back'),
      action: onGoHome,
      icon: Home
    });

    return actions;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-maritime-deep-blue via-maritime-navy to-maritime-dark-blue flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-6 text-center">
        {/* Error Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
        </div>

        {/* Error Title */}
        <h1 className="text-xl font-bold text-gray-900 mb-2">
          {getErrorTitle()}
        </h1>

        {/* Error Message */}
        <p className="text-gray-600 mb-6">
          {getErrorMessage()}
        </p>

        {/* Recovery Actions */}
        <div className="space-y-3 mb-6">
          {getRecoveryActions().map((action, index) => (
            <button
              key={index}
              onClick={action.action}
              className={`w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                action.primary
                  ? 'bg-maritime-light-green text-white hover:bg-maritime-green'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <action.icon className="w-4 h-4" />
              <span>{action.label}</span>
            </button>
          ))}
        </div>

        {/* Help Section */}
        <div className="border-t pt-4">
          <p className="text-sm text-gray-500 mb-2">
            {t('errors:help.still_stuck')}
          </p>
          <div className="flex items-center justify-center space-x-2 text-sm text-maritime-blue">
            <Mail className="w-4 h-4" />
            <span>{t('errors:help.contact_info')}</span>
          </div>
        </div>

        {/* Debug Info (Development Only) */}
        {process.env.NODE_ENV === 'development' && error && (
          <details className="mt-4 text-left">
            <summary className="text-sm text-gray-500 cursor-pointer">
              Debug Information
            </summary>
            <div className="mt-2 p-3 bg-gray-100 rounded text-xs font-mono text-gray-700 overflow-auto max-h-32">
              <div className="mb-2">
                <strong>Error:</strong> {error.message}
              </div>
              {error.stack && (
                <div className="mb-2">
                  <strong>Stack:</strong>
                  <pre className="whitespace-pre-wrap">{error.stack}</pre>
                </div>
              )}
              {errorInfo?.componentStack && (
                <div>
                  <strong>Component Stack:</strong>
                  <pre className="whitespace-pre-wrap">{errorInfo.componentStack}</pre>
                </div>
              )}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

// Enhanced Error Boundary with context support
export function EnhancedErrorBoundary({ children, context = 'general' }) {
  return (
    <ErrorBoundaryClass context={context}>
      {children}
    </ErrorBoundaryClass>
  );
}

// Hook for manual error reporting
export function useErrorReporting() {
  const reportError = (error, context = 'manual', additionalInfo = {}) => {
    // Log to existing service
    errorHandler.logError(error, context, additionalInfo);
    errorHandler.showError(error, context);

    // Log to new frontend error logging service
    frontendErrorLogger.logCustomError(error.message || 'Manual error report', {
      context,
      ...additionalInfo
    });
  };

  return { reportError };
}

export default EnhancedErrorBoundary;
