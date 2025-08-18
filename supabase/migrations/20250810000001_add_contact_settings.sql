-- Migration: Add Contact Settings for Help System
-- Created: 2025-08-10
-- Purpose: Add configurable contact information for help widgets and reference cards

-- Insert default contact settings into system_settings table
INSERT INTO system_settings (category, key, value, type, description, is_public, is_required) VALUES
-- Support contact information
('contact', 'support_email', '"support@company.com"', 'string', 'Primary support email address displayed in help widgets', true, true),
('contact', 'admin_email', '"admin@company.com"', 'string', 'Administrator email address for escalations', true, true),
('contact', 'it_phone', '"+1-555-0123"', 'string', 'IT support phone number', true, false),

-- Documentation and help
('contact', 'docs_url', '"/help"', 'string', 'URL for documentation and help pages', true, true),
('contact', 'company_name', '"Maritime Onboarding System"', 'string', 'Company name displayed in reference cards', true, true),
('contact', 'system_url', '"onboarding.company.com"', 'string', 'System URL displayed in reference cards', true, true),

-- Live chat configuration
('contact', 'chat_enabled', 'false', 'boolean', 'Enable live chat functionality in help widget', true, false),
('contact', 'chat_url', '""', 'string', 'Live chat service URL (e.g., Intercom, Zendesk)', false, false),
('contact', 'chat_hours', '"Mon-Fri, 9 AM - 5 PM CET"', 'string', 'Live chat availability hours', true, false),

-- Response time expectations
('contact', 'email_response_time', '"24 hours"', 'string', 'Expected email response time', true, false),
('contact', 'urgent_response_time', '"4 hours"', 'string', 'Expected response time for urgent issues', true, false)

ON CONFLICT (category, key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Add comment for documentation
COMMENT ON TABLE system_settings IS 'System-wide configuration settings including contact information for help system';
