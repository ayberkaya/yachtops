-- AlterTable
ALTER TABLE "shopping_lists" ADD COLUMN IF NOT EXISTS "trip_id" TEXT;

-- AddForeignKey (only if constraint doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'shopping_lists_trip_id_fkey'
        AND table_name = 'shopping_lists'
    ) THEN
        ALTER TABLE "shopping_lists" ADD CONSTRAINT "shopping_lists_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

