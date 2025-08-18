-- Convert existing workflow phase durations from minutes to hours
-- This script should be run after the workflow system is deployed
-- to convert any existing duration data from minutes to hours

-- Update workflow_phases table to convert minutes to hours
UPDATE workflow_phases 
SET estimated_duration = CASE 
  WHEN estimated_duration IS NULL THEN 2  -- Default 2 hours
  WHEN estimated_duration < 60 THEN 1     -- Less than 1 hour becomes 1 hour minimum
  WHEN estimated_duration >= 60 THEN ROUND(estimated_duration / 60.0) -- Convert minutes to hours
  ELSE 2  -- Default fallback
END
WHERE estimated_duration IS NOT NULL;

-- Update any workflow phases that might have unrealistic hour values
UPDATE workflow_phases 
SET estimated_duration = CASE
  WHEN estimated_duration > 168 THEN 168  -- Cap at 1 week (168 hours)
  WHEN estimated_duration < 0.5 THEN 1    -- Minimum 1 hour
  ELSE estimated_duration
END;

-- Add a comment to track this conversion
COMMENT ON COLUMN workflow_phases.estimated_duration IS 'Duration in hours (converted from minutes on deployment)';

SELECT 'Conversion completed. Duration values are now in hours.' as status;