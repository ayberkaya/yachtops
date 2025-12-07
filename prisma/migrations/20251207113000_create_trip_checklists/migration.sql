-- Ensure the TripChecklistType enum exists (idempotent for existing DBs)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'TripChecklistType'
  ) THEN
    CREATE TYPE "TripChecklistType" AS ENUM ('PRE_DEPARTURE', 'POST_ARRIVAL');
  END IF;
END
$$;

-- Create the trip_checklist_items table if it's missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'trip_checklist_items'
  ) THEN
    CREATE TABLE "public"."trip_checklist_items" (
      "id" TEXT PRIMARY KEY,
      "trip_id" TEXT NOT NULL,
      "type" "TripChecklistType" NOT NULL,
      "title" TEXT NOT NULL,
      "remarks" TEXT,
      "completed" BOOLEAN NOT NULL DEFAULT false,
      "completed_at" TIMESTAMP(3),
      "completed_by_id" TEXT,
      "order_index" INTEGER NOT NULL DEFAULT 0,
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX "trip_checklist_items_trip_id_type_idx"
      ON "public"."trip_checklist_items" ("trip_id", "type");

    ALTER TABLE "public"."trip_checklist_items"
      ADD CONSTRAINT "trip_checklist_items_trip_id_fkey"
      FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;

    ALTER TABLE "public"."trip_checklist_items"
      ADD CONSTRAINT "trip_checklist_items_completed_by_id_fkey"
      FOREIGN KEY ("completed_by_id") REFERENCES "public"."users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

