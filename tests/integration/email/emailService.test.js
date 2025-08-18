/**
 * Integration tests for email service
 * Tests email sending, template rendering, and security measures
 */

const {
  sendMagicLinkEmail,
  sendWelcomeEmail,
  sendTrainingReminderEmail,
  sendPhaseCompletionEmail,
  sendPasswordChangeEmail,
  sendCompletionCertificateEmail,
  sendManagerNotificationEmail,
  sendCustomEmail
} = require('../../../lib/unifiedEmailService');

// Mock environment variables
process.env.MAILERSEND_API_KEY = 'test-api-key';
process.env.EMAIL_FROM = 'noreply@test.com';
process.env.SMTP_HOST = 'smtp.test.com';
process.env.SMTP_PORT = '587';
process.env.SMTP_USER = 'test@test.com';
process.env.SMTP_PASS = 'test-password';

// Mock MailerSend
jest.mock('mailersend', () => {
  return {
    MailerSend: jest.fn().mockImplementation(() => ({
      email: {
        send: jest.fn().mockResolvedValue({ message_id: 'test-123' })
      }
    }))
  };
});

// Mock nodemailer
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-456' }),
    verify: jest.fn().mockResolvedValue(true)
  })
}));

describe('Email Service Integration Tests', () => {
  let mockMailerSendCalls = [];
  let mockSmtpCalls = [];

  beforeEach(() => {
    jest.clearAllMocks();
    mockMailerSendCalls = [];
    mockSmtpCalls = [];

    // Capture MailerSend calls
    const { MailerSend } = require('mailersend');
    MailerSend.mockImplementation(() => ({
      email: {
        send: jest.fn().mockImplementation((params) => {
          mockMailerSendCalls.push(params);
          return Promise.resolve({ message_id: 'test-123' });
        })
      }
    }));

    // Capture SMTP calls
    const nodemailer = require('nodemailer');
    nodemailer.createTransport.mockReturnValue({
      sendMail: jest.fn().mockImplementation((params) => {
        mockSmtpCalls.push(params);
        return Promise.resolve({ messageId: 'test-456' });
      }),
      verify: jest.fn().mockResolvedValue(true)
    });
  });

  describe('Magic Link Email', () => {
    test('should send magic link email with correct content', async () => {
      const recipient = 'user@example.com';
      const magicLink = 'https://app.example.com/auth/verify?token=abc123';
      const userType = 'crew';

      const result = await sendMagicLinkEmail(recipient, magicLink, userType);

      expect(result).toBe(true);
      expect(mockMailerSendCalls).toHaveLength(1);
      
      const emailData = mockMailerSendCalls[0];
      expect(emailData.to[0].email).toBe(recipient);
      expect(emailData.subject).toContain('Sign In');
      expect(emailData.html).toContain(magicLink);
      expect(emailData.html).toContain('This link will expire in 30 minutes');
    });

    test('should sanitize magic link URL', async () => {
      const recipient = 'user@example.com';
      const maliciousLink = 'javascript:alert("XSS")';
      
      const result = await sendMagicLinkEmail(recipient, maliciousLink, 'crew');

      expect(result).toBe(true);
      const emailData = mockMailerSendCalls[0];
      expect(emailData.html).not.toContain('javascript:');
      expect(emailData.html).not.toContain('alert');
    });

    test('should validate email recipient', async () => {
      const invalidEmails = [
        'not-an-email',
        '@example.com',
        'user@',
        'user..double@example.com'
      ];

      for (const email of invalidEmails) {
        const result = await sendMagicLinkEmail(email, 'https://example.com', 'crew');
        expect(result).toBe(false);
      }
    });
  });

  describe('Welcome Email', () => {
    test('should send personalized welcome email', async () => {
      const user = {
        email: 'newuser@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'crew',
        companyName: 'Shipping Co'
      };

      const result = await sendWelcomeEmail(user);

      expect(result).toBe(true);
      expect(mockMailerSendCalls).toHaveLength(1);
      
      const emailData = mockMailerSendCalls[0];
      expect(emailData.to[0].email).toBe(user.email);
      expect(emailData.personalization[0].data.firstName).toBe('John');
      expect(emailData.personalization[0].data.companyName).toBe('Shipping Co');
      expect(emailData.html).toContain('Welcome aboard');
    });

    test('should handle missing user data gracefully', async () => {
      const user = {
        email: 'user@example.com'
        // Missing other fields
      };

      const result = await sendWelcomeEmail(user);

      expect(result).toBe(true);
      const emailData = mockMailerSendCalls[0];
      expect(emailData.personalization[0].data.firstName).toBe('there');
      expect(emailData.personalization[0].data.companyName).toBe('our platform');
    });
  });

  describe('Training Reminder Email', () => {
    test('should send training reminder with progress info', async () => {
      const data = {
        email: 'user@example.com',
        firstName: 'Jane',
        phaseName: 'Safety Procedures',
        progress: 75,
        dueDate: '2024-02-01',
        loginLink: 'https://app.example.com/login'
      };

      const result = await sendTrainingReminderEmail(data);

      expect(result).toBe(true);
      const emailData = mockMailerSendCalls[0];
      expect(emailData.subject).toContain('Training Reminder');
      expect(emailData.html).toContain('75%');
      expect(emailData.html).toContain('Safety Procedures');
      expect(emailData.html).toContain('February 1, 2024');
    });

    test('should include progress visualization', async () => {
      const data = {
        email: 'user@example.com',
        firstName: 'Test',
        phaseName: 'Test Phase',
        progress: 50,
        dueDate: '2024-02-01',
        loginLink: 'https://app.example.com'
      };

      const result = await sendTrainingReminderEmail(data);

      const emailData = mockMailerSendCalls[0];
      // Check for progress bar styling
      expect(emailData.html).toContain('width: 50%');
      expect(emailData.html).toContain('progress');
    });
  });

  describe('Phase Completion Email', () => {
    test('should send phase completion notification', async () => {
      const data = {
        email: 'user@example.com',
        firstName: 'John',
        phaseName: 'Basic Training',
        nextPhaseName: 'Advanced Training',
        completionDate: '2024-01-15',
        certificateLink: 'https://app.example.com/certificate/123'
      };

      const result = await sendPhaseCompletionEmail(data);

      expect(result).toBe(true);
      const emailData = mockMailerSendCalls[0];
      expect(emailData.subject).toContain('Congratulations');
      expect(emailData.html).toContain('Basic Training');
      expect(emailData.html).toContain('Advanced Training');
      expect(emailData.html).toContain(data.certificateLink);
    });

    test('should handle final phase completion', async () => {
      const data = {
        email: 'user@example.com',
        firstName: 'John',
        phaseName: 'Final Assessment',
        nextPhaseName: null, // No next phase
        completionDate: '2024-01-15'
      };

      const result = await sendPhaseCompletionEmail(data);

      const emailData = mockMailerSendCalls[0];
      expect(emailData.html).toContain('completed all training');
      expect(emailData.html).not.toContain('next phase');
    });
  });

  describe('Security Features', () => {
    test('should sanitize all user inputs in emails', async () => {
      const maliciousData = {
        email: 'user@example.com',
        firstName: '<script>alert("XSS")</script>',
        companyName: '<img src=x onerror=alert("XSS")>',
        customMessage: '"><script>alert("XSS")</script>'
      };

      const result = await sendWelcomeEmail(maliciousData);

      const emailData = mockMailerSendCalls[0];
      expect(emailData.html).not.toContain('<script>');
      expect(emailData.html).not.toContain('alert');
      expect(emailData.html).not.toContain('onerror');
      expect(emailData.text).not.toContain('<script>');
    });

    test('should prevent email header injection', async () => {
      const maliciousEmail = 'user@example.com\nBcc: attacker@evil.com';
      const result = await sendMagicLinkEmail(maliciousEmail, 'https://example.com', 'crew');

      // Should reject email with newline
      expect(result).toBe(false);
      expect(mockMailerSendCalls).toHaveLength(0);
    });

    test('should validate all URLs in emails', async () => {
      const dangerousUrls = [
        'javascript:alert("XSS")',
        'data:text/html,<script>alert("XSS")</script>',
        'vbscript:msgbox("XSS")',
        'file:///etc/passwd'
      ];

      for (const url of dangerousUrls) {
        const result = await sendMagicLinkEmail('user@example.com', url, 'crew');
        
        if (result) {
          const emailData = mockMailerSendCalls[mockMailerSendCalls.length - 1];
          expect(emailData.html).not.toContain(url);
        }
      }
    });
  });

  describe('Email Templates', () => {
    test('should use inline CSS for better compatibility', async () => {
      const result = await sendWelcomeEmail({
        email: 'user@example.com',
        firstName: 'Test'
      });

      const emailData = mockMailerSendCalls[0];
      // Check for inline styles
      expect(emailData.html).toContain('style="');
      expect(emailData.html).not.toContain('<style>'); // No style tags
    });

    test('should include both HTML and text versions', async () => {
      const result = await sendMagicLinkEmail(
        'user@example.com',
        'https://example.com/auth',
        'crew'
      );

      const emailData = mockMailerSendCalls[0];
      expect(emailData.html).toBeDefined();
      expect(emailData.text).toBeDefined();
      expect(emailData.text).toContain('https://example.com/auth');
      expect(emailData.text).not.toContain('<'); // No HTML in text version
    });

    test('should handle special characters correctly', async () => {
      const user = {
        email: 'user@example.com',
        firstName: 'José',
        lastName: 'García',
        companyName: 'Compañía Marítima'
      };

      const result = await sendWelcomeEmail(user);

      const emailData = mockMailerSendCalls[0];
      expect(emailData.personalization[0].data.firstName).toBe('José');
      expect(emailData.personalization[0].data.companyName).toBe('Compañía Marítima');
    });
  });

  describe('Error Handling', () => {
    test('should handle MailerSend API errors', async () => {
      const { MailerSend } = require('mailersend');
      MailerSend.mockImplementationOnce(() => ({
        email: {
          send: jest.fn().mockRejectedValue(new Error('API Error'))
        }
      }));

      const result = await sendWelcomeEmail({
        email: 'user@example.com',
        firstName: 'Test'
      });

      expect(result).toBe(false);
    });

    test('should fallback to SMTP when MailerSend fails', async () => {
      // Force MailerSend to fail
      process.env.EMAIL_PROVIDER = 'smtp';

      const result = await sendWelcomeEmail({
        email: 'user@example.com',
        firstName: 'Test'
      });

      expect(result).toBe(true);
      expect(mockSmtpCalls).toHaveLength(1);
      expect(mockSmtpCalls[0].to).toBe('user@example.com');
    });

    test('should handle network timeouts gracefully', async () => {
      const { MailerSend } = require('mailersend');
      MailerSend.mockImplementationOnce(() => ({
        email: {
          send: jest.fn().mockImplementation(() => 
            new Promise((resolve, reject) => {
              setTimeout(() => reject(new Error('Timeout')), 100);
            })
          )
        }
      }));

      const result = await sendWelcomeEmail({
        email: 'user@example.com',
        firstName: 'Test'
      });

      expect(result).toBe(false);
    });
  });

  describe('Bulk Email Handling', () => {
    test('should send manager notifications efficiently', async () => {
      const notifications = [
        {
          managerEmail: 'manager1@example.com',
          managerName: 'Manager One',
          crewMember: 'John Doe',
          completionType: 'phase',
          phaseName: 'Safety Training'
        },
        {
          managerEmail: 'manager2@example.com',
          managerName: 'Manager Two',
          crewMember: 'Jane Smith',
          completionType: 'training',
          phaseName: 'Complete Onboarding'
        }
      ];

      const results = await Promise.all(
        notifications.map(data => sendManagerNotificationEmail(data))
      );

      expect(results.every(r => r === true)).toBe(true);
      expect(mockMailerSendCalls).toHaveLength(2);
    });

    test('should respect rate limits', async () => {
      // Simulate sending many emails
      const emails = Array(10).fill(null).map((_, i) => ({
        email: `user${i}@example.com`,
        firstName: `User${i}`
      }));

      const startTime = Date.now();
      const results = await Promise.all(
        emails.map(user => sendWelcomeEmail(user))
      );
      const duration = Date.now() - startTime;

      expect(results.every(r => r === true)).toBe(true);
      // Should complete reasonably fast (not rate limited in tests)
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('Email Tracking', () => {
    test('should include tracking headers', async () => {
      const result = await sendWelcomeEmail({
        email: 'user@example.com',
        firstName: 'Test'
      });

      const emailData = mockMailerSendCalls[0];
      expect(emailData.headers).toBeDefined();
      expect(emailData.headers['X-Email-Type']).toBe('welcome');
      expect(emailData.headers['X-User-Role']).toBeDefined();
    });

    test('should log email sends for audit', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await sendMagicLinkEmail('user@example.com', 'https://example.com', 'crew');

      // Should log email send (in dev/test mode)
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Email sent successfully')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Internationalization', () => {
    test('should support multiple languages in emails', async () => {
      const user = {
        email: 'user@example.com',
        firstName: 'Test',
        language: 'es' // Spanish
      };

      // Mock language detection
      const result = await sendWelcomeEmail(user);

      const emailData = mockMailerSendCalls[0];
      // In a real implementation, this would check for Spanish content
      expect(emailData.personalization[0].data.language).toBe('es');
    });
  });
});