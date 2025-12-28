-- Migration: Fix MEDIUM priority to NORMAL (Simple Version)
-- Date: 2025-01-26
-- Purpose: Add NORMAL to enum, then update data
-- 
-- INSTRUCTIONS:
-- 1. Run the first ALTER TYPE statement below
-- 2. Wait for it to complete (it will commit automatically)
-- 3. Then run the UPDATE statements
-- 4. Finally run the SELECT to verify

-- Step 1: Add NORMAL to enum (run this first)
ALTER TYPE "TaskPriority" ADD VALUE IF NOT EXISTS 'NORMAL';

-- Step 2: Update MEDIUM to NORMAL (run after step 1 completes)
UPDATE tasks
SET priority = 'NORMAL'
WHERE priority = 'MEDIUM';

-- Step 3: Update LOW to NORMAL (if any exist)
UPDATE tasks
SET priority = 'NORMAL'
WHERE priority = 'LOW';

-- Step 4: Verify
SELECT 
  COUNT(*) FILTER (WHERE priority = 'MEDIUM') as remaining_medium,
  COUNT(*) FILTER (WHERE priority = 'LOW') as remaining_low,
  COUNT(*) FILTER (WHERE priority = 'NORMAL') as normal_count,
  COUNT(*) FILTER (WHERE priority = 'HIGH') as high_count,
  COUNT(*) FILTER (WHERE priority = 'URGENT') as urgent_count,
  COUNT(*) as total_tasks
FROM tasks;

