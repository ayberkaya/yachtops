-- ============================================================================
-- Add missing index on alcohol_stocks.yacht_id for query performance
-- ============================================================================
-- This migration addresses Supabase query performance analysis showing that
-- alcohol_stocks queries filtering by yacht_id are taking 55% of total query time.
-- 
-- The index advisor recommends: CREATE INDEX ON public.alcohol_stocks USING btree (yacht_id)
-- 
-- Note: While composite indexes exist on (yacht_id, low_stock_threshold) and 
-- (yacht_id, quantity), a simple single-column index on yacht_id can provide
-- better performance for queries that only filter by yacht_id without ordering.
-- ============================================================================

-- Check if index already exists (it might exist from Prisma migrations)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'alcohol_stocks'
      AND indexname = 'alcohol_stocks_yacht_id_idx'
  ) THEN
    -- Create the index
    CREATE INDEX alcohol_stocks_yacht_id_idx ON public.alcohol_stocks USING btree (yacht_id);
    RAISE NOTICE 'Index alcohol_stocks_yacht_id_idx created successfully.';
  ELSE
    RAISE NOTICE 'Index alcohol_stocks_yacht_id_idx already exists. Skipping.';
  END IF;
END $$;

-- Verify the index was created
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'alcohol_stocks'
  AND indexname = 'alcohol_stocks_yacht_id_idx';

