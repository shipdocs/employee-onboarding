/**
 * API-specific Type Definitions
 * Types for API routes, middleware, and request/response handling
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { User, ApiError } from './index';
import { JWTPayload } from '../lib/auth';

// Re-export ApiResponse for convenience
export { ApiResponse } from './index';

// ============================================================================
// EXTENDED API TYPES
// ============================================================================

export interface AuthenticatedRequest extends NextApiRequest {
  user?: JWTPayload;
  correlation_id?: string;
}

export interface TypedApiRequest<T = any> extends NextApiRequest {
  body: T;
  user?: User;
  correlation_id?: string;
}

export interface TypedApiResponse<T = any> extends NextApiResponse {
  json: (body: ApiResponse<T> | ApiError) => void;
}

// ============================================================================
// AUTH API TYPES
// ============================================================================

export interface MagicLinkRequest {
  email: string;
  redirect_url?: string;
}

export interface MagicLinkResponse extends ApiResponse {
  message: string;
  email: string;
}

export interface VerifyTokenRequest {
  token: string;
}

export interface VerifyTokenResponse extends ApiResponse {
  user?: User;
  token?: string;
  expires_at?: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface RefreshTokenResponse extends ApiResponse {
  token?: string;
  expires_at?: string;
}

export interface LoginRequest {
  email: string;
  password?: string;
  token?: string;
}

export interface LoginResponse extends ApiResponse {
  success: boolean;
  token?: string;
  user?: User;
  error?: string;
}

// ============================================================================
// USER MANAGEMENT API TYPES
// ============================================================================

export interface CreateUserRequest {
  email: string;
  role: 'admin' | 'manager' | 'crew';
  first_name?: string;
  last_name?: string;
  phone?: string;
  company?: string;
  position?: string;
}

export interface UpdateUserRequest {
  first_name?: string;
  last_name?: string;
  phone?: string;
  company?: string;
  position?: string;
  status?: 'active' | 'inactive' | 'pending';
}

export interface UserListRequest {
  page?: number;
  limit?: number;
  role?: 'admin' | 'manager' | 'crew';
  status?: 'active' | 'inactive' | 'pending';
  search?: string;
  sort_by?: 'created_at' | 'last_login' | 'email' | 'role';
  sort_order?: 'asc' | 'desc';
}

// ============================================================================
// WORKFLOW API TYPES
// ============================================================================

export interface CreateWorkflowRequest {
  name: string;
  description?: string;
  phase_type: 'onboarding' | 'training' | 'assessment' | 'certification';
  is_required?: boolean;
  estimated_duration_minutes?: number;
}

export interface UpdateWorkflowRequest {
  name?: string;
  description?: string;
  status?: 'draft' | 'active' | 'archived';
  is_required?: boolean;
  estimated_duration_minutes?: number;
  order_index?: number;
}

export interface WorkflowListRequest {
  page?: number;
  limit?: number;
  status?: 'draft' | 'active' | 'archived';
  phase_type?: 'onboarding' | 'training' | 'assessment' | 'certification';
  search?: string;
}

// ============================================================================
// TRAINING API TYPES
// ============================================================================

export interface StartTrainingRequest {
  workflow_id: string;
  user_id?: string; // Optional for managers starting training for crew
}

export interface UpdateTrainingProgressRequest {
  phase_id: string;
  progress: number; // 0-100
  data?: any; // Phase-specific progress data
}

export interface CompletePhaseRequest {
  phase_id: string;
  completion_data?: any;
}

export interface TrainingListRequest {
  page?: number;
  limit?: number;
  user_id?: string;
  workflow_id?: string;
  status?: 'not_started' | 'in_progress' | 'completed' | 'failed';
  date_from?: string;
  date_to?: string;
}

// Enhanced Training Content API Types
export interface CreateTrainingPhaseRequest {
  phase_number: number;
  title: string;
  description?: string;
  time_limit: number;
  items: TrainingPhaseItemRequest[];
  passing_score?: number;
  status?: 'draft' | 'published' | 'archived';
}

export interface UpdateTrainingPhaseRequest {
  title?: string;
  description?: string;
  time_limit?: number;
  items?: TrainingPhaseItemRequest[];
  passing_score?: number;
  status?: 'draft' | 'published' | 'archived';
  approval_notes?: string;
}

export interface TrainingPhaseItemRequest {
  number: string;
  title: string;
  description?: string;
  category: string;
  content?: {
    overview?: string;
    objectives?: string[];
    keyPoints?: string[];
    procedures?: string[];
    mediaFiles?: string[];
    additionalResources?: string[];
  };
}

export interface UploadTrainingMediaRequest {
  phase_id: string;
  file: File;
  file_type: 'image' | 'video' | 'document' | 'audio';
  alt_text?: string;
  description?: string;
  sort_order?: number;
}

export interface ContentMigrationRequest {
  force_overwrite?: boolean;
  backup_existing?: boolean;
}

export interface ContentValidationRequest {
  phase_id: string;
  validate_media?: boolean;
  validate_structure?: boolean;
}

// ============================================================================
// QUIZ API TYPES
// ============================================================================

export interface SubmitQuizAnswerRequest {
  question_id: string;
  answer: string | string[];
  time_spent_seconds?: number;
}

export interface SubmitQuizRequest {
  training_session_id: string;
  answers: {
    question_id: string;
    answer: string | string[];
    time_spent_seconds?: number;
  }[];
  total_time_seconds: number;
}

export interface QuizResultsResponse extends ApiResponse {
  attempt_id: string;
  total_questions: number;
  correct_answers: number;
  percentage_score: number;
  passed: boolean;
  time_spent_seconds: number;
  results: {
    question_id: string;
    question: string;
    user_answer: string | string[];
    correct_answer: string | string[];
    is_correct: boolean;
    points_earned: number;
    explanation?: string;
  }[];
}

// ============================================================================
// FILE UPLOAD API TYPES
// ============================================================================

export interface FileUploadRequest {
  file: File;
  category: 'profile' | 'document' | 'certificate' | 'training_material';
  metadata?: {
    description?: string;
    tags?: string[];
    [key: string]: any;
  };
}

export interface FileUploadResponse extends ApiResponse {
  file_id: string;
  file_url: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  upload_date: string;
}

export interface FileListRequest {
  page?: number;
  limit?: number;
  category?: 'profile' | 'document' | 'certificate' | 'training_material';
  user_id?: string;
  search?: string;
}

// ============================================================================
// CERTIFICATE API TYPES
// ============================================================================

export interface GenerateCertificateRequest {
  training_session_id: string;
  template_id?: string;
  custom_data?: {
    [key: string]: any;
  };
}

export interface CertificateListRequest {
  page?: number;
  limit?: number;
  user_id?: string;
  workflow_id?: string;
  status?: 'pending' | 'issued' | 'revoked' | 'expired';
  date_from?: string;
  date_to?: string;
}

export interface RevokeCertificateRequest {
  certificate_id: string;
  reason: string;
}

// ============================================================================
// NOTIFICATION API TYPES
// ============================================================================

export interface CreateNotificationRequest {
  user_id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  action_url?: string;
}

export interface NotificationListRequest {
  page?: number;
  limit?: number;
  read?: boolean;
  type?: 'info' | 'success' | 'warning' | 'error';
  date_from?: string;
  date_to?: string;
}

export interface MarkNotificationReadRequest {
  notification_ids: string[];
}

// ============================================================================
// SETTINGS API TYPES
// ============================================================================

export interface UpdateSettingsRequest {
  settings: {
    key: string;
    value: any;
  }[];
}

export interface SettingsListRequest {
  category?: string;
  is_public?: boolean;
  search?: string;
}

// ============================================================================
// HEALTH CHECK API TYPES
// ============================================================================

export interface HealthCheckResponse extends ApiResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  database: {
    connected: boolean;
    response_time_ms?: number;
    error?: string;
  };
  storage: {
    connected: boolean;
    response_time_ms?: number;
    error?: string;
  };
  external_services: {
    email: {
      connected: boolean;
      response_time_ms?: number;
      error?: string;
    };
  };
  performance: {
    memory_usage: {
      used: number;
      total: number;
      percentage: number;
    };
    cpu_usage?: number;
  };
}

// ============================================================================
// MIDDLEWARE TYPES
// ============================================================================

export interface MiddlewareContext {
  req: AuthenticatedRequest;
  res: NextApiResponse;
  correlation_id: string;
}

export type MiddlewareFunction = (
  req: AuthenticatedRequest,
  res: NextApiResponse,
  next: () => void
) => void | Promise<void>;

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  max: number; // Maximum requests per window
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

// ============================================================================
// ERROR HANDLING TYPES
// ============================================================================

export interface ApiErrorDetails {
  code: string;
  message: string;
  field?: string;
  value?: any;
}

export interface ValidationError extends ApiError {
  details: ApiErrorDetails[];
}

export interface DatabaseError extends ApiError {
  query?: string;
  parameters?: any[];
}

export interface AuthenticationError extends ApiError {
  reason: 'invalid_token' | 'expired_token' | 'missing_token' | 'invalid_credentials';
}

export interface AuthorizationError extends ApiError {
  required_role?: string;
  user_role?: string;
  resource?: string;
  action?: string;
}

// ============================================================================
// UTILITY API TYPES
// ============================================================================

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RequestMetadata {
  method: HttpMethod;
  url: string;
  user_agent?: string;
  ip_address?: string;
  correlation_id: string;
  timestamp: string;
  user_id?: string;
}

export interface ResponseMetadata {
  status_code: number;
  response_time_ms: number;
  content_length?: number;
  correlation_id: string;
  timestamp: string;
}
