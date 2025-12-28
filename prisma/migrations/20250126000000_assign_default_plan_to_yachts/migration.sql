-- Migration: Assign default plan to yachts without a plan
-- Date: 2025-01-26
-- Purpose: Fix production issue where yachts don't have plans assigned, causing feature gate to fail

-- Step 1: Find or create a default plan with all features
-- First, try to find an existing plan that has ALL_FEATURES or most features
DO $$
DECLARE
  default_plan_id UUID;
  default_plan_name TEXT;
  updated_count INTEGER;
  has_active_column BOOLEAN;
BEGIN
  -- Check if 'active' column exists in plans table
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'plans' 
      AND column_name = 'active'
  ) INTO has_active_column;

  -- Try to find a plan with ALL_FEATURES first (Enterprise plan)
  IF has_active_column THEN
    SELECT id, name INTO default_plan_id, default_plan_name
    FROM plans
    WHERE active = true
      AND features @> ARRAY['ALL_FEATURES']::text[]
    LIMIT 1;
  ELSE
    SELECT id, name INTO default_plan_id, default_plan_name
    FROM plans
    WHERE features @> ARRAY['ALL_FEATURES']::text[]
    LIMIT 1;
  END IF;

  -- If not found, try to find PROFESSIONAL plan (has most features)
  IF default_plan_id IS NULL THEN
    IF has_active_column THEN
      SELECT id, name INTO default_plan_id, default_plan_name
      FROM plans
      WHERE active = true
        AND name = 'PROFESSIONAL'
      LIMIT 1;
    ELSE
      SELECT id, name INTO default_plan_id, default_plan_name
      FROM plans
      WHERE name = 'PROFESSIONAL'
      LIMIT 1;
    END IF;
  END IF;

  -- If not found, try to find a plan with most common features
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

  -- If still not found, try to find any plan
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

  -- If no plan exists at all, create a default one with all features
  IF default_plan_id IS NULL THEN
    IF has_active_column THEN
      INSERT INTO plans (id, name, features, limits, active, currency, created_at, updated_at)
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
    
    RAISE NOTICE 'Created default plan: % (ID: %)', default_plan_name, default_plan_id;
  ELSE
    RAISE NOTICE 'Using existing plan: % (ID: %)', default_plan_name, default_plan_id;
  END IF;

  -- Step 2: Assign this plan to all yachts without a plan
  UPDATE yachts
  SET 
    current_plan_id = default_plan_id,
    subscription_status = COALESCE(subscription_status, 'ACTIVE')
  WHERE current_plan_id IS NULL;

  -- Log how many yachts were updated
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Assigned plan to % yachts', updated_count;
END $$;

-- Step 3: Verify the update
-- This query should return 0 rows (all yachts should have a plan)
SELECT 
  COUNT(*) as yachts_without_plan,
  COUNT(*) FILTER (WHERE subscription_status IS NULL) as yachts_without_status
FROM yachts
WHERE current_plan_id IS NULL;

