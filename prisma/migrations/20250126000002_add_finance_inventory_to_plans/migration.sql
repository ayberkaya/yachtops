-- Migration: Add finance and inventory features to existing plans
-- Date: 2025-01-26
-- Purpose: Ensure all plans have module:finance and module:inventory features
-- This fixes the "finance_not_available" and "inventory_not_available" errors

-- Step 1: Add module:finance to all plans that don't have it
UPDATE plans
SET features = array_append(features, 'module:finance')
WHERE NOT ('module:finance' = ANY(features))
  AND NOT ('ALL_FEATURES' = ANY(features)); -- Skip if already has ALL_FEATURES

-- Step 2: Add module:inventory to all plans that don't have it
UPDATE plans
SET features = array_append(features, 'module:inventory')
WHERE NOT ('module:inventory' = ANY(features))
  AND NOT ('ALL_FEATURES' = ANY(features)); -- Skip if already has ALL_FEATURES

-- Step 3: Verify the update
SELECT 
  id,
  name,
  features,
  CASE 
    WHEN 'ALL_FEATURES' = ANY(features) THEN 'Has ALL_FEATURES'
    WHEN 'module:finance' = ANY(features) AND 'module:inventory' = ANY(features) THEN 'Has both finance and inventory'
    WHEN 'module:finance' = ANY(features) THEN 'Has finance only'
    WHEN 'module:inventory' = ANY(features) THEN 'Has inventory only'
    ELSE 'Missing both'
  END as feature_status
FROM plans
ORDER BY name;

