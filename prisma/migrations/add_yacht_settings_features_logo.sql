-- Migration: Add settings, features, and logoUrl to yachts table
-- Date: 2025-01-20

-- Add settings JSON column
ALTER TABLE yachts 
ADD COLUMN IF NOT EXISTS settings JSONB;

-- Add features JSON column
ALTER TABLE yachts 
ADD COLUMN IF NOT EXISTS features JSONB;

-- Add logoUrl column
ALTER TABLE yachts 
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Add comments for documentation
COMMENT ON COLUMN yachts.settings IS 'Tenant settings: currency, measurement system, etc.';
COMMENT ON COLUMN yachts.features IS 'Feature flags: enabled modules (inventory, finance, charter, crew)';
COMMENT ON COLUMN yachts.logo_url IS 'Path to yacht logo in Supabase Storage';

