-- First, clean up duplicate channels (keep the oldest one for each yacht+name combination)
-- This query deletes duplicates, keeping the one with the earliest createdAt

WITH ranked_channels AS (
  SELECT 
    id,
    yacht_id,
    name,
    created_at,
    ROW_NUMBER() OVER (PARTITION BY yacht_id, name ORDER BY created_at ASC) as rn
  FROM message_channels
)
DELETE FROM message_channels
WHERE id IN (
  SELECT id FROM ranked_channels WHERE rn > 1
);

-- Now add the unique constraint
ALTER TABLE "message_channels" 
ADD CONSTRAINT "message_channels_yacht_id_name_key" UNIQUE ("yacht_id", "name");

