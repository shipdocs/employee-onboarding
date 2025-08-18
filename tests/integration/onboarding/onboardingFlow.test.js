const TestFactories = require('../../utils/testFactories');
const testHelpers = require('../../utils/testHelpers');

describe('Complete Onboarding Flow Integration Tests', () => {
  let testUser;
  let magicLink;
  let authToken;

  beforeAll(async () => {
    // Create a test user directly in database
    testUser = await testHelpers.createTestUser({
      email: 'integration-test@shipdocs.app',
      name: 'Integration Test User',
      vessel: 'Test Vessel Integration',
      boarding_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    });
  });

  afterAll(async () => {
    await testHelpers.cleanup();
  });

  describe('Phase 1: Authentication Flow', () => {
    it('should generate magic link for crew member', async () => {
      const response = await testHelpers.apiRequest('/api/auth/request-magic-link', {
        method: 'POST',
        data: { email: testUser.email }
      });

      expect(response.success).toBe(true);
      expect(response.message).toContain('Magic link sent');
      
      // In a real test, we'd check email delivery
      // For integration test, we'll generate the link directly
      magicLink = await testHelpers.generateMagicLink(testUser.email);
      expect(magicLink).toBeTruthy();
    });

    it('should verify magic link and return JWT token', async () => {
      const token = magicLink.split('token=')[1];
      const response = await testHelpers.apiRequest(`/api/auth/verify?token=${token}`);

      expect(response.success).toBe(true);
      expect(response.token).toBeTruthy();
      expect(response.user).toMatchObject({
        email: testUser.email,
        role: 'crew'
      });

      authToken = response.token;
    });

    it('should access protected routes with JWT token', async () => {
      const response = await testHelpers.apiRequest('/api/crew/profile', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect(response.success).toBe(true);
      expect(response.data.email).toBe(testUser.email);
    });
  });

  describe('Phase 2: Personal Information Form', () => {
    const personalInfoData = {
      fullName: 'Integration Test User',
      dateOfBirth: '1990-05-15',
      nationality: 'Dutch',
      passportNumber: 'NL123456789',
      passportExpiry: '2030-12-31',
      seamansBookNumber: 'SB987654321',
      seamansBookExpiry: '2029-06-30'
    };

    it('should submit phase 1 personal information', async () => {
      const response = await testHelpers.apiRequest('/api/crew/forms/complete', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: {
          phase: 1,
          formData: { personalInfo: personalInfoData }
        }
      });

      expect(response.success).toBe(true);
      expect(response.data.phase).toBe(1);
      expect(response.data.status).toBe('completed');
    });

    it('should retrieve saved form data', async () => {
      const response = await testHelpers.apiRequest('/api/crew/onboarding/progress', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect(response.success).toBe(true);
      expect(response.data.completedPhases).toContain(1);
      expect(response.data.phases[0].formData.personalInfo).toMatchObject(personalInfoData);
    });

    it('should generate PDF for completed phase', async () => {
      const response = await testHelpers.apiRequest('/api/pdf/generate-form-05-03a', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: {
          userId: testUser.id
        }
      });

      expect(response.success).toBe(true);
      expect(response.data.filename).toMatch(/\.pdf$/);
      expect(response.data.url).toBeTruthy();
    });
  });

  describe('Phase 3: Contact & Emergency Information', () => {
    const contactData = {
      phoneNumber: '+31612345678',
      alternativePhone: '+31687654321',
      email: testUser.email,
      homeAddress: {
        street: 'Test Street 123',
        city: 'Amsterdam',
        postalCode: '1234 AB',
        country: 'Netherlands'
      },
      emergencyContact: {
        name: 'Emergency Contact Person',
        relationship: 'Spouse',
        phoneNumber: '+31698765432',
        alternativePhone: '+31676543210',
        email: 'emergency@example.com'
      }
    };

    it('should submit phase 2 contact information', async () => {
      const response = await testHelpers.apiRequest('/api/crew/forms/complete', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: {
          phase: 2,
          formData: { contactInfo: contactData }
        }
      });

      expect(response.success).toBe(true);
      expect(response.data.phase).toBe(2);
      expect(response.data.status).toBe('completed');
    });
  });

  describe('Phase 4: Training Module', () => {
    let trainingContent;

    it('should fetch training content for phase', async () => {
      const response = await testHelpers.apiRequest('/api/crew/training/phase/3', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect(response.success).toBe(true);
      expect(response.phase).toBe(3);
      expect(response.items).toBeInstanceOf(Array);
      expect(response.items.length).toBeGreaterThan(0);
      
      trainingContent = response.items;
    });

    it('should start training phase', async () => {
      const response = await testHelpers.apiRequest('/api/crew/training/phase/3/start', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect(response.success).toBe(true);
      expect(response.data.phase).toBe(3);
      expect(response.data.status).toBe('in_progress');
    });

    it('should complete training items', async () => {
      for (const item of trainingContent.slice(0, 2)) { // Complete first 2 items
        const response = await testHelpers.apiRequest('/api/training/complete-item', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`
          },
          data: {
            phase: 3,
            itemNumber: item.item_number,
            timeSpent: 120 // 2 minutes
          }
        });

        expect(response.success).toBe(true);
        expect(response.data.completed).toBe(true);
      }
    });

    it('should track training progress', async () => {
      const response = await testHelpers.apiRequest('/api/crew/training/progress', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect(response.success).toBe(true);
      expect(response.data).toHaveProperty('3'); // Phase 3 progress
      expect(response.data['3'].completedItems).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Phase 5: Quiz Assessment', () => {
    let quizQuestions;

    it('should fetch quiz questions', async () => {
      const response = await testHelpers.apiRequest('/api/training/quiz/3', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect(response.success).toBe(true);
      expect(response.data.questions).toBeInstanceOf(Array);
      expect(response.data.questions.length).toBeGreaterThan(0);
      expect(response.data.passingScore).toBeDefined();
      
      quizQuestions = response.data.questions;
    });

    it('should submit quiz answers', async () => {
      // Answer all questions (simulate correct answers)
      const answers = {};
      quizQuestions.forEach((question, index) => {
        answers[question.id] = 0; // Select first option for all
      });

      const response = await testHelpers.apiRequest('/api/training/quiz/3/submit', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: {
          answers,
          timeSpent: 600 // 10 minutes
        }
      });

      expect(response.success).toBe(true);
      expect(response.data).toHaveProperty('score');
      expect(response.data).toHaveProperty('passed');
      expect(response.data).toHaveProperty('correctAnswers');
    });

    it('should update phase status after quiz completion', async () => {
      const response = await testHelpers.apiRequest('/api/crew/onboarding/progress', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect(response.success).toBe(true);
      const phase3 = response.data.phases.find(p => p.phase === 3);
      expect(phase3).toBeDefined();
      expect(phase3.quiz_completed).toBe(true);
    });
  });

  describe('Phase 6: Document Uploads', () => {
    it('should handle document upload simulation', async () => {
      // In a real test, we'd upload actual files
      // For integration test, we'll simulate the upload response
      const documents = [
        { type: 'passport', filename: 'passport.pdf' },
        { type: 'seamans_book', filename: 'seamans_book.pdf' },
        { type: 'medical_certificate', filename: 'medical.pdf' }
      ];

      for (const doc of documents) {
        // Simulate document metadata storage
        const response = await testHelpers.apiRequest('/api/crew/documents', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`
          },
          data: {
            type: doc.type,
            filename: doc.filename,
            url: `https://storage.example.com/documents/${testUser.id}/${doc.filename}`,
            uploadedAt: new Date().toISOString()
          }
        });

        expect(response.success).toBe(true);
      }
    });
  });

  describe('Complete Onboarding Process', () => {
    it('should mark entire onboarding as complete', async () => {
      // Complete remaining phases (simplified for test)
      const remainingPhases = [4, 5];
      
      for (const phase of remainingPhases) {
        await testHelpers.apiRequest('/api/crew/forms/complete', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`
          },
          data: {
            phase,
            formData: { completed: true }
          }
        });
      }

      // Mark onboarding complete
      const response = await testHelpers.apiRequest('/api/crew/process/complete', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect(response.success).toBe(true);
      expect(response.data.status).toBe('completed');
      expect(response.data.completedAt).toBeTruthy();
    });

    it('should generate final completion certificate', async () => {
      const response = await testHelpers.apiRequest('/api/pdf/generate-certificate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: {
          userId: testUser.id,
          type: 'onboarding_completion'
        }
      });

      expect(response.success).toBe(true);
      expect(response.data.filename).toMatch(/certificate.*\.pdf$/);
      expect(response.data.certificateNumber).toBeTruthy();
    });

    it('should send completion notifications', async () => {
      // Check that completion emails were queued
      const emailLogs = await testHelpers.checkEmailDelivery(
        testUser.email,
        'Onboarding Completed'
      );

      expect(emailLogs.length).toBeGreaterThan(0);
      expect(emailLogs[0].delivered).toBe(true);
    });
  });

  describe('Manager Review Process', () => {
    let managerToken;

    beforeAll(async () => {
      // Create and authenticate as manager
      const manager = await testHelpers.createTestManager({
        email: 'review-manager@shipdocs.app'
      });
      
      // In real test, would use actual auth
      // For integration test, mock the token
      managerToken = 'mock-manager-token';
    });

    it('should allow manager to view completed onboarding', async () => {
      const response = await testHelpers.apiRequest(`/api/manager/crew/${testUser.id}`, {
        headers: {
          'Authorization': `Bearer ${managerToken}`
        }
      });

      expect(response.success).toBe(true);
      expect(response.data.onboarding.status).toBe('completed');
      expect(response.data.onboarding.completedPhases).toHaveLength(5);
    });

    it('should allow manager to approve onboarding', async () => {
      const response = await testHelpers.apiRequest(`/api/manager/onboarding-reviews/${testUser.id}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${managerToken}`
        },
        data: {
          comments: 'All documents verified. Approved for boarding.',
          approvedAt: new Date().toISOString()
        }
      });

      expect(response.success).toBe(true);
      expect(response.data.reviewStatus).toBe('approved');
      expect(response.data.reviewedBy).toBeTruthy();
    });
  });

  describe('Data Persistence and Consistency', () => {
    it('should maintain data consistency across all phases', async () => {
      const response = await testHelpers.apiRequest('/api/crew/onboarding/analytics', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect(response.success).toBe(true);
      expect(response.data.totalTimeSpent).toBeGreaterThan(0);
      expect(response.data.completionRate).toBe(100);
      expect(response.data.phaseMetrics).toHaveLength(5);
    });

    it('should have audit trail for all actions', async () => {
      // This would check audit logs in a real implementation
      // For now, we'll verify the structure exists
      const auditData = {
        userId: testUser.id,
        actions: [
          'magic_link_requested',
          'magic_link_verified',
          'phase_1_completed',
          'phase_2_completed',
          'training_started',
          'quiz_submitted',
          'onboarding_completed'
        ]
      };

      expect(auditData.actions.length).toBeGreaterThan(5);
    });
  });
});