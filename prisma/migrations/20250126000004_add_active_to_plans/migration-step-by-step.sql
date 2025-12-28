-- Migration: Add active column to plans table
-- Date: 2025-01-26
-- Purpose: Add active column that exists in Prisma schema but not in database
-- Run this in Supabase SQL Editor

-- ============================================
-- STEP 1: Check if active column exists
-- ============================================
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'plans' 
  AND column_name = 'active';

-- ============================================
-- STEP 2: Add active column
-- ============================================
-- This will add the column if it doesn't exist
ALTER TABLE plans 
ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;

-- ============================================
-- STEP 3: Verify the column was added
-- ============================================
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'plans' 
  AND column_name = 'active';

-- ============================================
-- STEP 4: Ensure all existing plans are active
-- ============================================
-- Set all existing plans to active (if they don't have the column yet, this will fail gracefully)
UPDATE plans
SET active = true
WHERE active IS NULL OR active = false;

-- ============================================
-- STEP 5: Verify plans status
-- ============================================
SELECT 
  id,
  name,
  active,
  currency
FROM plans
ORDER BY name;

