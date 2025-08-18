/**
 * Core Type Definitions for Maritime Onboarding System
 * Centralized type definitions for database models, API responses, and common interfaces
 */

// ============================================================================
// USER TYPES
// ============================================================================

export type UserRole = 'admin' | 'manager' | 'crew';
export type UserStatus = 'active' | 'inactive' | 'pending';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  first_name?: string;
  last_name?: string;
  phone?: string;
  company?: string;
  position?: string;
  created_at: string;
  updated_at: string;
  last_login?: string;
  first_login_completed?: boolean;
  account_locked?: boolean;
  failed_login_attempts?: number;
  last_failed_login?: string;
}

export interface UserProfile extends User {
  full_name: string;
  initials: string;
}

// ============================================================================
// WORKFLOW TYPES
// ============================================================================

export type WorkflowStatus = 'draft' | 'active' | 'archived';
export type WorkflowPhaseType = 'onboarding' | 'training' | 'assessment' | 'certification';

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  status: WorkflowStatus;
  phase_type: WorkflowPhaseType;
  order_index: number;
  is_required: boolean;
  estimated_duration_minutes?: number;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface WorkflowPhase {
  id: string;
  workflow_id: string;
  name: string;
  description?: string;
  order_index: number;
  is_required: boolean;
  estimated_duration_minutes?: number;
  content?: any; // JSON content
  created_at: string;
  updated_at: string;
}

// ============================================================================
// TRAINING SESSION TYPES
// ============================================================================

export type TrainingSessionStatus = 'not_started' | 'in_progress' | 'completed' | 'failed';

export interface TrainingSession {
  id: string;
  user_id: string;
  workflow_id: string;
  status: TrainingSessionStatus;
  progress: number; // 0-100
  current_phase_id?: string;
  started_at?: string;
  completed_at?: string;
  failed_at?: string;
  failure_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface TrainingProgress {
  session_id: string;
  phase_id: string;
  status: TrainingSessionStatus;
  progress: number;
  started_at?: string;
  completed_at?: string;
  data?: any; // JSON data for phase-specific progress
  created_at: string;
  updated_at: string;
}

// ============================================================================
// QUIZ TYPES
// ============================================================================

export type QuestionType = 'multiple_choice' | 'yes_no' | 'fill_in_gaps' | 'drag_order' | 'matching' | 'file_upload';

export interface QuizQuestion {
  id: string;
  type: QuestionType;
  question: string;
  options?: string[]; // For multiple choice, matching, etc.
  correct_answer?: string | string[];
  explanation?: string;
  points: number;
  order_index: number;
  metadata?: any; // JSON for question-specific data
}

export interface QuizResult {
  id: string;
  user_id: string;
  training_session_id: string;
  question_id: string;
  user_answer: string | string[];
  is_correct: boolean;
  points_earned: number;
  time_spent_seconds?: number;
  created_at: string;
}

export interface QuizAttempt {
  id: string;
  user_id: string;
  training_session_id: string;
  total_questions: number;
  correct_answers: number;
  total_points: number;
  points_earned: number;
  percentage_score: number;
  passed: boolean;
  time_spent_seconds: number;
  started_at: string;
  completed_at?: string;
}

// ============================================================================
// CERTIFICATE TYPES
// ============================================================================

export type CertificateStatus = 'pending' | 'issued' | 'revoked' | 'expired';

export interface Certificate {
  id: string;
  user_id: string;
  workflow_id: string;
  training_session_id: string;
  certificate_number: string;
  status: CertificateStatus;
  issued_at?: string;
  expires_at?: string;
  revoked_at?: string;
  revocation_reason?: string;
  pdf_url?: string;
  metadata?: any; // JSON for certificate-specific data
  created_at: string;
  updated_at: string;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  correlation_id?: string;
}

export interface ApiError {
  error: string;
  message?: string;
  code?: string;
  correlation_id?: string;
  details?: any;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

// ============================================================================
// AUTH TYPES
// ============================================================================

export interface LoginRequest {
  email: string;
  password?: string;
}

export interface LoginResponse extends ApiResponse {
  token?: string;
  user?: User;
  expires_at?: string;
}

export interface AuthContext {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

// ============================================================================
// FORM TYPES
// ============================================================================

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'select' | 'textarea' | 'checkbox' | 'file';
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
}

export interface FormData {
  [key: string]: any;
}

// ============================================================================
// NOTIFICATION TYPES
// ============================================================================

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  action_url?: string;
  created_at: string;
  read_at?: string;
}

// ============================================================================
// SETTINGS TYPES
// ============================================================================

export interface ApplicationSettings {
  id: string;
  key: string;
  value: any;
  description?: string;
  category: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmailSettings {
  smtp_host: string;
  smtp_port: number;
  smtp_secure: boolean;
  smtp_user: string;
  smtp_password: string;
  from_email: string;
  from_name: string;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type Nullable<T> = T | null;
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Database timestamp fields
export interface TimestampFields {
  created_at: string;
  updated_at: string;
}

// Common ID field
export interface WithId {
  id: string;
}

// Audit fields
export interface AuditFields extends TimestampFields {
  created_by?: string;
  updated_by?: string;
}

// ============================================================================
// COMPONENT PROP TYPES
// ============================================================================

export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface ButtonProps extends BaseComponentProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

export interface ModalProps extends BaseComponentProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export interface ErrorInfo {
  error: Error;
  errorInfo: React.ErrorInfo;
  timestamp: string;
  url: string;
  userAgent: string;
  userId?: string;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
  errorId?: string;
}
