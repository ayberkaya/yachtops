# Manual RLS Migration Application

The migration `20250122000000_update_rls_for_nextauth` needs to be applied manually since it updates a database function.

## Option 1: Apply via Supabase SQL Editor (Recommended)

1. Open your Supabase Dashboard
2. Go to SQL Editor
3. Copy the contents of `prisma/migrations/20250122000000_update_rls_for_nextauth/migration.sql`
4. Paste and execute the SQL
5. Verify the function was created:
   ```sql
   SELECT proname, prosrc 
   FROM pg_proc 
   WHERE proname = 'get_user_yacht_id';
   ```

## Option 2: Apply via psql

```bash
cd helmops
psql $DATABASE_URL -f prisma/migrations/20250122000000_update_rls_for_nextauth/migration.sql
```

## Option 3: Mark as Applied (if already applied manually)

If you've already applied the migration manually, mark it as applied in Prisma:

```bash
cd helmops
npx prisma migrate resolve --applied 20250122000000_update_rls_for_nextauth
```

## Verification

After applying, verify the function exists:

```sql
-- Check function exists
SELECT proname FROM pg_proc WHERE proname = 'get_user_yacht_id';

-- Test function (will return NULL if not authenticated)
SELECT get_user_yacht_id();
```

## Next Steps

After applying the migration:

1. Sync existing users to Supabase Auth:
   ```typescript
   import { syncAllUsersToSupabaseAuth } from '@/lib/supabase-auth-sync';
   await syncAllUsersToSupabaseAuth();
   ```

2. Test RLS policies work correctly

3. Verify tenant isolation is enforced

