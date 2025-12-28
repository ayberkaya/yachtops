-- Migration: Add annual_price column to plans table
-- Date: 2025-01-26
-- Purpose: Add annual_price column that exists in Prisma schema but not in database
-- Run this in Supabase SQL Editor

-- ============================================
-- STEP 1: Check if annual_price column exists
-- ============================================
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'plans' 
  AND column_name IN ('monthly_price', 'annual_price')
ORDER BY column_name;

-- ============================================
-- STEP 2: Add annual_price column
-- ============================================
-- This will add the column if it doesn't exist
ALTER TABLE plans 
ADD COLUMN IF NOT EXISTS annual_price DOUBLE PRECISION;

-- ============================================
-- STEP 3: Verify the column was added
-- ============================================
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'plans' 
  AND column_name IN ('monthly_price', 'annual_price')
ORDER BY column_name;

