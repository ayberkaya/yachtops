-- Migration: Add finance and inventory features to existing plans
-- Date: 2025-01-26
-- Purpose: Ensure all plans have module:finance and module:inventory features
-- Run these SQL statements in Supabase SQL Editor

-- ============================================
-- STEP 1: Check current plan features
-- ============================================
-- First, see what features each plan currently has
SELECT 
  id,
  name,
  features,
  CASE 
    WHEN 'ALL_FEATURES' = ANY(features) THEN 'Has ALL_FEATURES'
    WHEN 'module:finance' = ANY(features) AND 'module:inventory' = ANY(features) THEN 'Has both'
    WHEN 'module:finance' = ANY(features) THEN 'Has finance only'
    WHEN 'module:inventory' = ANY(features) THEN 'Has inventory only'
    ELSE 'Missing both'
  END as feature_status
FROM plans
ORDER BY name;

-- ============================================
-- STEP 2: Add module:finance to plans missing it
-- ============================================
-- This adds 'module:finance' to all plans that don't already have it
-- (or don't have ALL_FEATURES which includes everything)
UPDATE plans
SET features = array_append(features, 'module:finance')
WHERE NOT ('module:finance' = ANY(features))
  AND NOT ('ALL_FEATURES' = ANY(features));

-- ============================================
-- STEP 3: Add module:inventory to plans missing it
-- ============================================
-- This adds 'module:inventory' to all plans that don't already have it
-- (or don't have ALL_FEATURES which includes everything)
UPDATE plans
SET features = array_append(features, 'module:inventory')
WHERE NOT ('module:inventory' = ANY(features))
  AND NOT ('ALL_FEATURES' = ANY(features));

-- ============================================
-- STEP 3.5: Ensure plans are active (if active column exists)
-- ============================================
-- Make sure all plans are active so they can be used
-- Note: This will only run if the 'active' column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'plans' AND column_name = 'active'
  ) THEN
    UPDATE plans
    SET active = true
    WHERE active = false OR active IS NULL;
  END IF;
END $$;

-- ============================================
-- STEP 4: Verify the update
-- ============================================
-- Check that all plans now have both features
SELECT 
  id,
  name,
  features,
  CASE 
    WHEN 'ALL_FEATURES' = ANY(features) THEN 'Has ALL_FEATURES'
    WHEN 'module:finance' = ANY(features) AND 'module:inventory' = ANY(features) THEN 'Has both ✅'
    WHEN 'module:finance' = ANY(features) THEN 'Has finance only ⚠️'
    WHEN 'module:inventory' = ANY(features) THEN 'Has inventory only ⚠️'
    ELSE 'Missing both ❌'
  END as feature_status
FROM plans
ORDER BY name;

-- ============================================
-- STEP 5: Check which yachts are using which plans
-- ============================================
-- Verify that yachts have plans with the required features
SELECT 
  y.id as yacht_id,
  y.name as yacht_name,
  p.name as plan_name,
  p.active as plan_active,
  CASE 
    WHEN 'ALL_FEATURES' = ANY(p.features) THEN 'Has ALL_FEATURES ✅'
    WHEN 'module:finance' = ANY(p.features) AND 'module:inventory' = ANY(p.features) THEN 'Has both ✅'
    ELSE 'Missing features ❌'
  END as feature_status
FROM yachts y
LEFT JOIN plans p ON y.current_plan_id = p.id
WHERE y.current_plan_id IS NOT NULL
ORDER BY y.name;

