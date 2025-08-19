-- =====================================================
-- MARITIME ONBOARDING SYSTEM - PERFORMANCE ANALYSIS
-- =====================================================
-- Performance analysis and optimization queries for the Maritime Onboarding System
-- Run these queries to identify bottlenecks and optimization opportunities

-- =====================================================
-- SECTION 1: TABLE SIZE AND STATISTICS
-- =====================================================

-- Get table sizes and row counts
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS indexes_size,
    n_live_tup AS row_count,
    n_dead_tup AS dead_rows,
    ROUND((n_dead_tup::numeric / NULLIF(n_live_tup, 0)) * 100, 2) AS dead_row_percent
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- =====================================================
-- SECTION 2: MISSING INDEXES
-- =====================================================

-- Identify missing indexes for foreign keys
WITH foreign_keys AS (
    SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
),
indexed_columns AS (
    SELECT
        t.tablename AS table_name,
        a.attname AS column_name
    FROM pg_class c
    JOIN pg_index i ON c.oid = i.indrelid
    JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = ANY(i.indkey)
    JOIN pg_tables t ON c.relname = t.tablename
    WHERE t.schemaname = 'public'
)
SELECT 
    fk.table_name,
    fk.column_name,
    fk.foreign_table_name,
    'CREATE INDEX idx_' || fk.table_name || '_' || fk.column_name || 
    ' ON ' || fk.table_name || '(' || fk.column_name || ');' AS suggested_index
FROM foreign_keys fk
LEFT JOIN indexed_columns ic
    ON fk.table_name = ic.table_name 
    AND fk.column_name = ic.column_name
WHERE ic.column_name IS NULL
ORDER BY fk.table_name, fk.column_name;

-- =====================================================
-- SECTION 3: INDEX USAGE STATISTICS
-- =====================================================

-- Check index usage and identify unused indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan AS index_scans,
    idx_tup_read AS tuples_read,
    idx_tup_fetch AS tuples_fetched,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
    CASE 
        WHEN idx_scan = 0 THEN 'UNUSED - Consider dropping'
        WHEN idx_scan < 100 THEN 'RARELY USED'
        ELSE 'ACTIVE'
    END AS status
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan ASC, pg_relation_size(indexrelid) DESC;

-- =====================================================
-- SECTION 4: SLOW QUERIES (Requires pg_stat_statements)
-- =====================================================

-- Note: This requires pg_stat_statements extension
-- CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Find slowest queries
SELECT 
    round(total_exec_time::numeric, 2) AS total_time_ms,
    calls,
    round(mean_exec_time::numeric, 2) AS mean_time_ms,
    round((100 * total_exec_time / sum(total_exec_time) OVER ())::numeric, 2) AS percentage,
    substr(query, 1, 100) AS query_preview
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat_statements%'
ORDER BY mean_exec_time DESC
LIMIT 20;

-- =====================================================
-- SECTION 5: QUERY OPTIMIZATION RECOMMENDATIONS
-- =====================================================

-- High-impact indexes for common query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_training_sessions_user_status_phase 
ON training_sessions(user_id, status, phase_number) 
WHERE status IN ('in_progress', 'completed');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quiz_results_user_phase_passed 
ON quiz_results(user_id, phase_number, passed) 
WHERE passed = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_created_at_desc 
ON audit_log(created_at DESC) 
WHERE created_at > NOW() - INTERVAL '30 days';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role_active 
ON users(role, is_active) 
WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_training_items_session_completed 
ON training_items(session_id, completed) 
WHERE completed = false;

-- =====================================================
-- SECTION 6: RLS POLICY ANALYSIS
-- =====================================================

-- Check RLS policy overhead
WITH rls_tables AS (
    SELECT 
        schemaname,
        tablename,
        rowsecurity
    FROM pg_tables
    WHERE schemaname = 'public'
        AND rowsecurity = true
)
SELECT 
    rt.tablename,
    COUNT(p.policyname) AS policy_count,
    STRING_AGG(p.policyname, ', ') AS policies
FROM rls_tables rt
LEFT JOIN pg_policies p ON rt.tablename = p.tablename
GROUP BY rt.tablename
ORDER BY policy_count DESC;

-- =====================================================
-- SECTION 7: CONNECTION POOL MONITORING
-- =====================================================

-- Monitor active connections
SELECT 
    datname,
    usename,
    application_name,
    client_addr,
    state,
    COUNT(*) AS connection_count,
    MAX(backend_start) AS oldest_connection,
    MIN(backend_start) AS newest_connection
FROM pg_stat_activity
WHERE datname = current_database()
GROUP BY datname, usename, application_name, client_addr, state
ORDER BY connection_count DESC;

-- =====================================================
-- SECTION 8: VACUUM AND MAINTENANCE STATUS
-- =====================================================

-- Check when tables were last vacuumed/analyzed
SELECT 
    schemaname,
    tablename,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze,
    vacuum_count,
    autovacuum_count,
    analyze_count,
    autoanalyze_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY GREATEST(
    COALESCE(last_vacuum, '1900-01-01'::timestamp),
    COALESCE(last_autovacuum, '1900-01-01'::timestamp)
) ASC;

-- =====================================================
-- SECTION 9: PERFORMANCE BOTTLENECK QUERIES
-- =====================================================

-- Dashboard statistics optimization
CREATE OR REPLACE FUNCTION get_manager_dashboard_stats(manager_user_id BIGINT)
RETURNS TABLE (
    total_crew INTEGER,
    active_crew INTEGER,
    completed_crew INTEGER,
    pending_reviews INTEGER,
    avg_completion_time INTERVAL
) AS $$
BEGIN
    RETURN QUERY
    WITH crew_stats AS (
        SELECT 
            u.id,
            u.status,
            ts.status AS training_status,
            ts.completed_at,
            ts.started_at
        FROM users u
        LEFT JOIN training_sessions ts ON u.id = ts.user_id
        WHERE u.role = 'crew'
            AND EXISTS (
                SELECT 1 FROM managers m 
                WHERE m.user_id = manager_user_id
            )
    )
    SELECT 
        COUNT(DISTINCT id)::INTEGER AS total_crew,
        COUNT(DISTINCT CASE WHEN status = 'active' THEN id END)::INTEGER AS active_crew,
        COUNT(DISTINCT CASE WHEN training_status = 'completed' THEN id END)::INTEGER AS completed_crew,
        (SELECT COUNT(*)::INTEGER 
         FROM quiz_results qr 
         WHERE qr.review_required = true 
            AND qr.review_status = 'pending'
            AND EXISTS (
                SELECT 1 FROM users u2 
                WHERE u2.id = qr.user_id 
                    AND u2.role = 'crew'
            )
        ) AS pending_reviews,
        AVG(completed_at - started_at) AS avg_completion_time
    FROM crew_stats;
END;
$$ LANGUAGE plpgsql STABLE;

-- Training progress aggregation optimization
CREATE OR REPLACE FUNCTION get_training_progress_summary(user_id_param BIGINT)
RETURNS TABLE (
    phase_number INTEGER,
    phase_status TEXT,
    items_completed INTEGER,
    total_items INTEGER,
    quiz_passed BOOLEAN,
    quiz_score NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tp.phase_number,
        ts.status AS phase_status,
        COUNT(CASE WHEN ti.completed = true THEN 1 END)::INTEGER AS items_completed,
        COUNT(ti.id)::INTEGER AS total_items,
        qr.passed AS quiz_passed,
        qr.score AS quiz_score
    FROM training_phases tp
    LEFT JOIN training_sessions ts ON tp.phase_number = ts.phase_number 
        AND ts.user_id = user_id_param
    LEFT JOIN training_items ti ON ts.id = ti.session_id
    LEFT JOIN quiz_results qr ON tp.phase_number = qr.phase_number 
        AND qr.user_id = user_id_param
        AND qr.id = (
            SELECT id FROM quiz_results 
            WHERE user_id = user_id_param 
                AND phase_number = tp.phase_number 
            ORDER BY created_at DESC 
            LIMIT 1
        )
    WHERE tp.is_active = true
    GROUP BY tp.phase_number, ts.status, qr.passed, qr.score
    ORDER BY tp.phase_number;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- SECTION 10: MONITORING VIEWS
-- =====================================================

-- Create monitoring view for query performance
CREATE OR REPLACE VIEW v_performance_monitoring AS
SELECT 
    'Table Sizes' AS metric_category,
    tablename AS metric_name,
    pg_size_pretty(pg_total_relation_size('public.'||tablename)) AS metric_value,
    NOW() AS measured_at
FROM pg_tables
WHERE schemaname = 'public'

UNION ALL

SELECT 
    'Active Connections' AS metric_category,
    'Total Connections' AS metric_name,
    COUNT(*)::TEXT AS metric_value,
    NOW() AS measured_at
FROM pg_stat_activity
WHERE datname = current_database()

UNION ALL

SELECT 
    'RLS Enabled Tables' AS metric_category,
    'Total Tables with RLS' AS metric_name,
    COUNT(*)::TEXT AS metric_value,
    NOW() AS measured_at
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = true;

-- =====================================================
-- SECTION 11: CLEANUP AND MAINTENANCE
-- =====================================================

-- Identify and clean up dead tuples
CREATE OR REPLACE FUNCTION cleanup_dead_tuples()
RETURNS TABLE (
    table_name TEXT,
    dead_tuples BIGINT,
    action_taken TEXT
) AS $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN 
        SELECT 
            schemaname || '.' || tablename AS full_table_name,
            n_dead_tup
        FROM pg_stat_user_tables
        WHERE schemaname = 'public'
            AND n_dead_tup > 1000
            AND (n_dead_tup::float / NULLIF(n_live_tup, 1)) > 0.1
    LOOP
        EXECUTE 'VACUUM ANALYZE ' || rec.full_table_name;
        RETURN QUERY SELECT 
            rec.full_table_name::TEXT,
            rec.n_dead_tup,
            'VACUUM ANALYZE executed'::TEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SECTION 12: BENCHMARK QUERIES
-- =====================================================

-- Benchmark common operations
CREATE OR REPLACE FUNCTION benchmark_queries()
RETURNS TABLE (
    query_name TEXT,
    execution_time INTERVAL,
    row_count INTEGER
) AS $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    rec_count INTEGER;
BEGIN
    -- Benchmark 1: User lookup
    start_time := clock_timestamp();
    SELECT COUNT(*) INTO rec_count FROM users WHERE role = 'crew' AND is_active = true;
    end_time := clock_timestamp();
    RETURN QUERY SELECT 'Active Crew Lookup'::TEXT, end_time - start_time, rec_count;
    
    -- Benchmark 2: Training Progress Join
    start_time := clock_timestamp();
    SELECT COUNT(*) INTO rec_count 
    FROM training_sessions ts
    JOIN training_items ti ON ts.id = ti.session_id
    WHERE ts.status = 'in_progress';
    end_time := clock_timestamp();
    RETURN QUERY SELECT 'Training Progress Join'::TEXT, end_time - start_time, rec_count;
    
    -- Benchmark 3: Audit Log Search
    start_time := clock_timestamp();
    SELECT COUNT(*) INTO rec_count 
    FROM audit_log 
    WHERE created_at > NOW() - INTERVAL '7 days'
        AND action IN ('login', 'logout', 'password_change');
    end_time := clock_timestamp();
    RETURN QUERY SELECT 'Recent Audit Log Search'::TEXT, end_time - start_time, rec_count;
    
    -- Benchmark 4: Quiz Results Aggregation
    start_time := clock_timestamp();
    SELECT COUNT(*) INTO rec_count 
    FROM (
        SELECT user_id, AVG(score) as avg_score
        FROM quiz_results
        WHERE created_at > NOW() - INTERVAL '30 days'
        GROUP BY user_id
    ) AS quiz_agg;
    end_time := clock_timestamp();
    RETURN QUERY SELECT 'Quiz Results Aggregation'::TEXT, end_time - start_time, rec_count;
END;
$$ LANGUAGE plpgsql;

-- Run the benchmark
-- SELECT * FROM benchmark_queries();