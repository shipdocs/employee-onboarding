/**
 * Unit tests for error handling middleware
 * Tests centralized error handling, error formatting, and logging
 */

const {
  errorMiddleware,
  requestIdMiddleware,
  methodValidationMiddleware,
  contentTypeValidationMiddleware,
  requestSizeValidationMiddleware,
  rateLimitErrorHandler,
  authErrorHandler,
  databaseErrorHandler,
  serviceErrorHandler,
  validationErrorHandler,
  asyncHandler,
  errorBoundary
} = require('../../../lib/middleware/errorMiddleware');

const ErrorHandler = require('../../../lib/errorHandler');

// Mock the error handler
jest.mock('../../../lib/errorHandler', () => ({
  handle: jest.fn(),
  generateRequestId: jest.fn(() => 'test-request-id-123'),
  createErrorResponse: jest.fn((code, message, details) => ({
    code,
    message,
    details,
    isCustomError: true
  }))
}));

describe('Error Middleware', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = {
      headers: {},
      method: 'GET',
      url: '/api/test',
      connection: { remoteAddress: '127.0.0.1' }
    };
    mockRes = {
      headersSent: false,
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('errorMiddleware', () => {
    test('should handle errors with centralized error handler', () => {
      const error = new Error('Test error');
      errorMiddleware(error, mockReq, mockRes, mockNext);

      expect(ErrorHandler.handle).toHaveBeenCalledWith(error, mockReq, mockRes, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should delegate to Express if headers already sent', () => {
      mockRes.headersSent = true;
      const error = new Error('Test error');
      
      errorMiddleware(error, mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(ErrorHandler.handle).not.toHaveBeenCalled();
    });
  });

  describe('requestIdMiddleware', () => {
    test('should generate new request ID if none exists', () => {
      requestIdMiddleware(mockReq, mockRes, mockNext);

      expect(ErrorHandler.generateRequestId).toHaveBeenCalled();
      expect(mockReq.headers['x-request-id']).toBe('test-request-id-123');
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Request-ID', 'test-request-id-123');
      expect(mockNext).toHaveBeenCalled();
    });

    test('should use existing x-request-id header', () => {
      mockReq.headers['x-request-id'] = 'existing-id';
      
      requestIdMiddleware(mockReq, mockRes, mockNext);

      expect(ErrorHandler.generateRequestId).not.toHaveBeenCalled();
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Request-ID', 'existing-id');
      expect(mockNext).toHaveBeenCalled();
    });

    test('should use x-correlation-id header', () => {
      mockReq.headers['x-correlation-id'] = 'correlation-id';
      
      requestIdMiddleware(mockReq, mockRes, mockNext);

      expect(ErrorHandler.generateRequestId).not.toHaveBeenCalled();
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Request-ID', 'correlation-id');
    });

    test('should use request-id header', () => {
      mockReq.headers['request-id'] = 'request-id';
      
      requestIdMiddleware(mockReq, mockRes, mockNext);

      expect(ErrorHandler.generateRequestId).not.toHaveBeenCalled();
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Request-ID', 'request-id');
    });
  });

  describe('methodValidationMiddleware', () => {
    test('should allow valid HTTP methods', () => {
      const middleware = methodValidationMiddleware(['GET', 'POST']);
      mockReq.method = 'GET';
      
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(ErrorHandler.createErrorResponse).not.toHaveBeenCalled();
    });

    test('should reject invalid HTTP methods', () => {
      const middleware = methodValidationMiddleware(['GET', 'POST']);
      mockReq.method = 'DELETE';
      
      middleware(mockReq, mockRes, mockNext);

      expect(ErrorHandler.createErrorResponse).toHaveBeenCalledWith(
        'VALIDATION_INVALID_METHOD',
        expect.stringContaining('Method DELETE not allowed'),
        expect.objectContaining({
          allowedMethods: ['GET', 'POST'],
          requestedMethod: 'DELETE'
        })
      );
      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        code: 'VALIDATION_INVALID_METHOD',
        isCustomError: true
      }));
    });

    test('should use default allowed methods', () => {
      const middleware = methodValidationMiddleware();
      mockReq.method = 'POST';
      
      middleware(mockReq, mockRes, mockNext);

      expect(ErrorHandler.createErrorResponse).toHaveBeenCalledWith(
        'VALIDATION_INVALID_METHOD',
        expect.stringContaining('Allowed methods: GET'),
        expect.any(Object)
      );
    });
  });

  describe('contentTypeValidationMiddleware', () => {
    test('should skip validation for GET requests', () => {
      const middleware = contentTypeValidationMiddleware();
      mockReq.method = 'GET';
      
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(ErrorHandler.createErrorResponse).not.toHaveBeenCalled();
    });

    test('should validate content-type for POST requests', () => {
      const middleware = contentTypeValidationMiddleware();
      mockReq.method = 'POST';
      mockReq.headers['content-type'] = 'application/json';
      
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(ErrorHandler.createErrorResponse).not.toHaveBeenCalled();
    });

    test('should reject invalid content-type', () => {
      const middleware = contentTypeValidationMiddleware();
      mockReq.method = 'POST';
      mockReq.headers['content-type'] = 'text/plain';
      
      middleware(mockReq, mockRes, mockNext);

      expect(ErrorHandler.createErrorResponse).toHaveBeenCalledWith(
        'VALIDATION_INVALID_CONTENT_TYPE',
        expect.stringContaining('Expected: application/json'),
        expect.objectContaining({
          expected: 'application/json',
          received: 'text/plain'
        })
      );
    });

    test('should reject missing content-type', () => {
      const middleware = contentTypeValidationMiddleware();
      mockReq.method = 'PUT';
      
      middleware(mockReq, mockRes, mockNext);

      expect(ErrorHandler.createErrorResponse).toHaveBeenCalledWith(
        'VALIDATION_INVALID_CONTENT_TYPE',
        expect.any(String),
        expect.objectContaining({
          expected: 'application/json',
          received: undefined
        })
      );
    });

    test('should accept custom content-type requirement', () => {
      const middleware = contentTypeValidationMiddleware('multipart/form-data');
      mockReq.method = 'POST';
      mockReq.headers['content-type'] = 'multipart/form-data; boundary=----WebKitFormBoundary';
      
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('requestSizeValidationMiddleware', () => {
    test('should allow requests within size limit', () => {
      const middleware = requestSizeValidationMiddleware(1024 * 1024); // 1MB
      mockReq.headers['content-length'] = '524288'; // 512KB
      
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(ErrorHandler.createErrorResponse).not.toHaveBeenCalled();
    });

    test('should reject oversized requests', () => {
      const middleware = requestSizeValidationMiddleware(1024); // 1KB
      mockReq.headers['content-length'] = '2048'; // 2KB
      
      middleware(mockReq, mockRes, mockNext);

      expect(ErrorHandler.createErrorResponse).toHaveBeenCalledWith(
        'VALIDATION_REQUEST_TOO_LARGE',
        expect.stringContaining('exceeds limit of 1KB'),
        expect.objectContaining({
          maxSize: 1024,
          requestSize: 2048
        })
      );
    });

    test('should handle missing content-length', () => {
      const middleware = requestSizeValidationMiddleware(1024);
      
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('rateLimitErrorHandler', () => {
    test('should create rate limit error with headers', () => {
      const rateLimitInfo = {
        limit: 100,
        remaining: 0,
        retryAfter: 60,
        resetTime: 1234567890
      };

      rateLimitErrorHandler(mockReq, mockRes, mockNext, rateLimitInfo);

      expect(ErrorHandler.createErrorResponse).toHaveBeenCalledWith(
        'RATE_LIMIT_EXCEEDED',
        expect.stringContaining('Try again in 60 seconds'),
        rateLimitInfo
      );

      expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 100);
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 0);
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Reset', 1234567890);
      expect(mockRes.setHeader).toHaveBeenCalledWith('Retry-After', 60);
    });
  });

  describe('authErrorHandler', () => {
    test('should handle token expired error', () => {
      const authError = {
        type: 'token_expired',
        expiredAt: '2024-01-01T00:00:00Z'
      };

      authErrorHandler(mockReq, mockRes, mockNext, authError);

      expect(ErrorHandler.createErrorResponse).toHaveBeenCalledWith(
        'AUTH_TOKEN_EXPIRED',
        'Authentication token has expired',
        { expiredAt: '2024-01-01T00:00:00Z' }
      );
    });

    test('should handle invalid token error', () => {
      const authError = {
        type: 'token_invalid',
        reason: 'Malformed token'
      };

      authErrorHandler(mockReq, mockRes, mockNext, authError);

      expect(ErrorHandler.createErrorResponse).toHaveBeenCalledWith(
        'AUTH_TOKEN_INVALID',
        'Invalid authentication token',
        { reason: 'Malformed token' }
      );
    });

    test('should handle insufficient permissions error', () => {
      const authError = {
        type: 'insufficient_permissions',
        requiredPermissions: ['admin'],
        userPermissions: ['user']
      };

      authErrorHandler(mockReq, mockRes, mockNext, authError);

      expect(ErrorHandler.createErrorResponse).toHaveBeenCalledWith(
        'AUTH_INSUFFICIENT_PERMISSIONS',
        'Insufficient permissions for this operation',
        {
          requiredPermissions: ['admin'],
          userPermissions: ['user']
        }
      );
    });

    test('should handle generic auth error', () => {
      const authError = { type: 'unknown' };

      authErrorHandler(mockReq, mockRes, mockNext, authError);

      expect(ErrorHandler.createErrorResponse).toHaveBeenCalledWith(
        'AUTH_INVALID_CREDENTIALS',
        'Authentication failed'
      );
    });
  });

  describe('databaseErrorHandler', () => {
    test('should handle no rows returned error', () => {
      const error = databaseErrorHandler({ code: 'PGRST116' });

      expect(ErrorHandler.createErrorResponse).toHaveBeenCalledWith(
        'DB_RECORD_NOT_FOUND',
        'Requested record not found'
      );
    });

    test('should handle constraint violation', () => {
      const error = databaseErrorHandler({ 
        code: 'PGRST301',
        details: 'Unique constraint violated'
      });

      expect(ErrorHandler.createErrorResponse).toHaveBeenCalledWith(
        'DB_CONSTRAINT_VIOLATION',
        'Database constraint violation',
        { constraint: 'Unique constraint violated' }
      );
    });

    test('should handle connection errors', () => {
      const error = databaseErrorHandler({ 
        message: 'connection timeout'
      });

      expect(ErrorHandler.createErrorResponse).toHaveBeenCalledWith(
        'DB_CONNECTION_ERROR',
        'Database connection failed'
      );
    });

    test('should handle generic database errors', () => {
      const error = databaseErrorHandler({ 
        message: 'Query failed'
      });

      expect(ErrorHandler.createErrorResponse).toHaveBeenCalledWith(
        'DB_QUERY_ERROR',
        'Database operation failed',
        { originalError: 'Query failed' }
      );
    });
  });

  describe('serviceErrorHandler', () => {
    test('should handle connection refused', () => {
      const error = serviceErrorHandler({ code: 'ECONNREFUSED' }, 'EmailService');

      expect(ErrorHandler.createErrorResponse).toHaveBeenCalledWith(
        'SERVICE_UNAVAILABLE',
        'EmailService service is unavailable',
        { service: 'EmailService', reason: 'Connection failed' }
      );
    });

    test('should handle timeout', () => {
      const error = serviceErrorHandler({ 
        code: 'ETIMEDOUT',
        timeout: 5000
      }, 'PaymentAPI');

      expect(ErrorHandler.createErrorResponse).toHaveBeenCalledWith(
        'SERVICE_TIMEOUT',
        'PaymentAPI service timeout',
        { service: 'PaymentAPI', timeout: 5000 }
      );
    });

    test('should handle rate limiting', () => {
      const error = serviceErrorHandler({ 
        response: {
          status: 429,
          headers: { 'retry-after': '60' }
        }
      }, 'TranslationAPI');

      expect(ErrorHandler.createErrorResponse).toHaveBeenCalledWith(
        'SERVICE_QUOTA_EXCEEDED',
        'TranslationAPI service quota exceeded',
        { service: 'TranslationAPI', retryAfter: '60' }
      );
    });

    test('should handle generic service errors', () => {
      const error = serviceErrorHandler({ 
        message: 'Unknown error'
      }, 'StorageService');

      expect(ErrorHandler.createErrorResponse).toHaveBeenCalledWith(
        'SERVICE_ERROR',
        'StorageService service error',
        { service: 'StorageService', originalError: 'Unknown error' }
      );
    });
  });

  describe('validationErrorHandler', () => {
    test('should handle single validation error', () => {
      const error = validationErrorHandler({
        field: 'email',
        message: 'Invalid email format',
        value: 'notanemail'
      });

      expect(ErrorHandler.createErrorResponse).toHaveBeenCalledWith(
        'VALIDATION_FAILED',
        'Request validation failed',
        {
          errors: [{
            field: 'email',
            message: 'Invalid email format',
            value: 'notanemail',
            code: undefined
          }]
        }
      );
    });

    test('should handle multiple validation errors', () => {
      const errors = [
        { field: 'email', message: 'Required', code: 'REQUIRED' },
        { path: 'password', message: 'Too weak', value: '123' }
      ];

      const error = validationErrorHandler(errors);

      expect(ErrorHandler.createErrorResponse).toHaveBeenCalledWith(
        'VALIDATION_FAILED',
        'Request validation failed',
        {
          errors: [
            { field: 'email', message: 'Required', value: undefined, code: 'REQUIRED' },
            { field: 'password', message: 'Too weak', value: '123', code: undefined }
          ]
        }
      );
    });
  });

  describe('asyncHandler', () => {
    test('should handle successful async operations', async () => {
      const asyncRoute = jest.fn().mockResolvedValue(undefined);
      const wrapped = asyncHandler(asyncRoute);

      await wrapped(mockReq, mockRes, mockNext);

      expect(asyncRoute).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should catch async errors and pass to next', async () => {
      const error = new Error('Async error');
      const asyncRoute = jest.fn().mockRejectedValue(error);
      const wrapped = asyncHandler(asyncRoute);

      await wrapped(mockReq, mockRes, mockNext);

      expect(asyncRoute).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(error);
    });

    test('should handle synchronous errors in async functions', async () => {
      const error = new Error('Sync error in async');
      const asyncRoute = jest.fn(() => {
        throw error;
      });
      const wrapped = asyncHandler(asyncRoute);

      await wrapped(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('errorBoundary', () => {
    const originalProcessOn = process.on;
    const mockProcessOn = jest.fn();

    beforeEach(() => {
      process.on = mockProcessOn;
    });

    afterEach(() => {
      process.on = originalProcessOn;
    });

    test('should set up unhandled rejection handler', () => {
      errorBoundary(mockReq, mockRes, mockNext);

      expect(mockProcessOn).toHaveBeenCalledWith('unhandledRejection', expect.any(Function));
      expect(mockNext).toHaveBeenCalled();
    });

    test('should set up uncaught exception handler', () => {
      errorBoundary(mockReq, mockRes, mockNext);

      expect(mockProcessOn).toHaveBeenCalledWith('uncaughtException', expect.any(Function));
    });

    test('should handle unhandled rejection', () => {
      errorBoundary(mockReq, mockRes, mockNext);

      const rejectionHandler = mockProcessOn.mock.calls.find(
        call => call[0] === 'unhandledRejection'
      )[1];

      const reason = new Error('Unhandled promise rejection');
      rejectionHandler(reason, Promise.reject(reason));

      expect(ErrorHandler.createErrorResponse).toHaveBeenCalledWith(
        'SYSTEM_INTERNAL_ERROR',
        'An unexpected error occurred',
        { reason: reason.toString() }
      );
    });

    test('should not send response if headers already sent', () => {
      mockRes.headersSent = true;
      errorBoundary(mockReq, mockRes, mockNext);

      const rejectionHandler = mockProcessOn.mock.calls.find(
        call => call[0] === 'unhandledRejection'
      )[1];

      rejectionHandler(new Error('Test'), Promise.reject());

      expect(ErrorHandler.handle).not.toHaveBeenCalled();
    });
  });
});