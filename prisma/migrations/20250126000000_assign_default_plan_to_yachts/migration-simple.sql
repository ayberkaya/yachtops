-- Migration: Assign default plan to yachts without a plan
-- Date: 2025-01-26
-- Purpose: Fix production issue where yachts don't have plans assigned
-- 
-- IMPORTANT: Run this in Supabase SQL Editor
-- This is a simplified version that works better in Supabase UI

-- Step 1: Check if 'active' column exists and create temp function
CREATE OR REPLACE FUNCTION assign_plans_to_yachts()
RETURNS TABLE(yachts_updated INTEGER, plan_name TEXT, plan_id UUID) AS $$
DECLARE
  default_plan_id UUID;
  default_plan_name TEXT;
  updated_count INTEGER;
  has_active_column BOOLEAN;
BEGIN
  -- Check if 'active' column exists
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'plans' 
      AND column_name = 'active'
  ) INTO has_active_column;

  -- Try to find ENTERPRISE plan with ALL_FEATURES
  IF has_active_column THEN
    SELECT id, name INTO default_plan_id, default_plan_name
    FROM plans
    WHERE active = true
      AND 'ALL_FEATURES' = ANY(features)
    LIMIT 1;
  ELSE
    SELECT id, name INTO default_plan_id, default_plan_name
    FROM plans
    WHERE 'ALL_FEATURES' = ANY(features)
    LIMIT 1;
  END IF;

  -- If not found, try PROFESSIONAL
  IF default_plan_id IS NULL THEN
    IF has_active_column THEN
      SELECT id, name INTO default_plan_id, default_plan_name
      FROM plans
      WHERE active = true AND name = 'PROFESSIONAL'
      LIMIT 1;
    ELSE
      SELECT id, name INTO default_plan_id, default_plan_name
      FROM plans
      WHERE name = 'PROFESSIONAL'
      LIMIT 1;
    END IF;
  END IF;

  -- If not found, try any plan with finance/inventory/maintenance
  IF default_plan_id IS NULL THEN
    IF has_active_column THEN
      SELECT id, name INTO default_plan_id, default_plan_name
      FROM plans
      WHERE active = true
        AND (
          'module:finance' = ANY(features)
          OR 'module:inventory' = ANY(features)
          OR 'module:maintenance' = ANY(features)
        )
      ORDER BY array_length(features, 1) DESC NULLS LAST
      LIMIT 1;
    ELSE
      SELECT id, name INTO default_plan_id, default_plan_name
      FROM plans
      WHERE (
        'module:finance' = ANY(features)
        OR 'module:inventory' = ANY(features)
        OR 'module:maintenance' = ANY(features)
      )
      ORDER BY array_length(features, 1) DESC NULLS LAST
      LIMIT 1;
    END IF;
  END IF;

  -- If still not found, get any plan
  IF default_plan_id IS NULL THEN
    IF has_active_column THEN
      SELECT id, name INTO default_plan_id, default_plan_name
      FROM plans
      WHERE active = true
      ORDER BY created_at ASC
      LIMIT 1;
    ELSE
      SELECT id, name INTO default_plan_id, default_plan_name
      FROM plans
      ORDER BY created_at ASC
      LIMIT 1;
    END IF;
  END IF;

  -- If no plan exists, create one
  IF default_plan_id IS NULL THEN
    IF has_active_column THEN
      INSERT INTO plans (id, name, features, limits, active, currency, created_at, updated_at)
      VALUES (
        gen_random_uuid(),
        'ENTERPRISE',
        ARRAY['ALL_FEATURES', 'module:logbook', 'module:calendar', 'module:documents_basic', 'module:documents_full', 'module:maintenance', 'module:inventory', 'module:finance', 'module:fleet_dashboard', 'feature:offline_sync', 'feature:api_access', 'feature:white_label']::text[],
        '{"max_users": 50, "storage_mb": 10240, "max_vessels": 10}'::jsonb,
        true,
        'USD',
        NOW(),
        NOW()
      )
      RETURNING id, name INTO default_plan_id, default_plan_name;
    ELSE
      INSERT INTO plans (id, name, features, limits, currency, created_at, updated_at)
      VALUES (
        gen_random_uuid(),
        'ENTERPRISE',
        ARRAY['ALL_FEATURES', 'module:logbook', 'module:calendar', 'module:documents_basic', 'module:documents_full', 'module:maintenance', 'module:inventory', 'module:finance', 'module:fleet_dashboard', 'feature:offline_sync', 'feature:api_access', 'feature:white_label']::text[],
        '{"max_users": 50, "storage_mb": 10240, "max_vessels": 10}'::jsonb,
        'USD',
        NOW(),
        NOW()
      )
      RETURNING id, name INTO default_plan_id, default_plan_name;
    END IF;
  END IF;

  -- Assign plan to yachts
  UPDATE yachts
  SET 
    current_plan_id = default_plan_id,
    subscription_status = COALESCE(subscription_status, 'ACTIVE')
  WHERE current_plan_id IS NULL;

  GET DIAGNOSTICS updated_count = ROW_COUNT;

  RETURN QUERY SELECT updated_count, default_plan_name, default_plan_id;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Execute the function
SELECT * FROM assign_plans_to_yachts();

-- Step 3: Clean up - drop the function
DROP FUNCTION IF EXISTS assign_plans_to_yachts();

-- Step 4: Verify results
SELECT 
  COUNT(*) as yachts_without_plan,
  COUNT(*) FILTER (WHERE subscription_status IS NULL) as yachts_without_status
FROM yachts
WHERE current_plan_id IS NULL;

