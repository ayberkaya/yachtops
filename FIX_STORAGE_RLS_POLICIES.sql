-- ============================================================================
-- FIX: Storage RLS Policies for helmops-files bucket
-- ============================================================================
-- This SQL fixes the RLS policies to match the JWT payload key: yacht_id
-- Path format must be: /{yacht_id}/{category}/{filename}
-- ============================================================================

-- Step 1: Drop ALL existing storage policies on helmops-files
-- ============================================================================

DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop all existing policies on storage.objects
    FOR r IN (
        SELECT policyname, tablename
        FROM pg_policies
        WHERE schemaname = 'storage'
        AND tablename = 'objects'
        AND (
            policyname LIKE '%yacht%' 
            OR policyname LIKE '%Tenant%'
            OR policyname LIKE '%storage_objects%'
        )
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.%I', r.policyname, r.tablename);
        RAISE NOTICE 'Dropped policy: % on storage.%', r.policyname, r.tablename;
    END LOOP;
    
    -- Drop all existing policies on storage.buckets
    FOR r IN (
        SELECT policyname, tablename
        FROM pg_policies
        WHERE schemaname = 'storage'
        AND tablename = 'buckets'
        AND (
            policyname LIKE '%yacht%'
            OR policyname LIKE '%storage_buckets%'
        )
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.%I', r.policyname, r.tablename);
        RAISE NOTICE 'Dropped policy: % on storage.%', r.policyname, r.tablename;
    END LOOP;
END $$;

-- ============================================================================
-- Step 2: Recreate helper function (ensures it uses yacht_id)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_jwt_yacht_id()
RETURNS TEXT AS $$
BEGIN
  -- Extract yacht_id from JWT user_metadata
  -- JWT payload key: user_metadata.yacht_id (snake_case)
  RETURN (auth.jwt() -> 'user_metadata' ->> 'yacht_id')::TEXT;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_jwt_yacht_id() TO authenticated;
GRANT EXECUTE ON FUNCTION get_jwt_yacht_id() TO anon;

-- ============================================================================
-- Step 3: Create NEW robust RLS policies for storage.objects
-- ============================================================================

-- Policy: SELECT - Users can only see files in their yacht's path
CREATE POLICY "helmops_files_select_policy"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  -- Must be authenticated
  auth.role() = 'authenticated'
  -- JWT must contain yacht_id
  AND get_jwt_yacht_id() IS NOT NULL
  AND get_jwt_yacht_id() != ''
  -- Path must be in helmops-files bucket
  AND bucket_id = 'helmops-files'
  -- First path segment (after leading slash) must match yacht_id
  -- Path format: /{yacht_id}/{category}/{filename}
  -- split_part(name, '/', 2) extracts yacht_id (first segment after /)
  AND split_part(name, '/', 2) = get_jwt_yacht_id()
);

-- Policy: INSERT - Users can only upload to their yacht's path
CREATE POLICY "helmops_files_insert_policy"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  -- Must be authenticated
  auth.role() = 'authenticated'
  -- JWT must contain yacht_id
  AND get_jwt_yacht_id() IS NOT NULL
  AND get_jwt_yacht_id() != ''
  -- Path must be in helmops-files bucket
  AND bucket_id = 'helmops-files'
  -- First path segment must match yacht_id
  -- Path format: /{yacht_id}/{category}/{filename}
  AND split_part(name, '/', 2) = get_jwt_yacht_id()
  -- Ensure path starts with / (required for split_part to work correctly)
  AND name LIKE '/%'
);

-- Policy: UPDATE - Users can only update files in their yacht's path
CREATE POLICY "helmops_files_update_policy"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  -- Check existing file path
  auth.role() = 'authenticated'
  AND get_jwt_yacht_id() IS NOT NULL
  AND get_jwt_yacht_id() != ''
  AND bucket_id = 'helmops-files'
  AND split_part(name, '/', 2) = get_jwt_yacht_id()
)
WITH CHECK (
  -- Check new file path (if name is being updated)
  auth.role() = 'authenticated'
  AND get_jwt_yacht_id() IS NOT NULL
  AND get_jwt_yacht_id() != ''
  AND bucket_id = 'helmops-files'
  AND split_part(name, '/', 2) = get_jwt_yacht_id()
);

-- Policy: DELETE - Users can only delete files in their yacht's path
CREATE POLICY "helmops_files_delete_policy"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  -- Must be authenticated
  auth.role() = 'authenticated'
  -- JWT must contain yacht_id
  AND get_jwt_yacht_id() IS NOT NULL
  AND get_jwt_yacht_id() != ''
  -- Path must be in helmops-files bucket
  AND bucket_id = 'helmops-files'
  -- First path segment must match yacht_id
  AND split_part(name, '/', 2) = get_jwt_yacht_id()
);

-- ============================================================================
-- Step 4: Create RLS policy for storage.buckets
-- ============================================================================

CREATE POLICY "helmops_files_bucket_select_policy"
ON storage.buckets
FOR SELECT
TO authenticated
USING (
  -- Must be authenticated
  auth.role() = 'authenticated'
  -- Only allow access to helmops-files bucket
  AND id = 'helmops-files'
);

-- ============================================================================
-- Step 5: Verification
-- ============================================================================

DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    -- Count policies on storage.objects
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname LIKE 'helmops_files_%';
    
    IF policy_count < 4 THEN
        RAISE EXCEPTION 'Expected 4 policies on storage.objects, found %', policy_count;
    END IF;
    
    -- Count policies on storage.buckets
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'buckets'
    AND policyname LIKE 'helmops_files_%';
    
    IF policy_count < 1 THEN
        RAISE EXCEPTION 'Expected 1 policy on storage.buckets, found %', policy_count;
    END IF;
    
    RAISE NOTICE '✅ Storage RLS policies created successfully!';
    RAISE NOTICE '📋 Policies created:';
    RAISE NOTICE '   - helmops_files_select_policy (SELECT)';
    RAISE NOTICE '   - helmops_files_insert_policy (INSERT)';
    RAISE NOTICE '   - helmops_files_update_policy (UPDATE)';
    RAISE NOTICE '   - helmops_files_delete_policy (DELETE)';
    RAISE NOTICE '   - helmops_files_bucket_select_policy (SELECT on buckets)';
END $$;

-- ============================================================================
-- IMPORTANT NOTES:
-- ============================================================================
-- 1. JWT Key: The policy checks for user_metadata.yacht_id (snake_case)
-- 2. Path Format: Files MUST be uploaded as /{yacht_id}/{category}/{filename}
--    Example: /abc123/receipts/invoice.pdf
-- 3. Bucket: All policies are scoped to 'helmops-files' bucket
-- 4. Authentication: All policies require authenticated role
-- 5. Null Check: Policies validate that yacht_id is not NULL or empty
-- ============================================================================

