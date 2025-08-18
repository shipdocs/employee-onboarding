-- Test: RLS implementation verification
-- Description: Check RLS enabled/forced on critical tables and list policies
-- Usage: run in Supabase SQL editor or psql connected to production DB
-- Non-destructive; returns summaries and potential issues

-- 1) Status of RLS enablement/force on critical tables
WITH critical(table_name) AS (
  SELECT unnest(ARRAY[
    'users',
    'audit_log',
    'quiz_results',
    'workflow_user_access',
    'training_sessions',
    'data_exports'
  ]::text[])
),
status AS (
  SELECT c.relname AS table_name,
         c.relrowsecurity AS rls_enabled,
         c.relforcerowsecurity AS rls_forced
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  JOIN critical k ON k.table_name = c.relname
  WHERE n.nspname = 'public'
)
SELECT * FROM status ORDER BY table_name;

-- 2) Potential issues (should return zero rows)
WITH critical(table_name) AS (
  SELECT unnest(ARRAY[
    'users',
    'audit_log',
    'quiz_results',
    'workflow_user_access',
    'training_sessions',
    'data_exports'
  ]::text[])
),
status AS (
  SELECT c.relname AS table_name,
         c.relrowsecurity AS rls_enabled,
         c.relforcerowsecurity AS rls_forced
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
)
SELECT 'MISSING_TABLE' AS issue, k.table_name
FROM critical k
LEFT JOIN pg_class c ON c.relname = k.table_name AND c.relkind = 'r'
LEFT JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
WHERE c.oid IS NULL
UNION ALL
SELECT 'RLS_DISABLED' AS issue, s.table_name FROM status s
JOIN critical k ON k.table_name = s.table_name
WHERE NOT s.rls_enabled
UNION ALL
SELECT 'RLS_NOT_FORCED' AS issue, s.table_name FROM status s
JOIN critical k ON k.table_name = s.table_name
WHERE NOT s.rls_forced
ORDER BY issue, table_name;

-- 3) Policies for critical tables (reference)
SELECT n.nspname AS schema_name,
       c.relname AS table_name,
       pol.polname AS policy_name,
       pol.polcmd  AS command,
       array_to_string(pol.polroles::regrole[], ',') AS roles,
       pg_get_expr(pol.polqual, pol.polrelid) AS using_expr,
       pg_get_expr(pol.polwithcheck, pol.polrelid) AS with_check_expr
FROM pg_policy pol
JOIN pg_class c ON c.oid = pol.polrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('users','audit_log','quiz_results','workflow_user_access','training_sessions','data_exports')
ORDER BY table_name, policy_name;

