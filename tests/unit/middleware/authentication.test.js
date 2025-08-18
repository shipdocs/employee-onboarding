/**
 * Unit tests for authentication middleware
 * Tests JWT handling, role-based access control, and token management
 */

const jwt = require('jsonwebtoken');
const {
  generateMagicToken,
  generateJWT,
  verifyJWT,
  authenticateRequest,
  authenticateToken,
  requireAuth,
  requireManager,
  requireCrew,
  requireAdmin,
  requireManagerOrAdmin,
  hasRoleAccess,
  requireRoleLevel,
  isTokenExpired,
  getTokenExpirationTime,
  isTokenExpiringSoon,
  verifyAuth,
  isTokenBlacklisted,
  blacklistToken
} = require('../../../lib/auth');

// Mock the supabase client
jest.mock('../../../lib/supabase', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null })),
          gt: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ data: null, error: null }))
          }))
        }))
      })),
      insert: jest.fn(() => Promise.resolve({ data: {}, error: null }))
    }))
  }))
}));

// Set up environment variables
process.env.JWT_SECRET = 'test-secret-key-for-testing-only';

describe('Authentication Middleware', () => {
  const mockUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    role: 'crew',
    first_name: 'John',
    last_name: 'Doe'
  };

  describe('Token Generation', () => {
    test('should generate magic token', () => {
      const token = generateMagicToken();
      expect(token).toBeDefined();
      expect(token).toHaveLength(64); // 32 bytes in hex
      expect(/^[a-f0-9]+$/.test(token)).toBe(true);
    });

    test('should generate JWT with correct payload', () => {
      const token = generateJWT(mockUser);
      expect(token).toBeDefined();

      const decoded = jwt.decode(token);
      expect(decoded.userId).toBe(mockUser.id);
      expect(decoded.email).toBe(mockUser.email);
      expect(decoded.role).toBe(mockUser.role);
      expect(decoded.firstName).toBe(mockUser.first_name);
      expect(decoded.lastName).toBe(mockUser.last_name);
      expect(decoded.jti).toBeDefined(); // JWT ID for blacklisting
      expect(decoded.iss).toBe('crew-onboarding-app');
    });

    test('should generate unique JWT IDs', () => {
      const token1 = generateJWT(mockUser);
      const token2 = generateJWT(mockUser);

      const decoded1 = jwt.decode(token1);
      const decoded2 = jwt.decode(token2);

      expect(decoded1.jti).not.toBe(decoded2.jti);
    });
  });

  describe('Token Verification', () => {
    test('should verify valid JWT', () => {
      const token = generateJWT(mockUser);
      const decoded = verifyJWT(token);

      expect(decoded).toBeDefined();
      expect(decoded.userId).toBe(mockUser.id);
      expect(decoded.email).toBe(mockUser.email);
    });

    test('should reject invalid JWT', () => {
      const invalidToken = 'invalid.jwt.token';
      const decoded = verifyJWT(invalidToken);
      expect(decoded).toBeNull();
    });

    test('should reject expired JWT', () => {
      const expiredToken = jwt.sign(
        { userId: mockUser.id, exp: Math.floor(Date.now() / 1000) - 60 },
        process.env.JWT_SECRET
      );
      const decoded = verifyJWT(expiredToken);
      expect(decoded).toBeNull();
    });

    test('should reject JWT with wrong signature', () => {
      const wrongSignatureToken = jwt.sign(
        { userId: mockUser.id },
        'wrong-secret'
      );
      const decoded = verifyJWT(wrongSignatureToken);
      expect(decoded).toBeNull();
    });
  });

  describe('Request Authentication', () => {
    test('should authenticate valid request', async () => {
      const token = generateJWT(mockUser);
      const req = {
        headers: {
          authorization: `Bearer ${token}`
        }
      };

      const user = await authenticateRequest(req);
      expect(user).toBeDefined();
      expect(user.userId).toBe(mockUser.id);
    });

    test('should reject request without token', async () => {
      const req = {
        headers: {}
      };

      const user = await authenticateRequest(req);
      expect(user).toBeNull();
    });

    test('should reject request with malformed authorization header', async () => {
      const req = {
        headers: {
          authorization: 'InvalidFormat'
        }
      };

      const user = await authenticateRequest(req);
      expect(user).toBeNull();
    });

    test('should reject blacklisted token', async () => {
      const { createClient } = require('../../../lib/supabase');
      const mockSupabase = createClient();
      
      // Mock blacklisted token
      mockSupabase.from().select().eq().gt().single.mockResolvedValueOnce({
        data: { id: 1 }, // Token found in blacklist
        error: null
      });

      const token = generateJWT(mockUser);
      const req = {
        headers: {
          authorization: `Bearer ${token}`
        }
      };

      const user = await authenticateRequest(req);
      expect(user).toBeNull();
    });
  });

  describe('authenticateToken', () => {
    test('should return success object for valid token', async () => {
      const token = generateJWT(mockUser);
      const req = {
        headers: {
          authorization: `Bearer ${token}`
        }
      };

      const result = await authenticateToken(req);
      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user.userId).toBe(mockUser.id);
    });

    test('should return error object for missing token', async () => {
      const req = {
        headers: {}
      };

      const result = await authenticateToken(req);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Access token required');
    });
  });

  describe('Role-Based Middleware', () => {
    describe('requireAuth', () => {
      test('should allow authenticated user', async () => {
        const token = generateJWT(mockUser);
        const req = {
          headers: {
            authorization: `Bearer ${token}`
          }
        };
        const res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn()
        };
        const handler = jest.fn();

        const middleware = requireAuth(handler);
        await middleware(req, res);

        expect(handler).toHaveBeenCalledWith(req, res);
        expect(req.user).toBeDefined();
        expect(req.user.userId).toBe(mockUser.id);
      });

      test('should reject unauthenticated user', async () => {
        const req = { headers: {} };
        const res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn()
        };
        const handler = jest.fn();

        const middleware = requireAuth(handler);
        await middleware(req, res);

        expect(handler).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: 'Access token required' });
      });
    });

    describe('requireManager', () => {
      test('should allow manager', async () => {
        const managerUser = { ...mockUser, role: 'manager' };
        const token = generateJWT(managerUser);
        const req = {
          headers: {
            authorization: `Bearer ${token}`
          }
        };
        const res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn()
        };
        const handler = jest.fn();

        const middleware = requireManager(handler);
        await middleware(req, res);

        expect(handler).toHaveBeenCalled();
      });

      test('should reject non-manager', async () => {
        const token = generateJWT(mockUser); // crew role
        const req = {
          headers: {
            authorization: `Bearer ${token}`
          }
        };
        const res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn()
        };
        const handler = jest.fn();

        const middleware = requireManager(handler);
        await middleware(req, res);

        expect(handler).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ error: 'Manager access required' });
      });
    });

    describe('requireAdmin', () => {
      test('should allow admin', async () => {
        const adminUser = { ...mockUser, role: 'admin' };
        const token = generateJWT(adminUser);
        const req = {
          headers: {
            authorization: `Bearer ${token}`
          }
        };
        const res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn()
        };
        const handler = jest.fn();

        const middleware = requireAdmin(handler);
        await middleware(req, res);

        expect(handler).toHaveBeenCalled();
      });

      test('should reject non-admin', async () => {
        const token = generateJWT(mockUser); // crew role
        const req = {
          headers: {
            authorization: `Bearer ${token}`
          }
        };
        const res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn()
        };
        const handler = jest.fn();

        const middleware = requireAdmin(handler);
        await middleware(req, res);

        expect(handler).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ error: 'Administrator access required' });
      });
    });

    describe('requireManagerOrAdmin', () => {
      test('should allow manager', async () => {
        const managerUser = { ...mockUser, role: 'manager' };
        const token = generateJWT(managerUser);
        const req = {
          headers: {
            authorization: `Bearer ${token}`
          }
        };
        const res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn()
        };
        const handler = jest.fn();

        const middleware = requireManagerOrAdmin(handler);
        await middleware(req, res);

        expect(handler).toHaveBeenCalled();
      });

      test('should allow admin', async () => {
        const adminUser = { ...mockUser, role: 'admin' };
        const token = generateJWT(adminUser);
        const req = {
          headers: {
            authorization: `Bearer ${token}`
          }
        };
        const res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn()
        };
        const handler = jest.fn();

        const middleware = requireManagerOrAdmin(handler);
        await middleware(req, res);

        expect(handler).toHaveBeenCalled();
      });

      test('should reject crew', async () => {
        const token = generateJWT(mockUser); // crew role
        const req = {
          headers: {
            authorization: `Bearer ${token}`
          }
        };
        const res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn()
        };
        const handler = jest.fn();

        const middleware = requireManagerOrAdmin(handler);
        await middleware(req, res);

        expect(handler).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(403);
      });
    });
  });

  describe('Role Hierarchy', () => {
    test('should correctly check role access levels', () => {
      expect(hasRoleAccess('admin', 'crew')).toBe(true);
      expect(hasRoleAccess('admin', 'manager')).toBe(true);
      expect(hasRoleAccess('admin', 'admin')).toBe(true);

      expect(hasRoleAccess('manager', 'crew')).toBe(true);
      expect(hasRoleAccess('manager', 'manager')).toBe(true);
      expect(hasRoleAccess('manager', 'admin')).toBe(false);

      expect(hasRoleAccess('crew', 'crew')).toBe(true);
      expect(hasRoleAccess('crew', 'manager')).toBe(false);
      expect(hasRoleAccess('crew', 'admin')).toBe(false);
    });

    test('requireRoleLevel should enforce minimum role', async () => {
      const managerUser = { ...mockUser, role: 'manager' };
      const token = generateJWT(managerUser);
      const req = {
        headers: {
          authorization: `Bearer ${token}`
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const handler = jest.fn();

      const middleware = requireRoleLevel('crew')(handler);
      await middleware(req, res);

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('Token Expiration', () => {
    test('should check if token is expired', () => {
      const expiredToken = jwt.sign(
        { exp: Math.floor(Date.now() / 1000) - 60 },
        process.env.JWT_SECRET
      );
      expect(isTokenExpired(expiredToken)).toBe(true);

      const validToken = jwt.sign(
        { exp: Math.floor(Date.now() / 1000) + 3600 },
        process.env.JWT_SECRET
      );
      expect(isTokenExpired(validToken)).toBe(false);
    });

    test('should get token expiration time', () => {
      const expTime = Math.floor(Date.now() / 1000) + 3600;
      const token = jwt.sign(
        { exp: expTime },
        process.env.JWT_SECRET
      );

      const expirationTime = getTokenExpirationTime(token);
      expect(expirationTime).toBe(expTime * 1000);
    });

    test('should check if token is expiring soon', () => {
      // Token expiring in 3 minutes
      const expiringSoonToken = jwt.sign(
        { exp: Math.floor(Date.now() / 1000) + 180 },
        process.env.JWT_SECRET
      );
      expect(isTokenExpiringSoon(expiringSoonToken, 5)).toBe(true);

      // Token expiring in 10 minutes
      const notExpiringSoonToken = jwt.sign(
        { exp: Math.floor(Date.now() / 1000) + 600 },
        process.env.JWT_SECRET
      );
      expect(isTokenExpiringSoon(notExpiringSoonToken, 5)).toBe(false);
    });
  });

  describe('Token Blacklisting', () => {
    test('should check if token is blacklisted', async () => {
      const token = generateJWT(mockUser);
      const isBlacklisted = await isTokenBlacklisted(token);
      expect(isBlacklisted).toBe(false);
    });

    test('should handle tokens without JTI', async () => {
      const oldToken = jwt.sign(
        { userId: mockUser.id },
        process.env.JWT_SECRET
      );
      const isBlacklisted = await isTokenBlacklisted(oldToken);
      expect(isBlacklisted).toBe(false);
    });

    test('should blacklist token', async () => {
      const token = generateJWT(mockUser);
      const req = {
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'user-agent': 'Test Browser'
        }
      };

      const result = await blacklistToken(token, mockUser.id, 'logout', req);
      expect(result.success).toBe(true);
    });

    test('should handle blacklist errors gracefully', async () => {
      const { createClient } = require('../../../lib/supabase');
      const mockSupabase = createClient();
      
      mockSupabase.from().insert.mockRejectedValueOnce(new Error('DB Error'));

      const token = generateJWT(mockUser);
      const result = await blacklistToken(token, mockUser.id, 'logout');
      expect(result.success).toBe(false);
    });
  });

  describe('verifyAuth', () => {
    test('should verify auth and fetch user with permissions', async () => {
      const { createClient } = require('../../../lib/supabase');
      const mockSupabase = createClient();

      // Mock user lookup
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: {
          id: mockUser.id,
          email: mockUser.email,
          role: 'manager',
          first_name: mockUser.first_name,
          last_name: mockUser.last_name
        },
        error: null
      });

      // Mock permissions lookup
      mockSupabase.from().select().eq.mockResolvedValueOnce({
        data: [
          { permission_key: 'manage_crew' },
          { permission_key: 'view_reports' }
        ],
        error: null
      });

      const token = generateJWT(mockUser);
      const req = {
        headers: {
          authorization: `Bearer ${token}`
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      const user = await verifyAuth(req, res);
      expect(user).toBeDefined();
      expect(user.id).toBe(mockUser.id);
      expect(user.permissions).toEqual(['manage_crew', 'view_reports']);
    });

    test('should handle user not found', async () => {
      const { createClient } = require('../../../lib/supabase');
      const mockSupabase = createClient();

      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: null,
        error: { message: 'User not found' }
      });

      const token = generateJWT(mockUser);
      const req = {
        headers: {
          authorization: `Bearer ${token}`
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      const user = await verifyAuth(req, res);
      expect(user).toBeNull();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'User not found' });
    });
  });
});