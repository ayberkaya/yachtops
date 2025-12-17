-- ============================================================================
-- RLS Migration Part 9: Sensitive Tables
-- ============================================================================
-- Policies for sensitive tables (audit_logs, usage_events)
-- ============================================================================

-- AUDIT_LOGS: No client access (service role only)
-- No policies = no client access

-- USAGE_EVENTS: No client read access, but allow insert for tracking
CREATE POLICY "usage_events_insert_own"
ON public.usage_events
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- No SELECT/UPDATE/DELETE policies = no client access


