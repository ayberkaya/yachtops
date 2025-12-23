-- ============================================================================
-- Storage RLS Policies Migration
-- ============================================================================
-- This migration creates RLS policies for Supabase Storage to enforce
-- tenant isolation based on yacht_id. Files must be organized as:
-- /{yacht_id}/{folder}/{filename}
-- ============================================================================

-- ============================================================================
-- Step 1: Create 'helmops-files' bucket if it doesn't exist
-- ============================================================================
-- Note: Bucket creation via SQL may fail due to permissions.
-- If this fails, create the bucket manually via:
-- 1. Supabase Dashboard → Storage → New bucket → 'helmops-files' (private)
-- 2. Or via Storage API: supabase.storage.createBucket('helmops-files', { public: false })

DO $$
BEGIN
  -- Try to insert bucket, but ignore errors if we don't have permission
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'helmops-files',
    'helmops-files',
    false, -- Private bucket
    52428800, -- 50MB file size limit
    NULL -- Allow all MIME types
  )
  ON CONFLICT (id) DO NOTHING;
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Cannot create bucket via SQL. Please create manually via Supabase Dashboard or Storage API.';
  WHEN OTHERS THEN
    -- If bucket already exists or other error, continue
    RAISE NOTICE 'Bucket creation skipped: %', SQLERRM;
END $$;

-- ============================================================================
-- Step 2: Verify RLS is enabled on storage.objects and storage.buckets
-- ============================================================================
-- Note: RLS is typically enabled by default on Supabase storage tables
-- We skip ALTER TABLE commands as we don't have ownership of these tables
-- If RLS is not enabled, policies will fail and you'll need to enable it via
-- Supabase Dashboard → Storage → Settings → Enable RLS

-- ============================================================================
-- Step 3: Helper function to extract yacht_id from JWT
-- ============================================================================

-- Create or replace function to get yacht_id from JWT user_metadata
CREATE OR REPLACE FUNCTION get_jwt_yacht_id()
RETURNS TEXT AS $$
BEGIN
  -- Extract yacht_id from JWT user_metadata
  -- Format: auth.jwt() -> 'user_metadata' -> 'yacht_id'
  RETURN (auth.jwt() -> 'user_metadata' ->> 'yacht_id')::TEXT;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_jwt_yacht_id() TO authenticated;
GRANT EXECUTE ON FUNCTION get_jwt_yacht_id() TO anon;

-- ============================================================================
-- Step 4: Drop existing policies if they exist (for idempotent migration)
-- ============================================================================

DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop existing storage policies
    FOR r IN (
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'storage'
        AND tablename IN ('objects', 'buckets')
        AND policyname IN (
            'storage_objects_select_own_yacht',
            'storage_objects_insert_own_yacht',
            'storage_objects_update_own_yacht',
            'storage_objects_delete_own_yacht',
            'Tenant Isolation Policy - SELECT',
            'Tenant Isolation Policy - INSERT',
            'Tenant Isolation Policy - UPDATE',
            'Tenant Isolation Policy - DELETE',
            'storage_buckets_select_own_yacht'
        )
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.%I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- ============================================================================
-- Step 5: Create RLS policies for storage.objects
-- ============================================================================
-- Tenant Isolation Policy: Users can only access files where the first
-- path segment matches their yacht_id from JWT user_metadata

-- Policy: SELECT - Users can only see files in paths starting with their yacht_id
CREATE POLICY "Tenant Isolation Policy - SELECT"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  -- Check if user is authenticated and has yacht_id in JWT
  auth.role() = 'authenticated'
  AND get_jwt_yacht_id() IS NOT NULL
  -- Extract first path segment (yacht_id) and compare with JWT yacht_id
  -- Path format: /{yacht_id}/{category}/{filename}
  -- split_part(name, '/', 2) extracts the yacht_id (first segment after leading slash)
  -- Equivalent to: (storage.foldername(name))[1] = (auth.jwt() -> 'user_metadata' ->> 'yacht_id')
  AND split_part(name, '/', 2) = get_jwt_yacht_id()
);

-- Policy: INSERT - Users can only upload files to paths starting with their yacht_id
CREATE POLICY "Tenant Isolation Policy - INSERT"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  -- Check if user is authenticated and has yacht_id in JWT
  auth.role() = 'authenticated'
  AND get_jwt_yacht_id() IS NOT NULL
  -- Ensure the path starts with the user's yacht_id
  -- Path format: /{yacht_id}/{category}/{filename}
  AND split_part(name, '/', 2) = get_jwt_yacht_id()
  -- Ensure bucket is 'helmops-files'
  AND bucket_id = 'helmops-files'
);

-- Policy: UPDATE - Users can only update files in paths starting with their yacht_id
CREATE POLICY "Tenant Isolation Policy - UPDATE"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  -- Check if user is authenticated and has yacht_id in JWT
  auth.role() = 'authenticated'
  AND get_jwt_yacht_id() IS NOT NULL
  -- Ensure the path starts with the user's yacht_id
  AND split_part(name, '/', 2) = get_jwt_yacht_id()
)
WITH CHECK (
  -- Also check the new path (if name is being updated)
  auth.role() = 'authenticated'
  AND get_jwt_yacht_id() IS NOT NULL
  AND split_part(name, '/', 2) = get_jwt_yacht_id()
);

-- Policy: DELETE - Users can only delete files in paths starting with their yacht_id
CREATE POLICY "Tenant Isolation Policy - DELETE"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  -- Check if user is authenticated and has yacht_id in JWT
  auth.role() = 'authenticated'
  AND get_jwt_yacht_id() IS NOT NULL
  -- Ensure the path starts with the user's yacht_id
  AND split_part(name, '/', 2) = get_jwt_yacht_id()
);

-- ============================================================================
-- Step 6: Create RLS policies for storage.buckets
-- ============================================================================

-- Policy: SELECT - Users can only see the 'helmops-files' bucket
CREATE POLICY storage_buckets_select_own_yacht
ON storage.buckets
FOR SELECT
TO authenticated
USING (
  -- Check if user is authenticated
  auth.role() = 'authenticated'
  -- Only allow access to 'helmops-files' bucket
  AND id = 'helmops-files'
);

-- ============================================================================
-- Step 7: Verify policies were created
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
    AND (policyname LIKE 'Tenant Isolation Policy%' OR policyname LIKE 'storage_objects_%');
    
    IF policy_count < 4 THEN
        RAISE EXCEPTION 'Expected 4 policies on storage.objects, found %', policy_count;
    END IF;
    
    -- Count policies on storage.buckets
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'buckets'
    AND policyname LIKE 'storage_buckets_%';
    
    IF policy_count < 1 THEN
        RAISE EXCEPTION 'Expected 1 policy on storage.buckets, found %', policy_count;
    END IF;
    
    RAISE NOTICE 'Storage RLS policies created successfully';
END $$;

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- Summary:
-- 1. Attempted to create 'helmops-files' bucket (may require manual creation)
-- 2. RLS should already be enabled on storage.objects and storage.buckets
-- 3. Created helper function get_jwt_yacht_id() to extract yacht_id from JWT
-- 4. Created policies for SELECT, INSERT, UPDATE, DELETE on storage.objects
-- 5. Created policy for SELECT on storage.buckets
--
-- Security:
-- - Users can only access files in paths starting with their yacht_id
-- - Path format must be: /{yacht_id}/{folder}/{filename}
-- - All operations require authentication
-- - Bucket is private (not publicly accessible)
--
-- Important Notes:
-- - If bucket creation fails, create it manually via Supabase Dashboard
-- - If RLS is not enabled on storage tables, enable it via Dashboard → Storage → Settings
-- - Ensure your JWT includes yacht_id in user_metadata (see auth.ts)
-- ============================================================================

