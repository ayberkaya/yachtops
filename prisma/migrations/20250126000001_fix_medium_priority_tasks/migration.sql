-- Migration: Fix MEDIUM priority to NORMAL in tasks table
-- Date: 2025-01-26
-- Purpose: Update all tasks with MEDIUM priority to NORMAL after enum change

-- Update all tasks with MEDIUM priority to NORMAL
UPDATE tasks
SET priority = 'NORMAL'
WHERE priority = 'MEDIUM';

-- Verify the update
SELECT 
  COUNT(*) FILTER (WHERE priority = 'MEDIUM') as remaining_medium,
  COUNT(*) FILTER (WHERE priority = 'NORMAL') as normal_count,
  COUNT(*) FILTER (WHERE priority = 'HIGH') as high_count,
  COUNT(*) FILTER (WHERE priority = 'URGENT') as urgent_count
FROM tasks;

