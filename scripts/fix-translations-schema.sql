-- Fix translations schema issues
-- This script resolves ambiguous column references in workflow queries

-- Drop any existing views that might cause conflicts
DROP VIEW IF EXISTS workflow_with_translations CASCADE;

-- Create a clean view for workflows with translations
CREATE OR REPLACE VIEW workflow_with_translations AS
SELECT 
  w.*,
  COALESCE(
    json_agg(
      DISTINCT jsonb_build_object(
        'id', wt.id,
        'field_name', wt.field_name,
        'target_language', wt.target_language,
        'translated_text', wt.translated_text,
        'confidence_score', wt.confidence_score,
        'human_reviewed', wt.human_reviewed
      )
    ) FILTER (WHERE wt.id IS NOT NULL),
    '[]'::json
  ) AS translations
FROM workflows w
LEFT JOIN workflow_translations wt ON w.id = wt.workflow_id
GROUP BY w.id;

-- Grant appropriate permissions
GRANT SELECT ON workflow_with_translations TO anon, authenticated;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_workflow_translations_composite 
  ON workflow_translations(workflow_id, field_name, target_language);

-- Add helpful comments
COMMENT ON VIEW workflow_with_translations IS 'Workflows with their associated translations aggregated as JSON';