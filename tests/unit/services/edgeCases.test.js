const TestFactories = require('../../utils/testFactories');
const testHelpers = require('../../utils/testHelpers');

describe('Edge Case Testing', () => {
  beforeAll(() => {
    testHelpers.mockExternalServices();
  });

  afterAll(() => {
    testHelpers.restoreMocks();
  });

  describe('Boundary Value Testing', () => {
    it('should handle empty strings gracefully', async () => {
      const testUser = TestFactories.createUser();
      
      // Test empty email
      await expect(
        testHelpers.apiRequest('/api/auth/magic-link', {
          method: 'POST',
          data: { email: '' }
        })
      ).rejects.toThrow('API Error 400');
      
      // Test whitespace-only strings
      await expect(
        testHelpers.apiRequest('/api/auth/magic-link', {
          method: 'POST',
          data: { email: '   ' }
        })
      ).rejects.toThrow('API Error 400');
    });

    it('should handle maximum length inputs', async () => {
      const longEmail = 'a'.repeat(240) + '@test.com'; // 250 chars total
      
      await expect(
        testHelpers.apiRequest('/api/auth/magic-link', {
          method: 'POST',
          data: { email: longEmail }
        })
      ).rejects.toThrow('API Error 400');
    });

    it('should handle special characters in inputs', async () => {
      const specialCharInputs = [
        "test'user@shipdocs.app",
        'test"user@shipdocs.app',
        'test<script>@shipdocs.app',
        'test;DROP TABLE users;@shipdocs.app',
        'test\u0000@shipdocs.app', // Null character
        'test\n\r@shipdocs.app', // Newlines
      ];

      for (const email of specialCharInputs) {
        await expect(
          testHelpers.apiRequest('/api/auth/magic-link', {
            method: 'POST',
            data: { email }
          })
        ).rejects.toThrow('API Error 400');
      }
    });

    it('should handle unicode and emoji in text fields', async () => {
      const testUser = TestFactories.createUser();
      const unicodeData = {
        fullName: '测试用户 🚢',
        nationality: '中国 🇨🇳',
        additionalNotes: 'Testing unicode: café, naïve, Zürich 🌍'
      };

      const formData = TestFactories.createOnboardingData({
        userId: testUser.id,
        phase: 1,
        formData: {
          personalInfo: unicodeData
        }
      });

      // Should handle unicode gracefully
      const result = await testHelpers.submitFormData(
        testUser.id,
        formData.formData,
        1
      );

      expect(result.success).toBe(true);
    });
  });

  describe('Null and Undefined Handling', () => {
    it('should handle null values in optional fields', async () => {
      const testUser = TestFactories.createUser();
      
      const formData = {
        personalInfo: {
          fullName: 'Test User',
          dateOfBirth: '1990-01-01',
          nationality: 'Dutch',
          middleName: null,
          preferredName: undefined
        }
      };

      const result = await testHelpers.submitFormData(
        testUser.id,
        formData,
        1
      );

      expect(result.success).toBe(true);
    });

    it('should reject null values in required fields', async () => {
      const testUser = TestFactories.createUser();
      
      const formData = {
        personalInfo: {
          fullName: null, // Required field
          dateOfBirth: '1990-01-01',
          nationality: 'Dutch'
        }
      };

      await expect(
        testHelpers.submitFormData(testUser.id, formData, 1)
      ).rejects.toThrow('API Error 400');
    });
  });

  describe('Date and Time Edge Cases', () => {
    it('should handle various date formats', async () => {
      const testUser = TestFactories.createUser();
      
      const dateFormats = [
        '1990-01-01',
        '01/01/1990',
        '1990/01/01',
        '01-01-1990'
      ];

      for (const dateFormat of dateFormats) {
        const formData = {
          personalInfo: {
            fullName: 'Test User',
            dateOfBirth: dateFormat,
            nationality: 'Dutch'
          }
        };

        try {
          const result = await testHelpers.submitFormData(
            testUser.id,
            formData,
            1
          );
          // Some formats might be accepted
          expect(result.success).toBeDefined();
        } catch (error) {
          // Some formats might be rejected
          expect(error.message).toContain('API Error');
        }
      }
    });

    it('should handle future dates appropriately', async () => {
      const testUser = TestFactories.createUser();
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      
      const formData = {
        personalInfo: {
          fullName: 'Test User',
          dateOfBirth: futureDate.toISOString().split('T')[0],
          nationality: 'Dutch'
        }
      };

      await expect(
        testHelpers.submitFormData(testUser.id, formData, 1)
      ).rejects.toThrow('API Error 400');
    });

    it('should handle leap year dates', async () => {
      const testUser = TestFactories.createUser();
      
      const formData = {
        personalInfo: {
          fullName: 'Test User',
          dateOfBirth: '2000-02-29', // Leap year
          nationality: 'Dutch'
        }
      };

      const result = await testHelpers.submitFormData(
        testUser.id,
        formData,
        1
      );

      expect(result.success).toBe(true);
    });
  });

  describe('Concurrent Operation Edge Cases', () => {
    it('should handle duplicate submissions gracefully', async () => {
      const testUser = TestFactories.createUser();
      const formData = TestFactories.createOnboardingData({
        userId: testUser.id,
        phase: 1
      });

      // Submit the same form twice simultaneously
      const submission1 = testHelpers.submitFormData(
        testUser.id,
        formData.formData,
        1
      );
      const submission2 = testHelpers.submitFormData(
        testUser.id,
        formData.formData,
        1
      );

      const results = await Promise.allSettled([submission1, submission2]);
      
      // At least one should succeed
      const successes = results.filter(r => r.status === 'fulfilled');
      expect(successes.length).toBeGreaterThanOrEqual(1);
      
      // If both succeed, they should have different IDs
      if (successes.length === 2) {
        expect(successes[0].value.data.id).not.toBe(successes[1].value.data.id);
      }
    });

    it('should handle rapid status checks', async () => {
      const testUser = TestFactories.createUser();
      
      // Make 10 rapid status checks
      const statusChecks = Array.from({ length: 10 }, () =>
        testHelpers.apiRequest(`/api/onboarding/status/${testUser.id}`)
      );

      const results = await Promise.allSettled(statusChecks);
      const successes = results.filter(r => r.status === 'fulfilled');
      
      // All should succeed
      expect(successes.length).toBe(10);
      
      // All should return the same status
      const statuses = successes.map(r => r.value.data.status);
      expect(new Set(statuses).size).toBe(1);
    });
  });

  describe('Network and Timeout Edge Cases', () => {
    it('should handle slow responses gracefully', async () => {
      // Mock a slow response
      const mockFetch = jest.fn().mockImplementationOnce(() =>
        new Promise(resolve => {
          setTimeout(() => {
            resolve({
              ok: true,
              status: 200,
              json: () => Promise.resolve({ success: true }),
              text: () => Promise.resolve('{"success": true}')
            });
          }, 1000); // Reduced to 1 second for faster tests
        })
      );

      global.fetch = mockFetch;

      const startTime = Date.now();

      try {
        await testHelpers.apiRequest('/api/health', { timeout: 2000 });
        const duration = Date.now() - startTime;
        expect(duration).toBeGreaterThan(900);
        expect(duration).toBeLessThan(1500);
      } catch (error) {
        // Timeout is also acceptable
        expect(error.message).toMatch(/timeout|ECONNABORTED/);
      }
    });

    it('should handle partial responses', async () => {
      // Mock a response that gets cut off
      const mockFetch = jest.fn().mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.reject(new Error('Unexpected end of JSON input')),
          text: () => Promise.reject(new Error('Unexpected end of JSON input'))
        })
      );

      global.fetch = mockFetch;

      await expect(
        testHelpers.apiRequest('/api/health')
      ).rejects.toThrow(/Unexpected end of JSON input|Parse error/);
    });
  });

  describe('Authentication Edge Cases', () => {
    it('should handle expired tokens appropriately', async () => {
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImV4cCI6MTAwMDAwMDAwMH0.invalid';
      
      await expect(
        testHelpers.apiRequest('/api/manager/crew', {
          headers: {
            'Authorization': `Bearer ${expiredToken}`
          }
        })
      ).rejects.toThrow('API Error 401');
    });

    it('should handle malformed tokens', async () => {
      const malformedTokens = [
        'not-a-jwt-token',
        'Bearer ',
        'Bearer',
        '',
        'null',
        'undefined'
      ];

      for (const token of malformedTokens) {
        await expect(
          testHelpers.apiRequest('/api/manager/crew', {
            headers: {
              'Authorization': token
            }
          })
        ).rejects.toThrow(/API Error (401|403)/);
      }
    });
  });

  describe('File Upload Edge Cases', () => {
    it('should handle empty file uploads', async () => {
      const emptyFile = new Blob([], { type: 'application/pdf' });
      
      await expect(
        testHelpers.apiRequest('/api/upload/document', {
          method: 'POST',
          data: {
            file: emptyFile,
            type: 'certificate'
          }
        })
      ).rejects.toThrow('API Error 400');
    });

    it('should reject files exceeding size limits', async () => {
      // Create a 20MB file (assuming limit is 10MB)
      const largeFile = new Blob([new ArrayBuffer(20 * 1024 * 1024)], { 
        type: 'application/pdf' 
      });
      
      await expect(
        testHelpers.apiRequest('/api/upload/document', {
          method: 'POST',
          data: {
            file: largeFile,
            type: 'certificate'
          }
        })
      ).rejects.toThrow('API Error 413');
    });

    it('should handle unsupported file types', async () => {
      const executableFile = new Blob(['#!/bin/bash\necho "test"'], { 
        type: 'application/x-executable' 
      });
      
      await expect(
        testHelpers.apiRequest('/api/upload/document', {
          method: 'POST',
          data: {
            file: executableFile,
            type: 'certificate'
          }
        })
      ).rejects.toThrow('API Error 415');
    });
  });

  describe('Database Transaction Edge Cases', () => {
    it('should rollback on partial failures', async () => {
      const testUser = TestFactories.createUser();
      
      // Try to create workflow with invalid nested data
      const workflowData = {
        name: 'Test Workflow',
        slug: 'test-workflow',
        type: 'onboarding',
        workflow_phases: [
          {
            phase_number: 1,
            name: 'Phase 1',
            workflow_phase_items: [
              {
                item_number: 1,
                type: 'invalid-type', // This should cause validation failure
                title: 'Test Item'
              }
            ]
          }
        ]
      };

      await expect(
        testHelpers.apiRequest('/api/workflows', {
          method: 'POST',
          data: workflowData
        })
      ).rejects.toThrow('API Error');
      
      // Verify no partial data was saved
      const workflows = await testHelpers.apiRequest('/api/workflows');
      const createdWorkflow = workflows.find(w => w.slug === 'test-workflow');
      expect(createdWorkflow).toBeUndefined();
    });
  });
});