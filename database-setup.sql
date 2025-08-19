-- Create pdf_templates table
CREATE TABLE IF NOT EXISTS pdf_templates (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    page_size VARCHAR(20) DEFAULT 'A4',
    orientation VARCHAR(20) DEFAULT 'portrait',
    background_image TEXT,
    fields JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_by BIGINT REFERENCES users(id),
    updated_by BIGINT REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- Create indexes for pdf_templates
CREATE INDEX IF NOT EXISTS idx_pdf_templates_created_by ON pdf_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_pdf_templates_is_active ON pdf_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_pdf_templates_name ON pdf_templates(name);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_pdf_templates_updated_at 
    BEFORE UPDATE ON pdf_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert comprehensive test data
-- First, let's add more users with different roles
INSERT INTO users (email, first_name, last_name, role, position, password_hash, is_active) VALUES
('manager1@maritime-onboarding.local', 'John', 'Smith', 'manager', 'Fleet Manager', '$2b$10$example.hash.for.testing', true),
('manager2@maritime-onboarding.local', 'Sarah', 'Johnson', 'manager', 'Training Coordinator', '$2b$10$example.hash.for.testing', true),
('crew1@maritime-onboarding.local', 'Mike', 'Wilson', 'crew', 'Deck Officer', '$2b$10$example.hash.for.testing', true),
('crew2@maritime-onboarding.local', 'Lisa', 'Brown', 'crew', 'Engineer', '$2b$10$example.hash.for.testing', true),
('crew3@maritime-onboarding.local', 'David', 'Davis', 'crew', 'Cook', '$2b$10$example.hash.for.testing', true),
('inactive@maritime-onboarding.local', 'Inactive', 'User', 'crew', 'Former Employee', '$2b$10$example.hash.for.testing', false)
ON CONFLICT (email) DO NOTHING;

-- First create manager records for the manager users
INSERT INTO managers (user_id, department, permissions) VALUES
(2, 'Fleet Operations', '{"manage_crew": true, "view_reports": true}'::jsonb),
(3, 'Training Department', '{"manage_training": true, "view_reports": true}'::jsonb)
ON CONFLICT (user_id) DO NOTHING;

-- Insert manager permissions (using correct column names)
INSERT INTO manager_permissions (manager_id, permission_type, resource_type, resource_id, granted_by) VALUES
(1, 'manage_crew', 'department', NULL, 1),
(1, 'view_reports', 'system', NULL, 1),
(2, 'manage_training', 'department', NULL, 1),
(2, 'view_reports', 'system', NULL, 1)
ON CONFLICT DO NOTHING;

-- Insert system settings (using correct column names)
INSERT INTO system_settings (category, key, value, description) VALUES
('general', 'company_name', 'Maritime Onboarding Solutions', 'Company name displayed in the application'),
('general', 'default_language', 'en', 'Default language for new users'),
('general', 'timezone', 'UTC', 'Default timezone for the application'),
('security', 'password_min_length', '8', 'Minimum password length requirement'),
('security', 'session_timeout', '3600', 'Session timeout in seconds'),
('security', 'max_login_attempts', '5', 'Maximum failed login attempts before lockout'),
('email', 'smtp_host', 'localhost', 'SMTP server hostname'),
('email', 'smtp_port', '1025', 'SMTP server port'),
('email', 'from_address', 'noreply@maritime-onboarding.local', 'Default from email address'),
('training', 'default_quiz_pass_score', '80', 'Default passing score for quizzes (percentage)'),
('training', 'certificate_validity_days', '365', 'Default certificate validity period in days')
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = NOW();

-- Insert PDF templates with realistic data
INSERT INTO pdf_templates (name, description, page_size, orientation, fields, metadata, created_by, updated_by) VALUES
(
    'Safety Certificate Template',
    'Standard template for safety training certificates',
    'A4',
    'landscape',
    '[
        {"id": "participant_name", "type": "text", "label": "Participant Name", "x": 100, "y": 150, "width": 300, "height": 30, "fontSize": 18, "fontWeight": "bold"},
        {"id": "course_name", "type": "text", "label": "Course Name", "x": 100, "y": 200, "width": 400, "height": 25, "fontSize": 14},
        {"id": "completion_date", "type": "date", "label": "Completion Date", "x": 100, "y": 250, "width": 200, "height": 25, "fontSize": 12},
        {"id": "instructor_signature", "type": "signature", "label": "Instructor Signature", "x": 100, "y": 300, "width": 200, "height": 50},
        {"id": "certificate_number", "type": "text", "label": "Certificate Number", "x": 500, "y": 350, "width": 150, "height": 20, "fontSize": 10}
    ]'::jsonb,
    '{"type": "certificate", "category": "safety", "version": "1.0", "requires_signature": true}'::jsonb,
    1,
    1
),
(
    'Training Record Form',
    'Template for recording training session details',
    'A4',
    'portrait',
    '[
        {"id": "trainee_name", "type": "text", "label": "Trainee Name", "x": 50, "y": 100, "width": 250, "height": 25, "fontSize": 12},
        {"id": "trainer_name", "type": "text", "label": "Trainer Name", "x": 350, "y": 100, "width": 200, "height": 25, "fontSize": 12},
        {"id": "training_topic", "type": "text", "label": "Training Topic", "x": 50, "y": 150, "width": 500, "height": 25, "fontSize": 12},
        {"id": "duration_hours", "type": "number", "label": "Duration (Hours)", "x": 50, "y": 200, "width": 100, "height": 25, "fontSize": 12},
        {"id": "assessment_score", "type": "number", "label": "Assessment Score (%)", "x": 200, "y": 200, "width": 100, "height": 25, "fontSize": 12},
        {"id": "notes", "type": "textarea", "label": "Additional Notes", "x": 50, "y": 250, "width": 500, "height": 100, "fontSize": 10}
    ]'::jsonb,
    '{"type": "form", "category": "training", "version": "1.1", "auto_calculate": true}'::jsonb,
    2,
    2
),
(
    'Incident Report Template',
    'Template for documenting safety incidents',
    'A4',
    'portrait',
    '[
        {"id": "incident_date", "type": "date", "label": "Incident Date", "x": 50, "y": 100, "width": 150, "height": 25, "fontSize": 12},
        {"id": "incident_time", "type": "time", "label": "Incident Time", "x": 250, "y": 100, "width": 100, "height": 25, "fontSize": 12},
        {"id": "location", "type": "text", "label": "Location", "x": 400, "y": 100, "width": 150, "height": 25, "fontSize": 12},
        {"id": "reporter_name", "type": "text", "label": "Reporter Name", "x": 50, "y": 150, "width": 200, "height": 25, "fontSize": 12},
        {"id": "incident_type", "type": "select", "label": "Incident Type", "x": 300, "y": 150, "width": 200, "height": 25, "fontSize": 12, "options": ["Near Miss", "Minor Injury", "Major Injury", "Equipment Damage", "Environmental"]},
        {"id": "description", "type": "textarea", "label": "Incident Description", "x": 50, "y": 200, "width": 500, "height": 150, "fontSize": 10},
        {"id": "immediate_actions", "type": "textarea", "label": "Immediate Actions Taken", "x": 50, "y": 370, "width": 500, "height": 100, "fontSize": 10},
        {"id": "supervisor_signature", "type": "signature", "label": "Supervisor Signature", "x": 50, "y": 500, "width": 200, "height": 50}
    ]'::jsonb,
    '{"type": "report", "category": "safety", "version": "2.0", "priority": "high", "requires_approval": true}'::jsonb,
    1,
    1
);
