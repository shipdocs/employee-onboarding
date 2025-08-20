/**
 * Component-Specific Error Boundaries
 * Provides specialized error boundaries for different component types
 */

import React from 'react';
import { AlertTriangle, RefreshCw, FileX, Users, BookOpen, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { EnhancedErrorBoundary } from './EnhancedErrorBoundary';
import frontendErrorLogger from '../../services/frontendErrorLogging';

// Training Module Error Boundary
export function TrainingErrorBoundary({ children, moduleName = 'unknown' }) {
  return (
    <EnhancedErrorBoundary context="training">
      <TrainingErrorFallback moduleName={moduleName}>
        {children}
      </TrainingErrorFallback>
    </EnhancedErrorBoundary>
  );
}

function TrainingErrorFallback({ moduleName, error, onRetry }) {
  const { t } = useTranslation(['errors', 'training']);

  const handleSkipModule = () => {
    // Log the skip action
    frontendErrorLogger.logCustomError('Training module skipped due to error', {
      moduleName,
      action: 'skip_module',
      errorMessage: error?.message
    });

    // Navigate to next module or training overview
    window.location.href = '/training';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 text-center">
      <div className="flex justify-center mb-4">
        <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
          <BookOpen className="w-6 h-6 text-orange-600" />
        </div>
      </div>

      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {t('errors:training.module_error')}
      </h3>

      <p className="text-gray-600 mb-4">
        {t('errors:training.module_error_description', { moduleName })}
      </p>

      <div className="space-y-2">
        <button
          onClick={onRetry}
          className="w-full bg-maritime-light-green text-white px-4 py-2 rounded-lg hover:bg-maritime-green transition-colors flex items-center justify-center space-x-2"
        >
          <RefreshCw className="w-4 h-4" />
          <span>{t('errors:actions.retry_module')}</span>
        </button>

        <button
          onClick={handleSkipModule}
          className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
        >
          {t('errors:actions.skip_module')}
        </button>
      </div>
    </div>
  );
}

// User Management Error Boundary
export function UserManagementErrorBoundary({ children }) {
  return (
    <EnhancedErrorBoundary context="user_management">
      <UserManagementErrorFallback>
        {children}
      </UserManagementErrorFallback>
    </EnhancedErrorBoundary>
  );
}

function UserManagementErrorFallback({ error, onRetry }) {
  const { t } = useTranslation(['errors', 'users']);

  return (
    <div className="bg-white rounded-lg shadow-md p-6 text-center">
      <div className="flex justify-center mb-4">
        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
          <Users className="w-6 h-6 text-blue-600" />
        </div>
      </div>

      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {t('errors:user_management.error')}
      </h3>

      <p className="text-gray-600 mb-4">
        {t('errors:user_management.error_description')}
      </p>

      <div className="space-y-2">
        <button
          onClick={onRetry}
          className="w-full bg-maritime-light-green text-white px-4 py-2 rounded-lg hover:bg-maritime-green transition-colors flex items-center justify-center space-x-2"
        >
          <RefreshCw className="w-4 h-4" />
          <span>{t('errors:actions.retry')}</span>
        </button>

        <button
          onClick={() => window.location.href = '/dashboard'}
          className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
        >
          {t('errors:actions.go_to_dashboard')}
        </button>
      </div>
    </div>
  );
}

// Settings Error Boundary
export function SettingsErrorBoundary({ children }) {
  return (
    <EnhancedErrorBoundary context="settings">
      <SettingsErrorFallback>
        {children}
      </SettingsErrorFallback>
    </EnhancedErrorBoundary>
  );
}

function SettingsErrorFallback({ error, onRetry }) {
  const { t } = useTranslation(['errors', 'settings']);

  return (
    <div className="bg-white rounded-lg shadow-md p-6 text-center">
      <div className="flex justify-center mb-4">
        <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
          <Settings className="w-6 h-6 text-purple-600" />
        </div>
      </div>

      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {t('errors:settings.error')}
      </h3>

      <p className="text-gray-600 mb-4">
        {t('errors:settings.error_description')}
      </p>

      <div className="space-y-2">
        <button
          onClick={onRetry}
          className="w-full bg-maritime-light-green text-white px-4 py-2 rounded-lg hover:bg-maritime-green transition-colors flex items-center justify-center space-x-2"
        >
          <RefreshCw className="w-4 h-4" />
          <span>{t('errors:actions.retry')}</span>
        </button>

        <button
          onClick={() => window.location.href = '/dashboard'}
          className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
        >
          {t('errors:actions.go_to_dashboard')}
        </button>
      </div>
    </div>
  );
}

// File Upload Error Boundary
export function FileUploadErrorBoundary({ children, onUploadError }) {
  return (
    <EnhancedErrorBoundary context="file_upload">
      <FileUploadErrorFallback onUploadError={onUploadError}>
        {children}
      </FileUploadErrorFallback>
    </EnhancedErrorBoundary>
  );
}

function FileUploadErrorFallback({ error, onRetry, onUploadError }) {
  const { t } = useTranslation(['errors', 'files']);

  const handleClearFiles = () => {
    if (onUploadError) {
      onUploadError();
    }
    onRetry();
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 text-center">
      <div className="flex justify-center mb-4">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
          <FileX className="w-6 h-6 text-red-600" />
        </div>
      </div>

      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {t('errors:file_upload.error')}
      </h3>

      <p className="text-gray-600 mb-4">
        {t('errors:file_upload.error_description')}
      </p>

      <div className="space-y-2">
        <button
          onClick={handleClearFiles}
          className="w-full bg-maritime-light-green text-white px-4 py-2 rounded-lg hover:bg-maritime-green transition-colors flex items-center justify-center space-x-2"
        >
          <RefreshCw className="w-4 h-4" />
          <span>{t('errors:actions.clear_and_retry')}</span>
        </button>

        <button
          onClick={onRetry}
          className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
        >
          {t('errors:actions.retry_upload')}
        </button>
      </div>
    </div>
  );
}

// Performance Monitor Error Boundary
export function PerformanceErrorBoundary({ children, componentName = 'unknown' }) {
  const [renderTime, setRenderTime] = React.useState(null);
  const startTime = React.useRef(Date.now());

  React.useEffect(() => {
    const endTime = Date.now();
    const duration = endTime - startTime.current;
    setRenderTime(duration);

    // Log slow renders
    if (duration > 1000) { // 1 second threshold
      frontendErrorLogger.logPerformanceIssue(
        'slow_render',
        duration,
        1000,
        { componentName }
      );
    }
  }, [componentName]);

  return (
    <EnhancedErrorBoundary context="performance">
      {children}
    </EnhancedErrorBoundary>
  );
}

// Async Component Error Boundary
export function AsyncErrorBoundary({ children, fallback = null }) {
  const [asyncError, setAsyncError] = React.useState(null);

  React.useEffect(() => {
    const handleUnhandledRejection = (event) => {
      setAsyncError(event.reason);
      frontendErrorLogger.logUnhandledRejection(event);
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  if (asyncError) {
    return fallback || (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />
          <span className="text-yellow-800">
            An async operation failed. Please refresh the page.
          </span>
        </div>
      </div>
    );
  }

  return (
    <EnhancedErrorBoundary context="async">
      {children}
    </EnhancedErrorBoundary>
  );
}

// Higher-Order Component for adding error boundaries
export function withErrorBoundary(Component, boundaryType = 'general') {
  const WrappedComponent = (props) => {
    const BoundaryComponent = {
      training: TrainingErrorBoundary,
      user_management: UserManagementErrorBoundary,
      settings: SettingsErrorBoundary,
      file_upload: FileUploadErrorBoundary,
      performance: PerformanceErrorBoundary,
      async: AsyncErrorBoundary
    }[boundaryType] || EnhancedErrorBoundary;

    return (
      <BoundaryComponent>
        <Component {...props} />
      </BoundaryComponent>
    );
  };

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

export default {
  TrainingErrorBoundary,
  UserManagementErrorBoundary,
  SettingsErrorBoundary,
  FileUploadErrorBoundary,
  PerformanceErrorBoundary,
  AsyncErrorBoundary,
  withErrorBoundary
};
