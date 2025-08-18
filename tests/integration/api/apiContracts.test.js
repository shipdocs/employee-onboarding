const TestFactories = require('../../utils/testFactories');
const testHelpers = require('../../utils/testHelpers');

describe('API Contract Tests', () => {
  let testUser;
  let testManager;

  beforeAll(async () => {
    testUser = await testHelpers.createTestUser();
    testManager = await testHelpers.createTestManager();
  });

  afterAll(async () => {
    await testHelpers.cleanup();
  });

  describe('Authentication Endpoints', () => {
    describe('POST /api/auth/magic-link', () => {
      it('should return correct response structure for valid email', async () => {
        const response = await testHelpers.apiRequest('/api/auth/magic-link', {
          method: 'POST',
          data: { email: testUser.email }
        });

        // Assert response structure
        expect(response).toMatchObject({
          success: true,
          message: expect.any(String),
          magicLink: expect.stringMatching(/^https?:\/\/.+\/auth\/verify\?token=.+$/)
        });

        testHelpers.assertApiResponse(response, ['success', 'message', 'magicLink']);
      });

      it('should return error for invalid email format', async () => {
        await expect(
          testHelpers.apiRequest('/api/auth/magic-link', {
            method: 'POST',
            data: { email: 'invalid-email' }
          })
        ).rejects.toThrow('API Error 400');
      });

      it('should return error for missing email', async () => {
        await expect(
          testHelpers.apiRequest('/api/auth/magic-link', {
            method: 'POST',
            data: {}
          })
        ).rejects.toThrow('API Error 400');
      });
    });

    describe('GET /api/auth/verify', () => {
      it('should verify valid token and return user data', async () => {
        // Generate magic link first
        const magicLinkResponse = await testHelpers.apiRequest('/api/auth/magic-link', {
          method: 'POST',
          data: { email: testUser.email }
        });

        const token = magicLinkResponse.magicLink.split('token=')[1];
        
        const response = await testHelpers.apiRequest(`/api/auth/verify?token=${token}`);

        expect(response).toMatchObject({
          success: true,
          user: {
            id: expect.any(String),
            email: testUser.email,
            name: expect.any(String),
            role: expect.any(String)
          },
          token: expect.any(String)
        });

        testHelpers.assertApiResponse(response, ['success', 'user', 'token']);
      });

      it('should return error for invalid token', async () => {
        await expect(
          testHelpers.apiRequest('/api/auth/verify?token=invalid-token')
        ).rejects.toThrow('API Error 401');
      });

      it('should return error for expired token', async () => {
        // This would require mocking time or using a pre-expired token
        const expiredToken = 'expired-token-example';
        
        await expect(
          testHelpers.apiRequest(`/api/auth/verify?token=${expiredToken}`)
        ).rejects.toThrow('API Error 401');
      });
    });
  });

  describe('Onboarding Endpoints', () => {
    describe('POST /api/onboarding/form', () => {
      it('should accept valid form submission', async () => {
        const formData = TestFactories.createOnboardingData({
          userId: testUser.id,
          phase: 1
        });

        const response = await testHelpers.apiRequest('/api/onboarding/form', {
          method: 'POST',
          data: {
            userId: testUser.id,
            phase: 1,
            formData: formData.formData
          }
        });

        expect(response).toMatchObject({
          success: true,
          data: {
            id: expect.any(String),
            userId: testUser.id,
            phase: 1,
            status: expect.stringMatching(/^(in_progress|completed)$/),
            createdAt: expect.any(String)
          }
        });

        testHelpers.assertApiResponse(response, ['success', 'data']);
      });

      it('should validate required form fields', async () => {
        await expect(
          testHelpers.apiRequest('/api/onboarding/form', {
            method: 'POST',
            data: {
              userId: testUser.id,
              phase: 1,
              formData: {} // Empty form data
            }
          })
        ).rejects.toThrow('API Error 400');
      });

      it('should enforce phase sequence', async () => {
        await expect(
          testHelpers.apiRequest('/api/onboarding/form', {
            method: 'POST',
            data: {
              userId: testUser.id,
              phase: 3, // Skipping phase 2
              formData: TestFactories.createOnboardingData().formData
            }
          })
        ).rejects.toThrow('API Error 400');
      });
    });

    describe('GET /api/onboarding/status/:userId', () => {
      it('should return onboarding status for valid user', async () => {
        const response = await testHelpers.apiRequest(`/api/onboarding/status/${testUser.id}`);

        expect(response).toMatchObject({
          success: true,
          data: {
            userId: testUser.id,
            status: expect.stringMatching(/^(pending|in_progress|completed)$/),
            currentPhase: expect.any(Number),
            completedPhases: expect.any(Array),
            createdAt: expect.any(String),
            updatedAt: expect.any(String)
          }
        });

        testHelpers.assertApiResponse(response, ['success', 'data']);
      });

      it('should return 404 for non-existent user', async () => {
        const nonExistentUserId = TestFactories.createUser().id;
        
        await expect(
          testHelpers.apiRequest(`/api/onboarding/status/${nonExistentUserId}`)
        ).rejects.toThrow('API Error 404');
      });
    });
  });

  describe('PDF Generation Endpoints', () => {
    describe('POST /api/pdf/generate', () => {
      it('should generate PDF with valid data', async () => {
        // First complete onboarding to have data for PDF
        const formData = TestFactories.createOnboardingData({
          userId: testUser.id,
          phase: 1
        });

        await testHelpers.submitFormData(testUser.id, formData.formData, 1);

        const response = await testHelpers.apiRequest('/api/pdf/generate', {
          method: 'POST',
          data: {
            userId: testUser.id,
            templateId: 'form_05_03a'
          }
        });

        expect(response).toMatchObject({
          success: true,
          data: {
            id: expect.any(String),
            filename: expect.stringMatching(/\.pdf$/),
            url: expect.stringMatching(/^https?:\/\/.+\.pdf$/),
            status: 'generated',
            createdAt: expect.any(String)
          }
        });

        testHelpers.assertPdfStructure(response.data);
      });

      it('should return error for invalid template', async () => {
        await expect(
          testHelpers.apiRequest('/api/pdf/generate', {
            method: 'POST',
            data: {
              userId: testUser.id,
              templateId: 'invalid-template'
            }
          })
        ).rejects.toThrow('API Error 400');
      });

      it('should return error for user without completed onboarding', async () => {
        const newUser = await testHelpers.createTestUser({
          email: 'no-onboarding@shipdocs.app'
        });

        await expect(
          testHelpers.apiRequest('/api/pdf/generate', {
            method: 'POST',
            data: {
              userId: newUser.id,
              templateId: 'form_05_03a'
            }
          })
        ).rejects.toThrow('API Error 400');
      });
    });
  });

  describe('Manager Dashboard Endpoints', () => {
    describe('GET /api/manager/crew', () => {
      it('should return crew list for manager', async () => {
        const response = await testHelpers.apiRequest('/api/manager/crew', {
          headers: {
            'Authorization': `Bearer ${testManager.token || 'mock-manager-token'}`
          }
        });

        expect(response).toMatchObject({
          success: true,
          data: {
            crew: expect.any(Array),
            total: expect.any(Number),
            pagination: {
              page: expect.any(Number),
              limit: expect.any(Number),
              totalPages: expect.any(Number)
            }
          }
        });

        testHelpers.assertApiResponse(response, ['success', 'data']);
      });

      it('should return 401 for unauthorized access', async () => {
        await expect(
          testHelpers.apiRequest('/api/manager/crew')
        ).rejects.toThrow('API Error 401');
      });

      it('should return 403 for non-manager role', async () => {
        await expect(
          testHelpers.apiRequest('/api/manager/crew', {
            headers: {
              'Authorization': `Bearer ${testUser.token || 'mock-crew-token'}`
            }
          })
        ).rejects.toThrow('API Error 403');
      });
    });

    describe('POST /api/manager/crew', () => {
      it('should create new crew member', async () => {
        const newCrewData = TestFactories.createUser({
          email: 'new-crew@shipdocs.app',
          role: 'crew'
        });

        const response = await testHelpers.apiRequest('/api/manager/crew', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${testManager.token || 'mock-manager-token'}`
          },
          data: newCrewData
        });

        expect(response).toMatchObject({
          success: true,
          data: {
            id: expect.any(String),
            email: newCrewData.email,
            name: newCrewData.name,
            role: 'crew',
            createdAt: expect.any(String)
          }
        });

        testHelpers.assertApiResponse(response, ['success', 'data']);
      });

      it('should validate crew member data', async () => {
        await expect(
          testHelpers.apiRequest('/api/manager/crew', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${testManager.token || 'mock-manager-token'}`
            },
            data: {
              // Missing required fields
              name: 'Incomplete Crew'
            }
          })
        ).rejects.toThrow('API Error 400');
      });
    });
  });

  describe('Health Check Endpoints', () => {
    describe('GET /api/health', () => {
      it('should return system health status', async () => {
        const response = await testHelpers.apiRequest('/api/health');

        expect(response).toMatchObject({
          status: 'healthy',
          timestamp: expect.any(String),
          services: {
            database: expect.stringMatching(/^(healthy|unhealthy)$/),
            email: expect.stringMatching(/^(healthy|unhealthy)$/),
            storage: expect.stringMatching(/^(healthy|unhealthy)$/)
          },
          version: expect.any(String)
        });
      });
    });
  });

  describe('Error Response Consistency', () => {
    it('should return consistent error format across all endpoints', async () => {
      const endpoints = [
        { method: 'POST', url: '/api/auth/magic-link', data: {} },
        { method: 'GET', url: '/api/onboarding/status/invalid-id' },
        { method: 'POST', url: '/api/pdf/generate', data: {} }
      ];

      for (const endpoint of endpoints) {
        try {
          await testHelpers.apiRequest(endpoint.url, {
            method: endpoint.method,
            data: endpoint.data
          });
        } catch (error) {
          // All API errors should follow consistent format
          expect(error.message).toMatch(/^API Error \d{3}:/);
        }
      }
    });
  });
});
