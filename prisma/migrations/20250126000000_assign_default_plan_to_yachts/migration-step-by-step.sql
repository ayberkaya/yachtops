-- Migration: Assign default plan to yachts without a plan
-- Run these SQL statements ONE BY ONE in Supabase SQL Editor
-- Copy and paste each section separately

-- ============================================
-- STEP 1: Find the best plan to use
-- ============================================
-- This will show you which plan will be used
SELECT 
  id,
  name,
  features,
  CASE 
    WHEN 'ALL_FEATURES' = ANY(features) THEN 1
    WHEN name = 'PROFESSIONAL' THEN 2
    WHEN 'module:finance' = ANY(features) OR 'module:inventory' = ANY(features) OR 'module:maintenance' = ANY(features) THEN 3
    ELSE 4
  END as priority
FROM plans
ORDER BY 
  CASE 
    WHEN 'ALL_FEATURES' = ANY(features) THEN 1
    WHEN name = 'PROFESSIONAL' THEN 2
    WHEN 'module:finance' = ANY(features) OR 'module:inventory' = ANY(features) OR 'module:maintenance' = ANY(features) THEN 3
    ELSE 4
  END,
  array_length(features, 1) DESC NULLS LAST,
  created_at ASC
LIMIT 1;

-- ============================================
-- STEP 2: Get the plan ID (replace with actual ID from Step 1)
-- ============================================
-- If you got a plan ID from Step 1, use it here. Otherwise, this will get the first available plan:
-- (Replace 'YOUR_PLAN_ID_HERE' with the actual UUID from Step 1, or use the query below)

-- Option A: If you know the plan ID, use this:
-- UPDATE yachts
-- SET 
--   current_plan_id = 'YOUR_PLAN_ID_HERE'::uuid,
--   subscription_status = COALESCE(subscription_status, 'ACTIVE')
-- WHERE current_plan_id IS NULL;

-- Option B: Auto-select the best plan (use this if you want it automatic):
UPDATE yachts
SET 
  current_plan_id = (
    SELECT id
    FROM plans
    ORDER BY 
      CASE 
        WHEN 'ALL_FEATURES' = ANY(features) THEN 1
        WHEN name = 'PROFESSIONAL' THEN 2
        WHEN 'module:finance' = ANY(features) OR 'module:inventory' = ANY(features) OR 'module:maintenance' = ANY(features) THEN 3
        ELSE 4
      END,
      array_length(features, 1) DESC NULLS LAST,
      created_at ASC
    LIMIT 1
  ),
  subscription_status = COALESCE(subscription_status, 'ACTIVE')
WHERE current_plan_id IS NULL;

-- ============================================
-- STEP 3: Verify the results
-- ============================================
SELECT 
  COUNT(*) as yachts_without_plan,
  COUNT(*) FILTER (WHERE subscription_status IS NULL) as yachts_without_status
FROM yachts
WHERE current_plan_id IS NULL;

-- ============================================
-- STEP 4: Check which plan was assigned
-- ============================================
SELECT 
  y.id,
  y.name as yacht_name,
  p.name as plan_name,
  y.subscription_status
FROM yachts y
LEFT JOIN plans p ON y.current_plan_id = p.id
WHERE y.current_plan_id IS NOT NULL
ORDER BY y.updated_at DESC
LIMIT 10;

