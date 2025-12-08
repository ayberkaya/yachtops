ALTER TABLE "user_notes"
ADD COLUMN IF NOT EXISTS "content" JSONB NOT NULL DEFAULT '[]'::jsonb;


