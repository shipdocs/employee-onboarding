import { NextApiRequest, NextApiResponse } from 'next';

// Error code enumeration
export declare const ERROR_CODES: {
  // Authentication & Authorization
  AUTH_INVALID_CREDENTIALS: string;
  AUTH_ACCOUNT_LOCKED: string;
  AUTH_TOKEN_EXPIRED: string;
  AUTH_TOKEN_INVALID: string;
  AUTH_INSUFFICIENT_PERMISSIONS: string;
  AUTH_ACCOUNT_NOT_ACTIVE: string;
  AUTH_ACCOUNT_NOT_CONFIGURED: string;
  AUTH_SESSION_EXPIRED: string;

  // Validation
  VALIDATION_REQUIRED_FIELD: string;
  VALIDATION_INVALID_FORMAT: string;
  VALIDATION_OUT_OF_RANGE: string;
  VALIDATION_INVALID_EMAIL: string;
  VALIDATION_INVALID_METHOD: string;
  VALIDATION_INVALID_CONTENT_TYPE: string;
  VALIDATION_REQUEST_TOO_LARGE: string;
  VALIDATION_UNSUPPORTED_LANGUAGE: string;
  VALIDATION_INVALID_LANGUAGE_PAIR: string;
  VALIDATION_PASSWORD_TOO_WEAK: string;
  VALIDATION_DUPLICATE_ENTRY: string;

  // Database
  DB_CONNECTION_ERROR: string;
  DB_QUERY_ERROR: string;
  DB_CONSTRAINT_VIOLATION: string;
  DB_RECORD_NOT_FOUND: string;
  DB_TRANSACTION_FAILED: string;

  // External Services
  SERVICE_TRANSLATION_UNAVAILABLE: string;
  SERVICE_TRANSLATION_ERROR: string;
  SERVICE_EMAIL_FAILED: string;
  SERVICE_STORAGE_ERROR: string;
  SERVICE_TIMEOUT: string;
  SERVICE_QUOTA_EXCEEDED: string;

  // Rate Limiting
  RATE_LIMIT_EXCEEDED: string;
  RATE_LIMIT_QUOTA_EXCEEDED: string;
  RATE_LIMIT_TOO_MANY_REQUESTS: string;

  // System
  SYSTEM_INTERNAL_ERROR: string;
  SYSTEM_CONFIGURATION_ERROR: string;
  SYSTEM_MAINTENANCE: string;
  SYSTEM_TIMEOUT: string;
  SYSTEM_UNAVAILABLE: string;

  // File Operations
  FILE_NOT_FOUND: string;
  FILE_TOO_LARGE: string;
  FILE_INVALID_TYPE: string;
  FILE_UPLOAD_FAILED: string;

  // Training & Content
  TRAINING_PHASE_NOT_FOUND: string;
  TRAINING_ITEM_NOT_FOUND: string;
  TRAINING_ALREADY_COMPLETED: string;
  TRAINING_PREREQUISITES_NOT_MET: string;
};

// HTTP Status Code Mapping
export declare const STATUS_CODE_MAPPING: Record<string, number>;

// Error Details Interface
export interface ErrorDetails {
  field?: string;
  value?: any;
  reason?: string;
  [key: string]: any;
}

// Custom Error Classes
export declare class APIError extends Error {
  name: string;
  code: string;
  details: ErrorDetails | null;
  statusCode: number;

  constructor(code: string, message: string, details?: ErrorDetails | null, statusCode?: number | null);
}

export declare class AuthError extends APIError {
  constructor(code: string, message: string, details?: ErrorDetails | null);
}

export declare class ValidationError extends APIError {
  constructor(code: string, message: string, details?: ErrorDetails | null);
}

export declare class DatabaseError extends APIError {
  constructor(code: string, message: string, details?: ErrorDetails | null);
}

export declare class ServiceError extends APIError {
  constructor(code: string, message: string, details?: ErrorDetails | null);
}

// Error Response Interfaces
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details: ErrorDetails | null;
    timestamp: string;
    requestId: string;
    path: string;
    method: string;
    statusCode: number;
  };
  meta: {
    environment: string;
    version: string;
    documentation: string;
  };
}

// Extended Request Interface
export interface RequestWithUser extends NextApiRequest {
  user?: {
    userId: string;
    role: string;
    email: string;
  };
  headers: {
    'x-request-id'?: string;
    'user-agent'?: string;
    'x-forwarded-for'?: string;
  } & NextApiRequest['headers'];
}

// Main Error Handler Class
export declare class ErrorHandler {
  static handle(error: Error, req: RequestWithUser, res: NextApiResponse, next?: Function): void;
  static formatError(error: Error, req: RequestWithUser): ErrorResponse;
  static getErrorDetails(error: Error, isProduction: boolean): ErrorDetails | null;
  static getDocumentationUrl(code: string): string;
  static generateRequestId(): string;
  static logError(error: Error, req: RequestWithUser, errorResponse: ErrorResponse): void;
  static createErrorResponse(code: string, customMessage?: string | null, details?: ErrorDetails | null): APIError;
  static asyncHandler<T = any>(
    fn: (req: NextApiRequest, res: NextApiResponse<T>, next?: Function) => Promise<void>
  ): (req: NextApiRequest, res: NextApiResponse<T>, next?: Function) => void;
}

// Export convenience functions
export declare function createAuthError(code: string, message: string, details?: ErrorDetails | null): AuthError;
export declare function createValidationError(code: string, message: string, details?: ErrorDetails | null): ValidationError;
export declare function createDatabaseError(code: string, message: string, details?: ErrorDetails | null): DatabaseError;
export declare function createServiceError(code: string, message: string, details?: ErrorDetails | null): ServiceError;

export default ErrorHandler;
