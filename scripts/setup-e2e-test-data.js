#!/usr/bin/env node

/**
 * E2E Test Data Setup Script
 * Creates mock data for E2E testing without requiring database access
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up E2E test data...');

// Create mock API responses directory
const mockDataDir = path.join(__dirname, '..', 'tests', 'e2e', 'mocks');
if (!fs.existsSync(mockDataDir)) {
  fs.mkdirSync(mockDataDir, { recursive: true });
}

// Mock user data
const mockUsers = {
  admin: {
    id: 'admin-123',
    email: 'admin@test.shipdocs.app',
    name: 'Test Admin',
    role: 'admin',
    token: 'mock-admin-token'
  },
  manager: {
    id: 'manager-123',
    email: 'manager@test.shipdocs.app',
    name: 'Test Manager',
    role: 'manager',
    company_id: 'company-123',
    token: 'mock-manager-token'
  },
  crew: {
    id: 'crew-123',
    email: 'crew@test.shipdocs.app',
    name: 'Test Crew Member',
    role: 'crew',
    position: 'Deck Officer',
    token: 'mock-crew-token'
  }
};

// Mock company data
const mockCompanies = [
  {
    id: 'company-123',
    name: 'Test Shipping Company',
    email: 'info@testshipping.com',
    phone: '+31201234567',
    address: 'Shipping Plaza 1, Rotterdam',
    created_at: new Date().toISOString()
  },
  {
    id: 'company-456',
    name: 'Secondary Marine Services',
    email: 'contact@secondarymarine.com',
    phone: '+31209876543',
    address: 'Harbor Road 42, Amsterdam',
    created_at: new Date().toISOString()
  }
];

// Mock workflows
const mockWorkflows = [
  {
    id: 'workflow-123',
    name: 'Basic Onboarding Workflow',
    description: 'Standard onboarding process for all crew members',
    company_id: 'company-123',
    steps: [
      { name: 'Personal Information', order: 1 },
      { name: 'Document Upload', order: 2 },
      { name: 'Safety Training', order: 3 },
      { name: 'Knowledge Assessment', order: 4 }
    ],
    is_active: true
  }
];

// Mock crew members
const mockCrewMembers = [
  {
    id: 'crew-member-1',
    email: 'john.doe@example.com',
    name: 'John Doe',
    position: 'Captain',
    company_id: 'company-123',
    workflow_id: 'workflow-123',
    status: 'active',
    progress: 75
  },
  {
    id: 'crew-member-2',
    email: 'jane.smith@example.com',
    name: 'Jane Smith',
    position: 'Chief Engineer',
    company_id: 'company-123',
    workflow_id: 'workflow-123',
    status: 'completed',
    progress: 100
  },
  {
    id: 'crew-member-3',
    email: 'bob.johnson@example.com',
    name: 'Bob Johnson',
    position: 'Deck Officer',
    company_id: 'company-123',
    workflow_id: 'workflow-123',
    status: 'invited',
    progress: 0
  }
];

// Save mock data
fs.writeFileSync(
  path.join(mockDataDir, 'users.json'),
  JSON.stringify(mockUsers, null, 2)
);

fs.writeFileSync(
  path.join(mockDataDir, 'companies.json'),
  JSON.stringify(mockCompanies, null, 2)
);

fs.writeFileSync(
  path.join(mockDataDir, 'workflows.json'),
  JSON.stringify(mockWorkflows, null, 2)
);

fs.writeFileSync(
  path.join(mockDataDir, 'crew-members.json'),
  JSON.stringify(mockCrewMembers, null, 2)
);

// Create mock API responses
const mockApiResponses = {
  '/api/health': {
    status: 'healthy',
    timestamp: new Date().toISOString()
  },
  '/api/auth/login': {
    success: true,
    token: 'mock-jwt-token',
    user: mockUsers.admin
  },
  '/api/admin/companies': {
    data: mockCompanies,
    total: mockCompanies.length
  },
  '/api/manager/crew': {
    data: mockCrewMembers,
    total: mockCrewMembers.length
  },
  '/api/crew/profile': {
    data: mockUsers.crew
  }
};

fs.writeFileSync(
  path.join(mockDataDir, 'api-responses.json'),
  JSON.stringify(mockApiResponses, null, 2)
);

// Create Playwright mock routes file
const mockRoutesContent = `
/**
 * Playwright Mock Routes
 * Use these to mock API responses in E2E tests
 */

export const mockRoutes = ${JSON.stringify(mockApiResponses, null, 2)};

export function setupMockRoutes(page) {
  Object.entries(mockRoutes).forEach(([url, response]) => {
    page.route(\`**\${url}\`, route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response)
      });
    });
  });
}
`;

fs.writeFileSync(
  path.join(mockDataDir, 'mockRoutes.js'),
  mockRoutesContent
);

console.log('✅ Mock data created successfully!');
console.log(`📁 Mock data location: ${mockDataDir}`);
console.log('\nMock users created:');
console.log('  - Admin: admin@test.shipdocs.app');
console.log('  - Manager: manager@test.shipdocs.app');
console.log('  - Crew: crew@test.shipdocs.app');
console.log('\n🎯 You can now run E2E tests with mock data');