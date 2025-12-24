-- Add description/sales_pitch and sales_metadata columns to plans table
ALTER TABLE plans 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS sales_pitch TEXT,
ADD COLUMN IF NOT EXISTS sales_metadata JSONB;

-- Add plan_id column to public.users table
-- Note: plans.id is UUID, but we'll use TEXT to match users.id type or UUID depending on your setup
-- Check your plans table structure - if plans.id is UUID, use UUID; if TEXT, use TEXT
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES plans(id) ON DELETE SET NULL;

-- Update existing plans with descriptions
UPDATE plans 
SET description = CASE
  WHEN name = 'Essentials' THEN 'Perfect for small vessels under 30m. Essential expense tracking and crew management tools to keep your operations organized and efficient.'
  WHEN name = 'Professional' THEN 'Ideal for mid-size vessels (30-60m). Advanced reporting, inventory management, and voyage planning capabilities for professional yacht operations.'
  WHEN name = 'Enterprise' THEN 'Tailored solutions for large vessels (60m+). Dedicated account management, custom features, and 24/7 support for enterprise-level operations.'
  ELSE description
END
WHERE description IS NULL;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_users_plan_id ON public.users(plan_id) WHERE plan_id IS NOT NULL;

