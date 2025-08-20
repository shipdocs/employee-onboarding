/**
 * Type declarations for unifiedEmailService.js
 */

import { User } from '../types/database';

export interface EmailData {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
  logType: string;
  userId?: string | null;
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

export interface SendEmailOptions {
  immediate?: boolean;
  priority?: 'high' | 'normal' | 'low';
  maxRetries?: number;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  queued?: boolean;
  queueId?: string;
  error?: string;
  message?: string;
}

export class UnifiedEmailService {
  /**
   * Send email with automatic retry on failure
   */
  sendEmailWithRetry(emailData: EmailData, options?: SendEmailOptions): Promise<EmailResult>;

  /**
   * Send manager magic link email
   */
  sendManagerMagicLinkEmail(userId: string, token: string): Promise<EmailResult>;

  /**
   * Send crew magic link email
   */
  sendCrewMagicLinkEmail(userId: string, token: string): Promise<EmailResult>;

  /**
   * Send safety management email with PDF attachment
   */
  sendSafetyManagementEmail(crewId: string): Promise<EmailResult>;

  /**
   * Send onboarding start email
   */
  sendOnboardingStartEmail(crewId: string): Promise<EmailResult>;

  /**
   * Send completion certificate email
   */
  sendCompletionCertificateEmail(userId: string, certificatePath: string): Promise<{
    userResult: EmailResult;
    hrResult: EmailResult;
  }>;

  /**
   * Send manager welcome email
   */
  sendManagerWelcomeEmail(manager: User, password: string, language?: string): Promise<EmailResult>;

  /**
   * Send manager welcome email with token
   */
  sendManagerWelcomeEmailWithToken(manager: User, password: string, token: string, language?: string): Promise<EmailResult>;

  /**
   * Send phase start email
   */
  sendPhaseStartEmail(userId: string, phase: number): Promise<EmailResult>;

  /**
   * Send phase completion email
   */
  sendPhaseCompletionEmail(userId: string, phase: number): Promise<EmailResult>;

  /**
   * Send progress reminder email
   */
  sendProgressReminder(user: User, phase: number, dueDate: string, reminderType?: string): Promise<EmailResult>;

  /**
   * Send form reminder email
   */
  sendFormReminder(user: User): Promise<EmailResult>;
}

export const unifiedEmailService: UnifiedEmailService;
export default unifiedEmailService;
