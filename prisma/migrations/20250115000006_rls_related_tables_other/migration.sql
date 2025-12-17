-- ============================================================================
-- RLS Migration Part 6: Related Tables - Other (Tasks, Expenses, etc.)
-- ============================================================================
-- Policies for tables related to tasks, expenses, maintenance, shopping, alcohol
-- ============================================================================

-- TASK_COMMENTS (via tasks)
CREATE POLICY "task_comments_select_own_yacht"
ON public.task_comments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tasks
    WHERE tasks.id = task_comments.task_id
    AND tasks.yacht_id = public.get_user_yacht_id()
  )
);

CREATE POLICY "task_comments_insert_own_yacht"
ON public.task_comments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tasks
    WHERE tasks.id = task_comments.task_id
    AND tasks.yacht_id = public.get_user_yacht_id()
  )
  AND user_id = auth.uid()
);

CREATE POLICY "task_comments_update_own_yacht"
ON public.task_comments
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.tasks
    WHERE tasks.id = task_comments.task_id
    AND tasks.yacht_id = public.get_user_yacht_id()
  )
  AND user_id = auth.uid()
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tasks
    WHERE tasks.id = task_comments.task_id
    AND tasks.yacht_id = public.get_user_yacht_id()
  )
  AND user_id = auth.uid()
);

CREATE POLICY "task_comments_delete_own_yacht"
ON public.task_comments
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.tasks
    WHERE tasks.id = task_comments.task_id
    AND tasks.yacht_id = public.get_user_yacht_id()
  )
  AND user_id = auth.uid()
);

-- TASK_ATTACHMENTS (via tasks)
CREATE POLICY "task_attachments_select_own_yacht"
ON public.task_attachments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tasks
    WHERE tasks.id = task_attachments.task_id
    AND tasks.yacht_id = public.get_user_yacht_id()
  )
);

CREATE POLICY "task_attachments_insert_own_yacht"
ON public.task_attachments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tasks
    WHERE tasks.id = task_attachments.task_id
    AND tasks.yacht_id = public.get_user_yacht_id()
  )
  AND user_id = auth.uid()
);

CREATE POLICY "task_attachments_update_own_yacht"
ON public.task_attachments
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.tasks
    WHERE tasks.id = task_attachments.task_id
    AND tasks.yacht_id = public.get_user_yacht_id()
  )
  AND user_id = auth.uid()
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tasks
    WHERE tasks.id = task_attachments.task_id
    AND tasks.yacht_id = public.get_user_yacht_id()
  )
  AND user_id = auth.uid()
);

CREATE POLICY "task_attachments_delete_own_yacht"
ON public.task_attachments
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.tasks
    WHERE tasks.id = task_attachments.task_id
    AND tasks.yacht_id = public.get_user_yacht_id()
  )
  AND user_id = auth.uid()
);

-- EXPENSE_RECEIPTS (via expenses)
CREATE POLICY "expense_receipts_select_own_yacht"
ON public.expense_receipts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.expenses
    WHERE expenses.id = expense_receipts.expense_id
    AND expenses.yacht_id = public.get_user_yacht_id()
  )
);

CREATE POLICY "expense_receipts_insert_own_yacht"
ON public.expense_receipts
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.expenses
    WHERE expenses.id = expense_receipts.expense_id
    AND expenses.yacht_id = public.get_user_yacht_id()
  )
);

CREATE POLICY "expense_receipts_update_own_yacht"
ON public.expense_receipts
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.expenses
    WHERE expenses.id = expense_receipts.expense_id
    AND expenses.yacht_id = public.get_user_yacht_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.expenses
    WHERE expenses.id = expense_receipts.expense_id
    AND expenses.yacht_id = public.get_user_yacht_id()
  )
);

CREATE POLICY "expense_receipts_delete_own_yacht"
ON public.expense_receipts
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.expenses
    WHERE expenses.id = expense_receipts.expense_id
    AND expenses.yacht_id = public.get_user_yacht_id()
  )
);

-- MAINTENANCE_DOCUMENTS (via maintenance_logs)
CREATE POLICY "maintenance_documents_select_own_yacht"
ON public.maintenance_documents
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.maintenance_logs
    WHERE maintenance_logs.id = maintenance_documents.maintenance_id
    AND maintenance_logs.yacht_id = public.get_user_yacht_id()
  )
);

CREATE POLICY "maintenance_documents_insert_own_yacht"
ON public.maintenance_documents
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.maintenance_logs
    WHERE maintenance_logs.id = maintenance_documents.maintenance_id
    AND maintenance_logs.yacht_id = public.get_user_yacht_id()
  )
);

CREATE POLICY "maintenance_documents_update_own_yacht"
ON public.maintenance_documents
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.maintenance_logs
    WHERE maintenance_logs.id = maintenance_documents.maintenance_id
    AND maintenance_logs.yacht_id = public.get_user_yacht_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.maintenance_logs
    WHERE maintenance_logs.id = maintenance_documents.maintenance_id
    AND maintenance_logs.yacht_id = public.get_user_yacht_id()
  )
);

CREATE POLICY "maintenance_documents_delete_own_yacht"
ON public.maintenance_documents
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.maintenance_logs
    WHERE maintenance_logs.id = maintenance_documents.maintenance_id
    AND maintenance_logs.yacht_id = public.get_user_yacht_id()
  )
);

-- SHOPPING_ITEMS (via shopping_lists)
CREATE POLICY "shopping_items_select_own_yacht"
ON public.shopping_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.shopping_lists
    WHERE shopping_lists.id = shopping_items.list_id
    AND shopping_lists.yacht_id = public.get_user_yacht_id()
  )
);

CREATE POLICY "shopping_items_insert_own_yacht"
ON public.shopping_items
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.shopping_lists
    WHERE shopping_lists.id = shopping_items.list_id
    AND shopping_lists.yacht_id = public.get_user_yacht_id()
  )
);

CREATE POLICY "shopping_items_update_own_yacht"
ON public.shopping_items
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.shopping_lists
    WHERE shopping_lists.id = shopping_items.list_id
    AND shopping_lists.yacht_id = public.get_user_yacht_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.shopping_lists
    WHERE shopping_lists.id = shopping_items.list_id
    AND shopping_lists.yacht_id = public.get_user_yacht_id()
  )
);

CREATE POLICY "shopping_items_delete_own_yacht"
ON public.shopping_items
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.shopping_lists
    WHERE shopping_lists.id = shopping_items.list_id
    AND shopping_lists.yacht_id = public.get_user_yacht_id()
  )
);

-- ALCOHOL_STOCK_HISTORY (via alcohol_stocks)
CREATE POLICY "alcohol_stock_history_select_own_yacht"
ON public.alcohol_stock_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.alcohol_stocks
    WHERE alcohol_stocks.id = alcohol_stock_history.stock_id
    AND alcohol_stocks.yacht_id = public.get_user_yacht_id()
  )
);

CREATE POLICY "alcohol_stock_history_insert_own_yacht"
ON public.alcohol_stock_history
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.alcohol_stocks
    WHERE alcohol_stocks.id = alcohol_stock_history.stock_id
    AND alcohol_stocks.yacht_id = public.get_user_yacht_id()
  )
);

CREATE POLICY "alcohol_stock_history_update_own_yacht"
ON public.alcohol_stock_history
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.alcohol_stocks
    WHERE alcohol_stocks.id = alcohol_stock_history.stock_id
    AND alcohol_stocks.yacht_id = public.get_user_yacht_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.alcohol_stocks
    WHERE alcohol_stocks.id = alcohol_stock_history.stock_id
    AND alcohol_stocks.yacht_id = public.get_user_yacht_id()
  )
);

CREATE POLICY "alcohol_stock_history_delete_own_yacht"
ON public.alcohol_stock_history
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.alcohol_stocks
    WHERE alcohol_stocks.id = alcohol_stock_history.stock_id
    AND alcohol_stocks.yacht_id = public.get_user_yacht_id()
  )
);


