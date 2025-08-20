// Service Worker Management Service for Maritime Onboarding
// Handles service worker registration, updates, and communication

import errorHandler from './errorHandlingService';
import offlineStorage from './offlineStorageService';

class ServiceWorkerService {
  constructor() {
    this.registration = null;
    this.isUpdateAvailable = false;
    this.isOffline = !navigator.onLine;
    this.updateCallbacks = [];
    this.offlineCallbacks = [];
    this.onlineCallbacks = [];
  }

  // Initialize service worker
  async init() {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Worker not supported in this browser');
      return false;
    }

    try {
      // Register service worker
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('✅ Service Worker registered successfully');

      // Set up event listeners
      this.setupEventListeners();

      // Check for updates
      this.checkForUpdates();

      // Set up network status monitoring
      this.setupNetworkMonitoring();

      return true;
    } catch (error) {
      console.error('❌ Service Worker registration failed:', error);
      errorHandler.logError(error, 'service_worker_registration');
      return false;
    }
  }

  // Set up service worker event listeners
  setupEventListeners() {
    if (!this.registration) return;

    // Listen for service worker updates
    this.registration.addEventListener('updatefound', () => {
      const newWorker = this.registration.installing;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          console.log('🔄 New service worker available');
          this.isUpdateAvailable = true;
          this.notifyUpdateCallbacks();
        }
      });
    });

    // Listen for messages from service worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      this.handleServiceWorkerMessage(event);
    });

    // Listen for controller changes
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('🔄 Service worker controller changed');
      window.location.reload();
    });
  }

  // Handle messages from service worker
  handleServiceWorkerMessage(event) {
    const { type, data } = event.data;

    switch (type) {
      case 'CACHE_UPDATED':
        console.log('📦 Cache updated:', data);
        break;
      case 'OFFLINE_READY':
        console.log('📱 App ready for offline use');
        break;
      case 'SYNC_COMPLETE':
        console.log('🔄 Background sync completed:', data);
        this.handleSyncComplete(data);
        break;
      default:
        console.log('Unknown service worker message:', type, data);
    }
  }

  // Check for service worker updates
  async checkForUpdates() {
    if (!this.registration) return;

    try {
      await this.registration.update();
    } catch (error) {
      console.error('Failed to check for updates:', error);
    }
  }

  // Apply pending service worker update
  async applyUpdate() {
    if (!this.isUpdateAvailable || !this.registration) return false;

    try {
      const waitingWorker = this.registration.waiting;
      if (waitingWorker) {
        waitingWorker.postMessage({ type: 'SKIP_WAITING' });
        return true;
      }
    } catch (error) {
      console.error('Failed to apply update:', error);
      return false;
    }

    return false;
  }

  // Set up network status monitoring
  setupNetworkMonitoring() {
    const handleOnline = () => {
      console.log('🌐 Back online - triggering sync');
      this.isOffline = false;
      this.triggerBackgroundSync();
      this.notifyOnlineCallbacks();
    };

    const handleOffline = () => {
      console.log('📱 Gone offline - enabling offline mode');
      this.isOffline = true;
      this.notifyOfflineCallbacks();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial state
    if (navigator.onLine) {
      this.isOffline = false;
    } else {
      this.isOffline = true;
    }
  }

  // Trigger background sync when back online
  async triggerBackgroundSync() {
    if (!this.registration || !this.registration.sync) {
      console.log('Background sync not supported, using manual sync');
      await this.manualSync();
      return;
    }

    try {
      await this.registration.sync.register('offline-data');
      console.log('🔄 Background sync registered');
    } catch (error) {
      console.error('Background sync registration failed:', error);
      await this.manualSync();
    }
  }

  // Manual sync for browsers without background sync
  async manualSync() {
    try {
      const itemsToSync = offlineStorage.getItemsNeedingSync();

      for (const item of itemsToSync) {
        await this.syncItem(item);
      }

      console.log(`✅ Manual sync completed: ${itemsToSync.length} items`);
    } catch (error) {
      console.error('Manual sync failed:', error);
      errorHandler.showError(error, 'offline_sync');
    }
  }

  // Sync individual item
  async syncItem(item) {
    try {
      let endpoint = '';
      let method = 'POST';

      // Determine endpoint based on item type
      if (item.key.startsWith('quiz_completed_')) {
        endpoint = '/api/training/submit-quiz';
        method = 'POST';
      } else if (item.key.startsWith('training_progress_')) {
        endpoint = '/api/training/update-progress';
        method = 'POST';
      } else {
        console.warn('Unknown sync item type:', item.key);
        return;
      }

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(item.data)
      });

      if (response.ok) {
        offlineStorage.markAsSynced(item.key);
        console.log('✅ Synced item:', item.key);
      } else {
        throw new Error(`Sync failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to sync item:', item.key, error);
      throw error;
    }
  }

  // Handle sync completion from service worker
  handleSyncComplete(data) {
    if (data.success) {
      errorHandler.showSuccess('offline_sync_complete', {
        params: { count: data.itemCount }
      });
    } else {
      errorHandler.showError(new Error('Sync failed'), 'offline_sync');
    }
  }

  // Cache training content for offline use
  async cacheTrainingContent(phase, content) {
    try {
      // Store in local storage
      offlineStorage.cacheTrainingContent(phase, content);

      // Also cache in service worker
      if (this.registration && this.registration.active) {
        this.registration.active.postMessage({
          type: 'CACHE_TRAINING_CONTENT',
          data: { phase, content }
        });
      }

      console.log(`📦 Training content cached for phase ${phase}`);
      return true;
    } catch (error) {
      console.error('Failed to cache training content:', error);
      return false;
    }
  }

  // Preload critical content for offline use
  async preloadCriticalContent() {
    try {
      const token = localStorage.getItem('token');
      if (!token) return false;

      // Preload user profile
      try {
        const profileResponse = await fetch('/api/crew/profile', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          offlineStorage.setItem('user_profile', profileData);
        }
      } catch (error) {
        console.warn('Failed to preload profile:', error);
      }

      // Preload training phases overview
      try {
        const phasesResponse = await fetch('/api/content/training/phases', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (phasesResponse.ok) {
          const phasesData = await phasesResponse.json();
          offlineStorage.setItem('training_phases', phasesData);
        }
      } catch (error) {
        console.warn('Failed to preload training phases:', error);
      }

      console.log('📦 Critical content preloaded for offline use');
      return true;
    } catch (error) {
      console.error('Failed to preload critical content:', error);
      return false;
    }
  }

  // Get service worker status
  getStatus() {
    return {
      isSupported: 'serviceWorker' in navigator,
      isRegistered: !!this.registration,
      isUpdateAvailable: this.isUpdateAvailable,
      isOffline: this.isOffline,
      controller: navigator.serviceWorker.controller ? 'active' : 'none'
    };
  }

  // Callback management
  onUpdate(callback) {
    this.updateCallbacks.push(callback);
  }

  onOffline(callback) {
    this.offlineCallbacks.push(callback);
  }

  onOnline(callback) {
    this.onlineCallbacks.push(callback);
  }

  notifyUpdateCallbacks() {
    this.updateCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Update callback error:', error);
      }
    });
  }

  notifyOfflineCallbacks() {
    this.offlineCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Offline callback error:', error);
      }
    });
  }

  notifyOnlineCallbacks() {
    this.onlineCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Online callback error:', error);
      }
    });
  }

  // Cleanup expired cache and storage
  async cleanup() {
    try {
      // Clean up offline storage
      offlineStorage.cleanupExpiredItems();

      // Clean up old caches (if we have access)
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        const oldCaches = cacheNames.filter(name =>
          name.startsWith('maritime-onboarding-') &&
          name !== 'maritime-onboarding-v1.0.0'
        );

        await Promise.all(oldCaches.map(name => caches.delete(name)));

        if (oldCaches.length > 0) {
          console.log(`🗑️ Cleaned up ${oldCaches.length} old caches`);
        }
      }
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }
}

// Export singleton instance
export const serviceWorkerService = new ServiceWorkerService();
export default serviceWorkerService;
