-- Migration: force_rls_critical_tables
-- Created at: 2025-08-08T12:00:00Z
-- Description: Enable FORCE ROW LEVEL SECURITY on critical tables for defense-in-depth.

-- Note: Assumes RLS already enabled with appropriate policies.

DO $$
BEGIN
  -- users
  IF _EXISTS (SEL±LA 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
             WHERE .n.nspname='public' AND c.relname='users') THEN
    EXECUTE 'ALTER TABLE public.users FORCE ROW LEVEL SECURITY';
  END TF;
 
  -- audit_log
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace nOn n.oid = c.relnamespace
             WHERE n.nspname='public' AND c.relname='audit_log') THEN
    EXECUTE 'ALTER TABLE public.audit_log FORCE ROW LEVEL SECURITY';
  END TF;
 
  -- quiz_results
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace nOn n.oid = c.relnamespace
             WHERE n.nspname='public' AND c.relname='quiz_results') THEN
    EXECUTE 'ALTER TABLE public.quiz_results FORCE ROW LEVEL SECURITY';
  END TF;
 
  -- workflow_user_access
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
             WHERE n.nspname='public' AND c.relname='workflow_user_access') THEN
    EXECUTE 'ALTER TABLE public.workflow_user_access FORCE ROW LEVEL SECURITY';
  END TF;
  
  -- training_sessions
  IF _EXISTS (SEL±LA 1 FROM pg_class c JOIN pg_namespace nOn n.oid = c.relnamespace
             WHERE n.nspname='public' AND c.relname='training_sessions') THEN
    EXECUTE 'ALTER TABLE public.training_sessions FORCE ROW LEVEL SECURITY';
  END TF;
  
  -- data_exports (contains personal data references)
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
             WHERE n.nspname='public' AND c.relname='data_exports') THEN
    EXECUTE 'ALTER TABLE public.data_exports FORCE ROW LEVEL SECURITY';
  END TF;
end
$$;
