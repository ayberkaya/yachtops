-- ============================================================================
-- Create push_subscriptions table for PWA push notifications
-- ============================================================================
-- This table stores Web Push API subscription objects for authenticated users
-- ============================================================================

-- Create push_subscriptions table
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);

-- Create index on endpoint for faster lookups
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON public.push_subscriptions(endpoint);

-- Enable RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS Policies
-- ============================================================================

-- Policy: Users can only insert their own subscriptions
CREATE POLICY "Users can insert their own push subscriptions"
  ON public.push_subscriptions
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Policy: Users can only select their own subscriptions
CREATE POLICY "Users can select their own push subscriptions"
  ON public.push_subscriptions
  FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Users can only delete their own subscriptions
CREATE POLICY "Users can delete their own push subscriptions"
  ON public.push_subscriptions
  FOR DELETE
  USING (user_id = auth.uid());

-- Note: UPDATE is not needed as subscriptions should be replaced (delete + insert)
-- rather than updated

-- ============================================================================
-- Trigger to update updated_at timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION update_push_subscriptions_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_push_subscriptions_updated_at
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_push_subscriptions_updated_at();

-- ============================================================================
-- Grant permissions
-- ============================================================================

GRANT SELECT, INSERT, DELETE ON public.push_subscriptions TO authenticated;
-- Note: No sequence grant needed - using UUID with gen_random_uuid(), not serial

