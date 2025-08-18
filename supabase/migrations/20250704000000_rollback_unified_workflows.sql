-- Rollback unified workflow changes
-- This migration removes the unwanted unified workflow columns and types
-- that were accidentally added from BlackBox Marine project

-- Remove the unwanted columns from workflows table
ALTER TABLE public.workflows 
DROP COLUMN IF EXISTS category,
DROP COLUMN IF EXISTS trigger_type,
DROP COLUMN IF EXISTS access_control,
DROP COLUMN IF EXISTS steps;

-- Drop the unwanted enum types
DROP TYPE IF EXISTS workflow_category;
DROP TYPE IF EXISTS workflow_trigger_type;
DROP TYPE IF EXISTS workflow_status;

-- Remove any example workflows that were added
DELETE FROM public.workflows 
WHERE name IN (
    'Annual Safety Training',
    'Equipment Maintenance Check',
    'Safety Compliance Audit'
);

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Rolled back unified workflow changes successfully';
    RAISE NOTICE 'Removed unwanted columns: category, trigger_type, access_control, steps';
    RAISE NOTICE 'Removed unwanted enum types: workflow_category, workflow_trigger_type, workflow_status';
    RAISE NOTICE 'Workflows table restored to original maritime onboarding schema';
END $$;
