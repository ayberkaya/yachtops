-- CreateEnum (only if it doesn't exist)
DO $$ BEGIN
    CREATE TYPE "CalendarEventCategory" AS ENUM ('VOYAGE', 'MAINTENANCE', 'GUEST_VISIT', 'MARINA_RESERVATION', 'CREW_CHANGE', 'DELIVERY', 'OTHER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS "calendar_events" (
    "id" TEXT NOT NULL,
    "yacht_id" TEXT NOT NULL,
    "trip_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "CalendarEventCategory" NOT NULL DEFAULT 'OTHER',
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "color" TEXT,
    "created_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (only if they don't exist)
CREATE INDEX IF NOT EXISTS "calendar_events_yacht_id_start_date_end_date_idx" ON "calendar_events"("yacht_id", "start_date", "end_date");

CREATE INDEX IF NOT EXISTS "calendar_events_yacht_id_category_idx" ON "calendar_events"("yacht_id", "category");

CREATE INDEX IF NOT EXISTS "calendar_events_trip_id_idx" ON "calendar_events"("trip_id");

-- AddForeignKey (only if they don't exist)
DO $$ BEGIN
    ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_yacht_id_fkey" FOREIGN KEY ("yacht_id") REFERENCES "yachts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

