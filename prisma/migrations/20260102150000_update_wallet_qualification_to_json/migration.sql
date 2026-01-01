-- Update wallet_qualification to wallet_qualifications (JSON array)
-- First, drop the old column
ALTER TABLE "public"."users" DROP COLUMN IF EXISTS "wallet_qualification";

-- Add the new JSON column
ALTER TABLE "public"."users" 
ADD COLUMN "wallet_qualifications" TEXT;

