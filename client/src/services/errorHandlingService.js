// Enhanced Error Handling Service for Phase 3.3
// Provides maritime-friendly error messages with internationalization support

import toast from 'react-hot-toast';
import i18n from '../i18n';

class ErrorHandlingService {
  constructor() {
    this.defaultDuration = 5000;
    this.networkErrorDuration = 7000;
    this.criticalErrorDuration = 10000;
  }

  // Get current language for error messages
  getCurrentLanguage() {
    return i18n.language || 'en';
  }

  // Translate error message with fallback
  translateError(key, options = {}) {
    try {
      return i18n.t(`errors:${key}`, options);
    } catch (error) {
      // console.warn(`Translation missing for errors:${key}`, error);
      return i18n.t('common:errors.generic', options);
    }
  }

  // Determine error type from error object
  categorizeError(error) {
    if (!error) return 'unknown';

    // Network errors
    if (!error.response && (error.code === 'NETWORK_ERROR' || error.message?.includes('Network Error'))) {
      return 'network';
    }

    // Timeout errors
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return 'timeout';
    }

    // HTTP status-based categorization
    if (error.response?.status) {
      const status = error.response.status;

      if (status === 401) return 'authentication';
      if (status === 403) return 'authorization';
      if (status === 404) return 'not_found';
      if (status === 422) return 'validation';
      if (status >= 500) return 'server';
    }

    // API-specific errors
    if (error.response?.data?.error) {
      const errorMessage = error.response.data.error.toLowerCase();

      if (errorMessage.includes('session') || errorMessage.includes('token')) {
        return 'authentication';
      }
      if (errorMessage.includes('permission') || errorMessage.includes('access')) {
        return 'authorization';
      }
      if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
        return 'validation';
      }
    }

    return 'generic';
  }

  // Get appropriate error message based on context and error type
  getErrorMessage(error, context = 'general') {
    const errorType = this.categorizeError(error);
    const errorData = error.response?.data;

    switch (errorType) {
      case 'network':
        if (navigator.onLine === false) {
          return this.translateError('network.offline');
        }
        return this.translateError('network.connection_lost');

      case 'timeout':
        return this.translateError('network.timeout');

      case 'authentication':
        if (errorData?.error?.includes('expired')) {
          return this.translateError('authentication.session_expired');
        }
        if (errorData?.error?.includes('login link')) {
          return this.translateError('authentication.login_link_expired');
        }
        return this.translateError('authentication.login_failed');

      case 'authorization':
        return this.translateError('authentication.access_denied');

      case 'not_found':
        return this.getContextualNotFoundMessage(context);

      case 'validation':
        return this.getValidationErrorMessage(errorData);

      case 'server':
        return this.translateError('server.internal_error');

      default:
        return this.getContextualGenericMessage(context, errorData);
    }
  }

  // Get context-specific not found messages
  getContextualNotFoundMessage(context) {
    switch (context) {
      case 'training':
        return this.translateError('training.item_load_failed');
      case 'quiz':
        return this.translateError('training.quiz_load_failed');
      case 'certificate':
        return this.translateError('certificates.not_eligible');
      default:
        return this.translateError('common:errors.not_found');
    }
  }

  // Get validation error message
  getValidationErrorMessage(errorData) {
    if (errorData?.details) {
      // Try to map specific validation errors
      const details = errorData.details.toLowerCase();
      if (details.includes('email')) {
        return this.translateError('form_validation.invalid_email');
      }
      if (details.includes('password')) {
        return this.translateError('form_validation.password_too_short');
      }
      if (details.includes('required')) {
        return this.translateError('form_validation.required_field');
      }
    }
    return this.translateError('common:errors.validationError');
  }

  // Get context-specific generic error messages
  getContextualGenericMessage(context, errorData) {
    switch (context) {
      case 'onboarding':
        return this.translateError('onboarding.progress_save_failed');
      case 'training':
        return this.translateError('training.completion_failed');
      case 'quiz':
        return this.translateError('training.quiz_submit_failed');
      case 'certificate':
        return this.translateError('certificates.generation_failed');
      case 'file_upload':
        return this.translateError('file_operations.upload_failed');
      default:
        return this.translateError('user_friendly.something_went_wrong');
    }
  }

  // Get recovery suggestions based on error type
  getRecoverySuggestions(error, context = 'general') {
    const errorType = this.categorizeError(error);

    switch (errorType) {
      case 'network':
        return [
          this.translateError('recovery.check_connection'),
          this.translateError('recovery.refresh_page'),
          this.translateError('recovery.try_again_later')
        ];

      case 'authentication':
        return [
          this.translateError('recovery.refresh_page'),
          this.translateError('actions.retry')
        ];

      case 'server':
        return [
          this.translateError('recovery.try_again_later'),
          this.translateError('recovery.refresh_page'),
          this.translateError('recovery.contact_support')
        ];

      default:
        return [
          this.translateError('actions.retry'),
          this.translateError('recovery.refresh_page')
        ];
    }
  }

  // Show error toast with enhanced UX
  showError(error, context = 'general', options = {}) {
    const message = this.getErrorMessage(error, context);
    const errorType = this.categorizeError(error);

    // Determine duration based on error severity
    let duration = this.defaultDuration;
    if (errorType === 'network') duration = this.networkErrorDuration;
    if (errorType === 'server') duration = this.criticalErrorDuration;

    const toastOptions = {
      duration: options.duration || duration,
      style: {
        background: '#dc2626',
        color: '#fff',
        fontSize: '14px',
        fontWeight: '500',
        borderRadius: '8px',
        padding: '12px 16px',
        maxWidth: '400px'
      },
      iconTheme: {
        primary: '#dc2626',
        secondary: '#fff'
      },
      ...options.toastOptions
    };

    // Add recovery action if specified
    if (options.showRecovery) {
      const suggestions = this.getRecoverySuggestions(error, context);
      const enhancedMessage = `${message}\n\n${this.translateError('help.what_to_do')} ${suggestions[0]}`;
      return toast.error(enhancedMessage, toastOptions);
    }

    return toast.error(message, toastOptions);
  }

  // Show success message with internationalization
  showSuccess(messageKey, options = {}) {
    const message = this.translateError(messageKey, options.params);

    return toast.success(message, {
      duration: 3000,
      style: {
        background: '#059669',
        color: '#fff',
        fontSize: '14px',
        fontWeight: '500',
        borderRadius: '8px',
        padding: '12px 16px'
      },
      iconTheme: {
        primary: '#059669',
        secondary: '#fff'
      },
      ...options.toastOptions
    });
  }

  // Show warning message
  showWarning(messageKey, options = {}) {
    const message = this.translateError(messageKey, options.params);

    return toast(message, {
      duration: 4000,
      icon: '⚠️',
      style: {
        background: '#d97706',
        color: '#fff',
        fontSize: '14px',
        fontWeight: '500',
        borderRadius: '8px',
        padding: '12px 16px'
      },
      ...options.toastOptions
    });
  }

  // Handle specific maritime errors
  handleMaritimeError(error, context) {
    const errorMessage = error.response?.data?.error?.toLowerCase() || '';

    if (errorMessage.includes('vessel')) {
      return this.showError(error, 'maritime', {
        customMessage: this.translateError('maritime_specific.vessel_data_unavailable')
      });
    }

    if (errorMessage.includes('crew record')) {
      return this.showError(error, 'maritime', {
        customMessage: this.translateError('maritime_specific.crew_record_sync_failed')
      });
    }

    if (errorMessage.includes('safety protocol')) {
      return this.showError(error, 'maritime', {
        customMessage: this.translateError('maritime_specific.safety_protocol_load_failed')
      });
    }

    // Fallback to general error handling
    return this.showError(error, context);
  }

  // Check if user is offline
  isOffline() {
    return navigator.onLine === false;
  }

  // Handle offline scenarios
  handleOfflineError() {
    return this.showWarning('network.offline', {
      duration: this.networkErrorDuration,
      showRecovery: true
    });
  }

  // Log errors for debugging (development only)
  logError(error, context, additionalInfo = {}) {
    if (process.env.NODE_ENV === 'development') {
      // console.group(`🚨 Error in ${context}`);
      // console.error('Error object:', error);
      // console.log('Error type:', this.categorizeError(error));
      // console.log('User language:', this.getCurrentLanguage());
      // console.log('Additional info:', additionalInfo);
      // console.groupEnd();
    }
  }
}

// Export singleton instance
export const errorHandler = new ErrorHandlingService();
export default errorHandler;
