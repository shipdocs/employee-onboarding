/**
 * Test Data Fixtures
 * Centralized test data for E2E tests
 */

export const testUsers = {
  admin: {
    email: 'admin@test.shipdocs.app',
    password: 'Admin123!@#',
    name: 'Test Admin',
    role: 'admin'
  },
  manager: {
    email: 'manager@test.shipdocs.app',
    password: 'Manager123!@#',
    name: 'Test Manager',
    role: 'manager',
    company: 'Test Shipping Co'
  },
  crew: {
    email: 'crew@test.shipdocs.app',
    name: 'Test Crew Member',
    position: 'Deck Officer',
    nationality: 'Netherlands',
    dateOfBirth: '1990-01-01',
    phoneNumber: '+31612345678',
    address: '123 Test Street, Amsterdam',
    emergencyContact: 'Emergency Contact',
    emergencyPhone: '+31687654321'
  }
};

export const testCompanies = {
  default: {
    name: 'Test Shipping Company',
    email: 'info@testshipping.com',
    phone: '+31201234567',
    address: 'Shipping Plaza 1, Rotterdam',
    industry: 'Maritime Shipping'
  },
  secondary: {
    name: 'Secondary Marine Services',
    email: 'contact@secondarymarine.com',
    phone: '+31209876543',
    address: 'Harbor Road 42, Amsterdam',
    industry: 'Marine Services'
  }
};

export const testWorkflows = {
  basic: {
    name: 'Basic Onboarding Workflow',
    description: 'Standard onboarding process for all crew members',
    steps: [
      'Personal Information',
      'Document Upload',
      'Safety Training',
      'Knowledge Assessment'
    ]
  },
  advanced: {
    name: 'Advanced Officer Training',
    description: 'Extended training for officer positions',
    steps: [
      'Personal Information',
      'Document Upload',
      'Basic Safety Training',
      'Advanced Navigation',
      'Leadership Training',
      'Final Assessment'
    ]
  }
};

export const testDocuments = {
  passport: {
    name: 'passport.pdf',
    type: 'application/pdf',
    content: 'Mock passport document content'
  },
  medical: {
    name: 'medical-certificate.pdf',
    type: 'application/pdf',
    content: 'Mock medical certificate content'
  },
  stcw: {
    name: 'stcw-certificate.pdf',
    type: 'application/pdf',
    content: 'Mock STCW certificate content'
  }
};

export const quizQuestions = {
  safety: [
    {
      question: 'What is the first action in case of fire on board?',
      options: [
        'Sound the alarm',
        'Fight the fire',
        'Evacuate',
        'Call for help'
      ],
      correctAnswer: 0
    },
    {
      question: 'What does SOLAS stand for?',
      options: [
        'Safety of Life at Sea',
        'Standard Operating Life at Sea',
        'Security of Life and Safety',
        'Ship Operations and Life Safety'
      ],
      correctAnswer: 0
    },
    {
      question: 'When should you wear a life jacket?',
      options: [
        'Only in emergencies',
        'When ordered by the captain',
        'During drills and emergencies',
        'At all times on deck'
      ],
      correctAnswer: 2
    },
    {
      question: 'What is the purpose of a muster station?',
      options: [
        'Storage area',
        'Emergency assembly point',
        'Navigation room',
        'Recreation area'
      ],
      correctAnswer: 1
    },
    {
      question: 'How often should safety drills be conducted?',
      options: [
        'Monthly',
        'Weekly',
        'Quarterly',
        'Annually'
      ],
      correctAnswer: 1
    }
  ]
};

export const testMessages = {
  inviteMessage: 'Welcome aboard! Please complete your onboarding process.',
  reminderMessage: 'This is a reminder to complete your onboarding.',
  completionMessage: 'Congratulations on completing your onboarding!'
};

export const testFilters = {
  status: {
    all: 'all',
    pending: 'pending',
    active: 'active',
    completed: 'completed',
    archived: 'archived'
  },
  dateRanges: {
    today: 'today',
    week: 'this_week',
    month: 'this_month',
    custom: 'custom'
  }
};

export const testUrls = {
  production: 'https://onboarding.shipdocs.app',
  staging: 'https://staging.onboarding.shipdocs.app',
  local: 'http://localhost:3000'
};

export const testTimeouts = {
  short: 5000,
  medium: 10000,
  long: 30000,
  extraLong: 60000
};

export const testViewports = {
  desktop: { width: 1920, height: 1080 },
  laptop: { width: 1366, height: 768 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 667 }
};

export const errorMessages = {
  invalidEmail: 'Please enter a valid email address',
  requiredField: 'This field is required',
  passwordTooShort: 'Password must be at least 8 characters',
  sessionExpired: 'Your session has expired',
  networkError: 'Network error. Please try again.',
  accessDenied: 'Access denied',
  invalidCredentials: 'Invalid email or password'
};

export const successMessages = {
  loginSuccess: 'Successfully logged in',
  inviteSent: 'Invitation sent successfully',
  profileUpdated: 'Profile updated successfully',
  documentUploaded: 'Document uploaded successfully',
  workflowAssigned: 'Workflow assigned successfully',
  onboardingComplete: 'Onboarding completed successfully'
};

export const apiEndpoints = {
  auth: {
    login: '/api/auth/login',
    logout: '/api/auth/logout',
    magicLink: '/api/auth/request-magic-link',
    verify: '/api/auth/verify'
  },
  admin: {
    companies: '/api/admin/companies',
    managers: '/api/admin/managers',
    workflows: '/api/admin/workflows',
    reports: '/api/admin/reports'
  },
  manager: {
    crew: '/api/manager/crew',
    invite: '/api/manager/invite-crew',
    assignWorkflow: '/api/manager/assign-workflow',
    reports: '/api/manager/reports'
  },
  crew: {
    profile: '/api/crew/profile',
    documents: '/api/crew/documents',
    training: '/api/crew/training',
    quiz: '/api/crew/quiz'
  }
};

export const testRoles = {
  admin: {
    permissions: ['manage_companies', 'manage_managers', 'view_all_reports', 'system_settings'],
    restrictions: []
  },
  manager: {
    permissions: ['manage_crew', 'assign_workflows', 'view_company_reports', 'company_settings'],
    restrictions: ['cannot_manage_other_companies', 'cannot_create_managers']
  },
  crew: {
    permissions: ['view_own_profile', 'upload_documents', 'complete_training', 'take_quiz'],
    restrictions: ['cannot_view_other_profiles', 'cannot_manage_users']
  }
};

export const generateRandomEmail = (): string => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `test.user.${timestamp}.${random}@shipdocs.app`;
};

export const generateRandomPhone = (): string => {
  const digits = Math.floor(Math.random() * 1000000000);
  return `+31${digits}`;
};

export const generateCompanyName = (): string => {
  const prefixes = ['Global', 'International', 'Maritime', 'Ocean', 'Sea'];
  const suffixes = ['Shipping', 'Lines', 'Carriers', 'Transport', 'Logistics'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
  return `${prefix} ${suffix} ${Date.now()}`;
};

export const mockApiResponses = {
  loginSuccess: {
    success: true,
    token: 'mock-jwt-token',
    user: {
      id: '123',
      email: 'test@example.com',
      role: 'manager'
    }
  },
  magicLinkSent: {
    success: true,
    message: 'Magic link sent to your email'
  },
  inviteSuccess: {
    success: true,
    inviteId: 'invite-123',
    message: 'Invitation sent successfully'
  },
  uploadSuccess: {
    success: true,
    fileId: 'file-123',
    message: 'File uploaded successfully'
  }
};