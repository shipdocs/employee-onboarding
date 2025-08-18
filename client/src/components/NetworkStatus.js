import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { Wifi, WifiOff, RefreshCw, Signal } from 'lucide-react';

const NetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState('unknown');
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isServiceWorkerReady, setIsServiceWorkerReady] = useState(false);

  // Check connection quality
  const checkConnectionQuality = useCallback(async () => {
    if (!isOnline) {
      setConnectionQuality('offline');
      return;
    }

    try {
      const startTime = Date.now();
      const response = await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-cache'
      });
      const endTime = Date.now();
      const latency = endTime - startTime;

      if (response.ok) {
        if (latency < 200) {
          setConnectionQuality('excellent');
        } else if (latency < 500) {
          setConnectionQuality('good');
        } else if (latency < 1000) {
          setConnectionQuality('fair');
        } else {
          setConnectionQuality('poor');
        }
      } else {
        setConnectionQuality('poor');
      }
    } catch (error) {
      setConnectionQuality('offline');
      setIsOnline(false);
    }
  }, [isOnline]);

  // Handle online event
  const handleOnline = useCallback(() => {
    setIsOnline(true);

    if (wasOffline) {
      toast.success('🚢 Connection restored! Syncing your progress...', {
        duration: 4000,
        icon: '📡',
        style: {
          background: '#10b981',
          color: 'white'
        }
      });

      // Trigger sync when coming back online
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SYNC_OFFLINE_DATA'
        });
      }

      setLastSyncTime(new Date());
      setWasOffline(false);
    }

    checkConnectionQuality();
  }, [wasOffline, checkConnectionQuality]);

  // Handle offline event
  const handleOffline = useCallback(() => {
    setIsOnline(false);
    setWasOffline(true);
    setConnectionQuality('offline');

    toast.error('📡 You\'re now offline. Don\'t worry - you can continue your maritime training!', {
      duration: 6000,
      icon: '⚠️',
      style: {
        background: '#ef4444',
        color: 'white'
      }
    });
  }, []);

  // Check for pending sync items
  const checkPendingSync = useCallback(() => {
    const pendingQuizzes = localStorage.getItem('pendingQuizSync');
    const pendingProgress = localStorage.getItem('pendingProgressSync');

    let count = 0;
    if (pendingQuizzes) {
      try {
        count += JSON.parse(pendingQuizzes).length;
      } catch (e) {
        // console.warn('Failed to parse pending quiz sync data');
      }
    }
    if (pendingProgress) {
      try {
        count += JSON.parse(pendingProgress).length;
      } catch (e) {
        // console.warn('Failed to parse pending progress sync data');
      }
    }

    setPendingSyncCount(count);
  }, []);

  // Service Worker registration check
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(() => {
        setIsServiceWorkerReady(true);
      });
    }
  }, []);

  // Set up event listeners
  useEffect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check connection quality periodically
    const qualityInterval = setInterval(checkConnectionQuality, 30000);

    // Check pending sync items
    const syncInterval = setInterval(checkPendingSync, 5000);

    // Initial checks
    checkConnectionQuality();
    checkPendingSync();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(qualityInterval);
      clearInterval(syncInterval);
    };
  }, [handleOnline, handleOffline, checkConnectionQuality, checkPendingSync]);

  // Get connection icon based on quality
  const getConnectionIcon = () => {
    if (!isOnline) return <WifiOff className="h-4 w-4" />;

    switch (connectionQuality) {
      case 'excellent':
      case 'good':
        return <Wifi className="h-4 w-4" />;
      case 'fair':
      case 'poor':
        return <Signal className="h-4 w-4" />;
      default:
        return <RefreshCw className="h-4 w-4 animate-spin" />;
    }
  };

  // Get status color
  const getStatusColor = () => {
    if (!isOnline) return 'bg-red-500';

    switch (connectionQuality) {
      case 'excellent':
        return 'bg-green-500';
      case 'good':
        return 'bg-green-400';
      case 'fair':
        return 'bg-yellow-500';
      case 'poor':
        return 'bg-orange-500';
      default:
        return 'bg-gray-500';
    }
  };

  // Get status text
  const getStatusText = () => {
    if (!isOnline) return 'Offline Mode';

    switch (connectionQuality) {
      case 'excellent':
        return 'Excellent Connection';
      case 'good':
        return 'Good Connection';
      case 'fair':
        return 'Fair Connection';
      case 'poor':
        return 'Poor Connection';
      default:
        return 'Checking...';
    }
  };

  // Don't render if online and no pending sync
  if (isOnline && pendingSyncCount === 0 && connectionQuality === 'excellent') {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-white text-sm font-medium shadow-lg ${getStatusColor()}`}>
        {getConnectionIcon()}
        <span>{getStatusText()}</span>

        {pendingSyncCount > 0 && (
          <span className="bg-white bg-opacity-20 px-2 py-1 rounded-full text-xs">
            {pendingSyncCount} pending
          </span>
        )}

        {!isServiceWorkerReady && (
          <span className="bg-white bg-opacity-20 px-2 py-1 rounded-full text-xs">
            SW Loading...
          </span>
        )}
      </div>

      {lastSyncTime && (
        <div className="mt-1 text-xs text-gray-600 text-right">
          Last sync: {lastSyncTime.toLocaleTimeString()}
        </div>
      )}
    </div>
  );
};

export default NetworkStatus;
