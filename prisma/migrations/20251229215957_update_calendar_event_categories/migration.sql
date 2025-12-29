-- Create new enum type with updated categories
DO $$ BEGIN
    CREATE TYPE "CalendarEventCategory_new" AS ENUM ('VOYAGE', 'MARINA', 'OVERSEAS', 'FUEL_SUPPLY', 'OTHER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Remove default constraint temporarily
ALTER TABLE "calendar_events" 
    ALTER COLUMN "category" DROP DEFAULT;

-- Update table to use new enum, mapping old values to new ones
ALTER TABLE "calendar_events" 
    ALTER COLUMN "category" TYPE "CalendarEventCategory_new" 
    USING (
        CASE "category"::text
            WHEN 'VOYAGE' THEN 'VOYAGE'::"CalendarEventCategory_new"
            WHEN 'MARINA_RESERVATION' THEN 'MARINA'::"CalendarEventCategory_new"
            WHEN 'MAINTENANCE' THEN 'OTHER'::"CalendarEventCategory_new"
            WHEN 'GUEST_VISIT' THEN 'OTHER'::"CalendarEventCategory_new"
            WHEN 'CREW_CHANGE' THEN 'OTHER'::"CalendarEventCategory_new"
            WHEN 'DELIVERY' THEN 'OTHER'::"CalendarEventCategory_new"
            WHEN 'OTHER' THEN 'OTHER'::"CalendarEventCategory_new"
            ELSE 'OTHER'::"CalendarEventCategory_new"
        END
    );

-- Restore default constraint
ALTER TABLE "calendar_events" 
    ALTER COLUMN "category" SET DEFAULT 'OTHER'::"CalendarEventCategory_new";

-- Drop old enum and rename new one
DROP TYPE "CalendarEventCategory";
ALTER TYPE "CalendarEventCategory_new" RENAME TO "CalendarEventCategory";

