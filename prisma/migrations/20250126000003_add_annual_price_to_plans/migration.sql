-- Migration: Add annual_price column to plans table
-- Date: 2025-01-26
-- Purpose: Add annual_price column that exists in Prisma schema but not in database

-- Add annual_price column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'plans' 
      AND column_name = 'annual_price'
  ) THEN
    ALTER TABLE plans ADD COLUMN annual_price DOUBLE PRECISION;
    RAISE NOTICE 'Added annual_price column to plans table';
  ELSE
    RAISE NOTICE 'annual_price column already exists';
  END IF;
END $$;

-- Verify the column was added
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'plans' 
  AND column_name IN ('monthly_price', 'annual_price')
ORDER BY column_name;

