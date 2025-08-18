// Enhanced Network Status Component for Offline Connectivity Phase 1
// Shows connection status with maritime-friendly messaging and offline capabilities

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Wifi, WifiOff, AlertTriangle, Download, RefreshCw, CheckCircle } from 'lucide-react';
import errorHandler from '../../services/errorHandlingService';
import serviceWorkerService from '../../services/serviceWorkerService';
import offlineStorage from '../../services/offlineStorageService';

export function NetworkStatus() {
  const { t, i18n } = useTranslation(['errors', 'common']);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOfflineMessage, setShowOfflineMessage] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState('good');
  const [syncStatus, setSyncStatus] = useState('idle'); // idle, syncing, success, error
  const [pendingItems, setPendingItems] = useState(0);
  const [isServiceWorkerReady, setIsServiceWorkerReady] = useState(false);

  useEffect(() => {
    // Initialize service worker
    serviceWorkerService.init().then(success => {
      setIsServiceWorkerReady(success);
      if (success) {
        // Set up service worker callbacks
        serviceWorkerService.onOnline(() => {
          setSyncStatus('syncing');
          updatePendingItemsCount();
        });

        serviceWorkerService.onOffline(() => {
          updatePendingItemsCount();
        });
      }
    });

    const handleOnline = () => {
      setIsOnline(true);
      setShowOfflineMessage(false);
      setSyncStatus('syncing');

      // Trigger sync and show success message
      setTimeout(() => {
        setSyncStatus('success');
        errorHandler.showSuccess('errors:network.connection_restored', {
          duration: 3000
        });

        // Reset sync status after showing success
        setTimeout(() => setSyncStatus('idle'), 2000);
      }, 1000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineMessage(true);
      setSyncStatus('idle');

      // Show offline message with maritime context
      errorHandler.showWarning('errors:network.offline', {
        duration: 8000
      });
    };

    // Monitor connection quality
    const checkConnectionQuality = async () => {
      if (!navigator.onLine) {
        setConnectionQuality('offline');
        return;
      }

      try {
        const startTime = Date.now();
        const response = await fetch('/api/health', {
          method: 'HEAD',
          cache: 'no-cache',
          headers: {
            'x-health-check-type': 'monitoring'
          }
        });
        const endTime = Date.now();
        const responseTime = endTime - startTime;

        if (response.ok) {
          if (responseTime < 500) {
            setConnectionQuality('good');
          } else if (responseTime < 2000) {
            setConnectionQuality('slow');
          } else {
            setConnectionQuality('poor');
          }
        } else {
          setConnectionQuality('poor');
        }
      } catch (error) {
        setConnectionQuality('poor');
      }
    };

    // Update pending items count
    const updatePendingItemsCount = () => {
      const items = offlineStorage.getItemsNeedingSync();
      setPendingItems(items.length);
    };

    // Event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check connection quality periodically (reduced frequency)
    const qualityInterval = setInterval(checkConnectionQuality, 300000); // 5 minutes instead of 30 seconds
    checkConnectionQuality(); // Initial check

    // Update pending items count initially and periodically
    updatePendingItemsCount();
    const pendingInterval = setInterval(updatePendingItemsCount, 60000); // 1 minute instead of 10 seconds

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(qualityInterval);
      clearInterval(pendingInterval);
    };
  }, []);

  // Don't show anything if connection is good and no pending items
  if (isOnline && connectionQuality === 'good' && pendingItems === 0 && syncStatus === 'idle') {
    return null;
  }

  // Don't render until translations are ready
  if (!i18n.isInitialized) {
    return null;
  }

  const getStatusIcon = () => {
    if (syncStatus === 'syncing') {
      return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
    }
    if (syncStatus === 'success') {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
    if (!isOnline) {
      return <WifiOff className="w-4 h-4 text-red-500" />;
    }
    if (connectionQuality === 'poor') {
      return <AlertTriangle className="w-4 h-4 text-orange-500" />;
    }
    if (pendingItems > 0) {
      return <Download className="w-4 h-4 text-blue-500" />;
    }
    return <Wifi className="w-4 h-4 text-yellow-500" />;
  };

  const getStatusMessage = () => {
    if (syncStatus === 'syncing') {
      return `Syncing ${pendingItems} items...`;
    }
    if (syncStatus === 'success') {
      return 'All data synchronized';
    }
    if (!isOnline) {
      const offlineMsg = t('errors:network.offline');
      return pendingItems > 0 ? `${offlineMsg} (${pendingItems} items pending)` : offlineMsg;
    }
    if (connectionQuality === 'poor' || connectionQuality === 'slow') {
      // Use translation with fallback to ensure it displays correctly
      return t('errors:network.slow_connection', 'Your connection seems slow. This might take a moment longer than usual.');
    }
    if (pendingItems > 0) {
      return `${pendingItems} items ready to sync`;
    }
    return '';
  };

  const getStatusColor = () => {
    if (syncStatus === 'syncing') return 'bg-blue-500';
    if (syncStatus === 'success') return 'bg-green-500';
    if (!isOnline) return 'bg-red-500';
    if (connectionQuality === 'poor') return 'bg-orange-500';
    if (pendingItems > 0) return 'bg-blue-500';
    return 'bg-yellow-500';
  };

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 ${getStatusColor()} text-white px-4 py-2 text-sm`}>
      <div className="flex items-center justify-center space-x-2">
        {getStatusIcon()}
        <span>{getStatusMessage()}</span>
        {(!isOnline || pendingItems > 0) && (
          <button
            onClick={() => {
              if (!isOnline) {
                window.location.reload();
              } else if (pendingItems > 0) {
                setSyncStatus('syncing');
                serviceWorkerService.triggerBackgroundSync();
              }
            }}
            className="ml-4 px-3 py-1 bg-white bg-opacity-20 rounded text-xs hover:bg-opacity-30 transition-colors"
            disabled={syncStatus === 'syncing'}
          >
            {!isOnline ? t('errors:actions.retry') : t('common:buttons.sync_now', 'Sync Now')}
          </button>
        )}
      </div>
    </div>
  );
}

// Hook for monitoring network status
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionQuality, setConnectionQuality] = useState('good');

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const checkConnection = async () => {
    if (!navigator.onLine) {
      return false;
    }

    try {
      const response = await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-cache',
        headers: {
          'x-health-check-type': 'monitoring'
        },
        timeout: 5000
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  };

  return {
    isOnline,
    connectionQuality,
    checkConnection
  };
}

export default NetworkStatus;
