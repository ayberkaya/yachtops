#!/bin/bash
# Manual RLS Migration Application Script
# This script applies the RLS migration in parts to avoid timeout issues

set -e

MIGRATION_FILE="prisma/migrations/20250115000000_enable_rls_single_tenant/migration.sql"
DATABASE_URL="${DATABASE_URL:-}"

if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL environment variable is not set"
    echo "Please set it in .env.local or export it"
    exit 1
fi

echo "📋 Applying RLS migration manually..."
echo "⚠️  Note: This migration is large. If you encounter timeout issues,"
echo "   please apply it directly in Supabase SQL Editor instead."
echo ""
echo "Migration file: $MIGRATION_FILE"
echo ""

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo "❌ psql is not installed"
    echo ""
    echo "Please apply the migration manually:"
    echo "1. Go to Supabase Dashboard → SQL Editor"
    echo "2. Open: $MIGRATION_FILE"
    echo "3. Copy the entire content"
    echo "4. Paste into SQL Editor"
    echo "5. Click 'Run'"
    echo ""
    exit 1
fi

echo "✅ psql found, applying migration..."
echo ""

# Apply migration
psql "$DATABASE_URL" -f "$MIGRATION_FILE"

echo ""
echo "✅ Migration applied successfully!"
echo ""
echo "Next steps:"
echo "1. Verify RLS is enabled: Run scripts/verify-rls.sql in Supabase SQL Editor"
echo "2. Test the policies: See RLS_TESTING_CHECKLIST.md"

