# RLS Testing Checklist

This checklist helps verify that Row Level Security (RLS) policies are working correctly for the single-tenant-per-user model.

## Prerequisites

1. **Supabase Auth Setup**: Ensure users are authenticated via Supabase Auth (not just NextAuth)
   - Users must have corresponding entries in `auth.users` table
   - `auth.uid()` must return the user's ID from `public.users.id`

2. **Test Users**: Create at least 2 test users with different `yacht_id` values
   - User A: `yacht_id = 'yacht-1'`
   - User B: `yacht_id = 'yacht-2'`
   - User C: `yacht_id = NULL` (optional, for edge case testing)

3. **Test Data**: Create sample data for both yachts
   - At least 5-10 records per table for each yacht
   - Mix of different statuses, dates, etc.

## Testing Tools

### Option 1: Supabase Dashboard SQL Editor
- Use the SQL Editor with different user contexts
- Test queries as different authenticated users

### Option 2: Supabase Client (JavaScript/TypeScript)
```typescript
import { createClient } from '@supabase/supabase-js'

// Test as User A
const supabaseA = createClient(url, anonKey, {
  global: { headers: { Authorization: `Bearer ${userAToken}` } }
})

// Test as User B
const supabaseB = createClient(url, anonKey, {
  global: { headers: { Authorization: `Bearer ${userBToken}` } }
})
```

### Option 3: Direct SQL with Service Role
- Use service role key to bypass RLS for setup
- Then test with anon key as authenticated users

## Core Function Tests

### ✅ Helper Functions

```sql
-- Test get_user_yacht_id()
-- As User A (yacht_id = 'yacht-1')
SELECT public.get_user_yacht_id(); -- Should return 'yacht-1'

-- As User B (yacht_id = 'yacht-2')
SELECT public.get_user_yacht_id(); -- Should return 'yacht-2'

-- As User C (yacht_id = NULL)
SELECT public.get_user_yacht_id(); -- Should return NULL
```

```sql
-- Test can_modify_yacht_id()
-- As OWNER user
SELECT public.can_modify_yacht_id(); -- Should return true

-- As CAPTAIN user
SELECT public.can_modify_yacht_id(); -- Should return true

-- As CREW user
SELECT public.can_modify_yacht_id(); -- Should return false
```

## Business Tables with yacht_id

Test each table with the following pattern:

### ✅ SELECT Tests

**Test**: User A can only see their yacht's data
```sql
-- As User A
SELECT COUNT(*) FROM public.trips; -- Should only return trips for yacht-1
SELECT COUNT(*) FROM public.expenses; -- Should only return expenses for yacht-1
SELECT COUNT(*) FROM public.tasks; -- Should only return tasks for yacht-1
-- Repeat for all business tables
```

**Test**: User A cannot see User B's yacht data
```sql
-- As User A, try to access yacht-2 data directly
SELECT * FROM public.trips WHERE yacht_id = 'yacht-2'; -- Should return 0 rows
SELECT * FROM public.expenses WHERE yacht_id = 'yacht-2'; -- Should return 0 rows
```

**Test**: User with NULL yacht_id sees nothing
```sql
-- As User C (yacht_id = NULL)
SELECT COUNT(*) FROM public.trips; -- Should return 0
SELECT COUNT(*) FROM public.expenses; -- Should return 0
```

### ✅ INSERT Tests

**Test**: User A can insert data for their yacht
```sql
-- As User A
INSERT INTO public.trips (yacht_id, name, start_date, status)
VALUES ('yacht-1', 'Test Trip', NOW(), 'PLANNED');
-- Should succeed
```

**Test**: User A cannot insert data for another yacht
```sql
-- As User A
INSERT INTO public.trips (yacht_id, name, start_date, status)
VALUES ('yacht-2', 'Test Trip', NOW(), 'PLANNED');
-- Should fail with RLS policy violation
```

**Test**: User A cannot insert data with NULL yacht_id (if required)
```sql
-- As User A
INSERT INTO public.trips (yacht_id, name, start_date, status)
VALUES (NULL, 'Test Trip', NOW(), 'PLANNED');
-- Should fail if yacht_id is required, or succeed if nullable
```

### ✅ UPDATE Tests

**Test**: User A can update their yacht's data
```sql
-- As User A
UPDATE public.trips 
SET name = 'Updated Trip'
WHERE id = '<trip-id-from-yacht-1>';
-- Should succeed
```

**Test**: User A cannot update another yacht's data
```sql
-- As User A
UPDATE public.trips 
SET name = 'Hacked Trip'
WHERE yacht_id = 'yacht-2';
-- Should affect 0 rows (silently filtered)
```

**Test**: User A cannot change yacht_id to another yacht
```sql
-- As User A
UPDATE public.trips 
SET yacht_id = 'yacht-2'
WHERE id = '<trip-id-from-yacht-1>';
-- Should fail with RLS policy violation
```

### ✅ DELETE Tests

**Test**: User A can delete their yacht's data
```sql
-- As User A
DELETE FROM public.trips WHERE id = '<trip-id-from-yacht-1>';
-- Should succeed
```

**Test**: User A cannot delete another yacht's data
```sql
-- As User A
DELETE FROM public.trips WHERE yacht_id = 'yacht-2';
-- Should affect 0 rows (silently filtered)
```

## Users Table Tests

### ✅ SELECT Tests

**Test**: User can only see their own row
```sql
-- As User A
SELECT * FROM public.users WHERE id = auth.uid(); -- Should return 1 row (User A)
SELECT * FROM public.users WHERE id != auth.uid(); -- Should return 0 rows
SELECT COUNT(*) FROM public.users; -- Should return 1
```

### ✅ UPDATE Tests

**Test**: User can update their own profile
```sql
-- As User A
UPDATE public.users 
SET name = 'Updated Name'
WHERE id = auth.uid();
-- Should succeed
```

**Test**: User cannot update another user's profile
```sql
-- As User A
UPDATE public.users 
SET name = 'Hacked Name'
WHERE id = '<user-b-id>';
-- Should affect 0 rows
```

**Test**: CREW user cannot change their yacht_id
```sql
-- As User A (CREW role)
UPDATE public.users 
SET yacht_id = 'yacht-2'
WHERE id = auth.uid();
-- Should fail with RLS policy violation
```

**Test**: OWNER/CAPTAIN can change their yacht_id
```sql
-- As User A (OWNER or CAPTAIN role)
UPDATE public.users 
SET yacht_id = 'yacht-2'
WHERE id = auth.uid();
-- Should succeed
```

**Test**: User can update other fields without changing yacht_id
```sql
-- As User A (any role)
UPDATE public.users 
SET name = 'New Name', email = 'new@email.com'
WHERE id = auth.uid();
-- Should succeed (yacht_id unchanged)
```

## Related Tables (via Parent yacht_id)

Test tables that don't have yacht_id directly but are linked via parent tables:

### ✅ Trip-Related Tables

```sql
-- As User A
-- Should only see itinerary days for trips belonging to yacht-1
SELECT COUNT(*) FROM public.trip_itinerary_days; 
-- Should match count of trips for yacht-1

-- Should only see checklist items for trips belonging to yacht-1
SELECT COUNT(*) FROM public.trip_checklist_items;

-- Should only see tank logs for trips belonging to yacht-1
SELECT COUNT(*) FROM public.trip_tank_logs;

-- Should only see movement logs for trips belonging to yacht-1
SELECT COUNT(*) FROM public.trip_movement_logs;
```

### ✅ Task-Related Tables

```sql
-- As User A
-- Should only see comments for tasks belonging to yacht-1
SELECT COUNT(*) FROM public.task_comments;

-- Should only see attachments for tasks belonging to yacht-1
SELECT COUNT(*) FROM public.task_attachments;

-- Test: User can only insert comments on their yacht's tasks
INSERT INTO public.task_comments (task_id, user_id, content)
VALUES ('<task-id-from-yacht-2>', auth.uid(), 'Test');
-- Should fail
```

### ✅ Expense-Related Tables

```sql
-- As User A
-- Should only see receipts for expenses belonging to yacht-1
SELECT COUNT(*) FROM public.expense_receipts;
```

### ✅ Message-Related Tables

```sql
-- As User A
-- Should only see messages in channels belonging to yacht-1
SELECT COUNT(*) FROM public.messages;

-- Should only see message reads for messages in yacht-1 channels
SELECT COUNT(*) FROM public.message_reads;

-- Should only see attachments for messages in yacht-1 channels
SELECT COUNT(*) FROM public.message_attachments;
```

### ✅ Other Related Tables

```sql
-- As User A
-- Maintenance documents
SELECT COUNT(*) FROM public.maintenance_documents;

-- Shopping items
SELECT COUNT(*) FROM public.shopping_items;

-- Alcohol stock history
SELECT COUNT(*) FROM public.alcohol_stock_history;
```

## User-Specific Tables

### ✅ Notifications

```sql
-- As User A
SELECT COUNT(*) FROM public.notifications; 
-- Should only return notifications for User A

-- Cannot see other users' notifications
SELECT * FROM public.notifications WHERE user_id != auth.uid();
-- Should return 0 rows
```

### ✅ User Notes

```sql
-- As User A
SELECT COUNT(*) FROM public.user_notes; 
-- Should only return notes for User A

-- Cannot see other users' notes
SELECT * FROM public.user_notes WHERE user_id != auth.uid();
-- Should return 0 rows
```

## Sensitive Tables

### ✅ Audit Logs

```sql
-- As User A (or any authenticated user)
SELECT * FROM public.audit_logs;
-- Should return 0 rows (no client access)

-- Service role should be able to read
-- (Test with service role key, not anon key)
```

### ✅ Usage Events

```sql
-- As User A
SELECT * FROM public.usage_events;
-- Should return 0 rows (no client read access)

-- As User A
INSERT INTO public.usage_events (user_id, event_type, page)
VALUES (auth.uid(), 'page_view', '/dashboard');
-- Should succeed (insert allowed)

-- As User A
UPDATE public.usage_events SET event_type = 'test' WHERE user_id = auth.uid();
-- Should affect 0 rows (no update access)

-- As User A
DELETE FROM public.usage_events WHERE user_id = auth.uid();
-- Should affect 0 rows (no delete access)
```

## Edge Cases

### ✅ NULL yacht_id Handling

```sql
-- Test user with NULL yacht_id
-- As User C (yacht_id = NULL)
SELECT COUNT(*) FROM public.trips; -- Should return 0
SELECT COUNT(*) FROM public.expenses; -- Should return 0

-- Test feedback table (yacht_id is nullable)
-- As User C
INSERT INTO public.feedback (user_id, type, message)
VALUES (auth.uid(), 'bug', 'Test feedback');
-- Should succeed (yacht_id can be NULL)
```

### ✅ Feedback Table (Nullable yacht_id)

```sql
-- As User A
-- Can see feedback with yacht_id = 'yacht-1'
SELECT COUNT(*) FROM public.feedback WHERE yacht_id = 'yacht-1';

-- Can see their own feedback even if yacht_id is NULL
SELECT COUNT(*) FROM public.feedback WHERE user_id = auth.uid() AND yacht_id IS NULL;

-- Cannot see feedback for yacht-2
SELECT COUNT(*) FROM public.feedback WHERE yacht_id = 'yacht-2';
-- Should return 0 (unless it's their own feedback)
```

## Integration Tests (Application Level)

### ✅ Test in Application UI

1. **Login as User A**
   - Navigate to all major pages
   - Verify only yacht-1 data is visible
   - Try to create/edit/delete records
   - Verify operations succeed

2. **Login as User B**
   - Navigate to same pages
   - Verify only yacht-2 data is visible
   - Verify User A's data is not visible

3. **Cross-Yacht Access Attempts**
   - As User A, try to access URLs with yacht-2 IDs
   - Verify 404 or empty results
   - Check browser console for errors

4. **Profile Updates**
   - As CREW user, try to change yacht_id in profile
   - Verify it's blocked
   - As OWNER/CAPTAIN, verify yacht_id can be changed

## Performance Tests

### ✅ Query Performance

```sql
-- Test that policies don't cause significant performance degradation
EXPLAIN ANALYZE
SELECT * FROM public.expenses 
WHERE yacht_id = public.get_user_yacht_id();

-- Check that indexes are being used
-- Should see index scans, not sequential scans
```

## Security Verification

### ✅ Direct SQL Injection Attempts

```sql
-- As User A, try to bypass RLS
SELECT * FROM public.trips WHERE yacht_id = 'yacht-2' OR '1'='1';
-- Should still return 0 rows (RLS applies before WHERE clause)

-- Try to use subqueries to bypass
SELECT * FROM public.trips 
WHERE id IN (SELECT id FROM public.trips WHERE yacht_id = 'yacht-2');
-- Should return 0 rows
```

### ✅ Service Role Bypass

```sql
-- Verify service role can bypass RLS (for application logic)
-- Use service role key
SELECT COUNT(*) FROM public.trips; 
-- Should return all trips (service role bypasses RLS)
```

## Checklist Summary

- [ ] Helper functions work correctly
- [ ] All business tables enforce yacht_id isolation
- [ ] Users table restricts access to own row
- [ ] Users table prevents unauthorized yacht_id changes
- [ ] Related tables enforce isolation via parent yacht_id
- [ ] User-specific tables (notifications, notes) are isolated
- [ ] Sensitive tables (audit_logs, usage_events) are protected
- [ ] NULL yacht_id cases are handled correctly
- [ ] Application UI works correctly with RLS enabled
- [ ] No performance degradation
- [ ] RLS cannot be bypassed via SQL injection
- [ ] Service role can still access all data (for application logic)

## Troubleshooting

### Issue: "Policy violation" errors

**Check:**
1. User is authenticated (`auth.uid()` is not NULL)
2. User exists in `public.users` table
3. User has a `yacht_id` set (if required)
4. Helper functions are working correctly

### Issue: "No rows returned" when data exists

**Check:**
1. User's `yacht_id` matches the data's `yacht_id`
2. RLS policies are correctly enabled
3. Helper function `get_user_yacht_id()` returns correct value

### Issue: "Permission denied" on INSERT

**Check:**
1. `WITH CHECK` clause in INSERT policy
2. `yacht_id` is being set correctly in INSERT statement
3. User's `yacht_id` matches the inserted `yacht_id`

### Issue: Application breaks after enabling RLS

**Check:**
1. Application is using service role for admin operations
2. Client-side queries are using authenticated user context
3. All queries include necessary fields (e.g., `yacht_id`)

## Notes

- **Service Role**: Use service role key for application backend operations that need to bypass RLS
- **Anon Key**: Use anon key for client-side operations that should respect RLS
- **Migration Table**: `_prisma_migrations` should never be accessible to clients (no policies needed)
- **Performance**: Monitor query performance after enabling RLS; add indexes if needed

