# RLS Implementation Notes

## Overview

This document provides important information about the Row Level Security (RLS) implementation for the single-tenant-per-user model.

## Migration File

**Location**: `helmops/prisma/migrations/20250115000000_enable_rls_single_tenant/migration.sql`

**What it does:**
- Enables RLS on all public tables
- Creates helper functions for yacht_id checks
- Implements policies for yacht-based isolation
- Protects sensitive tables (audit_logs, usage_events)
- Enforces user self-access restrictions

## Important Considerations

### 1. Supabase Auth vs NextAuth

**Current State**: The codebase uses NextAuth for authentication, but RLS policies use `auth.uid()` which is a Supabase Auth function.

**Options:**

**Option A: Migrate to Supabase Auth** (Recommended for full RLS support)
- Replace NextAuth with Supabase Auth
- Users will be authenticated via Supabase
- `auth.uid()` will work automatically
- Full RLS enforcement

**Option B: Use Service Role for All Operations** (Current workaround)
- Keep NextAuth for authentication
- Use Supabase service role key for all database operations
- RLS policies will be bypassed (service role has full access)
- Application must enforce tenant isolation in code

**Option C: Hybrid Approach**
- Use NextAuth for authentication
- Sync user IDs to Supabase Auth (create auth.users entries)
- Use Supabase client with JWT tokens for database access
- RLS will work, but requires maintaining two auth systems

### 2. Helper Functions

The migration creates two helper functions:

**`public.get_user_yacht_id()`**
- Returns the `yacht_id` for the current authenticated user
- Used in all RLS policies
- Returns NULL if user doesn't exist or has no yacht_id

**`public.can_modify_yacht_id()`**
- Returns true if user is OWNER or CAPTAIN
- Returns false otherwise
- Used in users table UPDATE policy

### 3. Policy Structure

**Business Tables with yacht_id:**
- SELECT: Only rows where `yacht_id = user's yacht_id`
- INSERT: Only if `yacht_id = user's yacht_id`
- UPDATE: Only rows where `yacht_id = user's yacht_id` (and cannot change yacht_id)
- DELETE: Only rows where `yacht_id = user's yacht_id`

**Related Tables (no direct yacht_id):**
- Access controlled via parent table's yacht_id
- Uses EXISTS subqueries to check parent yacht_id
- Examples: task_comments, expense_receipts, trip_itinerary_days

**Users Table:**
- SELECT: Only own row (`id = auth.uid()`)
- UPDATE: Only own row, with yacht_id change restriction
- INSERT/DELETE: No client access (service role only)

**Sensitive Tables:**
- `audit_logs`: No client access (service role only)
- `usage_events`: INSERT allowed for own user_id, no SELECT/UPDATE/DELETE

### 4. Tables Not Covered

The following tables are not included in the migration:
- `_prisma_migrations`: System table, should never have client access
- Any tables in non-public schemas

## Applying the Migration

### Prerequisites

1. **Backup your database** before applying this migration
2. Ensure you have a service role key for Supabase
3. Test in a development environment first

### Steps

1. **Review the migration file** to ensure it matches your schema
2. **Apply via Prisma:**
   ```bash
   cd helmops
   npx prisma migrate deploy
   ```

3. **Or apply directly in Supabase SQL Editor:**
   - Copy the contents of `migration.sql`
   - Paste into Supabase Dashboard → SQL Editor
   - Execute

### Verification

After applying, verify:
1. RLS is enabled on all tables:
   ```sql
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE schemaname = 'public' 
   AND rowsecurity = true;
   ```

2. Policies are created:
   ```sql
   SELECT schemaname, tablename, policyname 
   FROM pg_policies 
   WHERE schemaname = 'public'
   ORDER BY tablename, policyname;
   ```

3. Helper functions exist:
   ```sql
   SELECT routine_name 
   FROM information_schema.routines 
   WHERE routine_schema = 'public' 
   AND routine_name IN ('get_user_yacht_id', 'can_modify_yacht_id');
   ```

## Testing

See `RLS_TESTING_CHECKLIST.md` for comprehensive testing procedures.

**Quick Test:**
```sql
-- As an authenticated user
SELECT public.get_user_yacht_id(); -- Should return your yacht_id
SELECT COUNT(*) FROM public.trips; -- Should only return trips for your yacht
```

## Rollback

If you need to rollback:

```sql
-- Disable RLS on all tables (use service role)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', r.tablename);
    END LOOP;
END $$;

-- Drop helper functions
DROP FUNCTION IF EXISTS public.get_user_yacht_id();
DROP FUNCTION IF EXISTS public.can_modify_yacht_id();

-- Drop all policies (optional, RLS disabled is enough)
-- Policies will be automatically dropped if you drop the functions they depend on
```

## Performance Considerations

1. **Indexes**: Ensure indexes exist on `yacht_id` columns for optimal performance
2. **Helper Functions**: The helper functions use `SECURITY DEFINER` and are marked `STABLE` for caching
3. **Subqueries**: Related table policies use EXISTS subqueries which should use indexes on foreign keys

**Monitor query performance:**
```sql
EXPLAIN ANALYZE
SELECT * FROM public.expenses 
WHERE yacht_id = public.get_user_yacht_id();
```

## Security Notes

1. **Service Role**: Never expose service role key to clients
2. **Anon Key**: Use anon key for client-side operations
3. **JWT Tokens**: Ensure JWT tokens are properly validated
4. **SQL Injection**: RLS policies are applied at the database level, providing defense in depth

## Common Issues

### Issue: "function get_user_yacht_id() does not exist"

**Solution**: The migration may not have been fully applied. Re-run the migration.

### Issue: "permission denied" errors

**Solution**: 
- Verify user is authenticated (`auth.uid()` is not NULL)
- Check user exists in `public.users` table
- Verify user has `yacht_id` set (if required)

### Issue: Application queries return 0 rows

**Solution**:
- Check if using service role (should bypass RLS)
- Verify user's `yacht_id` matches data's `yacht_id`
- Check RLS policies are correctly applied

### Issue: Cannot insert records

**Solution**:
- Ensure `yacht_id` is included in INSERT statement
- Verify `yacht_id` matches user's `yacht_id`
- Check `WITH CHECK` clause in INSERT policy

## Next Steps

1. **Test thoroughly** using the checklist
2. **Monitor performance** in production
3. **Update application code** if needed to work with RLS
4. **Consider migrating to Supabase Auth** for full RLS support
5. **Document any application-level changes** required

## Support

For issues or questions:
1. Check `RLS_TESTING_CHECKLIST.md` for troubleshooting
2. Review Supabase RLS documentation
3. Test in development environment first

