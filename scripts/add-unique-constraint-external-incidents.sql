-- Add unique constraint for external incident IDs to prevent duplicates
-- This ensures that each external incident ID is unique per source system

-- First, remove any existing duplicates (keep the oldest one)
WITH duplicates AS (
  SELECT 
    external_incident_id,
    source_system,
    MIN(created_at) as first_created
  FROM incidents 
  WHERE external_incident_id IS NOT NULL 
    AND source_system IS NOT NULL
  GROUP BY external_incident_id, source_system
  HAVING COUNT(*) > 1
),
to_delete AS (
  SELECT i.incident_id
  FROM incidents i
  JOIN duplicates d ON i.external_incident_id = d.external_incident_id 
    AND i.source_system = d.source_system
    AND i.created_at > d.first_created
)
DELETE FROM incidents 
WHERE incident_id IN (SELECT incident_id FROM to_delete);

-- Add unique constraint
ALTER TABLE incidents 
ADD CONSTRAINT unique_external_incident_per_source 
UNIQUE (external_incident_id, source_system);

-- Add comment for documentation
COMMENT ON CONSTRAINT unique_external_incident_per_source ON incidents IS 
'Ensures each external incident ID is unique per source system to prevent duplicate incident creation from webhooks';
