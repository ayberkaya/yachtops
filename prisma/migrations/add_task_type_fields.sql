-- Add TaskType enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE "TaskType" AS ENUM ('GENERAL', 'MAINTENANCE', 'REPAIR', 'INSPECTION');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add new columns to tasks table
ALTER TABLE "tasks" 
ADD COLUMN IF NOT EXISTS "type" "TaskType" NOT NULL DEFAULT 'GENERAL',
ADD COLUMN IF NOT EXISTS "cost" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'EUR',
ADD COLUMN IF NOT EXISTS "service_provider" TEXT;

