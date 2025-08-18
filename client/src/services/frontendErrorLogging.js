/**
 * Frontend Error Logging Service
 * Integrates with backend error handling system from T03_S01
 */

import React from 'react';
import { v4 as uuidv4 } from 'uuid';

class FrontendErrorLoggingService {
  constructor() {
    this.sessionId = uuidv4();
    this.errorQueue = [];
    this.isOnline = navigator.onLine;
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second

    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
  }

  handleOnline() {
    this.isOnline = true;
    this.flushErrorQueue();
  }

  handleOffline() {
    this.isOnline = false;
  }

  generateErrorId() {
    return `fe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async logError(type, error, context = {}) {
    const errorData = {
      id: this.generateErrorId(),
      type,
      message: error.message || 'Unknown error',
      stack: error.stack,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      url: window.location.href,
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      context: {
        ...context,
        reactVersion: React.version,
        environment: process.env.NODE_ENV
      }
    };

    // Add to queue for offline handling
    this.errorQueue.push(errorData);

    if (this.isOnline) {
      await this.sendErrorToBackend(errorData);
    } else {
      // console.warn('Offline: Error queued for later transmission', errorData);
    }

    // Always log to console in development
    if (process.env.NODE_ENV === 'development') {
      // console.group(`🚨 Frontend Error: ${type}`);
      // console.error('Error:', error);
      // console.log('Context:', context);
      // console.log('Error Data:', errorData);
      // console.groupEnd();
    }

    return errorData.id;
  }

  async sendErrorToBackend(errorData, retryCount = 0) {
    try {
      const response = await fetch('/api/errors/frontend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': this.sessionId
        },
        body: JSON.stringify(errorData)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Remove from queue on successful send
      this.errorQueue = this.errorQueue.filter(e => e.id !== errorData.id);

      // console.log(`✅ Error logged to backend: ${errorData.id}`);
      return true;

    } catch (error) {
      // console.error(`❌ Failed to log error to backend (attempt ${retryCount + 1}):`, error);

      // Retry logic
      if (retryCount < this.maxRetries) {
        setTimeout(() => {
          this.sendErrorToBackend(errorData, retryCount + 1);
        }, this.retryDelay * Math.pow(2, retryCount)); // Exponential backoff
      } else {
        // console.error(`❌ Max retries exceeded for error: ${errorData.id}`);
      }

      return false;
    }
  }

  async flushErrorQueue() {
    if (!this.isOnline || this.errorQueue.length === 0) {
      return;
    }

    // console.log(`📤 Flushing ${this.errorQueue.length} queued errors`);

    const promises = this.errorQueue.map(errorData =>
      this.sendErrorToBackend(errorData)
    );

    try {
      await Promise.allSettled(promises);
    } catch (error) {
      // console.error('Error flushing error queue:', error);
    }
  }

  // Log React Error Boundary errors
  logReactError(error, errorInfo, boundaryName = 'unknown') {
    return this.logError('REACT_ERROR_BOUNDARY', error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: boundaryName,
      errorInfo
    });
  }

  // Log unhandled promise rejections
  logUnhandledRejection(event) {
    const error = event.reason instanceof Error ? event.reason : new Error(event.reason);
    return this.logError('UNHANDLED_PROMISE_REJECTION', error, {
      reason: event.reason,
      promise: event.promise?.toString()
    });
  }

  // Log global JavaScript errors
  logGlobalError(event) {
    const error = new Error(event.message);
    error.stack = `${event.filename}:${event.lineno}:${event.colno}`;

    return this.logError('GLOBAL_JAVASCRIPT_ERROR', error, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    });
  }

  // Log custom application errors
  logCustomError(message, context = {}) {
    const error = new Error(message);
    return this.logError('CUSTOM_APPLICATION_ERROR', error, context);
  }

  // Log performance issues
  logPerformanceIssue(metric, value, threshold, context = {}) {
    const error = new Error(`Performance issue: ${metric} (${value}) exceeded threshold (${threshold})`);
    return this.logError('PERFORMANCE_ISSUE', error, {
      metric,
      value,
      threshold,
      ...context
    });
  }

  // Get error statistics
  getErrorStats() {
    return {
      sessionId: this.sessionId,
      queuedErrors: this.errorQueue.length,
      isOnline: this.isOnline,
      totalErrors: this.errorQueue.length
    };
  }

  // Clear error queue (for testing)
  clearErrorQueue() {
    this.errorQueue = [];
  }
}

// Create singleton instance
const frontendErrorLogger = new FrontendErrorLoggingService();

// Set up global error handlers
window.addEventListener('error', (event) => {
  frontendErrorLogger.logGlobalError(event);
});

window.addEventListener('unhandledrejection', (event) => {
  frontendErrorLogger.logUnhandledRejection(event);
});

// Export singleton and class for testing
export { frontendErrorLogger, FrontendErrorLoggingService };
export default frontendErrorLogger;
