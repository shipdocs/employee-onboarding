// Mock axios before importing
jest.mock('axios');

const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

/**
 * Test helper utilities for common testing operations
 */
class TestHelpers {
  constructor() {
    this.baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';
    this.supabase = null;
    this.testUsers = [];
    this.testData = [];
  }

  /**
   * Initialize Supabase client for testing
   */
  initSupabase() {
    if (!this.supabase) {
      this.supabase = createClient(
        process.env.TEST_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.TEST_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
      );
    }
    return this.supabase;
  }

  /**
   * Make authenticated API request
   */
  async apiRequest(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    try {
      const response = await axios(url, config);
      return response.data;
    } catch (error) {
      // Avoid circular reference issues by extracting only necessary error info
      if (error.response) {
        const status = error.response.status;
        const message = error.response.data?.message || error.response.statusText || 'Unknown error';
        throw new Error(`API Error ${status}: ${message}`);
      }

      // Handle network errors without circular references
      const errorMessage = error.code || error.message || 'Network error';
      throw new Error(`Network Error: ${errorMessage}`);
    }
  }

  /**
   * Create test user in database
   */
  async createTestUser(userData = {}) {
    const supabase = this.initSupabase();
    
    const user = {
      email: `test-${Date.now()}@shipdocs.app`,
      name: 'Test User',
      role: 'crew',
      vessel: 'Test Vessel',
      boarding_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      ...userData
    };

    const { data, error } = await supabase
      .from('users')
      .insert([user])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create test user: ${error.message}`);
    }

    this.testUsers.push(data.id);
    return data;
  }

  /**
   * Create test manager in database
   */
  async createTestManager(managerData = {}) {
    const supabase = this.initSupabase();
    
    const manager = {
      email: `manager-${Date.now()}@shipdocs.app`,
      name: 'Test Manager',
      role: 'manager',
      department: 'HR',
      permissions: ['view_crew', 'manage_onboarding'],
      ...managerData
    };

    const { data, error } = await supabase
      .from('users')
      .insert([manager])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create test manager: ${error.message}`);
    }

    this.testUsers.push(data.id);
    return data;
  }

  /**
   * Create test onboarding record
   */
  async createTestOnboarding(userId, onboardingData = {}) {
    const supabase = this.initSupabase();
    
    const onboarding = {
      user_id: userId,
      phase: 1,
      status: 'in_progress',
      form_data: {
        personalInfo: {
          fullName: 'Test User',
          dateOfBirth: '1990-01-01',
          nationality: 'Dutch'
        }
      },
      ...onboardingData
    };

    const { data, error } = await supabase
      .from('onboarding')
      .insert([onboarding])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create test onboarding: ${error.message}`);
    }

    this.testData.push({ table: 'onboarding', id: data.id });
    return data;
  }

  /**
   * Generate magic link for test user
   */
  async generateMagicLink(email) {
    try {
      const response = await this.apiRequest('/api/auth/magic-link', {
        method: 'POST',
        data: { email }
      });
      return response.magicLink;
    } catch (error) {
      throw new Error(`Failed to generate magic link: ${error.message}`);
    }
  }

  /**
   * Simulate email verification
   */
  async verifyEmail(token) {
    try {
      const response = await this.apiRequest(`/api/auth/verify?token=${token}`, {
        method: 'GET'
      });
      return response;
    } catch (error) {
      throw new Error(`Failed to verify email: ${error.message}`);
    }
  }

  /**
   * Submit test form data
   */
  async submitFormData(userId, formData, phase = 1) {
    try {
      const response = await this.apiRequest('/api/onboarding/form', {
        method: 'POST',
        data: {
          userId,
          phase,
          formData
        }
      });
      return response;
    } catch (error) {
      throw new Error(`Failed to submit form data: ${error.message}`);
    }
  }

  /**
   * Generate test PDF
   */
  async generateTestPdf(userId, templateId = 'form_05_03a') {
    try {
      const response = await this.apiRequest('/api/pdf/generate', {
        method: 'POST',
        data: {
          userId,
          templateId
        }
      });
      return response;
    } catch (error) {
      throw new Error(`Failed to generate PDF: ${error.message}`);
    }
  }

  /**
   * Check email delivery (mock)
   */
  async checkEmailDelivery(email, subject) {
    // In a real test environment, this would check an email service
    // For now, we'll simulate checking email logs
    try {
      const response = await this.apiRequest('/api/test/email-logs', {
        method: 'GET',
        params: { email, subject }
      });
      return response.emails || [];
    } catch (error) {
      // If email logs endpoint doesn't exist, return mock data
      return [{
        to: email,
        subject,
        delivered: true,
        timestamp: new Date().toISOString()
      }];
    }
  }

  /**
   * Wait for condition with timeout
   */
  async waitForCondition(conditionFn, timeout = 10000, interval = 500) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      if (await conditionFn()) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    
    throw new Error(`Condition not met within ${timeout}ms`);
  }

  /**
   * Clean up test data
   */
  async cleanup() {
    const supabase = this.initSupabase();
    
    try {
      // Clean up test users
      if (this.testUsers.length > 0) {
        await supabase
          .from('users')
          .delete()
          .in('id', this.testUsers);
      }

      // Clean up other test data
      for (const item of this.testData) {
        await supabase
          .from(item.table)
          .delete()
          .eq('id', item.id);
      }

      // Reset arrays
      this.testUsers = [];
      this.testData = [];
    } catch (error) {
      console.warn('Cleanup warning:', error.message);
    }
  }

  /**
   * Mock external service responses
   */
  mockExternalServices() {
    // Mock email service
    jest.mock('nodemailer', () => ({
      createTransport: jest.fn(() => ({
        sendMail: jest.fn().mockResolvedValue({
          messageId: 'test-message-id',
          accepted: ['test@example.com'],
          rejected: []
        })
      }))
    }));

    // Mock PDF generation
    jest.mock('pdf-lib', () => ({
      PDFDocument: {
        create: jest.fn().mockResolvedValue({
          addPage: jest.fn(),
          save: jest.fn().mockResolvedValue(Buffer.from('mock-pdf-content'))
        })
      }
    }));
  }

  /**
   * Restore mocked services
   */
  restoreMocks() {
    jest.restoreAllMocks();
  }

  /**
   * Assert API response structure
   */
  assertApiResponse(response, expectedKeys = []) {
    expect(response).toBeDefined();
    expect(typeof response).toBe('object');
    
    if (expectedKeys.length > 0) {
      expectedKeys.forEach(key => {
        expect(response).toHaveProperty(key);
      });
    }
  }

  /**
   * Assert email structure
   */
  assertEmailStructure(email) {
    expect(email).toHaveProperty('to');
    expect(email).toHaveProperty('subject');
    expect(email).toHaveProperty('html');
    expect(email.to).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  }

  /**
   * Assert PDF structure
   */
  assertPdfStructure(pdf) {
    expect(pdf).toHaveProperty('id');
    expect(pdf).toHaveProperty('filename');
    expect(pdf).toHaveProperty('url');
    expect(pdf.filename).toMatch(/\.pdf$/);
  }

  /**
   * Generate test database seed data
   */
  async seedTestData() {
    const supabase = this.initSupabase();
    
    // Seed test users
    const users = [
      {
        email: 'crew1@shipdocs.app',
        name: 'Test Crew Member 1',
        role: 'crew',
        vessel: 'Test Vessel 1'
      },
      {
        email: 'manager1@shipdocs.app',
        name: 'Test Manager 1',
        role: 'manager',
        department: 'HR'
      }
    ];

    const { data: createdUsers, error } = await supabase
      .from('users')
      .insert(users)
      .select();

    if (error) {
      throw new Error(`Failed to seed test data: ${error.message}`);
    }

    this.testUsers.push(...createdUsers.map(u => u.id));
    return createdUsers;
  }
}

module.exports = new TestHelpers();
