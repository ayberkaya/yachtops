-- ============================================================================
-- RLS Migration Part 5: Related Tables - Trip Related
-- ============================================================================
-- Policies for tables related to trips (via trip_id)
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


