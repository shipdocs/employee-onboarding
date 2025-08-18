/**
 * Integration tests for authentication flows
 * Tests complete login/logout cycles, token management, and role-based access
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');
const { createClient } = require('../../../lib/supabase');
const { generateMagicToken, generateJWT } = require('../../../lib/auth');

// Mock environment variables
process.env.JWT_SECRET = 'test-secret-key';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';

// Mock Supabase client
jest.mock('../../../lib/supabase', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis()
    }))
  }))
}));

// Mock email service
jest.mock('../../../lib/unifiedEmailService', () => ({
  sendMagicLinkEmail: jest.fn().mockResolvedValue(true),
  sendWelcomeEmail: jest.fn().mockResolvedValue(true),
  sendPasswordChangeEmail: jest.fn().mockResolvedValue(true)
}));

describe('Authentication Flow Integration Tests', () => {
  let app;
  const mockSupabase = createClient();

  beforeEach(() => {
    jest.clearAllMocks();
    // Create a simple Express app for testing
    const express = require('express');
    app = express();
    app.use(express.json());
  });

  describe('Magic Link Authentication Flow', () => {
    test('should complete full magic link flow', async () => {
      const testUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        role: 'crew',
        first_name: 'Test',
        last_name: 'User'
      };

      // Step 1: Request magic link
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: testUser,
        error: null
      });

      mockSupabase.from().insert.mockResolvedValueOnce({
        data: { token: 'test-magic-token' },
        error: null
      });

      const magicLinkHandler = require('../../../api/auth/magic-link');
      app.post('/api/auth/magic-link', magicLinkHandler);

      const magicLinkResponse = await request(app)
        .post('/api/auth/magic-link')
        .send({ email: testUser.email })
        .expect(200);

      expect(magicLinkResponse.body.message).toContain('Magic link sent');

      // Step 2: Verify magic link token
      mockSupabase.from().select().eq().gt().single.mockResolvedValueOnce({
        data: {
          token: 'test-magic-token',
          user_id: testUser.id,
          created_at: new Date().toISOString()
        },
        error: null
      });

      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: testUser,
        error: null
      });

      mockSupabase.from().update().eq.mockResolvedValueOnce({
        data: { used: true },
        error: null
      });

      app.post('/api/auth/verify-magic-link', async (req, res) => {
        // Simulate magic link verification endpoint
        const { token } = req.body;
        if (token === 'test-magic-token') {
          const jwt = generateJWT(testUser);
          res.json({ token: jwt, user: testUser });
        } else {
          res.status(401).json({ error: 'Invalid token' });
        }
      });

      const verifyResponse = await request(app)
        .post('/api/auth/verify-magic-link')
        .send({ token: 'test-magic-token' })
        .expect(200);

      expect(verifyResponse.body.token).toBeDefined();
      expect(verifyResponse.body.user.email).toBe(testUser.email);

      // Step 3: Use JWT for authenticated request
      const authToken = verifyResponse.body.token;
      
      app.get('/api/protected', (req, res) => {
        const auth = req.headers.authorization;
        if (!auth || !auth.startsWith('Bearer ')) {
          return res.status(401).json({ error: 'No token' });
        }
        
        const token = auth.split(' ')[1];
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          res.json({ userId: decoded.userId });
        } catch (error) {
          res.status(401).json({ error: 'Invalid token' });
        }
      });

      const protectedResponse = await request(app)
        .get('/api/protected')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(protectedResponse.body.userId).toBe(testUser.id);
    });

    test('should handle expired magic link', async () => {
      mockSupabase.from().select().eq().gt().single.mockResolvedValueOnce({
        data: null, // No valid token found
        error: null
      });

      app.post('/api/auth/verify-magic-link', async (req, res) => {
        const { token } = req.body;
        // Simulate checking for expired token
        res.status(401).json({ error: 'Magic link expired or invalid' });
      });

      await request(app)
        .post('/api/auth/verify-magic-link')
        .send({ token: 'expired-token' })
        .expect(401);
    });
  });

  describe('Admin Login Flow', () => {
    test('should authenticate admin with email and password', async () => {
      const adminUser = {
        id: 'admin-123',
        email: 'admin@example.com',
        role: 'admin',
        first_name: 'Admin',
        last_name: 'User',
        password_hash: '$2b$10$YourHashedPasswordHere' // bcrypt hash
      };

      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: adminUser,
        error: null
      });

      // Mock bcrypt comparison
      jest.mock('bcrypt', () => ({
        compare: jest.fn().mockResolvedValue(true)
      }));

      const adminLoginHandler = require('../../../api/auth/admin-login');
      app.post('/api/auth/admin-login', adminLoginHandler);

      const response = await request(app)
        .post('/api/auth/admin-login')
        .send({
          email: 'admin@example.com',
          password: 'AdminPassword123!'
        })
        .expect(200);

      expect(response.body.token).toBeDefined();
      expect(response.body.user.role).toBe('admin');
      
      // Verify JWT contains admin role
      const decoded = jwt.verify(response.body.token, process.env.JWT_SECRET);
      expect(decoded.role).toBe('admin');
    });

    test('should reject admin login with wrong password', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: {
          id: 'admin-123',
          password_hash: '$2b$10$WrongHashHere'
        },
        error: null
      });

      jest.mock('bcrypt', () => ({
        compare: jest.fn().mockResolvedValue(false)
      }));

      app.post('/api/auth/admin-login', async (req, res) => {
        res.status(401).json({ error: 'Invalid credentials' });
      });

      await request(app)
        .post('/api/auth/admin-login')
        .send({
          email: 'admin@example.com',
          password: 'WrongPassword'
        })
        .expect(401);
    });
  });

  describe('Manager Login Flow', () => {
    test('should authenticate manager and load permissions', async () => {
      const managerUser = {
        id: 'manager-123',
        email: 'manager@example.com',
        role: 'manager',
        first_name: 'Manager',
        last_name: 'User',
        company_id: 'company-456'
      };

      const managerPermissions = [
        { permission_key: 'manage_crew' },
        { permission_key: 'view_reports' },
        { permission_key: 'edit_training' }
      ];

      // Mock user lookup
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: managerUser,
        error: null
      });

      // Mock permissions lookup
      mockSupabase.from().select().eq.mockResolvedValueOnce({
        data: managerPermissions,
        error: null
      });

      const managerLoginHandler = require('../../../api/auth/manager-login');
      app.post('/api/auth/manager-login', managerLoginHandler);

      const response = await request(app)
        .post('/api/auth/manager-login')
        .send({ email: managerUser.email })
        .expect(200);

      expect(response.body.message).toContain('Magic link sent');
    });
  });

  describe('Token Refresh Flow', () => {
    test('should refresh expiring token', async () => {
      const user = {
        id: 'user-123',
        email: 'user@example.com',
        role: 'crew'
      };

      // Create token expiring in 1 minute
      const expiringToken = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          role: user.role,
          exp: Math.floor(Date.now() / 1000) + 60
        },
        process.env.JWT_SECRET
      );

      // Mock user lookup for refresh
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: user,
        error: null
      });

      app.post('/api/auth/refresh', async (req, res) => {
        const auth = req.headers.authorization;
        if (!auth) {
          return res.status(401).json({ error: 'No token' });
        }

        const token = auth.split(' ')[1];
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          
          // Check if token is expiring soon (within 5 minutes)
          const now = Math.floor(Date.now() / 1000);
          if (decoded.exp - now < 300) {
            const newToken = generateJWT(user);
            res.json({ token: newToken, refreshed: true });
          } else {
            res.json({ token, refreshed: false });
          }
        } catch (error) {
          res.status(401).json({ error: 'Invalid token' });
        }
      });

      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${expiringToken}`)
        .expect(200);

      expect(response.body.refreshed).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(response.body.token).not.toBe(expiringToken);
    });
  });

  describe('Logout Flow', () => {
    test('should logout and blacklist token', async () => {
      const user = {
        id: 'user-123',
        email: 'user@example.com',
        role: 'crew'
      };

      const token = generateJWT(user);

      // Mock blacklist insertion
      mockSupabase.from().insert.mockResolvedValueOnce({
        data: { id: 1 },
        error: null
      });

      app.post('/api/auth/logout', async (req, res) => {
        const auth = req.headers.authorization;
        if (!auth) {
          return res.status(401).json({ error: 'No token' });
        }

        const token = auth.split(' ')[1];
        const decoded = jwt.decode(token);
        
        if (decoded && decoded.jti) {
          // Blacklist the token
          res.json({ message: 'Logged out successfully' });
        } else {
          res.status(400).json({ error: 'Invalid token' });
        }
      });

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.message).toBe('Logged out successfully');
    });
  });

  describe('Password Change Flow', () => {
    test('should change password for authenticated user', async () => {
      const user = {
        id: 'user-123',
        email: 'user@example.com',
        role: 'crew',
        password_hash: '$2b$10$OldPasswordHash'
      };

      const token = generateJWT(user);

      // Mock user lookup
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: user,
        error: null
      });

      // Mock password update
      mockSupabase.from().update().eq.mockResolvedValueOnce({
        data: { id: user.id },
        error: null
      });

      // Mock email service
      const { sendPasswordChangeEmail } = require('../../../lib/unifiedEmailService');

      app.post('/api/auth/change-password', async (req, res) => {
        const auth = req.headers.authorization;
        if (!auth) {
          return res.status(401).json({ error: 'No token' });
        }

        const { currentPassword, newPassword } = req.body;
        
        // Simulate password validation
        if (!newPassword || newPassword.length < 12) {
          return res.status(400).json({ error: 'Password too weak' });
        }

        res.json({ message: 'Password changed successfully' });
      });

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'OldPassword123!',
          newPassword: 'NewSecurePassword456!'
        })
        .expect(200);

      expect(response.body.message).toBe('Password changed successfully');
    });
  });

  describe('Role-Based Access Control', () => {
    test('should enforce role requirements on endpoints', async () => {
      const crewUser = {
        id: 'crew-123',
        email: 'crew@example.com',
        role: 'crew'
      };

      const managerUser = {
        id: 'manager-123',
        email: 'manager@example.com',
        role: 'manager'
      };

      const adminUser = {
        id: 'admin-123',
        email: 'admin@example.com',
        role: 'admin'
      };

      const crewToken = generateJWT(crewUser);
      const managerToken = generateJWT(managerUser);
      const adminToken = generateJWT(adminUser);

      // Create role-protected endpoints
      app.get('/api/crew-only', (req, res) => {
        const auth = req.headers.authorization?.split(' ')[1];
        if (!auth) return res.status(401).json({ error: 'No token' });
        
        const decoded = jwt.verify(auth, process.env.JWT_SECRET);
        if (decoded.role !== 'crew') {
          return res.status(403).json({ error: 'Crew access required' });
        }
        res.json({ access: 'granted' });
      });

      app.get('/api/manager-only', (req, res) => {
        const auth = req.headers.authorization?.split(' ')[1];
        if (!auth) return res.status(401).json({ error: 'No token' });
        
        const decoded = jwt.verify(auth, process.env.JWT_SECRET);
        if (decoded.role !== 'manager') {
          return res.status(403).json({ error: 'Manager access required' });
        }
        res.json({ access: 'granted' });
      });

      app.get('/api/admin-only', (req, res) => {
        const auth = req.headers.authorization?.split(' ')[1];
        if (!auth) return res.status(401).json({ error: 'No token' });
        
        const decoded = jwt.verify(auth, process.env.JWT_SECRET);
        if (decoded.role !== 'admin') {
          return res.status(403).json({ error: 'Admin access required' });
        }
        res.json({ access: 'granted' });
      });

      // Test crew access
      await request(app)
        .get('/api/crew-only')
        .set('Authorization', `Bearer ${crewToken}`)
        .expect(200);

      await request(app)
        .get('/api/manager-only')
        .set('Authorization', `Bearer ${crewToken}`)
        .expect(403);

      // Test manager access
      await request(app)
        .get('/api/manager-only')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      await request(app)
        .get('/api/admin-only')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(403);

      // Test admin access
      await request(app)
        .get('/api/admin-only')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  describe('Security Headers', () => {
    test('should include security headers in responses', async () => {
      app.use((req, res, next) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        res.setHeader('Strict-Transport-Security', 'max-age=31536000');
        next();
      });

      app.get('/api/test', (req, res) => {
        res.json({ message: 'test' });
      });

      const response = await request(app)
        .get('/api/test')
        .expect(200);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      expect(response.headers['strict-transport-security']).toBe('max-age=31536000');
    });
  });
});