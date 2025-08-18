-- Migration: Initialize All System Settings
-- Created: 2025-08-10
-- Purpose: Ensure all system settings categories are properly initialized

-- Application settings
INSERT INTO system_settings (category, key, value, type, description, is_public, is_required) VALUES
('application', 'app_name', '"Maritime Onboarding System"', 'string', 'Application name displayed in UI', true, true),
('application', 'app_version', '"2.0.0"', 'string', 'Current application version', true, true),
('application', 'maintenance_mode', 'false', 'boolean', 'Enable maintenance mode', false, false),
('application', 'maintenance_message', '"System is under maintenance. Please try again later."', 'string', 'Message shown during maintenance', true, false),
('application', 'logo_url', '"/logo.png"', 'string', 'Application logo URL', true, false),
('application', 'favicon_url', '"/favicon.ico"', 'string', 'Application favicon URL', true, false),
('application', 'theme_color', '"#0066CC"', 'string', 'Primary theme color', true, false)
ON CONFLICT (category, key) DO NOTHING;

-- Email settings
INSERT INTO system_settings (category, key, value, type, description, is_public, is_required, is_encrypted) VALUES
('email', 'email_provider', '"smtp"', 'select', 'Email service provider (smtp or mailersend)', false, true, false),
('email', 'email_service_provider', '"smtp"', 'select', 'Email service provider (smtp or mailersend)', false, true, false),
('email', 'from_email', '"noreply@company.com"', 'email', 'Default sender email address', false, true, false),
('email', 'from_name', '"Maritime Onboarding"', 'string', 'Default sender name', false, true, false),
('email', 'admin_notifications', '"admin@company.com"', 'email', 'Email for admin notifications', false, true, false),
-- SMTP settings
('email', 'smtp_host', '"smtp.gmail.com"', 'string', 'SMTP server hostname', false, false, false),
('email', 'smtp_port', '587', 'number', 'SMTP server port', false, false, false),
('email', 'smtp_secure', 'true', 'boolean', 'Use TLS/SSL for SMTP', false, false, false),
('email', 'smtp_user', '""', 'string', 'SMTP authentication username', false, false, false),
('email', 'smtp_password', '""', 'password', 'SMTP authentication password', false, false, true),
-- MailerSend settings
('email', 'mailersend_api_key', '""', 'password', 'MailerSend API key', false, false, true),
('email', 'mailersend_domain', '""', 'string', 'MailerSend verified domain', false, false, false)
ON CONFLICT (category, key) DO NOTHING;

-- Translation settings
INSERT INTO system_settings (category, key, value, type, description, is_public, is_required, is_encrypted) VALUES
('translation', 'translation_provider', '"claude"', 'select', 'AI translation provider', false, false, false),
('translation', 'default_source_language', '"en"', 'string', 'Default source language code', true, true, false),
('translation', 'enabled_languages', '["en", "nl"]', 'json', 'List of enabled language codes', true, true, false),
('translation', 'anthropic_api_key', '""', 'password', 'Anthropic Claude API key', false, false, true),
('translation', 'openai_api_key', '""', 'password', 'OpenAI API key', false, false, true),
('translation', 'microsoft_api_key', '""', 'password', 'Microsoft Translator API key', false, false, true),
('translation', 'google_api_key', '""', 'password', 'Google Translate API key', false, false, true)
ON CONFLICT (category, key) DO NOTHING;

-- Security settings
INSERT INTO system_settings (category, key, value, type, description, is_public, is_required) VALUES
('security', 'password_min_length', '8', 'number', 'Minimum password length', true, true),
('security', 'password_require_uppercase', 'true', 'boolean', 'Require uppercase in passwords', true, true),
('security', 'password_require_lowercase', 'true', 'boolean', 'Require lowercase in passwords', true, true),
('security', 'password_require_numbers', 'true', 'boolean', 'Require numbers in passwords', true, true),
('security', 'password_require_special', 'false', 'boolean', 'Require special characters in passwords', true, true),
('security', 'session_timeout', '7200', 'number', 'Session timeout in seconds', false, true),
('security', 'max_login_attempts', '5', 'number', 'Maximum login attempts before lockout', false, true),
('security', 'lockout_duration', '900', 'number', 'Account lockout duration in seconds', false, true),
('security', 'two_factor_enabled', 'false', 'boolean', 'Enable two-factor authentication', false, false),
('security', 'ip_whitelist_enabled', 'false', 'boolean', 'Enable IP whitelist', false, false),
('security', 'ip_whitelist', '[]', 'json', 'List of whitelisted IP addresses', false, false)
ON CONFLICT (category, key) DO NOTHING;

-- Training settings
INSERT INTO system_settings (category, key, value, type, description, is_public, is_required) VALUES
('training', 'quiz_passing_score', '70', 'number', 'Minimum passing score for quizzes (%)', true, true),
('training', 'quiz_max_attempts', '3', 'number', 'Maximum quiz attempts allowed', true, true),
('training', 'quiz_retry_delay', '24', 'number', 'Hours to wait between quiz retries', true, true),
('training', 'certificate_validity_days', '365', 'number', 'Certificate validity period in days', true, true),
('training', 'auto_enroll', 'true', 'boolean', 'Auto-enroll new crew in training', false, true),
('training', 'reminder_enabled', 'true', 'boolean', 'Enable training reminder emails', false, true),
('training', 'reminder_days', '7', 'number', 'Days before expiry to send reminders', false, true),
('training', 'video_mandatory', 'true', 'boolean', 'Require video completion', true, true),
('training', 'video_min_watch_percent', '90', 'number', 'Minimum video watch percentage', true, true)
ON CONFLICT (category, key) DO NOTHING;

-- Notifications settings
INSERT INTO system_settings (category, key, value, type, description, is_public, is_required) VALUES
('notifications', 'email_notifications', 'true', 'boolean', 'Enable email notifications', false, true),
('notifications', 'sms_notifications', 'false', 'boolean', 'Enable SMS notifications', false, false),
('notifications', 'push_notifications', 'false', 'boolean', 'Enable push notifications', false, false),
('notifications', 'notify_on_enrollment', 'true', 'boolean', 'Notify on new enrollment', false, true),
('notifications', 'notify_on_completion', 'true', 'boolean', 'Notify on training completion', false, true),
('notifications', 'notify_on_certificate', 'true', 'boolean', 'Notify on certificate generation', false, true),
('notifications', 'notify_on_expiry', 'true', 'boolean', 'Notify on certificate expiry', false, true),
('notifications', 'admin_daily_digest', 'true', 'boolean', 'Send daily digest to admins', false, false),
('notifications', 'manager_weekly_report', 'true', 'boolean', 'Send weekly reports to managers', false, false)
ON CONFLICT (category, key) DO NOTHING;

-- Compliance settings
INSERT INTO system_settings (category, key, value, type, description, is_public, is_required) VALUES
('compliance', 'audit_enabled', 'true', 'boolean', 'Enable audit logging', false, true),
('compliance', 'audit_retention_days', '365', 'number', 'Audit log retention in days', false, true),
('compliance', 'gdpr_compliance', 'true', 'boolean', 'Enable GDPR compliance features', false, true),
('compliance', 'data_retention_days', '1825', 'number', 'User data retention in days (5 years)', false, true),
('compliance', 'require_consent', 'true', 'boolean', 'Require user consent for data processing', true, true),
('compliance', 'incident_reporting', 'true', 'boolean', 'Enable incident reporting', false, true),
('compliance', 'performance_monitoring', 'true', 'boolean', 'Enable performance monitoring', false, true)
ON CONFLICT (category, key) DO NOTHING;

-- Integration settings
INSERT INTO system_settings (category, key, value, type, description, is_public, is_required, is_encrypted) VALUES
('integrations', 'incident_response_provider', '"none"', 'select', 'Incident response provider (none, pagerduty, slack, webhook)', false, false, false),
('integrations', 'webhook_url', '""', 'url', 'Webhook URL for notifications', false, false, false),
('integrations', 'webhook_secret', '""', 'password', 'Webhook secret for authentication', false, false, true),
('integrations', 'slack_webhook_url', '""', 'url', 'Slack webhook URL', false, false, false),
('integrations', 'slack_channel', '""', 'string', 'Slack channel for notifications', false, false, false),
('integrations', 'pagerduty_integration_key', '""', 'password', 'PagerDuty integration key', false, false, true),
('integrations', 'pagerduty_service_id', '""', 'string', 'PagerDuty service ID', false, false, false),
('integrations', 'api_rate_limit', '1000', 'number', 'API rate limit per hour', false, true, false),
('integrations', 'webhook_retry_attempts', '3', 'number', 'Webhook retry attempts', false, false, false)
ON CONFLICT (category, key) DO NOTHING;

-- Update setting options where applicable
UPDATE system_settings 
SET options = '["smtp", "mailersend"]'::jsonb 
WHERE category = 'email' AND key IN ('email_provider', 'email_service_provider');

UPDATE system_settings 
SET options = '["claude", "openai", "microsoft", "google"]'::jsonb 
WHERE category = 'translation' AND key = 'translation_provider';

UPDATE system_settings 
SET options = '["none", "pagerduty", "slack", "webhook"]'::jsonb 
WHERE category = 'integrations' AND key = 'incident_response_provider';

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);
CREATE INDEX IF NOT EXISTS idx_system_settings_category_key ON system_settings(category, key);

-- Grant appropriate permissions
GRANT SELECT ON system_settings TO authenticated;
GRANT ALL ON system_settings TO service_role;