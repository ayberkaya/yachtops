-- Migration: Fix MEDIUM priority to NORMAL in tasks table
-- Date: 2025-01-26
-- Purpose: Update enum and migrate existing MEDIUM priorities to NORMAL
-- This is a simplified version for Supabase SQL Editor
--
-- IMPORTANT: Run each section separately in Supabase SQL Editor!
-- PostgreSQL requires enum changes to be committed before they can be used.

-- ============================================
-- SECTION 1: Add NORMAL value to the enum
-- ============================================
-- Run this FIRST and wait for it to complete
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'NORMAL' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'TaskPriority')
  ) THEN
    ALTER TYPE "TaskPriority" ADD VALUE 'NORMAL';
  END IF;
END $$;

-- ============================================
-- SECTION 2: Update data (run AFTER section 1 completes)
-- ============================================
-- After running section 1, wait a moment, then run this section

-- Update all tasks with MEDIUM priority to NORMAL
UPDATE tasks
SET priority = 'NORMAL'
WHERE priority = 'MEDIUM';

-- Update all tasks with LOW priority to NORMAL (if any exist)
UPDATE tasks
SET priority = 'NORMAL'
WHERE priority = 'LOW';

-- ============================================
-- SECTION 3: Verify the update
-- ============================================
-- Run this to verify the migration was successful
SELECT 
  COUNT(*) FILTER (WHERE priority = 'MEDIUM') as remaining_medium,
  COUNT(*) FILTER (WHERE priority = 'LOW') as remaining_low,
  COUNT(*) FILTER (WHERE priority = 'NORMAL') as normal_count,
  COUNT(*) FILTER (WHERE priority = 'HIGH') as high_count,
  COUNT(*) FILTER (WHERE priority = 'URGENT') as urgent_count,
  COUNT(*) as total_tasks
FROM tasks;
