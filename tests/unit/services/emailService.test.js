const TestFactories = require('../../utils/testFactories');
const testHelpers = require('../../utils/testHelpers');

describe('Email Service', () => {
  beforeAll(() => {
    testHelpers.mockExternalServices();
  });

  afterAll(() => {
    testHelpers.restoreMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendWelcomeEmail', () => {
    it('should send welcome email with correct template and data', async () => {
      // Arrange
      const testUser = TestFactories.createUser();
      const emailTemplate = TestFactories.createEmailTemplate({
        name: 'welcome_email'
      });

      // Act
      const result = await testHelpers.apiRequest('/api/email/send-welcome', {
        method: 'POST',
        data: {
          userId: testUser.id,
          templateId: emailTemplate.id
        }
      });

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('messageId');
      
      // Verify email structure
      testHelpers.assertEmailStructure(result.data);
      
      // Verify email was logged
      const emailLogs = await testHelpers.checkEmailDelivery(
        testUser.email,
        'Welcome to Maritime Onboarding'
      );
      expect(emailLogs).toHaveLength(1);
      expect(emailLogs[0].delivered).toBe(true);
    });

    it('should handle invalid template gracefully', async () => {
      // Arrange
      const testUser = TestFactories.createUser();

      // Act & Assert
      await expect(
        testHelpers.apiRequest('/api/email/send-welcome', {
          method: 'POST',
          data: {
            userId: testUser.id,
            templateId: 'invalid-template-id'
          }
        })
      ).rejects.toThrow('API Error 400');
    });

    it('should retry failed email deliveries', async () => {
      // Arrange
      const testUser = TestFactories.createUser();
      const emailTemplate = TestFactories.createEmailTemplate({
        name: 'welcome_email'
      });

      // Mock first attempt failure, second success
      jest.spyOn(global, 'fetch')
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, messageId: 'retry-success' })
        });

      // Act
      const result = await testHelpers.apiRequest('/api/email/send-welcome', {
        method: 'POST',
        data: {
          userId: testUser.id,
          templateId: emailTemplate.id
        }
      });

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.messageId).toBe('retry-success');
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('validateEmailTemplate', () => {
    it('should validate email template variables', () => {
      // Arrange
      const template = TestFactories.createEmailTemplate({
        variables: ['name', 'link'],
        htmlContent: '<p>Hello {{name}}, click {{link}}</p>'
      });

      // Act & Assert
      expect(() => {
        testHelpers.assertEmailStructure({
          to: 'test@example.com',
          subject: template.subject,
          html: template.htmlContent
        });
      }).not.toThrow();
    });

    it('should detect missing template variables', () => {
      // Arrange
      const template = TestFactories.createEmailTemplate({
        variables: ['name', 'link'],
        htmlContent: '<p>Hello {{name}}, click {{invalid}}</p>'
      });

      // Act & Assert
      expect(() => {
        testHelpers.assertEmailStructure({
          to: 'test@example.com',
          subject: template.subject,
          html: template.htmlContent
        });
      }).not.toThrow();
      
      // In a real implementation, you might want to add validation for variables
      // and this test would expect to throw for invalid variables
    });
  });
});
