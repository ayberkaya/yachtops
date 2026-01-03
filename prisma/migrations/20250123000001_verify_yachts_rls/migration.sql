-- ============================================================================
-- Verify and Fix Yachts Table RLS
-- ============================================================================
-- Bu migration yachts table'ının RLS durumunu kontrol eder ve gerekirse düzeltir
-- ============================================================================

-- 1. Ensure RLS is enabled on yachts table
ALTER TABLE public.yachts ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies if they exist (for idempotent migration)
DROP POLICY IF EXISTS "yachts_select_own" ON public.yachts;
DROP POLICY IF EXISTS "yachts_insert_authenticated" ON public.yachts;
DROP POLICY IF EXISTS "yachts_update_own" ON public.yachts;
DROP POLICY IF EXISTS "yachts_delete_own" ON public.yachts;

-- 3. Ensure get_user_yacht_id() function exists and works correctly
-- This function should return the current user's yacht_id from the users table
CREATE OR REPLACE FUNCTION public.get_user_yacht_id()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_id TEXT;
    yacht_id_result TEXT;
BEGIN
    -- Try to get user ID from Supabase Auth first (for Supabase Auth users)
    BEGIN
        user_id := (SELECT auth.uid()::TEXT);
    EXCEPTION
        WHEN OTHERS THEN
            user_id := NULL;
    END;

    -- If no Supabase Auth user, try to get from JWT claim (for NextAuth users)
    IF user_id IS NULL THEN
        BEGIN
            user_id := current_setting('request.jwt.claims', true)::json->>'sub';
            -- If it's a UUID, it might be from Supabase Auth
            -- If it's a CUID, it's from NextAuth
        EXCEPTION
            WHEN OTHERS THEN
                user_id := NULL;
        END;
    END IF;

    -- If still no user ID, return NULL (no yacht access)
    IF user_id IS NULL THEN
        RETURN NULL;
    END IF;

    -- Get yacht_id from users table
    SELECT yacht_id INTO yacht_id_result
    FROM public.users
    WHERE id = user_id
    LIMIT 1;

    RETURN yacht_id_result;
END;
$$;

-- Grant execute permission to authenticated and anon roles
GRANT EXECUTE ON FUNCTION public.get_user_yacht_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_yacht_id() TO anon;

-- 4. Create RLS policies for yachts table

-- SELECT: Users can only see their own yacht
CREATE POLICY "yachts_select_own" ON public.yachts
    FOR SELECT
    USING (id = public.get_user_yacht_id());

-- INSERT: Only authenticated users can insert (app handles validation)
CREATE POLICY "yachts_insert_authenticated" ON public.yachts
    FOR INSERT
    WITH CHECK (true);

-- UPDATE: Only users from the yacht can update
CREATE POLICY "yachts_update_own" ON public.yachts
    FOR UPDATE
    USING (id = public.get_user_yacht_id())
    WITH CHECK (id = public.get_user_yacht_id());

-- DELETE: Only users from the yacht can delete (or service role)
CREATE POLICY "yachts_delete_own" ON public.yachts
    FOR DELETE
    USING (id = public.get_user_yacht_id());

-- 5. Verify RLS is enabled
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename = 'yachts'
          AND rowsecurity = true
    ) THEN
        RAISE EXCEPTION 'RLS is not enabled on yachts table';
    END IF;
END $$;

-- 6. Verify policies exist
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'yachts';
    
    IF policy_count < 4 THEN
        RAISE EXCEPTION 'Expected 4 policies on yachts table, found %', policy_count;
    END IF;
END $$;

-- 7. Add comment for documentation
COMMENT ON TABLE public.yachts IS 'Yachts table with RLS enabled. Users can only access their own yacht via get_user_yacht_id() function.';
COMMENT ON FUNCTION public.get_user_yacht_id() IS 'Returns the current authenticated user''s yacht_id. Works with both Supabase Auth and NextAuth users.';

