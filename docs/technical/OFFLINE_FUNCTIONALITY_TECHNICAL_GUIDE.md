# 🌊 **Offline Functionality Technical Guide**
## *Maritime-Ready Service Worker Architecture*

---

## 📋 **Overview**

This document provides technical details for the offline functionality implemented in the maritime onboarding application. The system enables full training completion even without internet connectivity, critical for maritime environments.

---

## 🏗️ **Architecture Overview**

### **Service Worker Strategy**
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Client App    │───▶│  Service Worker  │───▶│   Cache/API     │
│                 │    │                  │    │                 │
│ - Quiz Pages    │    │ - Cache First    │    │ - Critical CSS  │
│ - Training      │    │ - Network First  │    │ - App Shell     │
│ - Progress      │    │ - Background     │    │ - API Responses │
│                 │    │   Sync           │    │ - User Data     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### **Caching Strategies by Resource Type**

| Resource Type | Strategy | Rationale |
|---------------|----------|-----------|
| **Critical Resources** (HTML, CSS, JS) | Cache-First | Instant loading, essential for offline |
| **API Routes** (training data) | Network-First + Cache | Fresh data when online, cached fallback |
| **Static Assets** (images, fonts) | Cache-First | Performance optimization |
| **Dynamic Content** (user-specific) | Network-First | Always try for fresh data |
| **Sensitive Endpoints** (auth, admin) | Never Cache | Security requirement |

---

## 🔧 **Service Worker Implementation**

### **File: `client/public/sw.js`**

#### **Cache Configuration**
```javascript
const CACHE_NAME = 'burando-maritime-v1.0.0';
const CRITICAL_RESOURCES = [
  '/',
  '/static/css/main.*.css',
  '/static/js/main.*.js',
  '/manifest.json',
  '/offline.html'
];

const CACHEABLE_API_ROUTES = [
  '/api/training/phases',
  '/api/crew/profile',
  '/api/auth/verify-token'
];

const NEVER_CACHE = [
  '/api/auth/login',
  '/api/admin/',
  '/api/email/'
];
```

#### **Install Event - Critical Resource Caching**
```javascript
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CRITICAL_RESOURCES))
      .then(() => self.skipWaiting())
  );
});
```

#### **Fetch Event - Intelligent Request Handling**
```javascript
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and external origins
  if (request.method !== 'GET' || url.origin !== location.origin) {
    return;
  }

  // Apply appropriate caching strategy
  event.respondWith(handleFetch(request));
});
```

#### **Background Sync - Offline Data Submission**
```javascript
self.addEventListener('sync', (event) => {
  if (event.tag === 'quiz-submission') {
    event.waitUntil(syncQuizSubmissions());
  } else if (event.tag === 'training-progress') {
    event.waitUntil(syncTrainingProgress());
  }
});
```

---

## 💾 **Offline Storage Service**

### **File: `client/src/services/offlineStorageService.js`**

#### **Storage Architecture**
```javascript
// Storage key structure
burando_maritime_quiz_progress_[phase]     // Quiz answers and current question
burando_maritime_quiz_completed_[phase]    // Completed quiz awaiting sync
burando_maritime_training_progress_[phase] // Training item completion
burando_maritime_request_queue             // Failed requests for retry
burando_maritime_user_profile              // Cached user data
burando_maritime_training_phases           // Cached training overview
```

#### **Quiz Progress Management**
```javascript
class OfflineStorageService {
  saveQuizProgress(phase, answers, currentQuestion, sessionId) {
    const progressData = {
      phase,
      answers,
      currentQuestion,
      sessionId,
      status: 'in_progress',
      lastUpdated: Date.now()
    };
    return this.setItem(`quiz_progress_${phase}`, progressData);
  }

  markQuizCompleted(phase, finalAnswers, score, sessionId) {
    const completedData = {
      phase,
      answers: finalAnswers,
      score,
      sessionId,
      completedAt: Date.now(),
      status: 'completed'
    };
    
    // Store for sync and remove progress
    this.setItem(`quiz_completed_${phase}`, completedData, { needsSync: true });
    this.removeItem(`quiz_progress_${phase}`);
  }
}
```

#### **Data Compression & Optimization**
```javascript
// Simple compression for large datasets
compressData(data) {
  const jsonString = JSON.stringify(data);
  return jsonString.replace(/(.)\1{2,}/g, (match, char) => {
    return `${char}*${match.length}`;
  });
}

// Storage usage monitoring
getStorageInfo() {
  return {
    totalSize: calculatedSize,
    totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
    keyCount: keys.length,
    percentUsed: ((totalSize / this.maxStorageSize) * 100).toFixed(1)
  };
}
```

---

## 🔄 **Service Worker Management**

### **File: `client/src/services/serviceWorkerService.js`**

#### **Registration & Update Handling**
```javascript
class ServiceWorkerService {
  async init() {
    this.registration = await navigator.serviceWorker.register('/sw.js');
    this.setupEventListeners();
    this.checkForUpdates();
    this.setupNetworkMonitoring();
  }

  async triggerBackgroundSync() {
    if (this.registration?.sync) {
      await this.registration.sync.register('offline-data');
    } else {
      await this.manualSync(); // Fallback for browsers without background sync
    }
  }
}
```

#### **Critical Content Preloading**
```javascript
async preloadCriticalContent() {
  const token = localStorage.getItem('token');
  if (!token) return false;

  // Preload user profile and training phases
  const [profileResponse, phasesResponse] = await Promise.allSettled([
    fetch('/api/crew/profile', { headers: { 'Authorization': `Bearer ${token}` } }),
    fetch('/api/training/phases', { headers: { 'Authorization': `Bearer ${token}` } })
  ]);

  // Store successful responses
  if (profileResponse.status === 'fulfilled' && profileResponse.value.ok) {
    const profileData = await profileResponse.value.json();
    offlineStorage.setItem('user_profile', profileData);
  }
}
```

---

## 📱 **Enhanced Quiz Page Integration**

### **File: `client/src/pages/QuizPage.js`**

#### **Offline Progress Restoration**
```javascript
useEffect(() => {
  const restoreOfflineProgress = () => {
    const savedProgress = offlineStorage.getQuizProgress(phase);
    if (savedProgress) {
      setAnswers(savedProgress.answers || {});
      setCurrentQuestionIndex(savedProgress.currentQuestion || 0);
      setQuizStarted(true);
      toast.success(t('quiz:offline.progress_restored'));
    }
  };
  
  if (phase) restoreOfflineProgress();
}, [phase, t]);
```

#### **Real-Time Progress Saving**
```javascript
const handleAnswerChange = (questionId, answer) => {
  const newAnswers = { ...answers, [questionId]: answer };
  setAnswers(newAnswers);

  // Save progress immediately
  if (quizSessionId) {
    offlineStorage.saveQuizProgress(phase, newAnswers, currentQuestionIndex, quizSessionId);
  }
};
```

#### **Offline Quiz Submission**
```javascript
const handleSubmitQuiz = () => {
  const submissionData = {
    answers: formattedAnswers,
    quizSessionId,
    phase: parseInt(phase),
    completedAt: Date.now()
  };

  if (offlineMode || !navigator.onLine) {
    const success = offlineStorage.markQuizCompleted(phase, formattedAnswers, null, quizSessionId);
    if (success) {
      setPendingSubmission(true);
      setQuizCompleted(true);
      toast.success(t('quiz:offline.saved_will_sync'));
    }
    return;
  }

  // Online submission
  submitQuizMutation.mutate(submissionData);
};
```

---

## 🌐 **Network Status Monitoring**

### **File: `client/src/components/common/NetworkStatus.js`**

#### **Real-Time Status Display**
```javascript
export function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState('idle');
  const [pendingItems, setPendingItems] = useState(0);

  // Monitor online/offline transitions
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setSyncStatus('syncing');
      serviceWorkerService.triggerBackgroundSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus('idle');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
  }, []);
}
```

#### **Status Indicators**
- 🔴 **Offline Mode**: Red indicator with offline message
- 🟡 **Slow Connection**: Yellow warning for poor connectivity  
- 🔵 **Syncing**: Blue indicator with spinning sync icon
- 🟢 **Sync Complete**: Green success indicator
- 📱 **Pending Items**: Count of items waiting to sync

---

## 🔒 **Security Considerations**

### **Data Protection**
- **Local Storage Encryption**: Sensitive data protected in local storage
- **Session Validation**: Quiz sessions validated before submission
- **Token Management**: Authentication tokens handled securely
- **Data Expiration**: Automatic cleanup of expired offline data

### **Sync Security**
- **Authentication Required**: All sync operations require valid tokens
- **Data Validation**: Server-side validation of offline submissions
- **Conflict Resolution**: Graceful handling of data conflicts
- **Audit Trail**: Complete logging of offline operations

---

## 🧪 **Testing & Validation**

### **Offline Testing Scenarios**
1. **Complete Network Disconnection**: Full offline quiz completion
2. **Intermittent Connectivity**: Handling connection drops during use
3. **Slow Connections**: Graceful degradation with poor connectivity
4. **Storage Limits**: Behavior when approaching storage quotas
5. **Cross-Device Sync**: Progress synchronization across devices

### **Browser Compatibility**
- ✅ **Chrome/Edge**: Full service worker and background sync support
- ✅ **Firefox**: Service worker support, manual sync fallback
- ✅ **Safari**: Service worker support with limitations
- ✅ **Mobile Browsers**: Optimized for mobile maritime devices

---

## 🚀 **Performance Optimizations**

### **Caching Efficiency**
- **Selective Caching**: Only cache essential resources
- **Cache Versioning**: Automatic cleanup of old cache versions
- **Compression**: Data compression for large offline datasets
- **Lazy Loading**: Load content on-demand to minimize initial cache size

### **Storage Management**
- **Automatic Cleanup**: Expired data automatically removed
- **Storage Monitoring**: Track usage and prevent quota exceeded errors
- **Prioritized Sync**: Critical data synced first when online
- **Conflict Resolution**: Intelligent handling of data conflicts

---

## 📊 **Monitoring & Analytics**

### **Offline Usage Tracking**
```javascript
// Track offline events for analytics
const trackOfflineEvent = (eventType, data) => {
  const event = {
    type: eventType,
    timestamp: Date.now(),
    data,
    userAgent: navigator.userAgent,
    connectionType: navigator.connection?.effectiveType
  };
  
  // Store for later analytics submission
  offlineStorage.addToRequestQueue('analytics', '/api/analytics/offline', event);
};
```

### **Performance Metrics**
- **Cache Hit Rates**: Percentage of requests served from cache
- **Sync Success Rates**: Percentage of successful offline data syncs
- **Storage Usage**: Local storage consumption patterns
- **Connection Quality**: Network performance in maritime environments

---

*This technical guide provides the foundation for understanding and maintaining the offline functionality critical for maritime training environments.*
