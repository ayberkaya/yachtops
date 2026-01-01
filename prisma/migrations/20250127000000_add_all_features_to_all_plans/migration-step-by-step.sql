-- Step-by-step migration: Add ALL_FEATURES to all existing plans
-- This allows all plans to access 100% of the application during testing phase

-- Step 1: Check current state
SELECT 
  id,
  name,
  features,
  active,
  CASE 
    WHEN 'ALL_FEATURES' = ANY(features) THEN 'HAS_ALL_FEATURES'
    ELSE 'NEEDS_UPDATE'
  END as status
FROM plans
ORDER BY name;

-- Step 2: Update all active plans to include ALL_FEATURES
UPDATE plans
SET features = 
  CASE 
    WHEN 'ALL_FEATURES' = ANY(features) THEN features
    ELSE array_append(features, 'ALL_FEATURES')
  END
WHERE active IS NOT FALSE; -- Only update active plans (or plans where active is null/true)

-- Step 3: Verify the update
SELECT 
  id,
  name,
  features,
  active,
  CASE 
    WHEN 'ALL_FEATURES' = ANY(features) THEN '✓ HAS_ALL_FEATURES'
    ELSE '✗ MISSING_ALL_FEATURES'
  END as status
FROM plans
ORDER BY name;

-- Step 4: Count updated plans
SELECT 
  COUNT(*) as total_plans,
  COUNT(*) FILTER (WHERE 'ALL_FEATURES' = ANY(features)) as plans_with_all_features,
  COUNT(*) FILTER (WHERE 'ALL_FEATURES' = ANY(features) AND active IS NOT FALSE) as active_plans_with_all_features
FROM plans;

