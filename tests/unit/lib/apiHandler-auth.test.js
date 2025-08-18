/**
 * Security tests for createAPIHandler authentication enforcement
 * Tests the critical fix for authentication bypass vulnerability
 */

const { createAPIHandler } = require('../../../lib/apiHandler');
const { authenticateToken } = require('../../../lib/auth');

// Mock the auth module
jest.mock('../../../lib/auth', () => ({
  authenticateToken: jest.fn()
}));

// Mock the error handler
jest.mock('../../../lib/errorHandler', () => ({
  createErrorResponse: jest.fn((code, message, details) => ({
    code,
    message,
    details,
    isAPIError: true
  })),
  handle: jest.fn((error, req, res) => {
    res.status(error.code === 'AUTH_TOKEN_INVALID' ? 401 : 500).json({
      error: error.message,
      code: error.code
    });
  })
}));

// Mock request ID middleware
jest.mock('../../../lib/middleware/errorMiddleware', () => ({
  requestIdMiddleware: jest.fn((req, res, next) => {
    req.requestId = 'test-request-id';
    next();
  })
}));

describe('createAPIHandler Authentication Security', () => {
  let mockReq, mockRes, mockHandler;

  beforeEach(() => {
    mockReq = {
      method: 'GET',
      headers: {}
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockHandler = jest.fn();
    jest.clearAllMocks();
  });

  describe('Authentication Enforcement', () => {
    test('should allow access when requireAuth is false', async () => {
      const handler = createAPIHandler(mockHandler, { requireAuth: false });
      
      await handler(mockReq, mockRes);
      
      expect(authenticateToken).not.toHaveBeenCalled();
      expect(mockHandler).toHaveBeenCalledWith(mockReq, mockRes);
    });

    test('should enforce authentication when requireAuth is true', async () => {
      authenticateToken.mockResolvedValue({ success: false, error: 'Access token required' });
      
      const handler = createAPIHandler(mockHandler, { requireAuth: true });
      
      await handler(mockReq, mockRes);
      
      expect(authenticateToken).toHaveBeenCalledWith(mockReq);
      expect(mockHandler).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    test('should allow access with valid authentication', async () => {
      const mockUser = { userId: '123', email: 'test@example.com', role: 'admin' };
      authenticateToken.mockResolvedValue({ success: true, user: mockUser });
      
      const handler = createAPIHandler(mockHandler, { requireAuth: true });
      
      await handler(mockReq, mockRes);
      
      expect(authenticateToken).toHaveBeenCalledWith(mockReq);
      expect(mockReq.user).toEqual(mockUser);
      expect(mockHandler).toHaveBeenCalledWith(mockReq, mockRes);
    });

    test('should reject invalid authentication tokens', async () => {
      authenticateToken.mockResolvedValue({ success: false, error: 'Invalid token' });
      
      const handler = createAPIHandler(mockHandler, { requireAuth: true });
      
      await handler(mockReq, mockRes);
      
      expect(authenticateToken).toHaveBeenCalledWith(mockReq);
      expect(mockHandler).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    test('should handle authentication errors gracefully', async () => {
      authenticateToken.mockRejectedValue(new Error('Database connection failed'));
      
      const handler = createAPIHandler(mockHandler, { requireAuth: true });
      
      await handler(mockReq, mockRes);
      
      expect(authenticateToken).toHaveBeenCalledWith(mockReq);
      expect(mockHandler).not.toHaveBeenCalled();
      // Should handle the error through the error handler
    });
  });

  describe('Method Validation with Authentication', () => {
    test('should validate method before authentication', async () => {
      mockReq.method = 'POST';
      
      const handler = createAPIHandler(mockHandler, { 
        requireAuth: true,
        allowedMethods: ['GET'] 
      });
      
      await handler(mockReq, mockRes);
      
      // Should fail on method validation before reaching authentication
      expect(authenticateToken).not.toHaveBeenCalled();
      expect(mockHandler).not.toHaveBeenCalled();
    });

    test('should authenticate after successful method validation', async () => {
      mockReq.method = 'POST';
      authenticateToken.mockResolvedValue({ success: true, user: { id: '123' } });
      
      const handler = createAPIHandler(mockHandler, { 
        requireAuth: true,
        allowedMethods: ['GET', 'POST'] 
      });
      
      await handler(mockReq, mockRes);
      
      expect(authenticateToken).toHaveBeenCalledWith(mockReq);
      expect(mockHandler).toHaveBeenCalledWith(mockReq, mockRes);
    });
  });

  describe('Security Regression Prevention', () => {
    test('should not bypass authentication when requireAuth is explicitly true', async () => {
      // This test specifically prevents the original vulnerability
      authenticateToken.mockResolvedValue({ success: false, error: 'No token' });
      
      const handler = createAPIHandler(mockHandler, { requireAuth: true });
      
      await handler(mockReq, mockRes);
      
      // CRITICAL: Handler should NOT be called without authentication
      expect(mockHandler).not.toHaveBeenCalled();
      expect(authenticateToken).toHaveBeenCalled();
    });

    test('should add user to request object when authenticated', async () => {
      const mockUser = { userId: '456', email: 'admin@example.com', role: 'admin' };
      authenticateToken.mockResolvedValue({ success: true, user: mockUser });
      
      const handler = createAPIHandler(mockHandler, { requireAuth: true });
      
      await handler(mockReq, mockRes);
      
      expect(mockReq.user).toEqual(mockUser);
      expect(mockHandler).toHaveBeenCalledWith(mockReq, mockRes);
    });
  });
});
