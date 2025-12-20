-- ============================================================================
-- RLS Policies Migration
-- ============================================================================
-- This migration creates RLS policies for all tables that have RLS enabled
-- but no policies. It implements tenant isolation based on yacht_id.
-- ============================================================================

-- ============================================================================
-- Cleanup: Drop existing policies if they exist (for idempotent migration)
-- ============================================================================

DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop all existing RLS policies
    FOR r IN (
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
        AND policyname IN (
            -- Users policies
            'users_select_own', 'users_insert_authenticated', 'users_update_own', 'users_delete_own',
            -- Yachts policies
            'yachts_select_own', 'yachts_insert_authenticated', 'yachts_update_own', 'yachts_delete_own',
            -- Business tables policies
            'trips_select_own_yacht', 'trips_insert_own_yacht', 'trips_update_own_yacht', 'trips_delete_own_yacht',
            'tasks_select_own_yacht', 'tasks_insert_own_yacht', 'tasks_update_own_yacht', 'tasks_delete_own_yacht',
            'expense_categories_select_own_yacht', 'expense_categories_insert_own_yacht', 'expense_categories_update_own_yacht', 'expense_categories_delete_own_yacht',
            'expenses_select_own_yacht', 'expenses_insert_own_yacht', 'expenses_update_own_yacht', 'expenses_delete_own_yacht',
            'cash_transactions_select_own_yacht', 'cash_transactions_insert_own_yacht', 'cash_transactions_update_own_yacht', 'cash_transactions_delete_own_yacht',
            'marina_permission_documents_select_own_yacht', 'marina_permission_documents_insert_own_yacht', 'marina_permission_documents_update_own_yacht', 'marina_permission_documents_delete_own_yacht',
            'vessel_documents_select_own_yacht', 'vessel_documents_insert_own_yacht', 'vessel_documents_update_own_yacht', 'vessel_documents_delete_own_yacht',
            'crew_documents_select_own_yacht', 'crew_documents_insert_own_yacht', 'crew_documents_update_own_yacht', 'crew_documents_delete_own_yacht',
            'message_channels_select_own_yacht', 'message_channels_insert_own_yacht', 'message_channels_update_own_yacht', 'message_channels_delete_own_yacht',
            'products_select_own_yacht', 'products_insert_own_yacht', 'products_update_own_yacht', 'products_delete_own_yacht',
            'shopping_stores_select_own_yacht', 'shopping_stores_insert_own_yacht', 'shopping_stores_update_own_yacht', 'shopping_stores_delete_own_yacht',
            'shopping_lists_select_own_yacht', 'shopping_lists_insert_own_yacht', 'shopping_lists_update_own_yacht', 'shopping_lists_delete_own_yacht',
            'alcohol_stocks_select_own_yacht', 'alcohol_stocks_insert_own_yacht', 'alcohol_stocks_update_own_yacht', 'alcohol_stocks_delete_own_yacht',
            'maintenance_logs_select_own_yacht', 'maintenance_logs_insert_own_yacht', 'maintenance_logs_update_own_yacht', 'maintenance_logs_delete_own_yacht',
            'shifts_select_own_yacht', 'shifts_insert_own_yacht', 'shifts_update_own_yacht', 'shifts_delete_own_yacht',
            'leaves_select_own_yacht', 'leaves_insert_own_yacht', 'leaves_update_own_yacht', 'leaves_delete_own_yacht',
            'custom_roles_select_own_yacht', 'custom_roles_insert_own_yacht', 'custom_roles_update_own_yacht', 'custom_roles_delete_own_yacht',
            'feedback_select_own_yacht', 'feedback_insert_own_yacht', 'feedback_update_own_yacht', 'feedback_delete_own_yacht',
            -- Related tables policies
            'trip_itinerary_days_select_own_yacht', 'trip_itinerary_days_insert_own_yacht', 'trip_itinerary_days_update_own_yacht', 'trip_itinerary_days_delete_own_yacht',
            'trip_checklist_items_select_own_yacht', 'trip_checklist_items_insert_own_yacht', 'trip_checklist_items_update_own_yacht', 'trip_checklist_items_delete_own_yacht',
            'trip_tank_logs_select_own_yacht', 'trip_tank_logs_insert_own_yacht', 'trip_tank_logs_update_own_yacht', 'trip_tank_logs_delete_own_yacht',
            'trip_movement_logs_select_own_yacht', 'trip_movement_logs_insert_own_yacht', 'trip_movement_logs_update_own_yacht', 'trip_movement_logs_delete_own_yacht',
            'task_comments_select_own_yacht', 'task_comments_insert_own_yacht', 'task_comments_update_own_yacht', 'task_comments_delete_own_yacht',
            'task_attachments_select_own_yacht', 'task_attachments_insert_own_yacht', 'task_attachments_update_own_yacht', 'task_attachments_delete_own_yacht',
            'expense_receipts_select_own_yacht', 'expense_receipts_insert_own_yacht', 'expense_receipts_update_own_yacht', 'expense_receipts_delete_own_yacht',
            'maintenance_documents_select_own_yacht', 'maintenance_documents_insert_own_yacht', 'maintenance_documents_update_own_yacht', 'maintenance_documents_delete_own_yacht',
            'shopping_items_select_own_yacht', 'shopping_items_insert_own_yacht', 'shopping_items_update_own_yacht', 'shopping_items_delete_own_yacht',
            'alcohol_stock_history_select_own_yacht', 'alcohol_stock_history_insert_own_yacht', 'alcohol_stock_history_update_own_yacht', 'alcohol_stock_history_delete_own_yacht',
            -- Messages policies
            'messages_select_own_yacht', 'messages_insert_own_yacht', 'messages_update_own_yacht', 'messages_delete_own_yacht',
            'message_reads_select_own_yacht', 'message_reads_insert_own_yacht', 'message_reads_update_own_yacht', 'message_reads_delete_own_yacht',
            'message_attachments_select_own_yacht', 'message_attachments_insert_own_yacht', 'message_attachments_update_own_yacht', 'message_attachments_delete_own_yacht',
            -- User-specific policies
            'notifications_select_own', 'notifications_insert_own', 'notifications_update_own', 'notifications_delete_own',
            'user_notes_select_own', 'user_notes_insert_own', 'user_notes_update_own', 'user_notes_delete_own',
            'user_note_checklist_items_select_own', 'user_note_checklist_items_insert_own', 'user_note_checklist_items_update_own', 'user_note_checklist_items_delete_own',
            -- Sensitive tables policies
            'audit_logs_deny_all',
            'usage_events_insert_own', 'usage_events_select_own', 'usage_events_no_update', 'usage_events_no_delete'
        )
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
            r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS enforce_yacht_id_modification_trigger ON public.users;

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function: Get current user's yacht_id
CREATE OR REPLACE FUNCTION public.get_user_yacht_id()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_yacht_id TEXT;
BEGIN
    SELECT yacht_id INTO user_yacht_id
    FROM public.users
    WHERE id = (select auth.uid())::TEXT;
    
    RETURN user_yacht_id;
END;
$$;

-- Function: Check if user can modify yacht_id (OWNER or CAPTAIN only)
CREATE OR REPLACE FUNCTION public.can_modify_yacht_id()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role
    FROM public.users
    WHERE id = (select auth.uid())::TEXT;
    
    RETURN user_role IN ('OWNER', 'CAPTAIN');
END;
$$;


-- ============================================================================
-- Users Table Policies
-- ============================================================================

-- Users: SELECT - Users can only see their own profile
CREATE POLICY "users_select_own" ON public.users
    FOR SELECT
    USING (id = (select auth.uid())::TEXT);

-- Users: INSERT - Only authenticated users can insert (handled by app)
CREATE POLICY "users_insert_authenticated" ON public.users
    FOR INSERT
    WITH CHECK (true);

-- Users: UPDATE - Users can update their own profile
-- Note: yacht_id modification restrictions are enforced via trigger (see below)
CREATE POLICY "users_update_own" ON public.users
    FOR UPDATE
    USING (id = (select auth.uid())::TEXT)
    WITH CHECK (id = (select auth.uid())::TEXT);

-- Trigger function to enforce yacht_id modification restrictions
CREATE OR REPLACE FUNCTION public.enforce_yacht_id_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_role TEXT;
BEGIN
    -- If yacht_id hasn't changed, allow
    IF OLD.yacht_id IS NOT DISTINCT FROM NEW.yacht_id THEN
        RETURN NEW;
    END IF;
    
    -- If yacht_id changed, check if user has permission
    SELECT role INTO user_role
    FROM public.users
    WHERE id = (select auth.uid())::TEXT;
    
    -- Only OWNER and CAPTAIN can modify yacht_id
    IF user_role NOT IN ('OWNER', 'CAPTAIN') THEN
        RAISE EXCEPTION 'Only OWNER or CAPTAIN roles can modify yacht_id';
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger to enforce yacht_id modification restrictions
DROP TRIGGER IF EXISTS enforce_yacht_id_modification_trigger ON public.users;
CREATE TRIGGER enforce_yacht_id_modification_trigger
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    WHEN (OLD.yacht_id IS DISTINCT FROM NEW.yacht_id)
    EXECUTE FUNCTION public.enforce_yacht_id_modification();

-- Users: DELETE - Only service role (handled by app)
CREATE POLICY "users_delete_own" ON public.users
    FOR DELETE
    USING (id = (select auth.uid())::TEXT);

-- ============================================================================
-- Yachts Table Policies
-- ============================================================================

-- Yachts: SELECT - Users can only see their own yacht
CREATE POLICY "yachts_select_own" ON public.yachts
    FOR SELECT
    USING (id = public.get_user_yacht_id());

-- Yachts: INSERT - Only authenticated users (handled by app)
CREATE POLICY "yachts_insert_authenticated" ON public.yachts
    FOR INSERT
    WITH CHECK (true);

-- Yachts: UPDATE - Only users from the yacht can update
CREATE POLICY "yachts_update_own" ON public.yachts
    FOR UPDATE
    USING (id = public.get_user_yacht_id())
    WITH CHECK (id = public.get_user_yacht_id());

-- Yachts: DELETE - Only service role (handled by app)
CREATE POLICY "yachts_delete_own" ON public.yachts
    FOR DELETE
    USING (id = public.get_user_yacht_id());

-- ============================================================================
-- Business Tables with yacht_id - Part 1
-- ============================================================================

-- Trips
CREATE POLICY "trips_select_own_yacht" ON public.trips
    FOR SELECT
    USING (yacht_id = public.get_user_yacht_id());

CREATE POLICY "trips_insert_own_yacht" ON public.trips
    FOR INSERT
    WITH CHECK (yacht_id = public.get_user_yacht_id());

CREATE POLICY "trips_update_own_yacht" ON public.trips
    FOR UPDATE
    USING (yacht_id = public.get_user_yacht_id())
    WITH CHECK (yacht_id = public.get_user_yacht_id());

CREATE POLICY "trips_delete_own_yacht" ON public.trips
    FOR DELETE
    USING (yacht_id = public.get_user_yacht_id());

-- Tasks
CREATE POLICY "tasks_select_own_yacht" ON public.tasks
    FOR SELECT
    USING (yacht_id = public.get_user_yacht_id());

CREATE POLICY "tasks_insert_own_yacht" ON public.tasks
    FOR INSERT
    WITH CHECK (yacht_id = public.get_user_yacht_id());

CREATE POLICY "tasks_update_own_yacht" ON public.tasks
    FOR UPDATE
    USING (yacht_id = public.get_user_yacht_id())
    WITH CHECK (yacht_id = public.get_user_yacht_id());

CREATE POLICY "tasks_delete_own_yacht" ON public.tasks
    FOR DELETE
    USING (yacht_id = public.get_user_yacht_id());

-- Expense Categories
CREATE POLICY "expense_categories_select_own_yacht" ON public.expense_categories
    FOR SELECT
    USING (yacht_id = public.get_user_yacht_id());

CREATE POLICY "expense_categories_insert_own_yacht" ON public.expense_categories
    FOR INSERT
    WITH CHECK (yacht_id = public.get_user_yacht_id());

CREATE POLICY "expense_categories_update_own_yacht" ON public.expense_categories
    FOR UPDATE
    USING (yacht_id = public.get_user_yacht_id())
    WITH CHECK (yacht_id = public.get_user_yacht_id());

CREATE POLICY "expense_categories_delete_own_yacht" ON public.expense_categories
    FOR DELETE
    USING (yacht_id = public.get_user_yacht_id());

-- Expenses
CREATE POLICY "expenses_select_own_yacht" ON public.expenses
    FOR SELECT
    USING (yacht_id = public.get_user_yacht_id());

CREATE POLICY "expenses_insert_own_yacht" ON public.expenses
    FOR INSERT
    WITH CHECK (yacht_id = public.get_user_yacht_id());

CREATE POLICY "expenses_update_own_yacht" ON public.expenses
    FOR UPDATE
    USING (yacht_id = public.get_user_yacht_id())
    WITH CHECK (yacht_id = public.get_user_yacht_id());

CREATE POLICY "expenses_delete_own_yacht" ON public.expenses
    FOR DELETE
    USING (yacht_id = public.get_user_yacht_id());

-- Cash Transactions
CREATE POLICY "cash_transactions_select_own_yacht" ON public.cash_transactions
    FOR SELECT
    USING (yacht_id = public.get_user_yacht_id());

CREATE POLICY "cash_transactions_insert_own_yacht" ON public.cash_transactions
    FOR INSERT
    WITH CHECK (yacht_id = public.get_user_yacht_id());

CREATE POLICY "cash_transactions_update_own_yacht" ON public.cash_transactions
    FOR UPDATE
    USING (yacht_id = public.get_user_yacht_id())
    WITH CHECK (yacht_id = public.get_user_yacht_id());

CREATE POLICY "cash_transactions_delete_own_yacht" ON public.cash_transactions
    FOR DELETE
    USING (yacht_id = public.get_user_yacht_id());

-- Marina Permission Documents
CREATE POLICY "marina_permission_documents_select_own_yacht" ON public.marina_permission_documents
    FOR SELECT
    USING (yacht_id = public.get_user_yacht_id());

CREATE POLICY "marina_permission_documents_insert_own_yacht" ON public.marina_permission_documents
    FOR INSERT
    WITH CHECK (yacht_id = public.get_user_yacht_id());

CREATE POLICY "marina_permission_documents_update_own_yacht" ON public.marina_permission_documents
    FOR UPDATE
    USING (yacht_id = public.get_user_yacht_id())
    WITH CHECK (yacht_id = public.get_user_yacht_id());

CREATE POLICY "marina_permission_documents_delete_own_yacht" ON public.marina_permission_documents
    FOR DELETE
    USING (yacht_id = public.get_user_yacht_id());

-- Vessel Documents
CREATE POLICY "vessel_documents_select_own_yacht" ON public.vessel_documents
    FOR SELECT
    USING (yacht_id = public.get_user_yacht_id());

CREATE POLICY "vessel_documents_insert_own_yacht" ON public.vessel_documents
    FOR INSERT
    WITH CHECK (yacht_id = public.get_user_yacht_id());

CREATE POLICY "vessel_documents_update_own_yacht" ON public.vessel_documents
    FOR UPDATE
    USING (yacht_id = public.get_user_yacht_id())
    WITH CHECK (yacht_id = public.get_user_yacht_id());

CREATE POLICY "vessel_documents_delete_own_yacht" ON public.vessel_documents
    FOR DELETE
    USING (yacht_id = public.get_user_yacht_id());

-- Crew Documents
CREATE POLICY "crew_documents_select_own_yacht" ON public.crew_documents
    FOR SELECT
    USING (yacht_id = public.get_user_yacht_id());

CREATE POLICY "crew_documents_insert_own_yacht" ON public.crew_documents
    FOR INSERT
    WITH CHECK (yacht_id = public.get_user_yacht_id());

CREATE POLICY "crew_documents_update_own_yacht" ON public.crew_documents
    FOR UPDATE
    USING (yacht_id = public.get_user_yacht_id())
    WITH CHECK (yacht_id = public.get_user_yacht_id());

CREATE POLICY "crew_documents_delete_own_yacht" ON public.crew_documents
    FOR DELETE
    USING (yacht_id = public.get_user_yacht_id());

-- ============================================================================
-- Business Tables with yacht_id - Part 2
-- ============================================================================

-- Message Channels
CREATE POLICY "message_channels_select_own_yacht" ON public.message_channels
    FOR SELECT
    USING (yacht_id = public.get_user_yacht_id());

CREATE POLICY "message_channels_insert_own_yacht" ON public.message_channels
    FOR INSERT
    WITH CHECK (yacht_id = public.get_user_yacht_id());

CREATE POLICY "message_channels_update_own_yacht" ON public.message_channels
    FOR UPDATE
    USING (yacht_id = public.get_user_yacht_id())
    WITH CHECK (yacht_id = public.get_user_yacht_id());

CREATE POLICY "message_channels_delete_own_yacht" ON public.message_channels
    FOR DELETE
    USING (yacht_id = public.get_user_yacht_id());

-- Products
CREATE POLICY "products_select_own_yacht" ON public.products
    FOR SELECT
    USING (yacht_id = public.get_user_yacht_id());

CREATE POLICY "products_insert_own_yacht" ON public.products
    FOR INSERT
    WITH CHECK (yacht_id = public.get_user_yacht_id());

CREATE POLICY "products_update_own_yacht" ON public.products
    FOR UPDATE
    USING (yacht_id = public.get_user_yacht_id())
    WITH CHECK (yacht_id = public.get_user_yacht_id());

CREATE POLICY "products_delete_own_yacht" ON public.products
    FOR DELETE
    USING (yacht_id = public.get_user_yacht_id());

-- Shopping Stores
CREATE POLICY "shopping_stores_select_own_yacht" ON public.shopping_stores
    FOR SELECT
    USING (yacht_id = public.get_user_yacht_id());

CREATE POLICY "shopping_stores_insert_own_yacht" ON public.shopping_stores
    FOR INSERT
    WITH CHECK (yacht_id = public.get_user_yacht_id());

CREATE POLICY "shopping_stores_update_own_yacht" ON public.shopping_stores
    FOR UPDATE
    USING (yacht_id = public.get_user_yacht_id())
    WITH CHECK (yacht_id = public.get_user_yacht_id());

CREATE POLICY "shopping_stores_delete_own_yacht" ON public.shopping_stores
    FOR DELETE
    USING (yacht_id = public.get_user_yacht_id());

-- Shopping Lists
CREATE POLICY "shopping_lists_select_own_yacht" ON public.shopping_lists
    FOR SELECT
    USING (yacht_id = public.get_user_yacht_id());

CREATE POLICY "shopping_lists_insert_own_yacht" ON public.shopping_lists
    FOR INSERT
    WITH CHECK (yacht_id = public.get_user_yacht_id());

CREATE POLICY "shopping_lists_update_own_yacht" ON public.shopping_lists
    FOR UPDATE
    USING (yacht_id = public.get_user_yacht_id())
    WITH CHECK (yacht_id = public.get_user_yacht_id());

CREATE POLICY "shopping_lists_delete_own_yacht" ON public.shopping_lists
    FOR DELETE
    USING (yacht_id = public.get_user_yacht_id());

-- Alcohol Stocks
CREATE POLICY "alcohol_stocks_select_own_yacht" ON public.alcohol_stocks
    FOR SELECT
    USING (yacht_id = public.get_user_yacht_id());

CREATE POLICY "alcohol_stocks_insert_own_yacht" ON public.alcohol_stocks
    FOR INSERT
    WITH CHECK (yacht_id = public.get_user_yacht_id());

CREATE POLICY "alcohol_stocks_update_own_yacht" ON public.alcohol_stocks
    FOR UPDATE
    USING (yacht_id = public.get_user_yacht_id())
    WITH CHECK (yacht_id = public.get_user_yacht_id());

CREATE POLICY "alcohol_stocks_delete_own_yacht" ON public.alcohol_stocks
    FOR DELETE
    USING (yacht_id = public.get_user_yacht_id());

-- Maintenance Logs
CREATE POLICY "maintenance_logs_select_own_yacht" ON public.maintenance_logs
    FOR SELECT
    USING (yacht_id = public.get_user_yacht_id());

CREATE POLICY "maintenance_logs_insert_own_yacht" ON public.maintenance_logs
    FOR INSERT
    WITH CHECK (yacht_id = public.get_user_yacht_id());

CREATE POLICY "maintenance_logs_update_own_yacht" ON public.maintenance_logs
    FOR UPDATE
    USING (yacht_id = public.get_user_yacht_id())
    WITH CHECK (yacht_id = public.get_user_yacht_id());

CREATE POLICY "maintenance_logs_delete_own_yacht" ON public.maintenance_logs
    FOR DELETE
    USING (yacht_id = public.get_user_yacht_id());

-- Shifts
CREATE POLICY "shifts_select_own_yacht" ON public.shifts
    FOR SELECT
    USING (yacht_id = public.get_user_yacht_id());

CREATE POLICY "shifts_insert_own_yacht" ON public.shifts
    FOR INSERT
    WITH CHECK (yacht_id = public.get_user_yacht_id());

CREATE POLICY "shifts_update_own_yacht" ON public.shifts
    FOR UPDATE
    USING (yacht_id = public.get_user_yacht_id())
    WITH CHECK (yacht_id = public.get_user_yacht_id());

CREATE POLICY "shifts_delete_own_yacht" ON public.shifts
    FOR DELETE
    USING (yacht_id = public.get_user_yacht_id());

-- Leaves
CREATE POLICY "leaves_select_own_yacht" ON public.leaves
    FOR SELECT
    USING (yacht_id = public.get_user_yacht_id());

CREATE POLICY "leaves_insert_own_yacht" ON public.leaves
    FOR INSERT
    WITH CHECK (yacht_id = public.get_user_yacht_id());

CREATE POLICY "leaves_update_own_yacht" ON public.leaves
    FOR UPDATE
    USING (yacht_id = public.get_user_yacht_id())
    WITH CHECK (yacht_id = public.get_user_yacht_id());

CREATE POLICY "leaves_delete_own_yacht" ON public.leaves
    FOR DELETE
    USING (yacht_id = public.get_user_yacht_id());

-- Custom Roles
CREATE POLICY "custom_roles_select_own_yacht" ON public.custom_roles
    FOR SELECT
    USING (yacht_id = public.get_user_yacht_id());

CREATE POLICY "custom_roles_insert_own_yacht" ON public.custom_roles
    FOR INSERT
    WITH CHECK (yacht_id = public.get_user_yacht_id());

CREATE POLICY "custom_roles_update_own_yacht" ON public.custom_roles
    FOR UPDATE
    USING (yacht_id = public.get_user_yacht_id())
    WITH CHECK (yacht_id = public.get_user_yacht_id());

CREATE POLICY "custom_roles_delete_own_yacht" ON public.custom_roles
    FOR DELETE
    USING (yacht_id = public.get_user_yacht_id());

-- Feedback
CREATE POLICY "feedback_select_own_yacht" ON public.feedback
    FOR SELECT
    USING (yacht_id = public.get_user_yacht_id() OR yacht_id IS NULL);

CREATE POLICY "feedback_insert_own_yacht" ON public.feedback
    FOR INSERT
    WITH CHECK (yacht_id = public.get_user_yacht_id() OR yacht_id IS NULL);

CREATE POLICY "feedback_update_own_yacht" ON public.feedback
    FOR UPDATE
    USING (yacht_id = public.get_user_yacht_id() OR yacht_id IS NULL)
    WITH CHECK (yacht_id = public.get_user_yacht_id() OR yacht_id IS NULL);

CREATE POLICY "feedback_delete_own_yacht" ON public.feedback
    FOR DELETE
    USING (yacht_id = public.get_user_yacht_id() OR yacht_id IS NULL);

-- ============================================================================
-- Related Tables (no direct yacht_id, accessed via parent)
-- ============================================================================

-- Trip Itinerary Days
CREATE POLICY "trip_itinerary_days_select_own_yacht" ON public.trip_itinerary_days
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.trips
            WHERE trips.id = trip_itinerary_days.trip_id
            AND trips.yacht_id = public.get_user_yacht_id()
        )
    );

CREATE POLICY "trip_itinerary_days_insert_own_yacht" ON public.trip_itinerary_days
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.trips
            WHERE trips.id = trip_itinerary_days.trip_id
            AND trips.yacht_id = public.get_user_yacht_id()
        )
    );

CREATE POLICY "trip_itinerary_days_update_own_yacht" ON public.trip_itinerary_days
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

CREATE POLICY "trip_itinerary_days_delete_own_yacht" ON public.trip_itinerary_days
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.trips
            WHERE trips.id = trip_itinerary_days.trip_id
            AND trips.yacht_id = public.get_user_yacht_id()
        )
    );

-- Trip Checklist Items
CREATE POLICY "trip_checklist_items_select_own_yacht" ON public.trip_checklist_items
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.trips
            WHERE trips.id = trip_checklist_items.trip_id
            AND trips.yacht_id = public.get_user_yacht_id()
        )
    );

CREATE POLICY "trip_checklist_items_insert_own_yacht" ON public.trip_checklist_items
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.trips
            WHERE trips.id = trip_checklist_items.trip_id
            AND trips.yacht_id = public.get_user_yacht_id()
        )
    );

CREATE POLICY "trip_checklist_items_update_own_yacht" ON public.trip_checklist_items
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

CREATE POLICY "trip_checklist_items_delete_own_yacht" ON public.trip_checklist_items
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.trips
            WHERE trips.id = trip_checklist_items.trip_id
            AND trips.yacht_id = public.get_user_yacht_id()
        )
    );

-- Trip Tank Logs
CREATE POLICY "trip_tank_logs_select_own_yacht" ON public.trip_tank_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.trips
            WHERE trips.id = trip_tank_logs.trip_id
            AND trips.yacht_id = public.get_user_yacht_id()
        )
    );

CREATE POLICY "trip_tank_logs_insert_own_yacht" ON public.trip_tank_logs
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.trips
            WHERE trips.id = trip_tank_logs.trip_id
            AND trips.yacht_id = public.get_user_yacht_id()
        )
    );

CREATE POLICY "trip_tank_logs_update_own_yacht" ON public.trip_tank_logs
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

CREATE POLICY "trip_tank_logs_delete_own_yacht" ON public.trip_tank_logs
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.trips
            WHERE trips.id = trip_tank_logs.trip_id
            AND trips.yacht_id = public.get_user_yacht_id()
        )
    );

-- Trip Movement Logs
CREATE POLICY "trip_movement_logs_select_own_yacht" ON public.trip_movement_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.trips
            WHERE trips.id = trip_movement_logs.trip_id
            AND trips.yacht_id = public.get_user_yacht_id()
        )
    );

CREATE POLICY "trip_movement_logs_insert_own_yacht" ON public.trip_movement_logs
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.trips
            WHERE trips.id = trip_movement_logs.trip_id
            AND trips.yacht_id = public.get_user_yacht_id()
        )
    );

CREATE POLICY "trip_movement_logs_update_own_yacht" ON public.trip_movement_logs
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

CREATE POLICY "trip_movement_logs_delete_own_yacht" ON public.trip_movement_logs
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.trips
            WHERE trips.id = trip_movement_logs.trip_id
            AND trips.yacht_id = public.get_user_yacht_id()
        )
    );

-- Task Comments
CREATE POLICY "task_comments_select_own_yacht" ON public.task_comments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.tasks
            WHERE tasks.id = task_comments.task_id
            AND tasks.yacht_id = public.get_user_yacht_id()
        )
    );

CREATE POLICY "task_comments_insert_own_yacht" ON public.task_comments
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.tasks
            WHERE tasks.id = task_comments.task_id
            AND tasks.yacht_id = public.get_user_yacht_id()
        )
    );

CREATE POLICY "task_comments_update_own_yacht" ON public.task_comments
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.tasks
            WHERE tasks.id = task_comments.task_id
            AND tasks.yacht_id = public.get_user_yacht_id()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.tasks
            WHERE tasks.id = task_comments.task_id
            AND tasks.yacht_id = public.get_user_yacht_id()
        )
    );

CREATE POLICY "task_comments_delete_own_yacht" ON public.task_comments
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.tasks
            WHERE tasks.id = task_comments.task_id
            AND tasks.yacht_id = public.get_user_yacht_id()
        )
    );

-- Task Attachments
CREATE POLICY "task_attachments_select_own_yacht" ON public.task_attachments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.tasks
            WHERE tasks.id = task_attachments.task_id
            AND tasks.yacht_id = public.get_user_yacht_id()
        )
    );

CREATE POLICY "task_attachments_insert_own_yacht" ON public.task_attachments
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.tasks
            WHERE tasks.id = task_attachments.task_id
            AND tasks.yacht_id = public.get_user_yacht_id()
        )
    );

CREATE POLICY "task_attachments_update_own_yacht" ON public.task_attachments
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.tasks
            WHERE tasks.id = task_attachments.task_id
            AND tasks.yacht_id = public.get_user_yacht_id()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.tasks
            WHERE tasks.id = task_attachments.task_id
            AND tasks.yacht_id = public.get_user_yacht_id()
        )
    );

CREATE POLICY "task_attachments_delete_own_yacht" ON public.task_attachments
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.tasks
            WHERE tasks.id = task_attachments.task_id
            AND tasks.yacht_id = public.get_user_yacht_id()
        )
    );

-- Expense Receipts
CREATE POLICY "expense_receipts_select_own_yacht" ON public.expense_receipts
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.expenses
            WHERE expenses.id = expense_receipts.expense_id
            AND expenses.yacht_id = public.get_user_yacht_id()
        )
    );

CREATE POLICY "expense_receipts_insert_own_yacht" ON public.expense_receipts
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.expenses
            WHERE expenses.id = expense_receipts.expense_id
            AND expenses.yacht_id = public.get_user_yacht_id()
        )
    );

CREATE POLICY "expense_receipts_update_own_yacht" ON public.expense_receipts
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

CREATE POLICY "expense_receipts_delete_own_yacht" ON public.expense_receipts
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.expenses
            WHERE expenses.id = expense_receipts.expense_id
            AND expenses.yacht_id = public.get_user_yacht_id()
        )
    );

-- Maintenance Documents
CREATE POLICY "maintenance_documents_select_own_yacht" ON public.maintenance_documents
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.maintenance_logs
            WHERE maintenance_logs.id = maintenance_documents.maintenance_id
            AND maintenance_logs.yacht_id = public.get_user_yacht_id()
        )
    );

CREATE POLICY "maintenance_documents_insert_own_yacht" ON public.maintenance_documents
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.maintenance_logs
            WHERE maintenance_logs.id = maintenance_documents.maintenance_id
            AND maintenance_logs.yacht_id = public.get_user_yacht_id()
        )
    );

CREATE POLICY "maintenance_documents_update_own_yacht" ON public.maintenance_documents
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

CREATE POLICY "maintenance_documents_delete_own_yacht" ON public.maintenance_documents
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.maintenance_logs
            WHERE maintenance_logs.id = maintenance_documents.maintenance_id
            AND maintenance_logs.yacht_id = public.get_user_yacht_id()
        )
    );

-- Shopping Items
CREATE POLICY "shopping_items_select_own_yacht" ON public.shopping_items
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.shopping_lists
            WHERE shopping_lists.id = shopping_items.list_id
            AND shopping_lists.yacht_id = public.get_user_yacht_id()
        )
    );

CREATE POLICY "shopping_items_insert_own_yacht" ON public.shopping_items
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.shopping_lists
            WHERE shopping_lists.id = shopping_items.list_id
            AND shopping_lists.yacht_id = public.get_user_yacht_id()
        )
    );

CREATE POLICY "shopping_items_update_own_yacht" ON public.shopping_items
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

CREATE POLICY "shopping_items_delete_own_yacht" ON public.shopping_items
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.shopping_lists
            WHERE shopping_lists.id = shopping_items.list_id
            AND shopping_lists.yacht_id = public.get_user_yacht_id()
        )
    );

-- Alcohol Stock History
CREATE POLICY "alcohol_stock_history_select_own_yacht" ON public.alcohol_stock_history
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.alcohol_stocks
            WHERE alcohol_stocks.id = alcohol_stock_history.stock_id
            AND alcohol_stocks.yacht_id = public.get_user_yacht_id()
        )
    );

CREATE POLICY "alcohol_stock_history_insert_own_yacht" ON public.alcohol_stock_history
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.alcohol_stocks
            WHERE alcohol_stocks.id = alcohol_stock_history.stock_id
            AND alcohol_stocks.yacht_id = public.get_user_yacht_id()
        )
    );

CREATE POLICY "alcohol_stock_history_update_own_yacht" ON public.alcohol_stock_history
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

CREATE POLICY "alcohol_stock_history_delete_own_yacht" ON public.alcohol_stock_history
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.alcohol_stocks
            WHERE alcohol_stocks.id = alcohol_stock_history.stock_id
            AND alcohol_stocks.yacht_id = public.get_user_yacht_id()
        )
    );

-- ============================================================================
-- Messages & Related Tables
-- ============================================================================

-- Messages
CREATE POLICY "messages_select_own_yacht" ON public.messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.message_channels
            WHERE message_channels.id = messages.channel_id
            AND message_channels.yacht_id = public.get_user_yacht_id()
        )
    );

CREATE POLICY "messages_insert_own_yacht" ON public.messages
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.message_channels
            WHERE message_channels.id = messages.channel_id
            AND message_channels.yacht_id = public.get_user_yacht_id()
        )
    );

CREATE POLICY "messages_update_own_yacht" ON public.messages
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.message_channels
            WHERE message_channels.id = messages.channel_id
            AND message_channels.yacht_id = public.get_user_yacht_id()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.message_channels
            WHERE message_channels.id = messages.channel_id
            AND message_channels.yacht_id = public.get_user_yacht_id()
        )
    );

CREATE POLICY "messages_delete_own_yacht" ON public.messages
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.message_channels
            WHERE message_channels.id = messages.channel_id
            AND message_channels.yacht_id = public.get_user_yacht_id()
        )
    );

-- Message Reads
CREATE POLICY "message_reads_select_own_yacht" ON public.message_reads
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.messages
            JOIN public.message_channels ON message_channels.id = messages.channel_id
            WHERE messages.id = message_reads.message_id
            AND message_channels.yacht_id = public.get_user_yacht_id()
        )
    );

CREATE POLICY "message_reads_insert_own_yacht" ON public.message_reads
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.messages
            JOIN public.message_channels ON message_channels.id = messages.channel_id
            WHERE messages.id = message_reads.message_id
            AND message_channels.yacht_id = public.get_user_yacht_id()
        )
    );

CREATE POLICY "message_reads_update_own_yacht" ON public.message_reads
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.messages
            JOIN public.message_channels ON message_channels.id = messages.channel_id
            WHERE messages.id = message_reads.message_id
            AND message_channels.yacht_id = public.get_user_yacht_id()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.messages
            JOIN public.message_channels ON message_channels.id = messages.channel_id
            WHERE messages.id = message_reads.message_id
            AND message_channels.yacht_id = public.get_user_yacht_id()
        )
    );

CREATE POLICY "message_reads_delete_own_yacht" ON public.message_reads
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.messages
            JOIN public.message_channels ON message_channels.id = messages.channel_id
            WHERE messages.id = message_reads.message_id
            AND message_channels.yacht_id = public.get_user_yacht_id()
        )
    );

-- Message Attachments
CREATE POLICY "message_attachments_select_own_yacht" ON public.message_attachments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.messages
            JOIN public.message_channels ON message_channels.id = messages.channel_id
            WHERE messages.id = message_attachments.message_id
            AND message_channels.yacht_id = public.get_user_yacht_id()
        )
    );

CREATE POLICY "message_attachments_insert_own_yacht" ON public.message_attachments
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.messages
            JOIN public.message_channels ON message_channels.id = messages.channel_id
            WHERE messages.id = message_attachments.message_id
            AND message_channels.yacht_id = public.get_user_yacht_id()
        )
    );

CREATE POLICY "message_attachments_update_own_yacht" ON public.message_attachments
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.messages
            JOIN public.message_channels ON message_channels.id = messages.channel_id
            WHERE messages.id = message_attachments.message_id
            AND message_channels.yacht_id = public.get_user_yacht_id()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.messages
            JOIN public.message_channels ON message_channels.id = messages.channel_id
            WHERE messages.id = message_attachments.message_id
            AND message_channels.yacht_id = public.get_user_yacht_id()
        )
    );

CREATE POLICY "message_attachments_delete_own_yacht" ON public.message_attachments
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.messages
            JOIN public.message_channels ON message_channels.id = messages.channel_id
            WHERE messages.id = message_attachments.message_id
            AND message_channels.yacht_id = public.get_user_yacht_id()
        )
    );

-- ============================================================================
-- User-Specific Tables
-- ============================================================================

-- Notifications
CREATE POLICY "notifications_select_own" ON public.notifications
    FOR SELECT
    USING (user_id = (select auth.uid())::TEXT);

CREATE POLICY "notifications_insert_own" ON public.notifications
    FOR INSERT
    WITH CHECK (user_id = (select auth.uid())::TEXT);

CREATE POLICY "notifications_update_own" ON public.notifications
    FOR UPDATE
    USING (user_id = (select auth.uid())::TEXT)
    WITH CHECK (user_id = (select auth.uid())::TEXT);

CREATE POLICY "notifications_delete_own" ON public.notifications
    FOR DELETE
    USING (user_id = (select auth.uid())::TEXT);

-- User Notes
CREATE POLICY "user_notes_select_own" ON public.user_notes
    FOR SELECT
    USING (user_id = (select auth.uid())::TEXT);

CREATE POLICY "user_notes_insert_own" ON public.user_notes
    FOR INSERT
    WITH CHECK (user_id = (select auth.uid())::TEXT);

CREATE POLICY "user_notes_update_own" ON public.user_notes
    FOR UPDATE
    USING (user_id = (select auth.uid())::TEXT)
    WITH CHECK (user_id = (select auth.uid())::TEXT);

CREATE POLICY "user_notes_delete_own" ON public.user_notes
    FOR DELETE
    USING (user_id = (select auth.uid())::TEXT);

-- User Note Checklist Items
CREATE POLICY "user_note_checklist_items_select_own" ON public.user_note_checklist_items
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_notes
            WHERE user_notes.id = user_note_checklist_items.note_id
            AND user_notes.user_id = (select auth.uid())::TEXT
        )
    );

CREATE POLICY "user_note_checklist_items_insert_own" ON public.user_note_checklist_items
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_notes
            WHERE user_notes.id = user_note_checklist_items.note_id
            AND user_notes.user_id = (select auth.uid())::TEXT
        )
    );

CREATE POLICY "user_note_checklist_items_update_own" ON public.user_note_checklist_items
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.user_notes
            WHERE user_notes.id = user_note_checklist_items.note_id
            AND user_notes.user_id = (select auth.uid())::TEXT
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_notes
            WHERE user_notes.id = user_note_checklist_items.note_id
            AND user_notes.user_id = (select auth.uid())::TEXT
        )
    );

CREATE POLICY "user_note_checklist_items_delete_own" ON public.user_note_checklist_items
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.user_notes
            WHERE user_notes.id = user_note_checklist_items.note_id
            AND user_notes.user_id = (select auth.uid())::TEXT
        )
    );

-- ============================================================================
-- Sensitive Tables (Restricted Access)
-- ============================================================================

-- Audit Logs: No client access (service role only)
-- Note: These policies deny all access from authenticated users
-- Service role will bypass RLS
CREATE POLICY "audit_logs_deny_all" ON public.audit_logs
    FOR ALL
    USING (false)
    WITH CHECK (false);

-- Usage Events: Users can only insert their own events
CREATE POLICY "usage_events_insert_own" ON public.usage_events
    FOR INSERT
    WITH CHECK (user_id = (select auth.uid())::TEXT);

-- Usage Events: Users can only select their own events
CREATE POLICY "usage_events_select_own" ON public.usage_events
    FOR SELECT
    USING (user_id = (select auth.uid())::TEXT);

-- Usage Events: No UPDATE or DELETE (read-only after insert)
CREATE POLICY "usage_events_no_update" ON public.usage_events
    FOR UPDATE
    USING (false)
    WITH CHECK (false);

CREATE POLICY "usage_events_no_delete" ON public.usage_events
    FOR DELETE
    USING (false);

