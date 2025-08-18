-- Workflow Management System Redesign
-- Supports flexible workflows: onboarding, forms, checklists, approvals

-- Workflow Templates (master definitions)
CREATE TABLE IF NOT EXISTS public.workflow_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL CHECK (type IN ('onboarding', 'form', 'checklist', 'approval', 'custom')),
  category VARCHAR(100),
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  is_template BOOLEAN DEFAULT true,
  
  -- Configuration
  config JSONB DEFAULT '{}', -- Stores workflow-specific settings
  metadata JSONB DEFAULT '{}', -- Additional metadata
  
  -- Permissions
  required_role VARCHAR(50), -- Role required to execute this workflow
  company_id UUID REFERENCES public.companies(id),
  
  -- Tracking
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workflow Steps (individual steps in a workflow)
CREATE TABLE IF NOT EXISTS public.workflow_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_template_id UUID NOT NULL REFERENCES public.workflow_templates(id) ON DELETE CASCADE,
  
  -- Step definition
  step_number INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL CHECK (type IN ('content', 'form', 'upload', 'approval', 'quiz', 'action', 'decision')),
  
  -- Content & Configuration
  content JSONB DEFAULT '{}', -- Rich content for content steps
  form_schema JSONB DEFAULT '{}', -- Form definition for form steps
  quiz_data JSONB DEFAULT '{}', -- Quiz questions for quiz steps
  action_config JSONB DEFAULT '{}', -- Action configuration (email, PDF, etc.)
  
  -- Requirements
  is_required BOOLEAN DEFAULT true,
  time_limit_hours INTEGER,
  passing_score INTEGER, -- For quiz steps
  requires_signature BOOLEAN DEFAULT false,
  requires_photo BOOLEAN DEFAULT false,
  
  -- Conditional logic
  condition_logic JSONB DEFAULT '{}', -- Conditions for showing/skipping this step
  
  -- UI Configuration
  ui_config JSONB DEFAULT '{}', -- UI customization options
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(workflow_template_id, step_number)
);

-- Workflow Instances (actual executions of workflows)
CREATE TABLE IF NOT EXISTS public.workflow_instances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_template_id UUID NOT NULL REFERENCES public.workflow_templates(id),
  
  -- Assignment
  assigned_to UUID REFERENCES public.profiles(id),
  assigned_by UUID REFERENCES public.profiles(id),
  crew_member_id UUID REFERENCES public.crew_members(id), -- For crew workflows
  
  -- Status tracking
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'expired')),
  current_step_number INTEGER DEFAULT 1,
  
  -- Timing
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  due_date TIMESTAMP WITH TIME ZONE,
  
  -- Data collection
  collected_data JSONB DEFAULT '{}', -- All data collected during workflow
  
  -- Results
  completion_certificate_url TEXT,
  generated_documents JSONB DEFAULT '[]', -- Array of generated document URLs
  
  company_id UUID REFERENCES public.companies(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workflow Step Progress (tracks progress through workflow steps)
CREATE TABLE IF NOT EXISTS public.workflow_step_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_instance_id UUID NOT NULL REFERENCES public.workflow_instances(id) ON DELETE CASCADE,
  workflow_step_id UUID NOT NULL REFERENCES public.workflow_steps(id),
  
  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped', 'failed')),
  
  -- Data
  response_data JSONB DEFAULT '{}', -- User's response/input for this step
  
  -- Validation
  validated_by UUID REFERENCES public.profiles(id),
  validation_notes TEXT,
  
  -- Files
  uploaded_files JSONB DEFAULT '[]', -- Array of file URLs
  signature_url TEXT,
  photo_url TEXT,
  
  -- Timing
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Quiz specific
  quiz_score INTEGER,
  quiz_attempts INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(workflow_instance_id, workflow_step_id)
);

-- Workflow Templates Library (pre-built templates)
CREATE TABLE IF NOT EXISTS public.workflow_template_library (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  
  -- Template definition
  template_data JSONB NOT NULL, -- Complete workflow definition
  
  -- Metadata
  tags TEXT[],
  industry VARCHAR(100),
  compliance_standards TEXT[], -- ISO, SOLAS, etc.
  
  -- Usage
  times_used INTEGER DEFAULT 0,
  rating DECIMAL(3,2),
  
  -- Visibility
  is_public BOOLEAN DEFAULT false,
  company_id UUID REFERENCES public.companies(id), -- NULL for public templates
  
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PDF Templates (for form workflows that generate PDFs)
CREATE TABLE IF NOT EXISTS public.pdf_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Template data
  template_url TEXT, -- URL to PDF template file
  field_mappings JSONB NOT NULL, -- Maps workflow fields to PDF fields
  
  -- Association
  workflow_template_id UUID REFERENCES public.workflow_templates(id),
  
  company_id UUID REFERENCES public.companies(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workflow Notifications (configured notifications for workflows)
CREATE TABLE IF NOT EXISTS public.workflow_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_template_id UUID REFERENCES public.workflow_templates(id) ON DELETE CASCADE,
  workflow_step_id UUID REFERENCES public.workflow_steps(id) ON DELETE CASCADE,
  
  -- Trigger
  trigger_event VARCHAR(50) NOT NULL CHECK (trigger_event IN ('start', 'complete', 'expire', 'fail', 'step_complete')),
  
  -- Recipients
  recipient_type VARCHAR(50) NOT NULL CHECK (recipient_type IN ('assignee', 'manager', 'role', 'email_list', 'department')),
  recipient_config JSONB NOT NULL, -- Configuration for recipients
  
  -- Message
  notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN ('email', 'sms', 'in_app')),
  subject VARCHAR(255),
  message_template TEXT,
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_workflow_templates_type ON public.workflow_templates(type);
CREATE INDEX idx_workflow_templates_company ON public.workflow_templates(company_id);
CREATE INDEX idx_workflow_instances_status ON public.workflow_instances(status);
CREATE INDEX idx_workflow_instances_assigned ON public.workflow_instances(assigned_to);
CREATE INDEX idx_workflow_step_progress_status ON public.workflow_step_progress(status);

-- Add RLS policies
ALTER TABLE public.workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_step_progress ENABLE ROW LEVEL SECURITY;

-- Workflow Templates policies
CREATE POLICY "Users can view active workflow templates" ON public.workflow_templates
  FOR SELECT USING (is_active = true);

CREATE POLICY "Managers can manage workflow templates" ON public.workflow_templates
  FOR ALL USING (
    auth.uid() IN (
      SELECT id FROM public.profiles 
      WHERE role IN ('admin', 'manager')
    )
  );

-- Workflow Instances policies  
CREATE POLICY "Users can view their assigned workflows" ON public.workflow_instances
  FOR SELECT USING (assigned_to = auth.uid());

CREATE POLICY "Managers can view all workflows" ON public.workflow_instances
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM public.profiles 
      WHERE role IN ('admin', 'manager')
    )
  );

-- Migration function to convert existing training_phases to workflow templates
CREATE OR REPLACE FUNCTION migrate_training_phases_to_workflows()
RETURNS void AS $$
BEGIN
  -- Create workflow templates from existing training phases
  INSERT INTO public.workflow_templates (
    name,
    description,
    type,
    category,
    config,
    company_id,
    created_at
  )
  SELECT 
    title,
    description,
    'onboarding',
    'training',
    jsonb_build_object(
      'time_limit', time_limit,
      'passing_score', passing_score
    ),
    company_id,
    created_at
  FROM public.training_phases
  WHERE NOT EXISTS (
    SELECT 1 FROM public.workflow_templates 
    WHERE name = training_phases.title
  );
  
  -- Note: Actual step migration would need more complex logic
  -- This is a placeholder for the migration strategy
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE public.workflow_templates IS 'Master workflow definitions that can be instantiated';
COMMENT ON TABLE public.workflow_steps IS 'Individual steps within a workflow template';
COMMENT ON TABLE public.workflow_instances IS 'Actual executions of workflow templates';
COMMENT ON TABLE public.workflow_step_progress IS 'Tracks user progress through workflow steps';
COMMENT ON TABLE public.pdf_templates IS 'PDF templates for generating documents from workflow data';