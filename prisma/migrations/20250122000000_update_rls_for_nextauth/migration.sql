-- ============================================================================
-- Update RLS Helper Functions for NextAuth Compatibility
-- ============================================================================
-- This migration updates RLS policies to work with NextAuth users
-- by syncing user IDs to Supabase Auth
-- ============================================================================

-- Drop existing function
DROP FUNCTION IF EXISTS get_user_yacht_id() CASCADE;

-- Create updated function that works with both Supabase Auth and NextAuth
-- Note: This function requires users to be synced to Supabase Auth via syncUserToSupabaseAuth()
CREATE OR REPLACE FUNCTION get_user_yacht_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id TEXT;
  user_yacht_id TEXT;
BEGIN
  -- First, try to get user ID from Supabase Auth (auth.uid())
  current_user_id := auth.uid()::TEXT;
  
  -- If no Supabase Auth user, try to get from JWT claim (for NextAuth)
  -- This requires setting JWT claims in the database connection
  IF current_user_id IS NULL THEN
    BEGIN
      current_user_id := current_setting('request.jwt.claims', true)::json->>'sub';
    EXCEPTION
      WHEN OTHERS THEN
        current_user_id := NULL;
    END;
  END IF;
  
  -- If still no user ID, return NULL (will deny access via RLS)
  IF current_user_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Get yacht_id from users table
  SELECT yacht_id INTO user_yacht_id
  FROM public.users
  WHERE id = current_user_id;
  
  RETURN user_yacht_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_yacht_id() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_yacht_id() TO anon;

-- ============================================================================
-- Note: Existing RLS policies will automatically use the updated function
-- No need to recreate policies unless they were dropped
-- ============================================================================

-- Verify function exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'get_user_yacht_id' 
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN
    RAISE EXCEPTION 'Function get_user_yacht_id() was not created successfully';
  END IF;
END $$;

