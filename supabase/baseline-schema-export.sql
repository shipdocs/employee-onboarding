-- =====================================================
-- MARITIME ONBOARDING DATABASE BASELINE SCHEMA
-- Exported: 2024-12-03
-- Project: maritime-onboarding-fresh (ocqnnyxnqaedarcohywe)
-- Purpose: Clean slate baseline for new migration system
-- =====================================================

-- This file represents the current working state of the database
-- All future migrations will build upon this baseline

-- TABLES FOUND IN CURRENT DATABASE:
-- =====================================================
-- Core System Tables:
-- - users (user management)
-- - managers (manager roles)
-- - manager_permissions (role permissions)
-- - system_settings (configuration)
-- - system_notifications (notifications)
-- - feature_flags (feature toggles)
-- - feature_flag_usage (usage tracking)

-- Authentication & Security:
-- - magic_links (passwordless auth)
-- - token_blacklist (security)
-- - audit_log (security audit)

-- Training & Content:
-- - training_items (training content)
-- - training_content_templates (content templates)
-- - training_media_files (media assets)
-- - training_sessions (user sessions)
-- - training_phases (training structure)
-- - training_phase_history (phase tracking)
-- - content_media (media management)
-- - content_versions (version control)

-- Workflows:
-- - workflows (workflow definitions)
-- - workflow_phases (workflow structure)
-- - workflow_phase_items (phase content)
-- - workflow_instances (user workflows)
-- - workflow_progress (progress tracking)
-- - workflow_translations (i18n)
-- - workflow_pdf_templates (PDF generation)

-- Quizzes & Assessment:
-- - quiz_content (quiz questions)
-- - quiz_content_multilingual (i18n quiz content)
-- - quiz_answer_options_multilingual (i18n answers)
-- - quiz_translations (quiz i18n)
-- - quiz_results (user results)
-- - quiz_history (attempt history)
-- - quiz_randomization_sessions (randomization)

-- Forms & Documents:
-- - forms (form definitions)
-- - form_templates (form templates)
-- - form_categories (categorization)
-- - form_rules (validation rules)
-- - pdf_templates (PDF generation)
-- - certificates (certification)

-- Crew Management:
-- - crew_assignments (crew assignments)

-- Onboarding:
-- - onboarding_progress (progress tracking)
-- - onboarding_analytics (analytics)

-- Internationalization:
-- - maritime_terminology (maritime terms)
-- - translation_memory (translation cache)
-- - translation_activity (translation tracking)

-- File Management:
-- - file_uploads (file handling)

-- Monitoring & Logging:
-- - api_logs (API monitoring)
-- - email_logs (email tracking)
-- - email_notifications (email queue)
-- - error_logs (error tracking)
-- - performance_metrics (performance data)
-- - performance_baselines (performance baselines)
-- - performance_alerts (performance monitoring)
-- - migration_logs (migration tracking)

-- Database Views:
-- - onboarding_overview (progress overview)
-- - quiz_content_detailed (detailed quiz view)
-- - workflow_items_with_training_content (workflow content view)

-- IMPORTANT FUNCTIONS FOUND:
-- =====================================================
-- - update_updated_at_column() - Auto-update timestamps
-- - cleanup_expired_blacklisted_tokens() - Security cleanup
-- - update_crew_assignments_updated_at() - Crew timestamp updates
-- - get_current_user_role() - JWT role extraction
-- - get_current_user_id() - JWT user ID extraction

-- MIGRATION STRATEGY:
-- =====================================================
-- 1. This baseline represents the current working state
-- 2. All migration chaos (80+ files) will be archived
-- 3. Future migrations will be numbered sequentially from this point
-- 4. No data loss - current database continues to work
-- 5. Clean migration history going forward

-- NEXT STEPS:
-- =====================================================
-- 1. Archive all existing migration folders
-- 2. Create new /supabase/migrations/ structure
-- 3. Import this baseline as migration 001
-- 4. Reset Supabase migration tracking
-- 5. Continue with clean migrations from this point

-- STATUS: READY FOR CLEAN SLATE IMPLEMENTATION
