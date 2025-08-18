-- Migration: Ensure Audit Log Table Exists
-- Created: 2025-08-10
-- Purpose: Create audit_log table if it doesn't exist and add sample data

-- Create audit_log table if not exists
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100) NOT NULL,
  resource_id VARCHAR(255),
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_resource_type ON audit_log(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_company_id ON audit_log(company_id);

-- Enable RLS
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Admins can view all audit logs" ON audit_log;
CREATE POLICY "Admins can view all audit logs" ON audit_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
      AND profiles.company_id = audit_log.company_id
    )
  );

DROP POLICY IF EXISTS "Managers can view their company audit logs" ON audit_log;
CREATE POLICY "Managers can view their company audit logs" ON audit_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'manager'
      AND profiles.company_id = audit_log.company_id
    )
  );

-- Function to log audit events
CREATE OR REPLACE FUNCTION log_audit_event(
  p_user_id UUID,
  p_action VARCHAR,
  p_resource_type VARCHAR,
  p_resource_id VARCHAR DEFAULT NULL,
  p_details JSONB DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_company_id UUID;
  v_audit_id UUID;
BEGIN
  -- Get company_id from user profile
  SELECT company_id INTO v_company_id
  FROM profiles
  WHERE id = p_user_id;

  -- Insert audit log entry
  INSERT INTO audit_log (
    user_id,
    action,
    resource_type,
    resource_id,
    details,
    ip_address,
    user_agent,
    company_id
  ) VALUES (
    p_user_id,
    p_action,
    p_resource_type,
    p_resource_id,
    p_details,
    p_ip_address,
    p_user_agent,
    v_company_id
  ) RETURNING id INTO v_audit_id;

  RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add sample audit log entries for testing (only if table is empty)
DO $$
DECLARE
  v_admin_id UUID;
  v_manager_id UUID;
  v_company_id UUID;
BEGIN
  -- Only add sample data if audit_log is empty
  IF NOT EXISTS (SELECT 1 FROM audit_log LIMIT 1) THEN
    -- Get an admin user
    SELECT id, company_id INTO v_admin_id, v_company_id
    FROM profiles
    WHERE role = 'admin'
    LIMIT 1;

    -- Get a manager user
    SELECT id INTO v_manager_id
    FROM profiles
    WHERE role = 'manager' AND company_id = v_company_id
    LIMIT 1;

    -- Only insert sample data if we have users
    IF v_admin_id IS NOT NULL THEN
      -- Insert sample audit logs
      INSERT INTO audit_log (user_id, action, resource_type, resource_id, details, ip_address, user_agent, company_id, created_at) VALUES
      (v_admin_id, 'admin_login', 'authentication', NULL, '{"success": true, "method": "password"}'::jsonb, '192.168.1.100'::inet, 'Mozilla/5.0', v_company_id, NOW() - INTERVAL '7 days'),
      (v_admin_id, 'view_system_stats', 'system_administration', NULL, '{"page": "dashboard"}'::jsonb, '192.168.1.100'::inet, 'Mozilla/5.0', v_company_id, NOW() - INTERVAL '6 days'),
      (v_admin_id, 'create_manager', 'manager_management', gen_random_uuid()::text, '{"email": "manager@example.com", "name": "John Doe"}'::jsonb, '192.168.1.100'::inet, 'Mozilla/5.0', v_company_id, NOW() - INTERVAL '5 days'),
      (v_admin_id, 'update_manager', 'manager_management', gen_random_uuid()::text, '{"changes": {"status": "active"}}'::jsonb, '192.168.1.100'::inet, 'Mozilla/5.0', v_company_id, NOW() - INTERVAL '4 days'),
      (v_admin_id, 'view_audit_log', 'system_administration', NULL, '{"filters": {"action": "admin_login"}}'::jsonb, '192.168.1.100'::inet, 'Mozilla/5.0', v_company_id, NOW() - INTERVAL '3 days'),
      (v_admin_id, 'create_template', 'template_management', 'cert_template_1', '{"template_name": "Certificate Template v1"}'::jsonb, '192.168.1.100'::inet, 'Mozilla/5.0', v_company_id, NOW() - INTERVAL '2 days'),
      (v_admin_id, 'admin_login', 'authentication', NULL, '{"success": true, "method": "password"}'::jsonb, '192.168.1.101'::inet, 'Mozilla/5.0', v_company_id, NOW() - INTERVAL '1 day'),
      (v_admin_id, 'view_managers', 'manager_management', NULL, '{"page": 1, "limit": 25}'::jsonb, '192.168.1.101'::inet, 'Mozilla/5.0', v_company_id, NOW() - INTERVAL '12 hours'),
      (v_admin_id, 'update_system_settings', 'system_administration', 'email_settings', '{"category": "email", "changes": {"smtp_host": "smtp.gmail.com"}}'::jsonb, '192.168.1.101'::inet, 'Mozilla/5.0', v_company_id, NOW() - INTERVAL '6 hours'),
      (v_admin_id, 'view_system_stats', 'system_administration', NULL, '{"page": "dashboard"}'::jsonb, '192.168.1.101'::inet, 'Mozilla/5.0', v_company_id, NOW() - INTERVAL '1 hour');

      -- Add manager logs if we have a manager
      IF v_manager_id IS NOT NULL THEN
        INSERT INTO audit_log (user_id, action, resource_type, resource_id, details, ip_address, user_agent, company_id, created_at) VALUES
        (v_manager_id, 'manager_login', 'authentication', NULL, '{"success": true, "method": "magic_link"}'::jsonb, '192.168.1.200'::inet, 'Chrome/120.0', v_company_id, NOW() - INTERVAL '3 days'),
        (v_manager_id, 'view_crew_members', 'crew_management', NULL, '{"page": 1, "limit": 50}'::jsonb, '192.168.1.200'::inet, 'Chrome/120.0', v_company_id, NOW() - INTERVAL '2 days'),
        (v_manager_id, 'create_crew_member', 'crew_management', gen_random_uuid()::text, '{"email": "crew@example.com", "name": "Jane Smith"}'::jsonb, '192.168.1.200'::inet, 'Chrome/120.0', v_company_id, NOW() - INTERVAL '1 day'),
        (v_manager_id, 'generate_certificate', 'certificate_management', gen_random_uuid()::text, '{"crew_member": "Jane Smith", "template": "cert_template_1"}'::jsonb, '192.168.1.200'::inet, 'Chrome/120.0', v_company_id, NOW() - INTERVAL '6 hours');
      END IF;
    END IF;
  END IF;
END $$;

-- Grant permissions
GRANT SELECT ON audit_log TO authenticated;
GRANT INSERT ON audit_log TO service_role;
GRANT EXECUTE ON FUNCTION log_audit_event TO service_role;