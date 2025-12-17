-- ============================================================================
-- RLS Migration Part 3: Users and Yachts Table Policies
-- ============================================================================
-- Policies for core tables: users and yachts
-- ============================================================================

-- USERS TABLE POLICIES
-- Users can only SELECT and UPDATE their own row.
-- Users cannot change their yacht_id unless they are OWNER or CAPTAIN.

-- SELECT: Users can see their own row
CREATE POLICY "users_select_own"
ON public.users
FOR SELECT
USING (id = auth.uid());

-- UPDATE: Users can update their own row, but cannot change yacht_id unless OWNER/CAPTAIN
-- Note: This policy allows updates to own row, but restricts yacht_id changes based on role.
-- If yacht_id is not included in UPDATE statement, it keeps old value (allowed).
-- If yacht_id is changed, can_modify_yacht_id() must return true.
CREATE POLICY "users_update_own"
ON public.users
FOR UPDATE
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid()
  AND (
    -- Case 1: yacht_id is not being changed (either not in UPDATE or same value)
    -- PostgreSQL will use OLD value if column not in UPDATE statement
    (yacht_id IS NOT DISTINCT FROM (
      SELECT yacht_id FROM public.users WHERE id = auth.uid()
    ))
    OR
    -- Case 2: yacht_id is being changed, but user has permission (OWNER/CAPTAIN)
    (public.can_modify_yacht_id() = true)
  )
);

-- INSERT: Only service role can insert (via application logic)
-- No policy = no client access

-- DELETE: Only service role can delete (via application logic)
-- No policy = no client access

-- YACHTS TABLE POLICIES
-- Users can only see yachts that match their yacht_id
CREATE POLICY "yachts_select_own"
ON public.yachts
FOR SELECT
USING (id = public.get_user_yacht_id());

-- INSERT/UPDATE/DELETE: Only service role (via application logic)
-- No policies = no client access


