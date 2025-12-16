-- ============================================================================
-- Supabase RLS Migration: Single-Tenant-Per-User Model
-- ============================================================================
-- This migration enables Row Level Security (RLS) on all public tables
-- to enforce single-tenant isolation where users can only access data
-- belonging to their yacht (yacht_id).
--
-- Key Rules:
-- 1. Business tables with yacht_id: Access only if row.yacht_id = user's yacht_id
-- 2. Users table: Users can only see/update their own row
-- 3. Sensitive tables: No public read access (audit_logs, usage_events)
-- 4. Migration table: No client access
-- ============================================================================

-- ============================================================================
-- Helper Function: Get Current User's Yacht ID
-- ============================================================================
-- This function retrieves the yacht_id for the currently authenticated user.
-- Returns NULL if user doesn't exist or has no yacht_id.
-- ============================================================================
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

-- ============================================================================
-- Helper Function: Check if User Can Modify Yacht ID
-- ============================================================================
-- Only OWNER or CAPTAIN roles can modify yacht_id.
-- Returns true if user is OWNER or CAPTAIN, false otherwise.
-- ============================================================================
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

-- ============================================================================
-- Enable RLS on All Public Tables
-- ============================================================================

-- Core tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yachts ENABLE ROW LEVEL SECURITY;

-- Business tables with yacht_id
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marina_permission_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vessel_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crew_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alcohol_stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Related tables (access via parent yacht_id)
ALTER TABLE public.trip_itinerary_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_tank_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_movement_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alcohol_stock_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_note_checklist_items ENABLE ROW LEVEL SECURITY;

-- Sensitive tables (restricted access)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- USERS TABLE POLICIES
-- ============================================================================
-- Users can only SELECT and UPDATE their own row.
-- Users cannot change their yacht_id unless they are OWNER or CAPTAIN.
-- ============================================================================

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

-- ============================================================================
-- YACHTS TABLE POLICIES
-- ============================================================================
-- Users can only see yachts that match their yacht_id
-- ============================================================================

CREATE POLICY "yachts_select_own"
ON public.yachts
FOR SELECT
USING (id = public.get_user_yacht_id());

-- INSERT/UPDATE/DELETE: Only service role (via application logic)
-- No policies = no client access

-- ============================================================================
-- BUSINESS TABLES WITH YACHT_ID: Standard Policies
-- ============================================================================
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

-- ============================================================================
-- RELATED TABLES: Access via Parent Table's Yacht ID
-- ============================================================================
-- These tables don't have yacht_id directly but are linked to parent tables
-- that do. We use JOINs to check yacht_id from the parent.
-- ============================================================================

-- TRIP_ITINERARY_DAYS (via trips)
CREATE POLICY "trip_itinerary_days_select_own_yacht"
ON public.trip_itinerary_days
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.trips
    WHERE trips.id = trip_itinerary_days.trip_id
    AND trips.yacht_id = public.get_user_yacht_id()
  )
);

CREATE POLICY "trip_itinerary_days_insert_own_yacht"
ON public.trip_itinerary_days
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.trips
    WHERE trips.id = trip_itinerary_days.trip_id
    AND trips.yacht_id = public.get_user_yacht_id()
  )
);

CREATE POLICY "trip_itinerary_days_update_own_yacht"
ON public.trip_itinerary_days
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.trips
    WHERE trips.id = trip_itinerary_days.trip_id
    AND trips.yacht_id = public.get_user_yacht_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.trips
    WHERE trips.id = trip_itinerary_days.trip_id
    AND trips.yacht_id = public.get_user_yacht_id()
  )
);

CREATE POLICY "trip_itinerary_days_delete_own_yacht"
ON public.trip_itinerary_days
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.trips
    WHERE trips.id = trip_itinerary_days.trip_id
    AND trips.yacht_id = public.get_user_yacht_id()
  )
);

-- TRIP_CHECKLIST_ITEMS (via trips)
CREATE POLICY "trip_checklist_items_select_own_yacht"
ON public.trip_checklist_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.trips
    WHERE trips.id = trip_checklist_items.trip_id
    AND trips.yacht_id = public.get_user_yacht_id()
  )
);

CREATE POLICY "trip_checklist_items_insert_own_yacht"
ON public.trip_checklist_items
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.trips
    WHERE trips.id = trip_checklist_items.trip_id
    AND trips.yacht_id = public.get_user_yacht_id()
  )
);

CREATE POLICY "trip_checklist_items_update_own_yacht"
ON public.trip_checklist_items
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.trips
    WHERE trips.id = trip_checklist_items.trip_id
    AND trips.yacht_id = public.get_user_yacht_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.trips
    WHERE trips.id = trip_checklist_items.trip_id
    AND trips.yacht_id = public.get_user_yacht_id()
  )
);

CREATE POLICY "trip_checklist_items_delete_own_yacht"
ON public.trip_checklist_items
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.trips
    WHERE trips.id = trip_checklist_items.trip_id
    AND trips.yacht_id = public.get_user_yacht_id()
  )
);

-- TRIP_TANK_LOGS (via trips)
CREATE POLICY "trip_tank_logs_select_own_yacht"
ON public.trip_tank_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.trips
    WHERE trips.id = trip_tank_logs.trip_id
    AND trips.yacht_id = public.get_user_yacht_id()
  )
);

CREATE POLICY "trip_tank_logs_insert_own_yacht"
ON public.trip_tank_logs
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.trips
    WHERE trips.id = trip_tank_logs.trip_id
    AND trips.yacht_id = public.get_user_yacht_id()
  )
);

CREATE POLICY "trip_tank_logs_update_own_yacht"
ON public.trip_tank_logs
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.trips
    WHERE trips.id = trip_tank_logs.trip_id
    AND trips.yacht_id = public.get_user_yacht_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.trips
    WHERE trips.id = trip_tank_logs.trip_id
    AND trips.yacht_id = public.get_user_yacht_id()
  )
);

CREATE POLICY "trip_tank_logs_delete_own_yacht"
ON public.trip_tank_logs
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.trips
    WHERE trips.id = trip_tank_logs.trip_id
    AND trips.yacht_id = public.get_user_yacht_id()
  )
);

-- TRIP_MOVEMENT_LOGS (via trips)
CREATE POLICY "trip_movement_logs_select_own_yacht"
ON public.trip_movement_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.trips
    WHERE trips.id = trip_movement_logs.trip_id
    AND trips.yacht_id = public.get_user_yacht_id()
  )
);

CREATE POLICY "trip_movement_logs_insert_own_yacht"
ON public.trip_movement_logs
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.trips
    WHERE trips.id = trip_movement_logs.trip_id
    AND trips.yacht_id = public.get_user_yacht_id()
  )
);

CREATE POLICY "trip_movement_logs_update_own_yacht"
ON public.trip_movement_logs
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.trips
    WHERE trips.id = trip_movement_logs.trip_id
    AND trips.yacht_id = public.get_user_yacht_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.trips
    WHERE trips.id = trip_movement_logs.trip_id
    AND trips.yacht_id = public.get_user_yacht_id()
  )
);

CREATE POLICY "trip_movement_logs_delete_own_yacht"
ON public.trip_movement_logs
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.trips
    WHERE trips.id = trip_movement_logs.trip_id
    AND trips.yacht_id = public.get_user_yacht_id()
  )
);

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

-- ============================================================================
-- SENSITIVE TABLES: Restricted Access
-- ============================================================================
-- audit_logs and usage_events should not be readable by clients.
-- Only service role should be able to insert/read these.
-- ============================================================================

-- AUDIT_LOGS: No client access (service role only)
-- No policies = no client access

-- USAGE_EVENTS: No client read access, but allow insert for tracking
CREATE POLICY "usage_events_insert_own"
ON public.usage_events
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- No SELECT/UPDATE/DELETE policies = no client access

-- ============================================================================
-- MIGRATION TABLE: No Client Access
-- ============================================================================
-- _prisma_migrations should never be accessible to clients.
-- RLS is not enabled on this table (it's a system table), but we document
-- that it should not have any policies.
-- ============================================================================
-- Note: _prisma_migrations is typically in a different schema or managed
-- by Prisma directly. No action needed here.

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- All public tables now have RLS enabled with appropriate policies.
-- Test the policies using the checklist in RLS_TESTING_CHECKLIST.md
-- ============================================================================

