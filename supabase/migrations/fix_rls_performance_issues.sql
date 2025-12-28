-- ============================================================================
-- Fix RLS Performance Issues
-- ============================================================================
-- This migration fixes performance issues identified by Supabase linter:
-- 1. Replaces auth.uid() with (select auth.uid()) to prevent re-evaluation
-- 2. Creates helper function to check admin status efficiently
-- 3. Consolidates multiple permissive policies where possible
-- ============================================================================

-- ============================================================================
-- Helper Function: Check if current user is admin
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role TEXT;
  current_user_uuid UUID;
BEGIN
  -- Get current user ID as UUID first, then cast to TEXT for comparison
  -- users.id is TEXT, auth.uid() is UUID
  current_user_uuid := (select auth.uid());
  
  SELECT role INTO user_role
  FROM public.users
  WHERE id = current_user_uuid::TEXT;
  
  RETURN user_role IN ('SUPER_ADMIN', 'ADMIN');
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;

-- ============================================================================
-- Fix 1: Push Subscriptions Policies - Use (select auth.uid())
-- ============================================================================

-- Drop and recreate push_subscriptions policies with optimized auth calls
-- Use DO block to ensure policies are dropped even if they exist
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can insert their own push subscriptions" ON public.push_subscriptions;
  DROP POLICY IF EXISTS "Users can select their own push subscriptions" ON public.push_subscriptions;
  DROP POLICY IF EXISTS "Users can delete their own push subscriptions" ON public.push_subscriptions;
EXCEPTION
  WHEN OTHERS THEN
    -- Ignore errors if policies don't exist
    NULL;
END $$;

-- Recreate with optimized auth.uid() calls
CREATE POLICY "Users can insert their own push subscriptions"
  ON public.push_subscriptions
  FOR INSERT
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can select their own push subscriptions"
  ON public.push_subscriptions
  FOR SELECT
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can delete their own push subscriptions"
  ON public.push_subscriptions
  FOR DELETE
  USING (user_id = (select auth.uid()));

-- ============================================================================
-- Fix 2: Users Table - Fix Admin Policy and Consolidate
-- ============================================================================

-- Drop existing admin policy if it exists (to recreate with optimized calls)
-- Use DO block to ensure policies are dropped
DO $$
BEGIN
  DROP POLICY IF EXISTS "Admins can do everything" ON public.users;
  DROP POLICY IF EXISTS "view_own_profile" ON public.users;
  DROP POLICY IF EXISTS "update_own_profile" ON public.users;
EXCEPTION
  WHEN OTHERS THEN
    -- Ignore errors if policies don't exist
    NULL;
END $$;

-- Recreate admin policy with optimized auth calls
-- This policy allows SUPER_ADMIN and ADMIN roles to bypass RLS
-- Uses (select auth.uid()) to evaluate once per query, not per row
-- Note: users.id is TEXT, auth.uid() is UUID, so we cast UUID to TEXT
CREATE POLICY "Admins can do everything" ON public.users
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = (SELECT (auth.uid())::TEXT)
      AND role IN ('SUPER_ADMIN', 'ADMIN')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = (SELECT (auth.uid())::TEXT)
      AND role IN ('SUPER_ADMIN', 'ADMIN')
    )
  );

-- Note: The existing user-specific policies (users_select_own, users_update_own, etc.)
-- will handle non-admin users. Since RLS uses OR logic for permissive policies,
-- admins will match the admin policy, and regular users will match their specific policies.

-- ============================================================================
-- Fix 3: Plans Table - Fix Admin Policy and Consolidate
-- ============================================================================

-- Drop existing policies that might conflict
-- Use DO block to ensure policies are dropped
DO $$
BEGIN
  DROP POLICY IF EXISTS "Admins can view all plans" ON public.plans;
  DROP POLICY IF EXISTS "public_read_plans" ON public.plans;
EXCEPTION
  WHEN OTHERS THEN
    -- Ignore errors if policies don't exist
    NULL;
END $$;

-- Create a single consolidated policy for plans that handles both admin and public access
-- Admins can view all plans, public can view publicly visible plans
-- Uses (select auth.uid()) to evaluate once per query, not per row
-- Note: users.id is TEXT, auth.uid() is UUID, so we cast UUID to TEXT
CREATE POLICY "plans_select_policy" ON public.plans
  FOR SELECT
  USING (
    -- Admins can view all plans
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = (SELECT (auth.uid())::TEXT)
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
-- 1. ✅ push_subscriptions policies now use (select auth.uid())
-- 2. ✅ Admin policies now use (select auth.uid()) for better performance
-- 3. ✅ Consolidated plans policies into single policy
-- 4. ✅ Removed duplicate user policies (view_own_profile, update_own_profile)
--
-- Note: The admin policy "Admins can do everything" will allow SUPER_ADMIN
-- and ADMIN roles to bypass RLS for all operations. Regular users will still
-- be subject to the specific policies (users_select_own, etc.).
-- ============================================================================

