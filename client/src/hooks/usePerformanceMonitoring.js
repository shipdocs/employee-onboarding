/**
 * Performance Monitoring Hook
 * Provides easy access to performance monitoring functionality
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';

const usePerformanceMonitoring = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState({});
  const [isMonitoring, setIsMonitoring] = useState(false);
  const metricsRef = useRef({});
  const sessionStartTime = useRef(Date.now());

  // Initialize performance monitoring
  useEffect(() => {
    if (user && !isMonitoring) {
      startMonitoring();
    }

    return () => {
      if (isMonitoring) {
        stopMonitoring();
      }
    };
  }, [user, isMonitoring]);

  const startMonitoring = useCallback(() => {
    setIsMonitoring(true);
    sessionStartTime.current = Date.now();

    // Set up performance observers
    if ('PerformanceObserver' in window) {
      // Monitor navigation timing
      const navObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === 'navigation') {
            recordMetric('page_load_time', entry.loadEventEnd - entry.loadEventStart);
            recordMetric('dom_content_loaded', entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart);
            recordMetric('first_contentful_paint', entry.loadEventEnd - entry.fetchStart);
          }
        });
      });

      try {
        navObserver.observe({ entryTypes: ['navigation'] });
      } catch (error) {
        // console.warn('Navigation timing not supported:', error);
      }

      // Monitor resource timing
      const resourceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === 'resource') {
            recordMetric('resource_load_time', entry.responseEnd - entry.requestStart, {
              resource: entry.name.split('/').pop(),
              type: entry.initiatorType
            });
          }
        });
      });

      try {
        resourceObserver.observe({ entryTypes: ['resource'] });
      } catch (error) {
        // console.warn('Resource timing not supported:', error);
      }

      // Monitor largest contentful paint
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        if (lastEntry) {
          recordMetric('largest_contentful_paint', lastEntry.startTime);
        }
      });

      try {
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (error) {
        // console.warn('LCP not supported:', error);
      }

      // Monitor cumulative layout shift
      const clsObserver = new PerformanceObserver((list) => {
        let clsValue = 0;
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        recordMetric('cumulative_layout_shift', clsValue);
      });

      try {
        clsObserver.observe({ entryTypes: ['layout-shift'] });
      } catch (error) {
        // console.warn('CLS not supported:', error);
      }
    }

    // Monitor connection quality
    monitorConnectionQuality();

    // Monitor device performance
    monitorDevicePerformance();

    // console.log('🔍 Performance monitoring started');
  }, [user]);

  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);

    // Send final session metrics
    const sessionDuration = Date.now() - sessionStartTime.current;
    recordMetric('session_duration', sessionDuration);

    // console.log('🔍 Performance monitoring stopped');
  }, []);

  const recordMetric = useCallback((name, value, tags = {}) => {
    const metric = {
      name,
      value,
      unit: getMetricUnit(name),
      timestamp: new Date().toISOString(),
      tags: {
        ...tags,
        userId: user?.id,
        sessionId: getSessionId(),
        userAgent: navigator.userAgent,
        connectionStatus: navigator.onLine ? 'online' : 'offline',
        ...getMaritimeContext()
      }
    };

    // Store in local state
    metricsRef.current[name] = metric;
    setMetrics(prev => ({ ...prev, [name]: metric }));

    // Send to backend (with debouncing)
    debouncedSendMetric(metric);
  }, [user]);

  const getMetricUnit = (name) => {
    const timeMetrics = [
      'page_load_time', 'dom_content_loaded', 'first_contentful_paint',
      'largest_contentful_paint', 'resource_load_time', 'api_response_time',
      'session_duration'
    ];

    if (timeMetrics.includes(name)) return 'ms';
    if (name === 'cumulative_layout_shift') return 'score';
    if (name.includes('_rate')) return '%';
    if (name.includes('_count')) return 'count';
    return 'value';
  };

  const getSessionId = useCallback(() => {
    let sessionId = sessionStorage.getItem('performanceSessionId');
    if (!sessionId) {
      sessionId = `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('performanceSessionId', sessionId);
    }
    return sessionId;
  }, []);

  const getMaritimeContext = useCallback(() => {
    return {
      vessel: user?.vessel_assignment || 'unknown',
      position: user?.position || 'unknown',
      location: detectLocation(),
      deviceType: detectDeviceType(),
      connectionQuality: detectConnectionQuality()
    };
  }, [user]);

  const detectLocation = () => {
    // Simple heuristic based on connection type and speed
    const connection = navigator.connection;
    if (!connection) return 'unknown';

    if (connection.effectiveType === '2g' || connection.downlink < 1) {
      return 'at_sea';
    } else if (connection.effectiveType === '3g' || connection.downlink < 5) {
      return 'in_port';
    } else {
      return 'onshore';
    }
  };

  const detectDeviceType = () => {
    const userAgent = navigator.userAgent;
    if (/Mobile|Android|iPhone/i.test(userAgent)) return 'mobile';
    if (/Tablet|iPad/i.test(userAgent)) return 'tablet';
    return 'desktop';
  };

  const detectConnectionQuality = () => {
    if (!navigator.onLine) return 'offline';

    const connection = navigator.connection;
    if (!connection) return 'good';

    switch (connection.effectiveType) {
      case '4g': return 'excellent';
      case '3g': return 'good';
      case '2g': return 'fair';
      default: return 'poor';
    }
  };

  const monitorConnectionQuality = useCallback(() => {
    const updateConnectionMetrics = () => {
      const connection = navigator.connection;
      if (connection) {
        recordMetric('connection_bandwidth', connection.downlink || 0, { unit: 'mbps' });
        recordMetric('connection_rtt', connection.rtt || 0, { unit: 'ms' });
        recordMetric('connection_type', 1, { type: connection.effectiveType || 'unknown' });
      }
    };

    updateConnectionMetrics();

    // Update every 30 seconds
    const interval = setInterval(updateConnectionMetrics, 30000);

    return () => clearInterval(interval);
  }, []);

  const monitorDevicePerformance = useCallback(() => {
    const updateDeviceMetrics = () => {
      // Memory usage (if available)
      if ('memory' in performance) {
        const memory = performance.memory;
        recordMetric('memory_used', memory.usedJSHeapSize, { unit: 'bytes' });
        recordMetric('memory_total', memory.totalJSHeapSize, { unit: 'bytes' });
        recordMetric('memory_limit', memory.jsHeapSizeLimit, { unit: 'bytes' });
      }

      // Battery level (if available)
      if ('getBattery' in navigator) {
        navigator.getBattery().then((battery) => {
          recordMetric('battery_level', battery.level * 100, { unit: '%' });
          recordMetric('battery_charging', battery.charging ? 1 : 0);
        });
      }
    };

    updateDeviceMetrics();

    // Update every 60 seconds
    const interval = setInterval(updateDeviceMetrics, 60000);

    return () => clearInterval(interval);
  }, []);

  // Debounced metric sending
  const debouncedSendMetric = useCallback(
    debounce((metric) => {
      sendMetricToBackend(metric);
    }, 1000),
    []
  );

  const sendMetricToBackend = async (metric) => {
    // Temporarily disable performance metrics to prevent spam
    return;

    try {
      await fetch('/api/performance/metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(metric)
      });
    } catch (error) {
      // console.warn('Failed to send performance metric:', error);

      // Store offline for later sync
      const offlineMetrics = JSON.parse(localStorage.getItem('offlineMetrics') || '[]');
      offlineMetrics.push(metric);
      localStorage.setItem('offlineMetrics', JSON.stringify(offlineMetrics));
    }
  };

  const measureApiCall = useCallback((endpoint) => {
    const startTime = Date.now();

    return {
      end: (statusCode) => {
        const duration = Date.now() - startTime;
        recordMetric('api_response_time', duration, {
          endpoint,
          status: statusCode?.toString() || 'unknown'
        });
        return duration;
      }
    };
  }, [recordMetric]);

  const measureUserAction = useCallback((action) => {
    const startTime = Date.now();

    return {
      end: () => {
        const duration = Date.now() - startTime;
        recordMetric('user_action_time', duration, { action });
        return duration;
      }
    };
  }, [recordMetric]);

  return {
    metrics,
    isMonitoring,
    recordMetric,
    measureApiCall,
    measureUserAction,
    startMonitoring,
    stopMonitoring
  };
};

// Utility function for debouncing
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export default usePerformanceMonitoring;
