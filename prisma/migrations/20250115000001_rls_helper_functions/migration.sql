-- ============================================================================
-- RLS Migration Part 1: Helper Functions
-- ============================================================================
-- Creates helper functions used by all RLS policies
-- ============================================================================

-- Helper Function: Get Current User's Yacht ID
-- This function retrieves the yacht_id for the currently authenticated user.
-- Returns NULL if user doesn't exist or has no yacht_id.
CREATE OR REPLACE FUNCTION public.get_user_yacht_id()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT yacht_id
    FROM public.users
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper Function: Check if User Can Modify Yacht ID
-- Only OWNER or CAPTAIN roles can modify yacht_id.
-- Returns true if user is OWNER or CAPTAIN, false otherwise.
CREATE OR REPLACE FUNCTION public.can_modify_yacht_id()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT role IN ('OWNER', 'CAPTAIN')
    FROM public.users
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;


