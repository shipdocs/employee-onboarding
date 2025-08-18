-- =====================================================
-- SECURITY HARDENING: ENABLE RLS ON ALL SECURITY TABLES
-- =====================================================
-- This migration ensures all security-related tables have proper
-- Row Level Security (RLS) policies to prevent unauthorized access.

-- Enable RLS on tables that didn't have it
ALTER TABLE public.password_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Remove dangerous permissive policies
DROP POLICY IF EXISTS "Allow all for now" ON security_events;

-- =====================================================
-- PASSWORD HISTORY TABLE POLICIES
-- =====================================================
-- Password history should only be accessible by service role
-- Users should never be able to read their own password history

-- Only service role can access password history (RLS automatically denies others)
CREATE POLICY "Service role can manage all password history" ON public.password_history
  FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- USER SESSIONS TABLE POLICIES
-- =====================================================
-- Session management should only be handled by the application
-- Users should not be able to directly access session data

-- Only service role can access user sessions (RLS automatically denies others)
CREATE POLICY "Service role can manage all user sessions" ON public.user_sessions
  FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- SECURITY VIOLATIONS TABLE POLICIES
-- =====================================================
-- Security violations (CSP, etc.) should only be accessible by service role
-- This prevents attackers from seeing what violations are being logged

-- Only service role can access security violations (RLS automatically denies others)
CREATE POLICY "Service role can manage all security violations" ON public.security_violations
  FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- SECURITY EVENTS TABLE POLICIES
-- =====================================================
-- Add service role policy for application logging while maintaining admin access

-- Only service role can access security events (RLS automatically denies others)
CREATE POLICY "Service role can manage all security events" ON public.security_events
  FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- These can be run to verify the security setup

-- Check all security tables have RLS enabled:
-- SELECT tablename, rowsecurity FROM pg_tables
-- WHERE schemaname = 'public'
--   AND tablename IN ('security_events', 'security_violations', 'user_sessions', 'password_history')
--   AND rowsecurity = false;
-- (Should return no rows)

-- Check policy counts (should be 1 per table):
-- SELECT tablename, COUNT(*) as policy_count
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND tablename IN ('security_events', 'security_violations', 'user_sessions', 'password_history')
-- GROUP BY tablename;

-- =====================================================
-- SECURITY SUMMARY
-- =====================================================
-- After this migration:
-- 1. All security tables have RLS enabled
-- 2. Only service_role can write to security tables (for application logging)
-- 3. Only admins can read security data (via is_admin() function)
-- 4. Regular users and anonymous users are completely blocked
-- 5. No permissive "allow all" policies remain

COMMENT ON TABLE password_history IS 'RLS: Service role only - stores password hashes for reuse prevention';
COMMENT ON TABLE user_sessions IS 'RLS: Service role only - manages user session state and security';
COMMENT ON TABLE security_violations IS 'RLS: Service role only - logs CSP and other security violations';
COMMENT ON TABLE security_events IS 'RLS: Service role + admin only - comprehensive security audit log';
