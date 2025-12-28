-- Add Plan model and Yacht subscription fields
-- This migration adds subscription fields to yachts table
-- Note: plans table should already exist from supabase/migrations/create_plans_table.sql
-- Plans table uses UUID for id, so we'll use TEXT to match Prisma's String type

-- Add subscription fields to yachts table if they don't exist
DO $$ 
BEGIN
    -- Add current_plan_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'yachts' AND column_name = 'current_plan_id'
    ) THEN
        ALTER TABLE "yachts" ADD COLUMN "current_plan_id" UUID REFERENCES "plans"("id") ON DELETE SET NULL;
    END IF;

    -- Add subscription_status column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'yachts' AND column_name = 'subscription_status'
    ) THEN
        ALTER TABLE "yachts" ADD COLUMN "subscription_status" TEXT;
    END IF;
END $$;

-- Foreign key is already added in the column definition above

-- Create index on current_plan_id for faster lookups
CREATE INDEX IF NOT EXISTS "yachts_current_plan_id_idx" ON "yachts"("current_plan_id");

