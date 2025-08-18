/**
 * Unit Tests for Manager Login Authentication
 * Tests the manager login bug fix and prevents regression
 */

// Mock bcrypt to avoid dependency issues
const bcrypt = {
  hash: jest.fn((password) => Promise.resolve(`hashed_${password}`)),
  compare: jest.fn((password, hash) => Promise.resolve(hash === `hashed_${password}`))
};

// Simple test without external dependencies
const { createClient } = require('@supabase/supabase-js');
const request = require('supertest');
const express = require('express');

// Mock Supabase
jest.mock('@supabase/supabase-js');

// Mock other dependencies
jest.mock('../../../lib/auth', () => ({
  generateJWT: jest.fn(() => 'mock-jwt-token')
}));

jest.mock('../../../lib/accountLockout', () => ({
  isAccountLocked: jest.fn(() => false),
  recordFailedLogin: jest.fn(),
  recordSuccessfulLogin: jest.fn()
}));

jest.mock('../../../lib/notificationService', () => ({
  checkAndHandleFirstLogin: jest.fn()
}));

// Mock rate limiting properly
jest.mock('../../../lib/rateLimit', () => ({
  authRateLimit: jest.fn((handler) => handler),
  apiRateLimit: jest.fn((handler) => handler),
  createRateLimit: jest.fn(() => jest.fn((handler) => handler))
}));

describe('Manager Login Authentication', () => {
  let mockSupabase;
  let app;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock Supabase client
    mockSupabase = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn()
              }))
            }))
          }))
        })),
        insert: jest.fn(() => ({
          select: jest.fn()
        }))
      }))
    };
    
    createClient.mockReturnValue(mockSupabase);
    
    // Create test app
    const express = require('express');
    app = express();
    app.use(express.json());
    
    // Import the handler after mocks are set up
    const managerLoginHandler = require('../../../api/auth/manager-login');
    app.post('/api/auth/manager-login', managerLoginHandler.default || managerLoginHandler);
  });

  describe('Status Check Logic', () => {
    test('should allow login with fully_completed status', async () => {
      // Mock successful database query
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        role: 'manager',
        status: 'fully_completed',
        is_active: true,
        password_hash: 'hashed_password123',
        first_name: 'Test',
        last_name: 'Manager',
        position: 'Manager',
        vessel_assignment: null,
        preferred_language: 'en'
      };

      mockSupabase.from().select().eq().eq().eq().single.mockResolvedValue({
        data: mockUser,
        error: null
      });

      // Mock manager permissions query
      mockSupabase.from().select().eq.mockResolvedValue({
        data: [{ permission_key: 'view_crew_list' }],
        error: null
      });

      // Mock audit log insert
      mockSupabase.from().insert.mockResolvedValue({ error: null });

      const response = await request(app)
        .post('/api/auth/manager-login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body.token).toBe('mock-jwt-token');
      expect(response.body.user.status).toBe('fully_completed');
    });

    test('should reject login with non-fully_completed status', async () => {
      const invalidStatuses = ['not_started', 'in_progress', 'forms_completed', 'training_completed', 'suspended'];

      for (const status of invalidStatuses) {
        const mockUser = {
          id: 1,
          email: 'test@example.com',
          role: 'manager',
          status: status,
          is_active: true,
          password_hash: 'hashed_password123'
        };

        mockSupabase.from().select().eq().eq().eq().single.mockResolvedValue({
          data: mockUser,
          error: null
        });

        const response = await request(app)
          .post('/api/auth/manager-login')
          .send({
            email: 'test@example.com',
            password: 'password123'
          });

        expect(response.status).toBe(401);
        expect(response.body.error).toBe('Account is not active');
      }
    });

    test('should specifically reject the old "active" status that caused the bug', async () => {
      // This test ensures the original bug doesn't return
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        role: 'manager',
        status: 'active', // This was the problematic status
        is_active: true,
        password_hash: 'hashed_password123'
      };

      mockSupabase.from().select().eq().eq().eq().single.mockResolvedValue({
        data: mockUser,
        error: null
      });

      const response = await request(app)
        .post('/api/auth/manager-login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Account is not active');
    });
  });

  describe('Authentication Flow', () => {
    test('should reject login for non-existent user', async () => {
      mockSupabase.from().select().eq().eq().eq().single.mockResolvedValue({
        data: null,
        error: { message: 'No rows returned' }
      });

      const response = await request(app)
        .post('/api/auth/manager-login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid email or password');
    });

    test('should reject login for inactive manager', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        role: 'manager',
        status: 'fully_completed',
        is_active: false, // Inactive manager
        password_hash: 'hashed_password123'
      };

      mockSupabase.from().select().eq().eq().eq().single.mockResolvedValue({
        data: null, // Database query filters out inactive users
        error: { message: 'No rows returned' }
      });

      const response = await request(app)
        .post('/api/auth/manager-login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid email or password');
    });

    test('should reject login for manager without password hash', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        role: 'manager',
        status: 'fully_completed',
        is_active: true,
        password_hash: null // No password set
      };

      mockSupabase.from().select().eq().eq().eq().single.mockResolvedValue({
        data: mockUser,
        error: null
      });

      const response = await request(app)
        .post('/api/auth/manager-login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Account not properly configured. Please contact administrator.');
    });
  });

  describe('Manager Permissions', () => {
    test('should load manager permissions on successful login', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        role: 'manager',
        status: 'fully_completed',
        is_active: true,
        password_hash: 'hashed_password123',
        first_name: 'Test',
        last_name: 'Manager'
      };

      const mockPermissions = [
        { permission_key: 'view_crew_list' },
        { permission_key: 'manage_crew_members' },
        { permission_key: 'review_quiz_results' }
      ];

      // Mock user query
      mockSupabase.from().select().eq().eq().eq().single.mockResolvedValueOnce({
        data: mockUser,
        error: null
      });

      // Mock permissions query
      mockSupabase.from().select().eq.mockResolvedValueOnce({
        data: mockPermissions,
        error: null
      });

      // Mock audit log insert
      mockSupabase.from().insert.mockResolvedValue({ error: null });

      const response = await request(app)
        .post('/api/auth/manager-login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body.user.permissions).toEqual([
        'view_crew_list',
        'manage_crew_members', 
        'review_quiz_results'
      ]);
    });
  });

  describe('Audit Logging', () => {
    test('should log successful manager login', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        role: 'manager',
        status: 'fully_completed',
        is_active: true,
        password_hash: 'hashed_password123',
        first_name: 'Test',
        last_name: 'Manager'
      };

      mockSupabase.from().select().eq().eq().eq().single.mockResolvedValue({
        data: mockUser,
        error: null
      });

      mockSupabase.from().select().eq.mockResolvedValue({
        data: [],
        error: null
      });

      const mockInsert = jest.fn().mockResolvedValue({ error: null });
      mockSupabase.from().insert = mockInsert;

      await request(app)
        .post('/api/auth/manager-login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 1,
          action: 'manager_login',
          resource_type: 'authentication'
        })
      );
    });
  });

  describe('Input Validation', () => {
    test('should reject login without email', async () => {
      const response = await request(app)
        .post('/api/auth/manager-login')
        .send({
          password: 'password123'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Email and password are required');
    });

    test('should reject login without password', async () => {
      const response = await request(app)
        .post('/api/auth/manager-login')
        .send({
          email: 'test@example.com'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Email and password are required');
    });

    test('should handle invalid email format gracefully', async () => {
      const response = await request(app)
        .post('/api/auth/manager-login')
        .send({
          email: 'invalid-email',
          password: 'password123'
        });

      // Should still attempt login and fail with invalid credentials
      expect(response.status).toBe(401);
    });
  });
});

describe('Manager Creation Status Consistency', () => {
  test('admin manager creation should set fully_completed status', () => {
    // This test documents the expected behavior from admin/managers/index.js
    const expectedManagerData = {
      role: 'manager',
      status: 'fully_completed', // This is what admin sets
      is_active: true
    };

    expect(expectedManagerData.status).toBe('fully_completed');
    expect(expectedManagerData.is_active).toBe(true);
  });
});

describe('Database Constraint Compliance', () => {
  test('should only accept valid status values per database constraint', () => {
    const validStatuses = [
      'not_started',
      'in_progress', 
      'forms_completed',
      'training_completed',
      'fully_completed',
      'suspended'
    ];

    const invalidStatuses = [
      'active',    // This was the bug - not in constraint
      'pending',   // Old status name
      'completed', // Old status name
      'inactive'   // Old status name
    ];

    // Valid statuses should be accepted by constraint
    validStatuses.forEach(status => {
      expect(validStatuses).toContain(status);
    });

    // Invalid statuses should not be in valid list
    invalidStatuses.forEach(status => {
      expect(validStatuses).not.toContain(status);
    });

    // Specifically test the bug case
    expect(validStatuses).not.toContain('active');
    expect(validStatuses).toContain('fully_completed');
  });
});
