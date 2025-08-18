const { v4: uuidv4 } = require('uuid');

/**
 * Test data factories for consistent test data generation
 */
class TestFactories {
  /**
   * Generate a test user
   */
  static createUser(overrides = {}) {
    return {
      id: uuidv4(),
      email: `test-${Date.now()}@shipdocs.app`,
      name: 'Test User',
      role: 'crew',
      vessel: 'Test Vessel',
      boardingDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides
    };
  }

  /**
   * Generate a test manager
   */
  static createManager(overrides = {}) {
    return {
      id: uuidv4(),
      email: `manager-${Date.now()}@shipdocs.app`,
      name: 'Test Manager',
      role: 'manager',
      department: 'HR',
      permissions: ['view_crew', 'manage_onboarding'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides
    };
  }

  /**
   * Generate test onboarding data
   */
  static createOnboardingData(overrides = {}) {
    return {
      id: uuidv4(),
      userId: uuidv4(),
      phase: 1,
      status: 'in_progress',
      formData: {
        personalInfo: {
          fullName: 'Test User',
          dateOfBirth: '1990-01-01',
          nationality: 'Dutch',
          passportNumber: 'TEST123456',
          passportExpiry: '2030-01-01'
        },
        contactInfo: {
          phoneNumber: '+31612345678',
          emergencyContactName: 'Emergency Contact',
          emergencyContactPhone: '+31687654321',
          homeAddress: 'Test Street 123, Amsterdam'
        }
      },
      completedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides
    };
  }

  /**
   * Generate test quiz data
   */
  static createQuizData(overrides = {}) {
    return {
      id: uuidv4(),
      title: 'Safety Training Quiz',
      questions: [
        {
          id: uuidv4(),
          question: 'What is the first step in emergency procedures?',
          type: 'multiple_choice',
          options: [
            'Sound the alarm',
            'Assess the situation',
            'Call for help',
            'Evacuate immediately'
          ],
          correctAnswer: 1,
          points: 10
        },
        {
          id: uuidv4(),
          question: 'How often should safety equipment be inspected?',
          type: 'multiple_choice',
          options: [
            'Daily',
            'Weekly',
            'Monthly',
            'Annually'
          ],
          correctAnswer: 0,
          points: 10
        }
      ],
      passingScore: 80,
      timeLimit: 1800, // 30 minutes
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides
    };
  }

  /**
   * Generate test email template
   */
  static createEmailTemplate(overrides = {}) {
    return {
      id: uuidv4(),
      name: 'welcome_email',
      subject: 'Welcome to Maritime Onboarding',
      htmlContent: '<h1>Welcome {{name}}</h1><p>Your onboarding link: {{link}}</p>',
      textContent: 'Welcome {{name}}\n\nYour onboarding link: {{link}}',
      variables: ['name', 'link'],
      language: 'en',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides
    };
  }

  /**
   * Generate test PDF data
   */
  static createPdfData(overrides = {}) {
    return {
      id: uuidv4(),
      templateId: uuidv4(),
      userId: uuidv4(),
      filename: `form_05_03a_${Date.now()}.pdf`,
      status: 'generated',
      data: {
        personalInfo: {
          fullName: 'Test User',
          position: 'Deck Officer',
          vessel: 'Test Vessel'
        }
      },
      url: `https://storage.example.com/pdfs/form_05_03a_${Date.now()}.pdf`,
      createdAt: new Date().toISOString(),
      ...overrides
    };
  }

  /**
   * Generate test training session
   */
  static createTrainingSession(overrides = {}) {
    return {
      id: uuidv4(),
      userId: uuidv4(),
      moduleId: uuidv4(),
      title: 'Basic Safety Training',
      status: 'in_progress',
      progress: 0,
      startedAt: new Date().toISOString(),
      completedAt: null,
      timeSpent: 0,
      score: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides
    };
  }

  /**
   * Generate test notification
   */
  static createNotification(overrides = {}) {
    return {
      id: uuidv4(),
      userId: uuidv4(),
      type: 'email',
      subject: 'Test Notification',
      message: 'This is a test notification',
      status: 'pending',
      scheduledAt: new Date().toISOString(),
      sentAt: null,
      createdAt: new Date().toISOString(),
      ...overrides
    };
  }

  /**
   * Generate multiple test users
   */
  static createUsers(count = 5, overrides = {}) {
    return Array.from({ length: count }, (_, index) => 
      this.createUser({
        email: `test-user-${index + 1}@shipdocs.app`,
        name: `Test User ${index + 1}`,
        ...overrides
      })
    );
  }

  /**
   * Generate test API response
   */
  static createApiResponse(data = {}, overrides = {}) {
    return {
      success: true,
      data,
      message: 'Operation successful',
      timestamp: new Date().toISOString(),
      ...overrides
    };
  }

  /**
   * Generate test API error response
   */
  static createApiErrorResponse(error = 'Test error', overrides = {}) {
    return {
      success: false,
      error,
      message: 'Operation failed',
      timestamp: new Date().toISOString(),
      ...overrides
    };
  }

  /**
   * Create edge case test data
   */
  static createEdgeCaseData(type = 'boundary') {
    const timestamp = Date.now();
    
    switch (type) {
      case 'boundary':
        return {
          emptyString: '',
          nullValue: null,
          undefinedValue: undefined,
          veryLongString: 'x'.repeat(1000),
          specialChars: '<script>alert("test")</script>',
          unicode: '测试数据 🚀 café',
          futureDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          pastDate: new Date('1900-01-01').toISOString()
        };
      
      case 'invalid':
        return {
          sqlInjection: "'; DROP TABLE users; --",
          xssAttempt: '<img src=x onerror=alert(1)>',
          invalidEmail: 'not-an-email',
          invalidDate: '2023-13-45',
          negativeNumber: -999,
          infinity: Infinity,
          nan: NaN
        };
      
      case 'stress':
        return {
          largeArray: Array.from({ length: 10000 }, (_, i) => ({ id: i, value: `item-${i}` })),
          deeplyNested: this.createDeepObject(100),
          largeText: 'Lorem ipsum '.repeat(10000)
        };
      
      default:
        return {};
    }
  }

  /**
   * Create deeply nested object for testing
   */
  static createDeepObject(depth) {
    if (depth <= 0) return { value: 'leaf' };
    return {
      level: depth,
      nested: this.createDeepObject(depth - 1)
    };
  }
}

module.exports = TestFactories;
