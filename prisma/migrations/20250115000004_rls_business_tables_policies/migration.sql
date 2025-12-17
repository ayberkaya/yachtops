-- ============================================================================
-- RLS Migration Part 4: Business Tables with yacht_id Policies
-- ============================================================================
-- Policies for business tables that have yacht_id column
-- All operations (SELECT/INSERT/UPDATE/DELETE) are restricted to rows
-- where yacht_id matches the current user's yacht_id.
-- ============================================================================

-- TRIPS
CREATE POLICY "trips_select_own_yacht"
ON public.trips
FOR SELECT
USING (yacht_id = public.get_user_yacht_id());

CREATE POLICY "trips_insert_own_yacht"
ON public.trips
FOR INSERT
WITH CHECK (yacht_id = public.get_user_yacht_id());

CREATE POLICY "trips_update_own_yacht"
ON public.trips
FOR UPDATE
USING (yacht_id = public.get_user_yacht_id())
WITH CHECK (yacht_id = public.get_user_yacht_id());

CREATE POLICY "trips_delete_own_yacht"
ON public.trips
FOR DELETE
USING (yacht_id = public.get_user_yacht_id());

-- TASKS
CREATE POLICY "tasks_select_own_yacht"
ON public.tasks
FOR SELECT
USING (yacht_id = public.get_user_yacht_id());

CREATE POLICY "tasks_insert_own_yacht"
ON public.tasks
FOR INSERT
WITH CHECK (yacht_id = public.get_user_yacht_id());

CREATE POLICY "tasks_update_own_yacht"
ON public.tasks
FOR UPDATE
USING (yacht_id = public.get_user_yacht_id())
WITH CHECK (yacht_id = public.get_user_yacht_id());

CREATE POLICY "tasks_delete_own_yacht"
ON public.tasks
FOR DELETE
USING (yacht_id = public.get_user_yacht_id());

-- EXPENSE_CATEGORIES
CREATE POLICY "expense_categories_select_own_yacht"
ON public.expense_categories
FOR SELECT
USING (yacht_id = public.get_user_yacht_id());

CREATE POLICY "expense_categories_insert_own_yacht"
ON public.expense_categories
FOR INSERT
WITH CHECK (yacht_id = public.get_user_yacht_id());

CREATE POLICY "expense_categories_update_own_yacht"
ON public.expense_categories
FOR UPDATE
USING (yacht_id = public.get_user_yacht_id())
WITH CHECK (yacht_id = public.get_user_yacht_id());

CREATE POLICY "expense_categories_delete_own_yacht"
ON public.expense_categories
FOR DELETE
USING (yacht_id = public.get_user_yacht_id());

-- EXPENSES
CREATE POLICY "expenses_select_own_yacht"
ON public.expenses
FOR SELECT
USING (yacht_id = public.get_user_yacht_id());

CREATE POLICY "expenses_insert_own_yacht"
ON public.expenses
FOR INSERT
WITH CHECK (yacht_id = public.get_user_yacht_id());

CREATE POLICY "expenses_update_own_yacht"
ON public.expenses
FOR UPDATE
USING (yacht_id = public.get_user_yacht_id())
WITH CHECK (yacht_id = public.get_user_yacht_id());

CREATE POLICY "expenses_delete_own_yacht"
ON public.expenses
FOR DELETE
USING (yacht_id = public.get_user_yacht_id());

-- CASH_TRANSACTIONS
CREATE POLICY "cash_transactions_select_own_yacht"
ON public.cash_transactions
FOR SELECT
USING (yacht_id = public.get_user_yacht_id());

CREATE POLICY "cash_transactions_insert_own_yacht"
ON public.cash_transactions
FOR INSERT
WITH CHECK (yacht_id = public.get_user_yacht_id());

CREATE POLICY "cash_transactions_update_own_yacht"
ON public.cash_transactions
FOR UPDATE
USING (yacht_id = public.get_user_yacht_id())
WITH CHECK (yacht_id = public.get_user_yacht_id());

CREATE POLICY "cash_transactions_delete_own_yacht"
ON public.cash_transactions
FOR DELETE
USING (yacht_id = public.get_user_yacht_id());

-- MARINA_PERMISSION_DOCUMENTS
CREATE POLICY "marina_permission_documents_select_own_yacht"
ON public.marina_permission_documents
FOR SELECT
USING (yacht_id = public.get_user_yacht_id());

CREATE POLICY "marina_permission_documents_insert_own_yacht"
ON public.marina_permission_documents
FOR INSERT
WITH CHECK (yacht_id = public.get_user_yacht_id());

CREATE POLICY "marina_permission_documents_update_own_yacht"
ON public.marina_permission_documents
FOR UPDATE
USING (yacht_id = public.get_user_yacht_id())
WITH CHECK (yacht_id = public.get_user_yacht_id());

CREATE POLICY "marina_permission_documents_delete_own_yacht"
ON public.marina_permission_documents
FOR DELETE
USING (yacht_id = public.get_user_yacht_id());

-- VESSEL_DOCUMENTS
CREATE POLICY "vessel_documents_select_own_yacht"
ON public.vessel_documents
FOR SELECT
USING (yacht_id = public.get_user_yacht_id());

CREATE POLICY "vessel_documents_insert_own_yacht"
ON public.vessel_documents
FOR INSERT
WITH CHECK (yacht_id = public.get_user_yacht_id());

CREATE POLICY "vessel_documents_update_own_yacht"
ON public.vessel_documents
FOR UPDATE
USING (yacht_id = public.get_user_yacht_id())
WITH CHECK (yacht_id = public.get_user_yacht_id());

CREATE POLICY "vessel_documents_delete_own_yacht"
ON public.vessel_documents
FOR DELETE
USING (yacht_id = public.get_user_yacht_id());

-- CREW_DOCUMENTS
CREATE POLICY "crew_documents_select_own_yacht"
ON public.crew_documents
FOR SELECT
USING (yacht_id = public.get_user_yacht_id());

CREATE POLICY "crew_documents_insert_own_yacht"
ON public.crew_documents
FOR INSERT
WITH CHECK (yacht_id = public.get_user_yacht_id());

CREATE POLICY "crew_documents_update_own_yacht"
ON public.crew_documents
FOR UPDATE
USING (yacht_id = public.get_user_yacht_id())
WITH CHECK (yacht_id = public.get_user_yacht_id());

CREATE POLICY "crew_documents_delete_own_yacht"
ON public.crew_documents
FOR DELETE
USING (yacht_id = public.get_user_yacht_id());

-- MESSAGE_CHANNELS
CREATE POLICY "message_channels_select_own_yacht"
ON public.message_channels
FOR SELECT
USING (yacht_id = public.get_user_yacht_id());

CREATE POLICY "message_channels_insert_own_yacht"
ON public.message_channels
FOR INSERT
WITH CHECK (yacht_id = public.get_user_yacht_id());

CREATE POLICY "message_channels_update_own_yacht"
ON public.message_channels
FOR UPDATE
USING (yacht_id = public.get_user_yacht_id())
WITH CHECK (yacht_id = public.get_user_yacht_id());

CREATE POLICY "message_channels_delete_own_yacht"
ON public.message_channels
FOR DELETE
USING (yacht_id = public.get_user_yacht_id());

-- PRODUCTS
CREATE POLICY "products_select_own_yacht"
ON public.products
FOR SELECT
USING (yacht_id = public.get_user_yacht_id());

CREATE POLICY "products_insert_own_yacht"
ON public.products
FOR INSERT
WITH CHECK (yacht_id = public.get_user_yacht_id());

CREATE POLICY "products_update_own_yacht"
ON public.products
FOR UPDATE
USING (yacht_id = public.get_user_yacht_id())
WITH CHECK (yacht_id = public.get_user_yacht_id());

CREATE POLICY "products_delete_own_yacht"
ON public.products
FOR DELETE
USING (yacht_id = public.get_user_yacht_id());

-- SHOPPING_STORES
CREATE POLICY "shopping_stores_select_own_yacht"
ON public.shopping_stores
FOR SELECT
USING (yacht_id = public.get_user_yacht_id());

CREATE POLICY "shopping_stores_insert_own_yacht"
ON public.shopping_stores
FOR INSERT
WITH CHECK (yacht_id = public.get_user_yacht_id());

CREATE POLICY "shopping_stores_update_own_yacht"
ON public.shopping_stores
FOR UPDATE
USING (yacht_id = public.get_user_yacht_id())
WITH CHECK (yacht_id = public.get_user_yacht_id());

CREATE POLICY "shopping_stores_delete_own_yacht"
ON public.shopping_stores
FOR DELETE
USING (yacht_id = public.get_user_yacht_id());

-- SHOPPING_LISTS
CREATE POLICY "shopping_lists_select_own_yacht"
ON public.shopping_lists
FOR SELECT
USING (yacht_id = public.get_user_yacht_id());

CREATE POLICY "shopping_lists_insert_own_yacht"
ON public.shopping_lists
FOR INSERT
WITH CHECK (yacht_id = public.get_user_yacht_id());

CREATE POLICY "shopping_lists_update_own_yacht"
ON public.shopping_lists
FOR UPDATE
USING (yacht_id = public.get_user_yacht_id())
WITH CHECK (yacht_id = public.get_user_yacht_id());

CREATE POLICY "shopping_lists_delete_own_yacht"
ON public.shopping_lists
FOR DELETE
USING (yacht_id = public.get_user_yacht_id());

-- ALCOHOL_STOCKS
CREATE POLICY "alcohol_stocks_select_own_yacht"
ON public.alcohol_stocks
FOR SELECT
USING (yacht_id = public.get_user_yacht_id());

CREATE POLICY "alcohol_stocks_insert_own_yacht"
ON public.alcohol_stocks
FOR INSERT
WITH CHECK (yacht_id = public.get_user_yacht_id());

CREATE POLICY "alcohol_stocks_update_own_yacht"
ON public.alcohol_stocks
FOR UPDATE
USING (yacht_id = public.get_user_yacht_id())
WITH CHECK (yacht_id = public.get_user_yacht_id());

CREATE POLICY "alcohol_stocks_delete_own_yacht"
ON public.alcohol_stocks
FOR DELETE
USING (yacht_id = public.get_user_yacht_id());

-- MAINTENANCE_LOGS
CREATE POLICY "maintenance_logs_select_own_yacht"
ON public.maintenance_logs
FOR SELECT
USING (yacht_id = public.get_user_yacht_id());

CREATE POLICY "maintenance_logs_insert_own_yacht"
ON public.maintenance_logs
FOR INSERT
WITH CHECK (yacht_id = public.get_user_yacht_id());

CREATE POLICY "maintenance_logs_update_own_yacht"
ON public.maintenance_logs
FOR UPDATE
USING (yacht_id = public.get_user_yacht_id())
WITH CHECK (yacht_id = public.get_user_yacht_id());

CREATE POLICY "maintenance_logs_delete_own_yacht"
ON public.maintenance_logs
FOR DELETE
USING (yacht_id = public.get_user_yacht_id());

-- SHIFTS
CREATE POLICY "shifts_select_own_yacht"
ON public.shifts
FOR SELECT
USING (yacht_id = public.get_user_yacht_id());

CREATE POLICY "shifts_insert_own_yacht"
ON public.shifts
FOR INSERT
WITH CHECK (yacht_id = public.get_user_yacht_id());

CREATE POLICY "shifts_update_own_yacht"
ON public.shifts
FOR UPDATE
USING (yacht_id = public.get_user_yacht_id())
WITH CHECK (yacht_id = public.get_user_yacht_id());

CREATE POLICY "shifts_delete_own_yacht"
ON public.shifts
FOR DELETE
USING (yacht_id = public.get_user_yacht_id());

-- LEAVES
CREATE POLICY "leaves_select_own_yacht"
ON public.leaves
FOR SELECT
USING (yacht_id = public.get_user_yacht_id());

CREATE POLICY "leaves_insert_own_yacht"
ON public.leaves
FOR INSERT
WITH CHECK (yacht_id = public.get_user_yacht_id());

CREATE POLICY "leaves_update_own_yacht"
ON public.leaves
FOR UPDATE
USING (yacht_id = public.get_user_yacht_id())
WITH CHECK (yacht_id = public.get_user_yacht_id());

CREATE POLICY "leaves_delete_own_yacht"
ON public.leaves
FOR DELETE
USING (yacht_id = public.get_user_yacht_id());

-- CUSTOM_ROLES
CREATE POLICY "custom_roles_select_own_yacht"
ON public.custom_roles
FOR SELECT
USING (yacht_id = public.get_user_yacht_id());

CREATE POLICY "custom_roles_insert_own_yacht"
ON public.custom_roles
FOR INSERT
WITH CHECK (yacht_id = public.get_user_yacht_id());

CREATE POLICY "custom_roles_update_own_yacht"
ON public.custom_roles
FOR UPDATE
USING (yacht_id = public.get_user_yacht_id())
WITH CHECK (yacht_id = public.get_user_yacht_id());

CREATE POLICY "custom_roles_delete_own_yacht"
ON public.custom_roles
FOR DELETE
USING (yacht_id = public.get_user_yacht_id());

-- FEEDBACK (yacht_id is nullable, but if set, must match)
CREATE POLICY "feedback_select_own_yacht"
ON public.feedback
FOR SELECT
USING (
  yacht_id IS NULL
  OR yacht_id = public.get_user_yacht_id()
  OR user_id = auth.uid()
);

CREATE POLICY "feedback_insert_own_yacht"
ON public.feedback
FOR INSERT
WITH CHECK (
  (yacht_id IS NULL OR yacht_id = public.get_user_yacht_id())
  AND user_id = auth.uid()
);

CREATE POLICY "feedback_update_own_yacht"
ON public.feedback
FOR UPDATE
USING (
  (yacht_id IS NULL OR yacht_id = public.get_user_yacht_id())
  AND user_id = auth.uid()
)
WITH CHECK (
  (yacht_id IS NULL OR yacht_id = public.get_user_yacht_id())
  AND user_id = auth.uid()
);

CREATE POLICY "feedback_delete_own_yacht"
ON public.feedback
FOR DELETE
USING (
  (yacht_id IS NULL OR yacht_id = public.get_user_yacht_id())
  AND user_id = auth.uid()
);


