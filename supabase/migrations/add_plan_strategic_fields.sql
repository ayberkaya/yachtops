-- Add strategic revenue fields to plans table
-- Date: 2025-01-20

-- Add limits JSONB column for plan limits (maxUsers, maxStorage, maxGuests, etc.)
ALTER TABLE plans 
ADD COLUMN IF NOT EXISTS limits JSONB DEFAULT '{}'::jsonb;

-- Add isPopular boolean to highlight "Best Seller"
ALTER TABLE plans 
ADD COLUMN IF NOT EXISTS is_popular BOOLEAN DEFAULT false;

-- Add tier integer for visual sorting (1, 2, 3, etc.)
ALTER TABLE plans 
ADD COLUMN IF NOT EXISTS tier INTEGER DEFAULT 0;

-- Add is_publicly_visible boolean for visibility control
ALTER TABLE plans 
ADD COLUMN IF NOT EXISTS is_publicly_visible BOOLEAN DEFAULT true;

-- Add monthly_price and yearly_price for separate pricing
ALTER TABLE plans 
ADD COLUMN IF NOT EXISTS monthly_price NUMERIC(10, 2);
ALTER TABLE plans 
ADD COLUMN IF NOT EXISTS yearly_price NUMERIC(10, 2);

-- Migrate existing price to monthly_price if not set
UPDATE plans 
SET monthly_price = price 
WHERE monthly_price IS NULL AND price IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN plans.limits IS 'Plan limits: maxUsers, maxStorage (GB), maxGuests, etc.';
COMMENT ON COLUMN plans.is_popular IS 'Highlight this plan as "Best Seller" or "Most Popular"';
COMMENT ON COLUMN plans.tier IS 'Visual tier for sorting (1 = lowest, higher = premium)';
COMMENT ON COLUMN plans.is_publicly_visible IS 'Whether this plan is visible on public pricing page';

-- Create index for tier sorting
CREATE INDEX IF NOT EXISTS idx_plans_tier ON plans(tier, is_popular DESC);

