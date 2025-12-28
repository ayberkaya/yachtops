-- Migration: Complete fix for MEDIUM priority to NORMAL
-- Date: 2025-01-26
-- Purpose: Fully update enum and migrate existing MEDIUM/LOW priorities to NORMAL
-- This version completely removes MEDIUM and LOW from the enum

-- Step 1: Add NORMAL value to the enum (if not exists)
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

-- Step 2: Update all tasks with MEDIUM priority to NORMAL
UPDATE tasks
SET priority = 'NORMAL'
WHERE priority = 'MEDIUM';

-- Step 3: Update all tasks with LOW priority to NORMAL (if any exist)
UPDATE tasks
SET priority = 'NORMAL'
WHERE priority = 'LOW';

-- Step 4: Verify no MEDIUM or LOW values remain
DO $$
DECLARE
  medium_count INTEGER;
  low_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO medium_count FROM tasks WHERE priority = 'MEDIUM';
  SELECT COUNT(*) INTO low_count FROM tasks WHERE priority = 'LOW';
  
  IF medium_count > 0 OR low_count > 0 THEN
    RAISE EXCEPTION 'Still have % MEDIUM and % LOW priorities. Migration incomplete.', medium_count, low_count;
  END IF;
END $$;

-- Step 5: Recreate the enum to remove MEDIUM and LOW
-- Convert column to text temporarily
ALTER TABLE tasks ALTER COLUMN priority TYPE text;

-- Drop the old enum
DROP TYPE "TaskPriority";

-- Create new enum with only NORMAL, HIGH, URGENT
CREATE TYPE "TaskPriority" AS ENUM ('NORMAL', 'HIGH', 'URGENT');

-- Convert column back to enum
ALTER TABLE tasks ALTER COLUMN priority TYPE "TaskPriority" USING priority::"TaskPriority";

-- Step 6: Set default value for new tasks
ALTER TABLE tasks ALTER COLUMN priority SET DEFAULT 'NORMAL';

-- Step 7: Final verification
SELECT 
  COUNT(*) FILTER (WHERE priority = 'NORMAL') as normal_count,
  COUNT(*) FILTER (WHERE priority = 'HIGH') as high_count,
  COUNT(*) FILTER (WHERE priority = 'URGENT') as urgent_count,
  COUNT(*) as total_tasks
FROM tasks;

