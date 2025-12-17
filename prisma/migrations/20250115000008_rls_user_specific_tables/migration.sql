-- ============================================================================
-- RLS Migration Part 8: User-Specific Tables
-- ============================================================================
-- Policies for tables that are user-specific (notifications, user_notes)
-- ============================================================================

-- NOTIFICATIONS (via user_id, check user's yacht_id)
CREATE POLICY "notifications_select_own"
ON public.notifications
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "notifications_insert_own"
ON public.notifications
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "notifications_update_own"
ON public.notifications
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "notifications_delete_own"
ON public.notifications
FOR DELETE
USING (user_id = auth.uid());

-- USER_NOTES (via user_id, check user's yacht_id)
CREATE POLICY "user_notes_select_own"
ON public.user_notes
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "user_notes_insert_own"
ON public.user_notes
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_notes_update_own"
ON public.user_notes
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_notes_delete_own"
ON public.user_notes
FOR DELETE
USING (user_id = auth.uid());

-- USER_NOTE_CHECKLIST_ITEMS (via user_notes)
CREATE POLICY "user_note_checklist_items_select_own"
ON public.user_note_checklist_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_notes
    WHERE user_notes.id = user_note_checklist_items.note_id
    AND user_notes.user_id = auth.uid()
  )
);

CREATE POLICY "user_note_checklist_items_insert_own"
ON public.user_note_checklist_items
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_notes
    WHERE user_notes.id = user_note_checklist_items.note_id
    AND user_notes.user_id = auth.uid()
  )
);

CREATE POLICY "user_note_checklist_items_update_own"
ON public.user_note_checklist_items
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_notes
    WHERE user_notes.id = user_note_checklist_items.note_id
    AND user_notes.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_notes
    WHERE user_notes.id = user_note_checklist_items.note_id
    AND user_notes.user_id = auth.uid()
  )
);

CREATE POLICY "user_note_checklist_items_delete_own"
ON public.user_note_checklist_items
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_notes
    WHERE user_notes.id = user_note_checklist_items.note_id
    AND user_notes.user_id = auth.uid()
  )
);


