-- Migration: Add active column to plans table
-- Date: 2025-01-26
-- Purpose: Add active column that exists in Prisma schema but not in database

-- Add active column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'plans' 
      AND column_name = 'active'
  ) THEN
    ALTER TABLE plans ADD COLUMN active BOOLEAN NOT NULL DEFAULT true;
    RAISE NOTICE 'Added active column to plans table';
  ELSE
    RAISE NOTICE 'active column already exists';
  END IF;
END $$;

-- Verify the column was added
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'plans' 
  AND column_name = 'active';

