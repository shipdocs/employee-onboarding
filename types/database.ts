/**
 * Database Type Definitions
 * Core types representing database tables and records
 */

// ============================================================================
// USER TYPES
// ============================================================================

export type UserRole = 'crew' | 'manager' | 'admin';
export type UserStatus = 'active' | 'inactive' | 'suspended' | 'not_started' | 'in_progress' | 'completed';

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  position?: string;
  vessel_assignment?: string;
  expected_boarding_date?: string;
  contact_phone?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  preferred_language: string;
  status: UserStatus;
  is_active: boolean;
  first_login_at?: string;
  first_login_notification_sent?: boolean;
  login_count: number;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// TRAINING TYPES
// ============================================================================

export type TrainingStatus = 'pending' | 'in_progress' | 'completed' | 'failed';
export type TrainingPhaseStatus = 'draft' | 'published' | 'archived';
export type MediaFileType = 'image' | 'video' | 'document' | 'audio';
export type ContentTemplateType = 'objective' | 'procedure' | 'key_point' | 'overview';

// Enhanced Training Phase with rich content support
export interface TrainingPhase {
  id: string;
  phase_number: number;
  title: string;
  description?: string;
  time_limit: number; // in hours
  items: TrainingPhaseItem[];
  status: TrainingPhaseStatus;
  version: number;
  passing_score?: number;
  media_attachments: MediaAttachment[];
  content_metadata: Record<string, any>;
  approval_notes?: string;
  approved_by?: string;
  approved_at?: string;
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

// Rich content structure for training phase items
export interface TrainingPhaseItem {
  number: string;
  title: string;
  description?: string;
  category: string;
  content?: TrainingItemContent;
}

export interface TrainingItemContent {
  overview?: string;
  objectives?: string[];
  keyPoints?: string[];
  procedures?: string[];
  mediaFiles?: string[]; // References to media file IDs
  additionalResources?: string[];
}

// Media files for training content
export interface TrainingMediaFile {
  id: string;
  phase_id: string;
  file_name: string;
  file_path: string;
  file_type: MediaFileType;
  file_size?: number;
  mime_type?: string;
  alt_text?: string;
  description?: string;
  sort_order: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

// Media attachment reference in phase
export interface MediaAttachment {
  id: string;
  file_name: string;
  file_path: string;
  file_type: MediaFileType;
  alt_text?: string;
  description?: string;
}

// Content templates for reusable blocks
export interface TrainingContentTemplate {
  id: string;
  name: string;
  description?: string;
  template_type: ContentTemplateType;
  content: Record<string, any>;
  category?: string;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface TrainingSession {
  id: string;
  user_id: string;
  phase: number;
  status: TrainingStatus;
  started_at: string;
  completed_at?: string;
  due_date?: string;
  created_at: string;
  updated_at: string;
}

export interface TrainingItem {
  id: string;
  session_id: string;
  phase: number;
  item_number: number;
  title: string;
  type: 'video' | 'document' | 'quiz' | 'form';
  content?: any;
  completed_at?: string;
  created_at: string;
}

export interface TrainingProgress {
  id: string;
  user_id: string;
  phase: number;
  item_number: number;
  completed: boolean;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// QUIZ TYPES
// ============================================================================

export interface QuizResult {
  id: string;
  user_id: string;
  phase: number;
  score: number;
  total_questions: number;
  percentage: number;
  passed: boolean;
  answers?: any;
  completed_at: string;
  created_at: string;
}

export interface QuizReview {
  id: string;
  quiz_result_id: string;
  reviewer_id: string;
  status: 'pending' | 'approved' | 'rejected';
  comments?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// AUTH TYPES
// ============================================================================

export interface MagicLink {
  id: string;
  email: string;
  token: string;
  expires_at: string;
  used: boolean;
  used_at?: string;
  created_at: string;
}

export interface AuthAttempt {
  id: string;
  email: string;
  ip_address?: string;
  user_agent?: string;
  success: boolean;
  failure_reason?: string;
  created_at: string;
}

// ============================================================================
// MANAGER TYPES
// ============================================================================

export interface ManagerPermission {
  id: string;
  manager_id: string;
  permission_key: string;
  permission_value: boolean;
  created_at: string;
  updated_at: string;
}

export type PermissionKey =
  | 'can_add_crew'
  | 'can_edit_crew'
  | 'can_delete_crew'
  | 'can_view_reports'
  | 'can_approve_quizzes'
  | 'can_generate_certificates'
  | 'can_send_emails';

// ============================================================================
// CERTIFICATE TYPES
// ============================================================================

export interface Certificate {
  id: string;
  user_id: string;
  certificate_type: string;
  certificate_number: string;
  issued_date: string;
  expiry_date?: string;
  file_path: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// EMAIL TYPES
// ============================================================================

export interface EmailLog {
  id: string;
  recipient_email: string;
  recipient_name?: string;
  email_type: string;
  subject: string;
  status: 'sent' | 'failed' | 'bounced' | 'opened';
  message_id?: string;
  error?: string;
  metadata?: any;
  sent_at?: string;
  opened_at?: string;
  created_at: string;
}

export interface EmailQueue {
  id: string;
  email_data: any;
  priority: 'high' | 'normal' | 'low';
  status: 'pending' | 'processing' | 'sent' | 'failed' | 'retry';
  attempts: number;
  max_retries: number;
  error?: string;
  sent_at?: string;
  next_retry_at?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// NOTIFICATION TYPES
// ============================================================================

export interface SystemNotification {
  id: string;
  notification_type: string;
  recipient_type: 'admin' | 'managers' | 'user';
  recipient_id?: string;
  subject: string;
  message: string;
  metadata?: any;
  read: boolean;
  read_at?: string;
  sent_at?: string;
  created_at: string;
}

// ============================================================================
// SETTINGS TYPES
// ============================================================================

export interface SystemSetting {
  id: string;
  category: string;
  key: string;
  value: any;
  description?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// HELPER TYPES
// ============================================================================

export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface SortParams {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FilterParams {
  [key: string]: any;
}

export interface QueryOptions extends PaginationParams, SortParams {
  filters?: FilterParams;
}

// ============================================================================
// RESPONSE TYPES
// ============================================================================

export interface DatabaseError {
  code: string;
  message: string;
  details?: any;
}

export interface DatabaseResponse<T> {
  data: T | null;
  error: DatabaseError | null;
  count?: number;
}
