#!/bin/bash
# RLS Migration'larını psql ile uygulama scripti

set -e

# Script'in bulunduğu dizini bul
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# helmops dizininde olduğumuzu kontrol et
if [ ! -d "prisma/migrations" ]; then
    echo "❌ Error: prisma/migrations directory not found"
    echo "Please run this script from the helmops directory"
    echo "Current directory: $(pwd)"
    exit 1
fi

# Direct connection URL'i buraya yapıştırın
# Supabase Dashboard → Settings → Database → Connection string → Direct connection
# Format: postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?sslmode=require
DIRECT_DB_URL="${DIRECT_DB_URL:-}"

if [ -z "$DIRECT_DB_URL" ]; then
    echo "❌ DIRECT_DB_URL environment variable is not set"
    echo ""
    echo "Please set it:"
    echo "1. Go to Supabase Dashboard → Settings → Database"
    echo "2. Copy 'Connection string' → 'Direct connection' → 'URI'"
    echo "3. Run: export DIRECT_DB_URL='your-connection-string'"
    echo "4. Then run this script again"
    echo ""
    exit 1
fi

echo "🚀 Applying RLS migrations..."
echo ""

# Test connection
echo "Testing connection..."
if ! psql "$DIRECT_DB_URL" -c "SELECT 1;" > /dev/null 2>&1; then
    echo "❌ Connection failed. Please check your DIRECT_DB_URL"
    echo ""
    echo "Common issues:"
    echo "  - Make sure you're using 'Direct connection' (not Pooler)"
    echo "  - Check that password is correct"
    echo "  - Verify project reference is correct"
    echo ""
    echo "To get the correct connection string:"
    echo "  1. Supabase Dashboard → Settings → Database"
    echo "  2. Connection string → Direct connection → URI"
    echo ""
    exit 1
fi
echo "✅ Connection successful"
echo ""

# Helper functions (zaten uygulandı, skip)
echo "⏭️  Skipping helper functions (already applied)"
echo ""

# RLS Enable migrations
echo "📋 Applying RLS Enable migrations..."
MIGRATION_COUNT=0
for file in prisma/migrations/20250115000002*/migration.sql; do
    if [ -f "$file" ]; then
        MIGRATION_NAME=$(basename $(dirname $file))
        echo "  → $MIGRATION_NAME"
        if psql "$DIRECT_DB_URL" -f "$file" 2>&1; then
            MIGRATION_COUNT=$((MIGRATION_COUNT + 1))
        else
            echo "    ⚠️  Warning: Migration may have already been applied or failed"
        fi
    fi
done
echo "✅ RLS Enable migrations completed ($MIGRATION_COUNT applied)"
echo ""

# Policies migrations
echo "📋 Applying Policies migrations..."
POLICY_COUNT=0
for file in prisma/migrations/2025011500000[3-9]*/migration.sql; do
    if [ -f "$file" ]; then
        MIGRATION_NAME=$(basename $(dirname $file))
        echo "  → $MIGRATION_NAME"
        if psql "$DIRECT_DB_URL" -f "$file" 2>&1; then
            POLICY_COUNT=$((POLICY_COUNT + 1))
        else
            echo "    ⚠️  Warning: Migration may have already been applied or failed"
        fi
    fi
done
echo "✅ Policies migrations completed ($POLICY_COUNT applied)"
echo ""

echo "🎉 All migrations applied successfully!"
echo ""
echo "Next steps:"
echo "1. Verify RLS: Run scripts/verify-rls.sql in Supabase SQL Editor"
echo "2. Test policies: See RLS_TESTING_CHECKLIST.md"

