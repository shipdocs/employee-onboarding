-- Database Index Optimization Script
-- Sprint S02 T02: Database Query Optimization & Indexing
-- Created: 2025-06-10

-- ============================================================================
-- PERFORMANCE INDEXES FOR MARITIME ONBOARDING SYSTEM
-- ============================================================================

-- Enable timing for performance measurement
\timing on

-- Start transaction for atomic index creation
BEGIN;

-- ============================================================================
-- 1. USERS TABLE OPTIMIZATION
-- ============================================================================

-- Primary lookup indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email 
ON users(email);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role 
ON users(role);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_status 
ON users(status);

-- Composite indexes for common query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role_status 
ON users(role, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role_active 
ON users(role, is_active);

-- Time-based queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_created_at 
ON users(created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_updated_at 
ON users(updated_at);

-- ============================================================================
-- 2. TRAINING_SESSIONS TABLE OPTIMIZATION
-- ============================================================================

-- Foreign key indexes (critical for joins)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_training_sessions_user_id 
ON training_sessions(user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_training_sessions_workflow_id 
ON training_sessions(workflow_id);

-- Status and phase queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_training_sessions_status 
ON training_sessions(status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_training_sessions_phase 
ON training_sessions(phase);

-- Composite indexes for complex queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_training_sessions_user_status 
ON training_sessions(user_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_training_sessions_user_phase 
ON training_sessions(user_id, phase);

-- Date-based queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_training_sessions_started_at 
ON training_sessions(started_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_training_sessions_completed_at 
ON training_sessions(completed_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_training_sessions_due_date 
ON training_sessions(due_date);

-- ============================================================================
-- 3. TRAINING_ITEMS TABLE OPTIMIZATION
-- ============================================================================

-- Foreign key indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_training_items_session_id 
ON training_items(training_session_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_training_items_user_id 
ON training_items(user_id);

-- Completion tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_training_items_completed 
ON training_items(completed);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_training_items_completed_at 
ON training_items(completed_at);

-- Composite indexes for progress queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_training_items_session_completed 
ON training_items(training_session_id, completed);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_training_items_user_completed 
ON training_items(user_id, completed);

-- ============================================================================
-- 4. QUIZ_RESULTS TABLE OPTIMIZATION
-- ============================================================================

-- Foreign key indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quiz_results_user_id 
ON quiz_results(user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quiz_results_session_id 
ON quiz_results(training_session_id);

-- Phase and status queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quiz_results_phase 
ON quiz_results(phase);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quiz_results_passed 
ON quiz_results(passed);

-- Composite indexes for progress tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quiz_results_user_phase 
ON quiz_results(user_id, phase);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quiz_results_user_passed 
ON quiz_results(user_id, passed);

-- Time-based queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quiz_results_created_at 
ON quiz_results(created_at);

-- Review status for manager queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quiz_results_review_status 
ON quiz_results(review_status);

-- ============================================================================
-- 5. MAGIC_LINKS TABLE OPTIMIZATION
-- ============================================================================

-- Token lookup (most critical)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_magic_links_token 
ON magic_links(token);

-- Email lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_magic_links_email 
ON magic_links(email);

-- Expiration and usage tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_magic_links_expires_at 
ON magic_links(expires_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_magic_links_used 
ON magic_links(used);

-- Composite index for active link validation
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_magic_links_token_valid 
ON magic_links(token, used, expires_at);

-- ============================================================================
-- 6. AUDIT_LOG TABLE OPTIMIZATION
-- ============================================================================

-- User and action tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_user_id 
ON audit_log(user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_action 
ON audit_log(action);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_resource_type 
ON audit_log(resource_type);

-- Time-based queries (most common for audit logs)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_created_at 
ON audit_log(created_at);

-- Composite indexes for filtered queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_user_action 
ON audit_log(user_id, action);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_resource_action 
ON audit_log(resource_type, action);

-- IP address tracking for security
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_ip_address 
ON audit_log(ip_address);

-- ============================================================================
-- 7. EMAIL_NOTIFICATIONS TABLE OPTIMIZATION
-- ============================================================================

-- Recipient tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_email_notifications_recipient 
ON email_notifications(recipient_email);

-- Time-based queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_email_notifications_sent_at 
ON email_notifications(sent_at);

-- Status tracking if column exists
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_email_notifications_status 
-- ON email_notifications(status);

-- ============================================================================
-- 8. MANAGER_PERMISSIONS TABLE OPTIMIZATION
-- ============================================================================

-- Manager lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_manager_permissions_manager_id 
ON manager_permissions(manager_id);

-- Permission key lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_manager_permissions_key 
ON manager_permissions(permission_key);

-- Composite index for permission checks
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_manager_permissions_manager_key 
ON manager_permissions(manager_id, permission_key);

-- ============================================================================
-- 9. SYSTEM_SETTINGS TABLE OPTIMIZATION
-- ============================================================================

-- Category and key lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_system_settings_category 
ON system_settings(category);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_system_settings_key 
ON system_settings(key);

-- Composite unique index for settings lookup
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_system_settings_category_key 
ON system_settings(category, key);

-- ============================================================================
-- 10. TRANSLATION_MEMORY TABLE OPTIMIZATION (if exists)
-- ============================================================================

-- Source text lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_translation_memory_source_text 
ON translation_memory(source_text);

-- Language pair lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_translation_memory_source_lang 
ON translation_memory(source_language);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_translation_memory_target_lang 
ON translation_memory(target_language);

-- Composite index for translation lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_translation_memory_lang_pair 
ON translation_memory(source_language, target_language);

-- Domain and quality filters
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_translation_memory_domain 
ON translation_memory(domain);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_translation_memory_human_reviewed 
ON translation_memory(human_reviewed);

-- Usage tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_translation_memory_usage_count 
ON translation_memory(usage_count);

-- ============================================================================
-- COMMIT TRANSACTION
-- ============================================================================

COMMIT;

-- ============================================================================
-- ANALYZE TABLES FOR UPDATED STATISTICS
-- ============================================================================

ANALYZE users;
ANALYZE training_sessions;
ANALYZE training_items;
ANALYZE quiz_results;
ANALYZE magic_links;
ANALYZE audit_log;
ANALYZE email_notifications;
ANALYZE manager_permissions;
ANALYZE system_settings;
ANALYZE translation_memory;

-- ============================================================================
-- PERFORMANCE VERIFICATION QUERIES
-- ============================================================================

-- Check index usage
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Check table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

\echo 'Database optimization completed successfully!'
\echo 'Indexes created for optimal query performance.'
\echo 'Run EXPLAIN ANALYZE on your queries to verify improvements.'
