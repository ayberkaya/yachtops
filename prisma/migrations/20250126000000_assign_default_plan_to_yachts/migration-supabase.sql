-- Migration: Assign default plan to yachts without a plan
-- Run this in Supabase SQL Editor (copy and paste the entire content)

-- Step 1: Find or create a default plan
-- First, check what plans exist and find the best one
WITH plan_selection AS (
  -- Try to find ENTERPRISE plan with ALL_FEATURES
  SELECT id, name
  FROM plans
  WHERE 'ALL_FEATURES' = ANY(features)
  LIMIT 1
  
  UNION ALL
  
  -- If not found, try PROFESSIONAL
  SELECT id, name
  FROM plans
  WHERE name = 'PROFESSIONAL'
  LIMIT 1
  
  UNION ALL
  
  -- If not found, try any plan with common features
  SELECT id, name
  FROM plans
  WHERE (
    'module:finance' = ANY(features)
    OR 'module:inventory' = ANY(features)
    OR 'module:maintenance' = ANY(features)
  )
  ORDER BY array_length(features, 1) DESC NULLS LAST
  LIMIT 1
  
  UNION ALL
  
  -- If still not found, get any plan
  SELECT id, name
  FROM plans
  ORDER BY created_at ASC
  LIMIT 1
)
SELECT id, name INTO TEMP default_plan_temp
FROM plan_selection
LIMIT 1;

-- Step 2: If no plan found, create one
DO $$
DECLARE
  default_plan_id UUID;
  default_plan_name TEXT;
  plan_exists BOOLEAN;
BEGIN
  -- Check if we found a plan
  SELECT EXISTS(SELECT 1 FROM default_plan_temp) INTO plan_exists;
  
  IF plan_exists THEN
    SELECT id, name INTO default_plan_id, default_plan_name FROM default_plan_temp;
  ELSE
    -- Create a new ENTERPRISE plan
    INSERT INTO plans (id, name, features, limits, currency, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      'ENTERPRISE',
      ARRAY[
        'ALL_FEATURES',
        'module:logbook',
        'module:calendar',
        'module:documents_basic',
        'module:documents_full',
        'module:maintenance',
        'module:inventory',
        'module:finance',
        'module:fleet_dashboard',
        'feature:offline_sync',
        'feature:api_access',
        'feature:white_label'
      ]::text[],
      '{"max_users": 50, "storage_mb": 10240, "max_vessels": 10}'::jsonb,
      'USD',
      NOW(),
      NOW()
    )
    RETURNING id, name INTO default_plan_id, default_plan_name;
  END IF;
  
  -- Step 3: Assign plan to all yachts without a plan
  UPDATE yachts
  SET 
    current_plan_id = default_plan_id,
    subscription_status = COALESCE(subscription_status, 'ACTIVE')
  WHERE current_plan_id IS NULL;
  
  RAISE NOTICE 'Assigned plan % (ID: %) to yachts', default_plan_name, default_plan_id;
END $$;

-- Step 4: Clean up temp table
DROP TABLE IF EXISTS default_plan_temp;

-- Step 5: Verify results
SELECT 
  COUNT(*) as yachts_without_plan,
  COUNT(*) FILTER (WHERE subscription_status IS NULL) as yachts_without_status
FROM yachts
WHERE current_plan_id IS NULL;

