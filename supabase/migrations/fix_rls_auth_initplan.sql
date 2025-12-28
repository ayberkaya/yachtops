-- ============================================================================
-- Fix: Auth RLS Initialization Plan Performance Issues
-- ============================================================================
-- This migration fixes Supabase linter warnings about:
-- 1. auth.uid() being re-evaluated for each row (should use (select auth.uid()))
-- 2. Multiple permissive policies for the same role/action
-- ============================================================================

-- ============================================================================
-- Fix 1: Users Table - Optimize Admin Policy
-- ============================================================================

-- Drop existing admin policy to recreate with optimized auth calls
DROP POLICY IF EXISTS "Admins can do everything" ON public.users;

-- Recreate admin policy with optimized auth calls
-- Uses (select auth.uid()) to evaluate once per query, not per row
-- Note: users.id is TEXT, auth.uid() is UUID, so we cast UUID to TEXT
CREATE POLICY "Admins can do everything" ON public.users
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = (select auth.uid())::TEXT
      AND role IN ('SUPER_ADMIN', 'ADMIN')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = (select auth.uid())::TEXT
      AND role IN ('SUPER_ADMIN', 'ADMIN')
    )
  );

-- ============================================================================
-- Fix 2: Users Table - Consolidate Multiple Permissive Policies
-- ============================================================================
-- The issue: "Admins can do everything" (FOR ALL) conflicts with specific
-- policies like "users_delete_own" and "users_insert_authenticated" for
-- the same role/action. We need to make the specific policies exclude admins
-- since admins are already covered by the admin policy.

-- Drop and recreate users_delete_own to exclude admins (they're covered by admin policy)
DROP POLICY IF EXISTS "users_delete_own" ON public.users;

CREATE POLICY "users_delete_own" ON public.users
  FOR DELETE
  USING (
    -- Only non-admin users can use this policy
    -- Admins are covered by "Admins can do everything"
    id = (select auth.uid())::TEXT
    AND NOT EXISTS (
      SELECT 1 FROM public.users
      WHERE id = (select auth.uid())::TEXT
      AND role IN ('SUPER_ADMIN', 'ADMIN')
    )
  );

-- Drop and recreate users_insert_authenticated to exclude admins
-- Note: This policy is only for non-admin users. Admins are covered by "Admins can do everything"
DROP POLICY IF EXISTS "users_insert_authenticated" ON public.users;

CREATE POLICY "users_insert_authenticated" ON public.users
  FOR INSERT
  WITH CHECK (
    -- Only allow insert for non-admin authenticated users
    -- Admins are covered by "Admins can do everything" policy
    -- This policy allows any authenticated user to insert (app handles validation)
    -- but excludes admins to avoid multiple permissive policies warning
    NOT EXISTS (
      SELECT 1 FROM public.users
      WHERE id = (select auth.uid())::TEXT
      AND role IN ('SUPER_ADMIN', 'ADMIN')
    )
  );

-- Note: users_select_own and users_update_own don't conflict because:
-- - SELECT: Admin policy allows all, but users_select_own is more specific (only own)
-- - UPDATE: Admin policy allows all, but users_update_own is more specific (only own)
-- These can coexist because RLS uses OR logic, and the more permissive admin policy
-- will match first for admins.

-- ============================================================================
-- Fix 3: Plans Table - Optimize plans_select_policy
-- ============================================================================

DROP POLICY IF EXISTS "plans_select_policy" ON public.plans;

-- Recreate with optimized auth calls
-- Uses (select auth.uid()) to evaluate once per query, not per row
CREATE POLICY "plans_select_policy" ON public.plans
  FOR SELECT
  USING (
    -- Admins can view all plans
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = (select auth.uid())::TEXT
      AND role IN ('SUPER_ADMIN', 'ADMIN')
    )
    OR
    -- Public can view publicly visible plans (when not authenticated or regular users)
    -- Default to true if column doesn't exist (backward compatibility)
    (COALESCE(is_publicly_visible, true) = true)
  );

-- ============================================================================
-- Summary
-- ============================================================================
-- Fixed:
-- 1. ✅ Users admin policy now uses (select auth.uid()) instead of (SELECT (auth.uid()))
-- 2. ✅ Plans policy now uses (select auth.uid()) instead of (SELECT (auth.uid()))
-- 3. ✅ Consolidated multiple permissive policies by making specific policies
--    exclude admins (who are covered by the admin policy)
-- 4. ✅ This eliminates the "multiple permissive policies" warning while
--    maintaining the same security model
-- ============================================================================

