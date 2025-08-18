// Service Worker for Maritime Onboarding - Offline Connectivity Phase 1
// Provides critical offline functionality for ships with poor connectivity

const CACHE_NAME = 'burando-maritime-v1.0.0';
const CACHE_VERSION = '1.0.0';

// Critical resources that must be cached for offline functionality
const CRITICAL_RESOURCES = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  '/burando-logo-white.svg',
  '/offline.html'
];

// API endpoints that should be cached
const CACHEABLE_API_ROUTES = [
  '/api/content/training/phases',
  '/api/crew/profile',
  '/api/auth/verify-token'
];

// Resources that should never be cached
const NEVER_CACHE = [
  '/api/auth/login',
  '/api/auth/logout', 
  '/api/admin/',
  '/api/manager/create-crew',
  '/api/email/'
];

// Install event - cache critical resources
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 Caching critical resources...');
        return cache.addAll(CRITICAL_RESOURCES);
      })
      .then(() => {
        console.log('✅ Critical resources cached successfully');
        // Force activation of new service worker
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('❌ Failed to cache critical resources:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log('🗑️ Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ Service Worker activated');
        // Take control of all pages immediately
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip requests to other origins
  if (url.origin !== location.origin) {
    return;
  }

  // Never cache certain endpoints
  if (NEVER_CACHE.some(path => url.pathname.startsWith(path))) {
    return;
  }

  event.respondWith(handleFetch(request));
});

// Main fetch handling logic
async function handleFetch(request) {
  const url = new URL(request.url);
  
  try {
    // Strategy 1: Critical resources - Cache First
    if (CRITICAL_RESOURCES.some(resource => url.pathname === resource || url.pathname.endsWith(resource))) {
      return await cacheFirst(request);
    }
    
    // Strategy 2: API routes - Network First with cache fallback
    if (url.pathname.startsWith('/api/')) {
      return await networkFirstWithCache(request);
    }
    
    // Strategy 3: Static assets - Cache First
    if (url.pathname.startsWith('/static/')) {
      return await cacheFirst(request);
    }
    
    // Strategy 4: Everything else - Network First
    return await networkFirst(request);
    
  } catch (error) {
    console.error('Fetch error:', error);
    
    // Return offline page for navigation requests
    if (request.destination === 'document') {
      const offlineResponse = await caches.match('/offline.html');
      return offlineResponse || new Response('Offline - Please check your connection', {
        status: 503,
        statusText: 'Service Unavailable'
      });
    }
    
    // Return generic offline response for other requests
    return new Response('Offline', { status: 503 });
  }
}

// Cache First strategy - for critical resources
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    throw error;
  }
}

// Network First strategy - for dynamic content
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

// Network First with Cache strategy - for API routes
async function networkFirstWithCache(request) {
  try {
    const networkResponse = await fetch(request);
    
    // Cache successful API responses
    if (networkResponse.ok && CACHEABLE_API_ROUTES.some(route => request.url.includes(route))) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Return cached version if available
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('📱 Serving cached API response for:', request.url);
      return cachedResponse;
    }
    throw error;
  }
}

// Background sync for offline data submission
self.addEventListener('sync', (event) => {
  console.log('🔄 Background sync triggered:', event.tag);
  
  if (event.tag === 'quiz-submission') {
    event.waitUntil(syncQuizSubmissions());
  } else if (event.tag === 'training-progress') {
    event.waitUntil(syncTrainingProgress());
  } else if (event.tag === 'offline-data') {
    event.waitUntil(syncOfflineData());
  }
});

// Sync quiz submissions when back online
async function syncQuizSubmissions() {
  try {
    const pendingQuizzes = await getStoredData('pending-quiz-submissions');
    
    for (const quiz of pendingQuizzes || []) {
      try {
        const response = await fetch('/api/training/submit-quiz', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(quiz.data)
        });
        
        if (response.ok) {
          await removeStoredData('pending-quiz-submissions', quiz.id);
          console.log('✅ Quiz submission synced:', quiz.id);
        }
      } catch (error) {
        console.error('❌ Failed to sync quiz:', quiz.id, error);
      }
    }
  } catch (error) {
    console.error('❌ Background sync failed:', error);
  }
}

// Sync training progress when back online
async function syncTrainingProgress() {
  try {
    const pendingProgress = await getStoredData('pending-training-progress');
    
    for (const progress of pendingProgress || []) {
      try {
        const response = await fetch('/api/training/update-progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(progress.data)
        });
        
        if (response.ok) {
          await removeStoredData('pending-training-progress', progress.id);
          console.log('✅ Training progress synced:', progress.id);
        }
      } catch (error) {
        console.error('❌ Failed to sync progress:', progress.id, error);
      }
    }
  } catch (error) {
    console.error('❌ Training progress sync failed:', error);
  }
}

// Generic offline data sync
async function syncOfflineData() {
  await Promise.all([
    syncQuizSubmissions(),
    syncTrainingProgress()
  ]);
}

// Helper functions for IndexedDB operations
async function getStoredData(storeName) {
  // This will be implemented with IndexedDB in Phase 1.5
  // For now, use localStorage as fallback
  try {
    const data = localStorage.getItem(storeName);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting stored data:', error);
    return [];
  }
}

async function removeStoredData(storeName, id) {
  try {
    const data = await getStoredData(storeName);
    const filtered = data.filter(item => item.id !== id);
    localStorage.setItem(storeName, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error removing stored data:', error);
  }
}

// Message handling for communication with main thread
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
    case 'GET_VERSION':
      event.ports[0].postMessage({ version: CACHE_VERSION });
      break;
    case 'CACHE_TRAINING_CONTENT':
      cacheTrainingContent(data);
      break;
    default:
      console.log('Unknown message type:', type);
  }
});

// Cache training content on demand
async function cacheTrainingContent(contentData) {
  try {
    const cache = await caches.open(CACHE_NAME);
    const response = new Response(JSON.stringify(contentData), {
      headers: { 'Content-Type': 'application/json' }
    });
    await cache.put(`/api/training/phase/${contentData.phase}`, response);
    console.log('✅ Training content cached for phase:', contentData.phase);
  } catch (error) {
    console.error('❌ Failed to cache training content:', error);
  }
}
