-- Add ALL_FEATURES to all existing plans
-- This allows all plans to access 100% of the application during testing phase

-- Update all plans to include ALL_FEATURES if not already present
UPDATE plans
SET features = 
  CASE 
    WHEN 'ALL_FEATURES' = ANY(features) THEN features
    ELSE array_append(features, 'ALL_FEATURES')
  END
WHERE active IS NOT FALSE; -- Only update active plans (or plans where active is null/true)

-- Log the update
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % plans with ALL_FEATURES', updated_count;
END $$;

