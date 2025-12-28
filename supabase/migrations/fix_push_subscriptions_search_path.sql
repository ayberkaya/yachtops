-- ============================================================================
-- Fix: Make search_path immutable for update_push_subscriptions_updated_at function
-- ============================================================================
-- This fixes the Supabase security warning about mutable search_path
-- ============================================================================

-- Drop and recreate the function with immutable search_path
DROP FUNCTION IF EXISTS public.update_push_subscriptions_updated_at();

CREATE OR REPLACE FUNCTION public.update_push_subscriptions_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = pg_catalog.now();
  RETURN NEW;
END;
$$;

-- Recreate the trigger (it will be automatically recreated, but explicit is better)
DROP TRIGGER IF EXISTS update_push_subscriptions_updated_at ON public.push_subscriptions;

CREATE TRIGGER update_push_subscriptions_updated_at
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_push_subscriptions_updated_at();

