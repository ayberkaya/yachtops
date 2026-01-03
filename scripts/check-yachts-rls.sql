-- ============================================================================
-- Check Yachts Table RLS Status
-- ============================================================================
-- Bu script yachts table'ının RLS durumunu kontrol eder
-- Supabase SQL Editor'de çalıştırın
-- ============================================================================

-- 1. Check if RLS is enabled on yachts table
SELECT 
    schemaname,
    tablename,
    rowsecurity as "RLS Enabled"
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'yachts';

-- 2. List all RLS policies on yachts table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd as "Command",
    qual as "USING Expression",
    with_check as "WITH CHECK Expression"
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'yachts'
ORDER BY policyname;

-- 3. Check if get_user_yacht_id() function exists
SELECT 
    proname as "Function Name",
    pg_get_functiondef(oid) as "Function Definition"
FROM pg_proc
WHERE proname = 'get_user_yacht_id'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 4. Count total yachts (should work with service role, but not with regular user)
SELECT COUNT(*) as "Total Yachts (Service Role)" FROM public.yachts;

-- 5. Check if there are any yachts without users
SELECT 
    y.id,
    y.name,
    y.flag,
    COUNT(u.id) as "User Count"
FROM public.yachts y
LEFT JOIN public.users u ON u.yacht_id = y.id
GROUP BY y.id, y.name, y.flag
HAVING COUNT(u.id) = 0
ORDER BY y.created_at DESC;

-- 6. Check if there are duplicate yacht names
SELECT 
    name,
    COUNT(*) as "Count",
    array_agg(id) as "Yacht IDs"
FROM public.yachts
GROUP BY name
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;

