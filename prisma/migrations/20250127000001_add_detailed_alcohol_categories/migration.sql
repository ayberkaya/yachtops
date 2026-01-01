-- Add detailed alcohol categories to AlcoholCategory enum
-- This migration adds popular alcohol types for better categorization

-- First, drop the existing enum and recreate with new values
-- Note: This requires dropping dependent columns temporarily
ALTER TABLE alcohol_stocks DROP CONSTRAINT IF EXISTS alcohol_stocks_category_fkey;

-- Drop and recreate enum with new values
DROP TYPE IF EXISTS "AlcoholCategory" CASCADE;

CREATE TYPE "AlcoholCategory" AS ENUM (
  'WINE',
  'BEER',
  'WHISKEY',
  'VODKA',
  'RUM',
  'GIN',
  'TEQUILA',
  'CHAMPAGNE',
  'COGNAC',
  'BRANDY',
  'SCOTCH',
  'BOURBON',
  'PROSECCO',
  'SAKE',
  'CIDER',
  'PORT',
  'SHERRY',
  'LIQUEURS',
  'VERMOUTH',
  'ABSINTHE',
  'SPIRITS'
);

-- Re-add the column with the new enum
ALTER TABLE alcohol_stocks 
  ADD COLUMN IF NOT EXISTS category "AlcoholCategory";

-- Update existing values to match new enum
-- Map old values to new ones
UPDATE alcohol_stocks 
SET category = 'WINE' 
WHERE category::text = 'WINE';

UPDATE alcohol_stocks 
SET category = 'BEER' 
WHERE category::text = 'BEER';

UPDATE alcohol_stocks 
SET category = 'SPIRITS' 
WHERE category::text = 'SPIRITS';

