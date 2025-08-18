const TestFactories = require('../utils/testFactories');
const testHelpers = require('../utils/testHelpers');

describe('Performance and Load Testing', () => {
  let testUsers = [];
  let testManager;

  beforeAll(async () => {
    // Create multiple test users for load testing
    testUsers = await Promise.all(
      Array.from({ length: 10 }, (_, i) => 
        testHelpers.createTestUser({
          email: `load-test-${i}@shipdocs.app`,
          name: `Load Test User ${i}`
        })
      )
    );
    
    testManager = await testHelpers.createTestManager({
      email: 'load-test-manager@shipdocs.app'
    });
  });

  afterAll(async () => {
    await testHelpers.cleanup();
  });

  describe('API Response Times', () => {
    it('should respond to authentication requests within 2 seconds', async () => {
      const startTime = Date.now();
      
      await testHelpers.apiRequest('/api/auth/magic-link', {
        method: 'POST',
        data: { email: testUsers[0].email }
      });
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(2000);
    });

    it('should handle form submissions within 3 seconds', async () => {
      const formData = TestFactories.createOnboardingData({
        userId: testUsers[0].id,
        phase: 1
      });

      const startTime = Date.now();
      
      await testHelpers.submitFormData(
        testUsers[0].id,
        formData.formData,
        1
      );
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(3000);
    });

    it('should generate PDFs within 5 seconds', async () => {
      // First submit form data
      const formData = TestFactories.createOnboardingData({
        userId: testUsers[1].id,
        phase: 1
      });

      await testHelpers.submitFormData(
        testUsers[1].id,
        formData.formData,
        1
      );

      const startTime = Date.now();
      
      await testHelpers.generateTestPdf(testUsers[1].id);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(5000);
    });

    it('should handle status queries within 1 second', async () => {
      const startTime = Date.now();
      
      await testHelpers.apiRequest(`/api/onboarding/status/${testUsers[0].id}`);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(1000);
    });
  });

  describe('Concurrent Request Handling', () => {
    it('should handle multiple simultaneous authentication requests', async () => {
      const concurrentRequests = 20;
      const requests = Array.from({ length: concurrentRequests }, (_, i) =>
        testHelpers.apiRequest('/api/auth/magic-link', {
          method: 'POST',
          data: { email: `concurrent-${i}@shipdocs.app` }
        })
      );

      const startTime = Date.now();
      const results = await Promise.allSettled(requests);
      const totalTime = Date.now() - startTime;

      // Check that most requests succeeded
      const successfulRequests = results.filter(r => r.status === 'fulfilled').length;
      expect(successfulRequests).toBeGreaterThan(concurrentRequests * 0.8); // 80% success rate

      // Check that total time is reasonable (not linear with request count)
      expect(totalTime).toBeLessThan(concurrentRequests * 500); // Should be much faster than sequential
    });

    it('should handle concurrent form submissions without data corruption', async () => {
      const concurrentSubmissions = 10;
      const formData = TestFactories.createOnboardingData({
        phase: 1
      });

      const submissions = testUsers.slice(0, concurrentSubmissions).map(user =>
        testHelpers.submitFormData(user.id, formData.formData, 1)
      );

      const results = await Promise.allSettled(submissions);
      const successfulSubmissions = results.filter(r => r.status === 'fulfilled');

      expect(successfulSubmissions.length).toBe(concurrentSubmissions);

      // Verify each submission has unique ID (no data corruption)
      const submissionIds = successfulSubmissions.map(r => r.value.data.id);
      const uniqueIds = new Set(submissionIds);
      expect(uniqueIds.size).toBe(concurrentSubmissions);
    });

    it('should handle concurrent PDF generation requests', async () => {
      // First submit form data for multiple users
      const formData = TestFactories.createOnboardingData({ phase: 1 });
      
      await Promise.all(
        testUsers.slice(2, 7).map(user =>
          testHelpers.submitFormData(user.id, formData.formData, 1)
        )
      );

      // Generate PDFs concurrently
      const pdfRequests = testUsers.slice(2, 7).map(user =>
        testHelpers.generateTestPdf(user.id)
      );

      const startTime = Date.now();
      const results = await Promise.allSettled(pdfRequests);
      const totalTime = Date.now() - startTime;

      const successfulPdfs = results.filter(r => r.status === 'fulfilled').length;
      expect(successfulPdfs).toBeGreaterThan(3); // At least 60% success rate

      // Should complete within reasonable time
      expect(totalTime).toBeLessThan(15000); // 15 seconds for 5 PDFs
    });
  });

  describe('Memory and Resource Usage', () => {
    it('should not cause memory leaks during repeated operations', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Perform many operations
      for (let i = 0; i < 50; i++) {
        const formData = TestFactories.createOnboardingData({
          userId: testUsers[i % testUsers.length].id,
          phase: 1
        });

        await testHelpers.apiRequest('/api/onboarding/form', {
          method: 'POST',
          data: {
            userId: testUsers[i % testUsers.length].id,
            phase: 1,
            formData: formData.formData
          }
        });

        // Force garbage collection periodically
        if (i % 10 === 0 && global.gc) {
          global.gc();
        }
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    it('should handle large form data efficiently', async () => {
      const largeFormData = TestFactories.createOnboardingData({
        userId: testUsers[7].id,
        phase: 1,
        formData: {
          ...TestFactories.createOnboardingData().formData,
          // Add large text fields
          additionalNotes: 'x'.repeat(10000), // 10KB of text
          detailedExperience: 'y'.repeat(5000), // 5KB of text
          certificationDetails: Array.from({ length: 100 }, (_, i) => ({
            name: `Certification ${i}`,
            issuer: `Issuer ${i}`,
            details: 'z'.repeat(100)
          }))
        }
      });

      const startTime = Date.now();
      
      const result = await testHelpers.submitFormData(
        testUsers[7].id,
        largeFormData.formData,
        1
      );
      
      const responseTime = Date.now() - startTime;
      
      expect(result.success).toBe(true);
      expect(responseTime).toBeLessThan(5000); // Should handle large data within 5 seconds
    });
  });

  describe('Database Performance', () => {
    it('should handle complex queries efficiently', async () => {
      // Create some test data first
      await Promise.all(
        testUsers.map(user => {
          const formData = TestFactories.createOnboardingData({
            userId: user.id,
            phase: 1
          });
          return testHelpers.submitFormData(user.id, formData.formData, 1);
        })
      );

      const startTime = Date.now();
      
      // Query that might involve joins and aggregations
      const result = await testHelpers.apiRequest('/api/manager/dashboard/stats', {
        headers: {
          'Authorization': `Bearer ${testManager.token || 'mock-manager-token'}`
        }
      });
      
      const queryTime = Date.now() - startTime;
      
      expect(result.success).toBe(true);
      expect(queryTime).toBeLessThan(2000); // Complex queries should complete within 2 seconds
    });

    it('should handle pagination efficiently for large datasets', async () => {
      const startTime = Date.now();
      
      // Request large page of data
      const result = await testHelpers.apiRequest('/api/manager/crew?page=1&limit=100', {
        headers: {
          'Authorization': `Bearer ${testManager.token || 'mock-manager-token'}`
        }
      });
      
      const queryTime = Date.now() - startTime;
      
      expect(result.success).toBe(true);
      expect(queryTime).toBeLessThan(1500); // Pagination should be fast
      expect(result.data.pagination).toBeDefined();
    });
  });

  describe('Email Performance', () => {
    it('should handle bulk email sending efficiently', async () => {
      const emailPromises = testUsers.map(user =>
        testHelpers.apiRequest('/api/email/send-welcome', {
          method: 'POST',
          data: {
            userId: user.id,
            templateId: 'welcome_email'
          }
        })
      );

      const startTime = Date.now();
      const results = await Promise.allSettled(emailPromises);
      const totalTime = Date.now() - startTime;

      const successfulEmails = results.filter(r => r.status === 'fulfilled').length;
      expect(successfulEmails).toBeGreaterThan(testUsers.length * 0.8); // 80% success rate

      // Should send emails efficiently (not more than 1 second per email)
      expect(totalTime).toBeLessThan(testUsers.length * 1000);
    });

    it('should queue emails properly under high load', async () => {
      // Generate many email requests
      const manyEmailRequests = Array.from({ length: 50 }, (_, i) =>
        testHelpers.apiRequest('/api/email/send-notification', {
          method: 'POST',
          data: {
            to: `bulk-test-${i}@shipdocs.app`,
            subject: `Bulk Test Email ${i}`,
            template: 'notification'
          }
        })
      );

      const startTime = Date.now();
      const results = await Promise.allSettled(manyEmailRequests);
      const totalTime = Date.now() - startTime;

      // Most emails should be queued successfully
      const queuedEmails = results.filter(r => 
        r.status === 'fulfilled' && 
        (r.value.status === 'queued' || r.value.status === 'sent')
      ).length;

      expect(queuedEmails).toBeGreaterThan(40); // 80% should be queued/sent
      expect(totalTime).toBeLessThan(10000); // Should queue quickly
    });
  });

  describe('Stress Testing', () => {
    // Skip stress test in CI unless explicitly enabled
    const runStressTest = process.env.RUN_STRESS_TEST === 'true' || process.env.NODE_ENV !== 'test';
    const testFunction = runStressTest ? it : it.skip;
    
    testFunction('should maintain stability under sustained load', async () => {
      const duration = process.env.STRESS_TEST_DURATION ? parseInt(process.env.STRESS_TEST_DURATION) : 10000; // Default 10 seconds, configurable
      const requestInterval = 100; // Request every 100ms
      const startTime = Date.now();
      const results = [];
      let requestCount = 0;

      while (Date.now() - startTime < duration) {
        const userIndex = requestCount % testUsers.length;
        
        try {
          const result = await testHelpers.apiRequest(`/api/onboarding/status/${testUsers[userIndex].id}`);
          results.push({ success: true, time: Date.now() });
        } catch (error) {
          results.push({ success: false, error: error.message, time: Date.now() });
        }

        requestCount++;
        await testHelpers.wait(requestInterval);
      }

      const successRate = results.filter(r => r.success).length / results.length;
      const averageResponseTime = results
        .filter(r => r.success)
        .reduce((sum, r, i, arr) => {
          if (i === 0) return 0;
          return sum + (r.time - results[i - 1].time);
        }, 0) / (results.length - 1);

      expect(successRate).toBeGreaterThan(0.95); // 95% success rate
      expect(averageResponseTime).toBeLessThan(500); // Average response under 500ms
      expect(requestCount).toBeGreaterThan(250); // Should handle many requests
    });
  });
});
