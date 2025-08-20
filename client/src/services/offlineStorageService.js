// Offline Storage Service for Maritime Onboarding - Phase 1
// Handles local data persistence for offline functionality

import errorHandler from './errorHandlingService';

class OfflineStorageService {
  constructor() {
    this.storagePrefix = 'maritime_onboarding_';
    this.maxStorageSize = 50 * 1024 * 1024; // 50MB limit for localStorage
    this.compressionEnabled = true;
  }

  // Generate storage key with prefix
  getStorageKey(key) {
    return `${this.storagePrefix}${key}`;
  }

  // Check if we're currently offline
  isOffline() {
    return !navigator.onLine;
  }

  // Get storage usage information
  getStorageInfo() {
    let totalSize = 0;
    const keys = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.storagePrefix)) {
        const value = localStorage.getItem(key);
        totalSize += key.length + (value ? value.length : 0);
        keys.push(key);
      }
    }

    return {
      totalSize,
      totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
      keyCount: keys.length,
      keys,
      percentUsed: ((totalSize / this.maxStorageSize) * 100).toFixed(1)
    };
  }

  // Store data with metadata
  setItem(key, data, options = {}) {
    try {
      const storageKey = this.getStorageKey(key);
      const metadata = {
        data,
        timestamp: Date.now(),
        expires: options.expires || null,
        version: options.version || '1.0.0',
        compressed: false,
        offline: this.isOffline(),
        needsSync: options.needsSync || false
      };

      // Compress large data if enabled
      if (this.compressionEnabled && JSON.stringify(data).length > 10000) {
        try {
          metadata.data = this.compressData(data);
          metadata.compressed = true;
        } catch (error) {
          // console.warn('Compression failed, storing uncompressed:', error);
        }
      }

      const serialized = JSON.stringify(metadata);

      // Check storage limits
      if (serialized.length > this.maxStorageSize * 0.1) { // Single item shouldn't exceed 10% of total
        throw new Error('Data too large for storage');
      }

      localStorage.setItem(storageKey, serialized);

      // console.log(`📱 Stored offline data: ${key} (${(serialized.length / 1024).toFixed(1)}KB)`);
      return true;
    } catch (error) {
      // console.error('Failed to store offline data:', error);
      errorHandler.showError(error, 'offline_storage');
      return false;
    }
  }

  // Retrieve data with automatic decompression
  getItem(key) {
    try {
      const storageKey = this.getStorageKey(key);
      const stored = localStorage.getItem(storageKey);

      if (!stored) return null;

      const metadata = JSON.parse(stored);

      // Check expiration
      if (metadata.expires && Date.now() > metadata.expires) {
        this.removeItem(key);
        return null;
      }

      // Decompress if needed
      let data = metadata.data;
      if (metadata.compressed) {
        try {
          data = this.decompressData(data);
        } catch (error) {
          // console.error('Decompression failed:', error);
          return null;
        }
      }

      return {
        data,
        metadata: {
          timestamp: metadata.timestamp,
          version: metadata.version,
          offline: metadata.offline,
          needsSync: metadata.needsSync
        }
      };
    } catch (error) {
      // console.error('Failed to retrieve offline data:', error);
      return null;
    }
  }

  // Remove item from storage
  removeItem(key) {
    try {
      const storageKey = this.getStorageKey(key);
      localStorage.removeItem(storageKey);
      return true;
    } catch (error) {
      // console.error('Failed to remove offline data:', error);
      return false;
    }
  }

  // Clear all offline data
  clearAll() {
    try {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.storagePrefix)) {
          keys.push(key);
        }
      }

      keys.forEach(key => localStorage.removeItem(key));
      // console.log(`🗑️ Cleared ${keys.length} offline storage items`);
      return true;
    } catch (error) {
      // console.error('Failed to clear offline storage:', error);
      return false;
    }
  }

  // Quiz Progress Storage
  saveQuizProgress(phase, answers, currentQuestion, sessionId) {
    const progressKey = `quiz_progress_${phase}`;
    const progressData = {
      phase,
      answers,
      currentQuestion,
      sessionId,
      status: 'in_progress',
      lastUpdated: Date.now()
    };

    return this.setItem(progressKey, progressData, {
      needsSync: false // Progress doesn't need sync, only completion does
    });
  }

  getQuizProgress(phase) {
    const progressKey = `quiz_progress_${phase}`;
    const stored = this.getItem(progressKey);
    return stored ? stored.data : null;
  }

  markQuizCompleted(phase, finalAnswers, score, sessionId) {
    const completedKey = `quiz_completed_${phase}`;
    const progressKey = `quiz_progress_${phase}`;

    const completedData = {
      phase,
      answers: finalAnswers,
      score,
      sessionId,
      completedAt: Date.now(),
      status: 'completed'
    };

    // Store completed quiz
    const success = this.setItem(completedKey, completedData, {
      needsSync: true // Completed quizzes need to sync
    });

    // Remove progress data
    if (success) {
      this.removeItem(progressKey);
    }

    return success;
  }

  // Training Progress Storage
  saveTrainingProgress(phase, itemNumber, completionData) {
    const progressKey = `training_progress_${phase}_${itemNumber}`;
    const progressData = {
      phase,
      itemNumber,
      ...completionData,
      completedAt: Date.now()
    };

    return this.setItem(progressKey, progressData, {
      needsSync: true
    });
  }

  getTrainingProgress(phase, itemNumber) {
    const progressKey = `training_progress_${phase}_${itemNumber}`;
    const stored = this.getItem(progressKey);
    return stored ? stored.data : null;
  }

  // Get all items that need syncing
  getItemsNeedingSync() {
    const itemsToSync = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.storagePrefix)) {
        const stored = this.getItem(key.replace(this.storagePrefix, ''));
        if (stored && stored.metadata.needsSync) {
          itemsToSync.push({
            key: key.replace(this.storagePrefix, ''),
            data: stored.data,
            metadata: stored.metadata
          });
        }
      }
    }

    return itemsToSync;
  }

  // Mark item as synced
  markAsSynced(key) {
    const stored = this.getItem(key);
    if (stored) {
      stored.metadata.needsSync = false;
      return this.setItem(key, stored.data, {
        ...stored.metadata,
        needsSync: false
      });
    }
    return false;
  }

  // Simple compression (basic implementation)
  compressData(data) {
    // For Phase 1, we'll use JSON stringification with minimal compression
    // In Phase 2, we can implement proper compression algorithms
    const jsonString = JSON.stringify(data);

    // Simple run-length encoding for repeated characters
    return jsonString.replace(/(.)\1{2,}/g, (match, char) => {
      return `${char}*${match.length}`;
    });
  }

  decompressData(compressedData) {
    // Reverse the simple compression
    const decompressed = compressedData.replace(/(.)\*(\d+)/g, (match, char, count) => {
      return char.repeat(parseInt(count));
    });

    return JSON.parse(decompressed);
  }

  // Cache training content for offline access
  cacheTrainingContent(phase, content) {
    const cacheKey = `training_content_${phase}`;
    const expirationTime = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 days

    return this.setItem(cacheKey, content, {
      expires: expirationTime,
      version: content.version || '1.0.0'
    });
  }

  getCachedTrainingContent(phase) {
    const cacheKey = `training_content_${phase}`;
    const stored = this.getItem(cacheKey);
    return stored ? stored.data : null;
  }

  // Offline request queue management
  addToRequestQueue(type, endpoint, data, options = {}) {
    const queueKey = 'request_queue';
    const currentQueue = this.getItem(queueKey);
    const queue = currentQueue ? currentQueue.data : [];

    const queueItem = {
      id: Date.now() + Math.random(),
      type,
      endpoint,
      data,
      timestamp: Date.now(),
      retries: 0,
      maxRetries: options.maxRetries || 3,
      priority: options.priority || 'normal'
    };

    queue.push(queueItem);

    // Sort by priority (high -> normal -> low)
    queue.sort((a, b) => {
      const priorityOrder = { high: 3, normal: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    return this.setItem(queueKey, queue);
  }

  getRequestQueue() {
    const queueKey = 'request_queue';
    const stored = this.getItem(queueKey);
    return stored ? stored.data : [];
  }

  removeFromRequestQueue(itemId) {
    const queueKey = 'request_queue';
    const currentQueue = this.getItem(queueKey);
    if (!currentQueue) return false;

    const filteredQueue = currentQueue.data.filter(item => item.id !== itemId);
    return this.setItem(queueKey, filteredQueue);
  }

  clearRequestQueue() {
    return this.removeItem('request_queue');
  }

  // Storage cleanup utilities
  cleanupExpiredItems() {
    let cleanedCount = 0;
    const now = Date.now();

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.storagePrefix)) {
        try {
          const stored = localStorage.getItem(key);
          const metadata = JSON.parse(stored);

          if (metadata.expires && now > metadata.expires) {
            localStorage.removeItem(key);
            cleanedCount++;
          }
        } catch (error) {
          // Remove corrupted items
          localStorage.removeItem(key);
          cleanedCount++;
        }
      }
    }

    if (cleanedCount > 0) {
      // console.log(`🧹 Cleaned up ${cleanedCount} expired offline items`);
    }

    return cleanedCount;
  }
}

// Export singleton instance
export const offlineStorage = new OfflineStorageService();
export default offlineStorage;
