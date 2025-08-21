-- Database Performance Monitoring Script
-- Sprint S02 T02: Database Query Optimization & Indexing
-- Created: 2025-06-10

-- ============================================================================
-- PERFORMANCE MONITORING QUERIES FOR POSTGRESQL/SUPABASE
-- ============================================================================

\echo '============================================================================'
\echo 'DATABASE PERFORMANCE MONITORING REPORT'
\echo '============================================================================'

-- Enable timing for all queries
\timing on

-- ============================================================================
-- 1. SLOW QUERY ANALYSIS
-- ============================================================================

\echo ''
\echo '1. TOP 10 SLOWEST QUERIES (if pg_stat_statements is enabled)'
\echo '============================================================================'

SELECT 
  query,
  calls,
  total_time,
  mean_time,
  rows,
  100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements 
WHERE query NOT LIKE '%pg_stat_statements%'
ORDER BY mean_time DESC 
LIMIT 10;

-- ============================================================================
-- 2. INDEX USAGE ANALYSIS
-- ============================================================================

\echo ''
\echo '2. INDEX USAGE STATISTICS'
\echo '============================================================================'

SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched,
    CASE 
        WHEN idx_scan = 0 THEN 'UNUSED'
        WHEN idx_scan < 100 THEN 'LOW USAGE'
        WHEN idx_scan < 1000 THEN 'MODERATE USAGE'
        ELSE 'HIGH USAGE'
    END as usage_level
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- ============================================================================
-- 3. TABLE SIZE AND BLOAT ANALYSIS
-- ============================================================================

\echo ''
\echo '3. TABLE SIZES AND STATISTICS'
\echo '============================================================================'

SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as index_size,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes,
    n_live_tup as live_tuples,
    n_dead_tup as dead_tuples,
    CASE 
        WHEN n_live_tup > 0 THEN round(100.0 * n_dead_tup / (n_live_tup + n_dead_tup), 2)
        ELSE 0 
    END as dead_tuple_percent
FROM pg_tables t
JOIN pg_stat_user_tables s ON t.tablename = s.relname AND t.schemaname = s.schemaname
WHERE t.schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- ============================================================================
-- 4. QUERY PERFORMANCE BY TABLE
-- ============================================================================

\echo ''
\echo '4. TABLE ACCESS PATTERNS'
\echo '============================================================================'

SELECT 
    schemaname,
    relname as table_name,
    seq_scan as sequential_scans,
    seq_tup_read as seq_tuples_read,
    idx_scan as index_scans,
    idx_tup_fetch as idx_tuples_fetched,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes,
    CASE 
        WHEN seq_scan + idx_scan > 0 THEN 
            round(100.0 * idx_scan / (seq_scan + idx_scan), 2)
        ELSE 0 
    END as index_usage_percent
FROM pg_stat_user_tables 
WHERE schemaname = 'public'
ORDER BY seq_scan + idx_scan DESC;

-- ============================================================================
-- 5. CACHE HIT RATIOS
-- ============================================================================

\echo ''
\echo '5. CACHE HIT RATIOS'
\echo '============================================================================'

-- Overall cache hit ratio
SELECT 
    'Database Cache Hit Ratio' as metric,
    round(100.0 * sum(blks_hit) / (sum(blks_hit) + sum(blks_read)), 2) as percentage
FROM pg_stat_database;

-- Table-level cache hit ratios
SELECT 
    schemaname,
    relname as table_name,
    CASE 
        WHEN heap_blks_hit + heap_blks_read > 0 THEN
            round(100.0 * heap_blks_hit / (heap_blks_hit + heap_blks_read), 2)
        ELSE 0 
    END as cache_hit_ratio
FROM pg_statio_user_tables 
WHERE schemaname = 'public'
ORDER BY heap_blks_hit + heap_blks_read DESC;

-- ============================================================================
-- 6. CONNECTION AND ACTIVITY ANALYSIS
-- ============================================================================

\echo ''
\echo '6. DATABASE CONNECTIONS AND ACTIVITY'
\echo '============================================================================'

-- Current connections
SELECT 
    state,
    count(*) as connection_count
FROM pg_stat_activity 
WHERE datname = current_database()
GROUP BY state
ORDER BY connection_count DESC;

-- Long running queries
SELECT 
    pid,
    now() - pg_stat_activity.query_start AS duration,
    query,
    state
FROM pg_stat_activity 
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes'
AND state != 'idle';

-- ============================================================================
-- 7. SPECIFIC MARITIME ONBOARDING SYSTEM METRICS
-- ============================================================================

\echo ''
\echo '7. MARITIME ONBOARDING SYSTEM SPECIFIC METRICS'
\echo '============================================================================'

-- User distribution
SELECT 
    role,
    status,
    count(*) as user_count
FROM users 
GROUP BY role, status
ORDER BY role, status;

-- Training session status distribution
SELECT 
    status,
    count(*) as session_count,
    round(avg(EXTRACT(EPOCH FROM (completed_at - started_at))/3600), 2) as avg_duration_hours
FROM training_sessions 
WHERE started_at IS NOT NULL
GROUP BY status
ORDER BY session_count DESC;

-- Quiz performance metrics
SELECT 
    phase,
    count(*) as total_attempts,
    count(*) FILTER (WHERE passed = true) as passed_attempts,
    round(100.0 * count(*) FILTER (WHERE passed = true) / count(*), 2) as pass_rate,
    round(avg(score), 2) as avg_score
FROM quiz_results 
GROUP BY phase
ORDER BY phase;

-- Recent activity (last 24 hours)
SELECT 
    'New Users' as metric,
    count(*) as count
FROM users 
WHERE created_at > now() - interval '24 hours'

UNION ALL

SELECT 
    'Completed Training Sessions' as metric,
    count(*) as count
FROM training_sessions 
WHERE completed_at > now() - interval '24 hours'

UNION ALL

SELECT 
    'Quiz Attempts' as metric,
    count(*) as count
FROM quiz_results 
WHERE created_at > now() - interval '24 hours';

-- ============================================================================
-- 8. RECOMMENDATIONS
-- ============================================================================

\echo ''
\echo '8. PERFORMANCE RECOMMENDATIONS'
\echo '============================================================================'

-- Tables that might need VACUUM
SELECT 
    schemaname,
    relname as table_name,
    n_dead_tup as dead_tuples,
    n_live_tup as live_tuples,
    CASE 
        WHEN n_live_tup > 0 THEN round(100.0 * n_dead_tup / (n_live_tup + n_dead_tup), 2)
        ELSE 0 
    END as dead_tuple_percent,
    CASE 
        WHEN n_live_tup > 0 AND (100.0 * n_dead_tup / (n_live_tup + n_dead_tup)) > 20 THEN 'NEEDS VACUUM'
        WHEN n_live_tup > 0 AND (100.0 * n_dead_tup / (n_live_tup + n_dead_tup)) > 10 THEN 'CONSIDER VACUUM'
        ELSE 'OK'
    END as recommendation
FROM pg_stat_user_tables 
WHERE schemaname = 'public'
AND n_dead_tup > 100
ORDER BY dead_tuple_percent DESC;

-- Unused indexes (potential candidates for removal)
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as scans,
    pg_size_pretty(pg_relation_size(indexrelid)) as size,
    'Consider removing if consistently unused' as recommendation
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
AND idx_scan < 10
AND pg_relation_size(indexrelid) > 1024 * 1024  -- Larger than 1MB
ORDER BY pg_relation_size(indexrelid) DESC;

-- Tables with high sequential scan ratio
SELECT 
    schemaname,
    relname as table_name,
    seq_scan,
    idx_scan,
    CASE 
        WHEN seq_scan + idx_scan > 0 THEN 
            round(100.0 * seq_scan / (seq_scan + idx_scan), 2)
        ELSE 0 
    END as seq_scan_percent,
    'Consider adding indexes for frequently queried columns' as recommendation
FROM pg_stat_user_tables 
WHERE schemaname = 'public'
AND seq_scan > idx_scan
AND seq_scan > 100
ORDER BY seq_scan_percent DESC;

\echo ''
\echo '============================================================================'
\echo 'PERFORMANCE MONITORING REPORT COMPLETED'
\echo '============================================================================'
\echo 'Review the results above and take action on recommendations.'
\echo 'Run this script regularly to monitor database performance.'
\echo '============================================================================'
