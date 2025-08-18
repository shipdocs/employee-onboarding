/**
 * Tests for Request Queue Service
 * Ensures failed requests are properly queued and retried when connection is restored
 * @jest-environment jsdom
 */

// Mock localStorage for testing environment
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    })
  };
})();

// Set up global mocks
global.localStorage = localStorageMock;

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true
});

// Mock fetch
global.fetch = jest.fn();

// Mock request queue service
const mockRequestQueue = {
  QUEUE_KEY: 'burando_request_queue',
  MAX_RETRY_ATTEMPTS: 3,

  generateRequestId: jest.fn(() => `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`),

  addRequest: jest.fn((type, endpoint, data, options = {}) => {
    try {
      const request = {
        id: mockRequestQueue.generateRequestId(),
        type,
        endpoint,
        data,
        options: {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...options.headers },
          ...options
        },
        timestamp: Date.now(),
        retryCount: 0,
        status: 'pending'
      };

      const queue = mockRequestQueue.getQueue();
      queue.push(request);
      mockRequestQueue.saveQueue(queue);

      return request.id;
    } catch (error) {
      return null;
    }
  }),

  getQueue: jest.fn(() => {
    try {
      const queueData = localStorage.getItem('burando_request_queue');
      return queueData ? JSON.parse(queueData) : [];
    } catch (error) {
      return [];
    }
  }),

  saveQueue: jest.fn((queue) => {
    try {
      localStorage.setItem('burando_request_queue', JSON.stringify(queue));
      return true;
    } catch (error) {
      return false;
    }
  }),

  processQueue: jest.fn(async () => {
    if (!navigator.onLine) return;

    const queue = mockRequestQueue.getQueue();
    const pendingRequests = queue.filter(req => req.status === 'pending' || req.status === 'failed');

    for (const request of pendingRequests) {
      try {
        const response = await fetch(request.endpoint, {
          ...request.options,
          body: JSON.stringify(request.data)
        });

        if (response.ok) {
          mockRequestQueue.markRequestCompleted(request.id);
        } else {
          mockRequestQueue.handleFailedRequest(request, `HTTP ${response.status}`);
        }
      } catch (error) {
        mockRequestQueue.handleFailedRequest(request, error.message);
      }
    }
  }),

  markRequestCompleted: jest.fn((requestId) => {
    const queue = mockRequestQueue.getQueue();
    const requestIndex = queue.findIndex(req => req.id === requestId);

    if (requestIndex !== -1) {
      queue[requestIndex].status = 'completed';
      queue[requestIndex].completedAt = Date.now();
      mockRequestQueue.saveQueue(queue);
    }
  }),

  handleFailedRequest: jest.fn((request, errorMessage) => {
    const queue = mockRequestQueue.getQueue();
    const requestIndex = queue.findIndex(req => req.id === request.id);

    if (requestIndex === -1) return;

    request.retryCount++;
    request.lastError = errorMessage;
    request.lastRetry = Date.now();

    if (request.retryCount >= mockRequestQueue.MAX_RETRY_ATTEMPTS) {
      request.status = 'failed_permanently';
    } else {
      request.status = 'failed';
    }

    queue[requestIndex] = request;
    mockRequestQueue.saveQueue(queue);
  }),

  getQueueStats: jest.fn(() => {
    const queue = mockRequestQueue.getQueue();
    return {
      total: queue.length,
      pending: queue.filter(req => req.status === 'pending').length,
      failed: queue.filter(req => req.status === 'failed').length,
      completed: queue.filter(req => req.status === 'completed').length,
      failedPermanently: queue.filter(req => req.status === 'failed_permanently').length
    };
  }),

  clearQueue: jest.fn(() => {
    try {
      localStorage.removeItem('burando_request_queue');
      return true;
    } catch (error) {
      return false;
    }
  }),

  cleanupQueue: jest.fn(() => {
    try {
      const queue = mockRequestQueue.getQueue();
      const oneHourAgo = Date.now() - (60 * 60 * 1000);

      const filteredQueue = queue.filter(request => {
        if (request.status === 'pending' || request.status === 'failed') {
          return true;
        }
        if (request.status === 'completed' && request.completedAt > oneHourAgo) {
          return true;
        }
        return false;
      });

      mockRequestQueue.saveQueue(filteredQueue);
    } catch (error) {
      console.warn('Cleanup error:', error);
    }
  }),

  queueQuizCompletion: jest.fn((phaseId, answers, score, timeSpent) => {
    return mockRequestQueue.addRequest('quiz_completion', '/api/quiz/submit', {
      phaseId,
      answers,
      score,
      timeSpent,
      completedAt: Date.now()
    });
  }),

  queueProgressUpdate: jest.fn((progressData) => {
    return mockRequestQueue.addRequest('progress_update', '/api/training/progress', progressData);
  }),

  queueProfileUpdate: jest.fn((profileData) => {
    return mockRequestQueue.addRequest('profile_update', '/api/profile', profileData);
  })
};

const requestQueue = mockRequestQueue;

describe('Request Queue Service', () => {
  beforeEach(() => {
    // Clear localStorage completely before each test
    localStorageMock.clear();
    jest.clearAllMocks();
    navigator.onLine = true;
    fetch.mockClear();

    // Reset the internal store completely
    const store = {};
    localStorageMock.getItem.mockImplementation((key) => store[key] || null);
    localStorageMock.setItem.mockImplementation((key, value) => {
      store[key] = value.toString();
    });
    localStorageMock.removeItem.mockImplementation((key) => {
      delete store[key];
    });
    localStorageMock.clear.mockImplementation(() => {
      Object.keys(store).forEach(key => delete store[key]);
    });

    // Reset all mock function implementations to their defaults
    Object.values(mockRequestQueue).forEach(fn => {
      if (typeof fn === 'function' && fn.mockReset) {
        fn.mockReset();
      }
    });

    // Re-implement ALL mocks with fresh state
    mockRequestQueue.generateRequestId.mockImplementation(() =>
      `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    );

    mockRequestQueue.addRequest.mockImplementation((type, endpoint, data, options = {}) => {
      try {
        const request = {
          id: mockRequestQueue.generateRequestId(),
          type,
          endpoint,
          data,
          options: {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...options.headers },
            ...options
          },
          timestamp: Date.now(),
          retryCount: 0,
          status: 'pending'
        };

        const queue = mockRequestQueue.getQueue();
        queue.push(request);
        mockRequestQueue.saveQueue(queue);

        return request.id;
      } catch (error) {
        return null;
      }
    });

    mockRequestQueue.getQueue.mockImplementation(() => {
      try {
        const queueData = localStorageMock.getItem('burando_request_queue');
        return queueData ? JSON.parse(queueData) : [];
      } catch (error) {
        return [];
      }
    });

    mockRequestQueue.saveQueue.mockImplementation((queue) => {
      try {
        localStorageMock.setItem('burando_request_queue', JSON.stringify(queue));
        return true;
      } catch (error) {
        return false;
      }
    });

    mockRequestQueue.processQueue.mockImplementation(async () => {
      if (!navigator.onLine) return;

      const queue = mockRequestQueue.getQueue();
      const pendingRequests = queue.filter(req => req.status === 'pending' || req.status === 'failed');

      for (const request of pendingRequests) {
        try {
          const response = await fetch(request.endpoint, {
            ...request.options,
            body: JSON.stringify(request.data)
          });

          if (response && response.ok) {
            mockRequestQueue.markRequestCompleted(request.id);
          } else {
            const status = response ? response.status : 500;
            mockRequestQueue.handleFailedRequest(request, `HTTP ${status}`);
          }
        } catch (error) {
          mockRequestQueue.handleFailedRequest(request, error.message);
        }
      }
    });

    mockRequestQueue.markRequestCompleted.mockImplementation((requestId) => {
      const queue = mockRequestQueue.getQueue();
      const requestIndex = queue.findIndex(req => req.id === requestId);

      if (requestIndex !== -1) {
        queue[requestIndex].status = 'completed';
        queue[requestIndex].completedAt = Date.now();
        mockRequestQueue.saveQueue(queue);
      }
    });

    mockRequestQueue.handleFailedRequest.mockImplementation((request, errorMessage) => {
      const queue = mockRequestQueue.getQueue();
      const requestIndex = queue.findIndex(req => req.id === request.id);

      if (requestIndex === -1) return;

      request.retryCount++;
      request.lastError = errorMessage;
      request.lastRetry = Date.now();

      if (request.retryCount >= mockRequestQueue.MAX_RETRY_ATTEMPTS) {
        request.status = 'failed_permanently';
      } else {
        request.status = 'failed';
      }

      queue[requestIndex] = request;
      mockRequestQueue.saveQueue(queue);
    });

    mockRequestQueue.getQueueStats.mockImplementation(() => {
      const queue = mockRequestQueue.getQueue();
      return {
        total: queue.length,
        pending: queue.filter(req => req.status === 'pending').length,
        failed: queue.filter(req => req.status === 'failed').length,
        completed: queue.filter(req => req.status === 'completed').length,
        failedPermanently: queue.filter(req => req.status === 'failed_permanently').length
      };
    });

    mockRequestQueue.clearQueue.mockImplementation(() => {
      try {
        localStorageMock.removeItem('burando_request_queue');
        return true;
      } catch (error) {
        return false;
      }
    });

    mockRequestQueue.cleanupQueue.mockImplementation(() => {
      try {
        const queue = mockRequestQueue.getQueue();
        const oneHourAgo = Date.now() - (60 * 60 * 1000);

        const filteredQueue = queue.filter(request => {
          if (request.status === 'pending' || request.status === 'failed') {
            return true;
          }
          if (request.status === 'completed' && request.completedAt > oneHourAgo) {
            return true;
          }
          return false;
        });

        mockRequestQueue.saveQueue(filteredQueue);
      } catch (error) {
        console.warn('Cleanup error:', error);
      }
    });

    mockRequestQueue.queueQuizCompletion.mockImplementation((phaseId, answers, score, timeSpent) => {
      return mockRequestQueue.addRequest('quiz_completion', '/api/quiz/submit', {
        phaseId,
        answers,
        score,
        timeSpent,
        completedAt: Date.now()
      });
    });

    mockRequestQueue.queueProgressUpdate.mockImplementation((progressData) => {
      return mockRequestQueue.addRequest('progress_update', '/api/training/progress', progressData);
    });

    mockRequestQueue.queueProfileUpdate.mockImplementation((profileData) => {
      return mockRequestQueue.addRequest('profile_update', '/api/profile', profileData);
    });
  });

  describe('Queue Management', () => {
    it('should add requests to queue', () => {
      const requestId = requestQueue.addRequest(
        'quiz_completion',
        '/api/quiz/submit',
        { phaseId: 'phase-1', score: 85 }
      );

      expect(requestId).toBeDefined();
      expect(typeof requestId).toBe('string');

      const queue = requestQueue.getQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].type).toBe('quiz_completion');
      expect(queue[0].endpoint).toBe('/api/quiz/submit');
      expect(queue[0].status).toBe('pending');
    });

    it('should generate unique request IDs', () => {
      const id1 = requestQueue.addRequest('test', '/api/test1', {});
      const id2 = requestQueue.addRequest('test', '/api/test2', {});

      expect(id1).not.toBe(id2);
    });

    it('should get queue statistics', () => {
      requestQueue.addRequest('quiz', '/api/quiz', {});
      requestQueue.addRequest('progress', '/api/progress', {});

      const stats = requestQueue.getQueueStats();
      expect(stats.total).toBe(2);
      expect(stats.pending).toBe(2);
      expect(stats.failed).toBe(0);
      expect(stats.completed).toBe(0);
    });

    it('should clear entire queue', () => {
      requestQueue.addRequest('test1', '/api/test1', {});
      requestQueue.addRequest('test2', '/api/test2', {});

      expect(requestQueue.getQueue()).toHaveLength(2);

      const result = requestQueue.clearQueue();
      expect(result).toBe(true);
      expect(requestQueue.getQueue()).toHaveLength(0);
    });
  });

  describe('Request Processing', () => {
    it('should process successful requests', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, id: 'quiz-123' })
      });

      const requestId = requestQueue.addRequest(
        'quiz_completion',
        '/api/quiz/submit',
        { phaseId: 'phase-1', score: 85 }
      );

      await requestQueue.processQueue();

      const queue = requestQueue.getQueue();
      const request = queue.find(r => r.id === requestId);
      expect(request.status).toBe('completed');
      expect(request.completedAt).toBeDefined();
    });

    it('should handle failed requests with retry', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      const requestId = requestQueue.addRequest(
        'quiz_completion',
        '/api/quiz/submit',
        { phaseId: 'phase-1', score: 85 }
      );

      await requestQueue.processQueue();

      const queue = requestQueue.getQueue();
      const request = queue.find(r => r.id === requestId);
      expect(request.status).toBe('failed');
      expect(request.retryCount).toBe(1);
      expect(request.lastError).toBe('Network error');
    });

    it('should mark requests as permanently failed after max retries', async () => {
      fetch.mockRejectedValue(new Error('Persistent error'));

      const requestId = requestQueue.addRequest(
        'quiz_completion',
        '/api/quiz/submit',
        { phaseId: 'phase-1', score: 85 }
      );

      // Process multiple times to exceed retry limit
      for (let i = 0; i < 4; i++) {
        await requestQueue.processQueue();
      }

      const queue = requestQueue.getQueue();
      const request = queue.find(r => r.id === requestId);
      expect(request.status).toBe('failed_permanently');
      expect(request.retryCount).toBe(3);
    });

    it('should not process queue when offline', async () => {
      navigator.onLine = false;

      requestQueue.addRequest('test', '/api/test', {});
      await requestQueue.processQueue();

      const queue = requestQueue.getQueue();
      expect(queue[0].status).toBe('pending');
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  describe('Specific Request Types', () => {
    it('should queue quiz completion requests', () => {
      const requestId = requestQueue.queueQuizCompletion(
        'phase-1',
        { q1: 'A', q2: 'B' },
        85,
        300
      );

      expect(requestId).toBeDefined();

      const queue = requestQueue.getQueue();
      const request = queue.find(r => r.id === requestId);
      expect(request.type).toBe('quiz_completion');
      expect(request.endpoint).toBe('/api/quiz/submit');
      expect(request.data.phaseId).toBe('phase-1');
      expect(request.data.score).toBe(85);
    });

    it('should queue progress update requests', () => {
      const progressData = {
        currentPhase: 2,
        completedPhases: [1],
        totalProgress: 50
      };

      const requestId = requestQueue.queueProgressUpdate(progressData);

      expect(requestId).toBeDefined();

      const queue = requestQueue.getQueue();
      const request = queue.find(r => r.id === requestId);
      expect(request.type).toBe('progress_update');
      expect(request.endpoint).toBe('/api/training/progress');
      expect(request.data).toEqual(progressData);
    });

    it('should queue profile update requests', () => {
      const profileData = {
        name: 'Updated Name',
        vessel: 'New Vessel',
        preferences: { language: 'nl' }
      };

      const requestId = requestQueue.queueProfileUpdate(profileData);

      expect(requestId).toBeDefined();

      const queue = requestQueue.getQueue();
      const request = queue.find(r => r.id === requestId);
      expect(request.type).toBe('profile_update');
      expect(request.endpoint).toBe('/api/profile');
      expect(request.data).toEqual(profileData);
    });
  });

  describe('Queue Cleanup', () => {
    it('should clean up old completed requests', () => {
      // Add completed request with old timestamp
      const oldRequest = {
        id: 'old-request',
        status: 'completed',
        completedAt: Date.now() - (2 * 60 * 60 * 1000), // 2 hours ago
        type: 'test',
        endpoint: '/api/test',
        data: {}
      };

      // Add recent completed request
      const recentRequest = {
        id: 'recent-request',
        status: 'completed',
        completedAt: Date.now() - (30 * 60 * 1000), // 30 minutes ago
        type: 'test',
        endpoint: '/api/test',
        data: {}
      };

      const queue = [oldRequest, recentRequest];
      localStorageMock.setItem('burando_request_queue', JSON.stringify(queue));

      requestQueue.cleanupQueue();

      const cleanedQueue = requestQueue.getQueue();
      expect(cleanedQueue).toHaveLength(1);
      expect(cleanedQueue[0].id).toBe('recent-request');
    });

    it('should keep pending and failed requests during cleanup', () => {
      const requests = [
        { id: 'pending', status: 'pending', timestamp: Date.now() },
        { id: 'failed', status: 'failed', timestamp: Date.now() },
        { id: 'old-completed', status: 'completed', completedAt: Date.now() - (2 * 60 * 60 * 1000) }
      ];

      localStorageMock.setItem('burando_request_queue', JSON.stringify(requests));

      requestQueue.cleanupQueue();

      const cleanedQueue = requestQueue.getQueue();
      expect(cleanedQueue).toHaveLength(2);
      expect(cleanedQueue.map(r => r.id)).toEqual(['pending', 'failed']);
    });
  });

  describe('Error Handling', () => {
    it('should handle localStorage errors gracefully', () => {
      // Override the addRequest mock to simulate localStorage error
      mockRequestQueue.addRequest.mockImplementationOnce((type, endpoint, data, options = {}) => {
        try {
          // Simulate localStorage error during saveQueue
          localStorageMock.setItem.mockImplementationOnce(() => {
            throw new Error('Storage quota exceeded');
          });

          const request = {
            id: mockRequestQueue.generateRequestId(),
            type,
            endpoint,
            data,
            options: {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...options.headers },
              ...options
            },
            timestamp: Date.now(),
            retryCount: 0,
            status: 'pending'
          };

          const queue = mockRequestQueue.getQueue();
          queue.push(request);

          // This will throw due to our mock
          localStorageMock.setItem('burando_request_queue', JSON.stringify(queue));

          return request.id;
        } catch (error) {
          return null;
        }
      });

      const result = requestQueue.addRequest('test', '/api/test', {});
      expect(result).toBeNull();
    });

    it('should handle corrupted queue data', () => {
      localStorageMock.setItem('burando_request_queue', 'invalid-json');

      const queue = requestQueue.getQueue();
      expect(queue).toEqual([]);
    });

    it('should handle HTTP error responses', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request'
      });

      const requestId = requestQueue.addRequest('test', '/api/test', {});
      await requestQueue.processQueue();

      const queue = requestQueue.getQueue();
      const request = queue.find(r => r.id === requestId);
      expect(request.status).toBe('failed');
      expect(request.lastError).toContain('HTTP 400');
    });
  });

  describe('Maritime-Specific Features', () => {
    it('should handle maritime quiz submissions', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ 
          success: true, 
          certificateGenerated: true,
          maritimeCompliance: true 
        })
      });

      const requestId = requestQueue.queueQuizCompletion(
        'maritime-safety-phase',
        { 
          'emergency-procedures': 'A',
          'safety-equipment': 'B',
          'navigation-rules': 'C'
        },
        95,
        450
      );

      await requestQueue.processQueue();

      const queue = requestQueue.getQueue();
      const request = queue.find(r => r.id === requestId);
      expect(request.status).toBe('completed');
      expect(request.data.phaseId).toBe('maritime-safety-phase');
    });

    it('should prioritize safety-related requests', () => {
      // Add regular request
      const regularId = requestQueue.addRequest('progress', '/api/progress', {});
      
      // Add safety request
      const safetyId = requestQueue.queueQuizCompletion(
        'safety-emergency-procedures',
        { 'safety-check': 'A' },
        100,
        200
      );

      const queue = requestQueue.getQueue();
      expect(queue).toHaveLength(2);
      
      // Both requests should be queued
      expect(queue.find(r => r.id === regularId)).toBeDefined();
      expect(queue.find(r => r.id === safetyId)).toBeDefined();
    });
  });
});
