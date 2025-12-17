-- ============================================================================
-- RLS Migration Part 7: Related Tables - Messages
-- ============================================================================
-- Policies for message-related tables (via message_channels)
-- ============================================================================

-- MESSAGES (via message_channels)
CREATE POLICY "messages_select_own_yacht"
ON public.messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.message_channels
    WHERE message_channels.id = messages.channel_id
    AND message_channels.yacht_id = public.get_user_yacht_id()
  )
);

CREATE POLICY "messages_insert_own_yacht"
ON public.messages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.message_channels
    WHERE message_channels.id = messages.channel_id
    AND message_channels.yacht_id = public.get_user_yacht_id()
  )
  AND user_id = auth.uid()
);

CREATE POLICY "messages_update_own_yacht"
ON public.messages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.message_channels
    WHERE message_channels.id = messages.channel_id
    AND message_channels.yacht_id = public.get_user_yacht_id()
  )
  AND user_id = auth.uid()
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.message_channels
    WHERE message_channels.id = messages.channel_id
    AND message_channels.yacht_id = public.get_user_yacht_id()
  )
  AND user_id = auth.uid()
);

CREATE POLICY "messages_delete_own_yacht"
ON public.messages
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.message_channels
    WHERE message_channels.id = messages.channel_id
    AND message_channels.yacht_id = public.get_user_yacht_id()
  )
  AND user_id = auth.uid()
);

-- MESSAGE_READS (via messages -> message_channels)
CREATE POLICY "message_reads_select_own_yacht"
ON public.message_reads
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.messages
    JOIN public.message_channels ON message_channels.id = messages.channel_id
    WHERE messages.id = message_reads.message_id
    AND message_channels.yacht_id = public.get_user_yacht_id()
  )
);

CREATE POLICY "message_reads_insert_own_yacht"
ON public.message_reads
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.messages
    JOIN public.message_channels ON message_channels.id = messages.channel_id
    WHERE messages.id = message_reads.message_id
    AND message_channels.yacht_id = public.get_user_yacht_id()
  )
  AND user_id = auth.uid()
);

CREATE POLICY "message_reads_update_own_yacht"
ON public.message_reads
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.messages
    JOIN public.message_channels ON message_channels.id = messages.channel_id
    WHERE messages.id = message_reads.message_id
    AND message_channels.yacht_id = public.get_user_yacht_id()
  )
  AND user_id = auth.uid()
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.messages
    JOIN public.message_channels ON message_channels.id = messages.channel_id
    WHERE messages.id = message_reads.message_id
    AND message_channels.yacht_id = public.get_user_yacht_id()
  )
  AND user_id = auth.uid()
);

CREATE POLICY "message_reads_delete_own_yacht"
ON public.message_reads
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.messages
    JOIN public.message_channels ON message_channels.id = messages.channel_id
    WHERE messages.id = message_reads.message_id
    AND message_channels.yacht_id = public.get_user_yacht_id()
  )
  AND user_id = auth.uid()
);

-- MESSAGE_ATTACHMENTS (via messages -> message_channels)
CREATE POLICY "message_attachments_select_own_yacht"
ON public.message_attachments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.messages
    JOIN public.message_channels ON message_channels.id = messages.channel_id
    WHERE messages.id = message_attachments.message_id
    AND message_channels.yacht_id = public.get_user_yacht_id()
  )
);

CREATE POLICY "message_attachments_insert_own_yacht"
ON public.message_attachments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.messages
    JOIN public.message_channels ON message_channels.id = messages.channel_id
    WHERE messages.id = message_attachments.message_id
    AND message_channels.yacht_id = public.get_user_yacht_id()
  )
  AND user_id = auth.uid()
);

CREATE POLICY "message_attachments_update_own_yacht"
ON public.message_attachments
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.messages
    JOIN public.message_channels ON message_channels.id = messages.channel_id
    WHERE messages.id = message_attachments.message_id
    AND message_channels.yacht_id = public.get_user_yacht_id()
  )
  AND user_id = auth.uid()
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.messages
    JOIN public.message_channels ON message_channels.id = messages.channel_id
    WHERE messages.id = message_attachments.message_id
    AND message_channels.yacht_id = public.get_user_yacht_id()
  )
  AND user_id = auth.uid()
);

CREATE POLICY "message_attachments_delete_own_yacht"
ON public.message_attachments
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.messages
    JOIN public.message_channels ON message_channels.id = messages.channel_id
    WHERE messages.id = message_attachments.message_id
    AND message_channels.yacht_id = public.get_user_yacht_id()
  )
  AND user_id = auth.uid()
);


