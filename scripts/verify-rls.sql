-- ============================================================================
-- RLS Verification Script
-- ============================================================================
-- Bu script RLS implementasyonunun doğru çalıştığını kontrol eder.
-- Supabase SQL Editor'de çalıştırılabilir.
-- ============================================================================

-- 1. RLS Aktif Tabloları Listele
SELECT 
    'RLS Enabled Tables' as check_type,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = true
ORDER BY tablename;

-- 2. RLS Aktif Olmayan Tabloları Bul (Uyarı)
SELECT 
    '⚠️ RLS NOT Enabled' as check_type,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = false
AND tablename NOT IN ('_prisma_migrations') -- System table, normal
ORDER BY tablename;

-- 3. Tüm Policies'leri Listele
SELECT 
    'Policies' as check_type,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd as command
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 4. Helper Fonksiyonları Kontrol Et
SELECT 
    'Helper Functions' as check_type,
    routine_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('get_user_yacht_id', 'can_modify_yacht_id')
ORDER BY routine_name;

-- 5. Policy Sayıları (Tablo Bazında)
SELECT 
    'Policy Counts' as check_type,
    tablename,
    COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY policy_count DESC, tablename;

-- 6. Eksik Policies Kontrolü (yacht_id olan tablolar için)
-- Her yacht_id olan tablo için SELECT, INSERT, UPDATE, DELETE policies olmalı
WITH tables_with_yacht_id AS (
    SELECT table_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND column_name = 'yacht_id'
    AND table_name NOT IN ('users', 'yachts', 'usage_events', 'feedback') -- Special cases
),
expected_policies AS (
    SELECT 
        t.table_name,
        p.cmd
    FROM tables_with_yacht_id t
    CROSS JOIN (VALUES ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE')) p(cmd)
),
actual_policies AS (
    SELECT 
        tablename as table_name,
        cmd
    FROM pg_policies
    WHERE schemaname = 'public'
    AND policyname LIKE '%_own_yacht'
)
SELECT 
    'Missing Policies' as check_type,
    e.table_name,
    e.cmd as missing_policy
FROM expected_policies e
LEFT JOIN actual_policies a ON e.table_name = a.table_name AND e.cmd = a.cmd
WHERE a.table_name IS NULL
ORDER BY e.table_name, e.cmd;

-- 7. Özet İstatistikler
SELECT 
    'Summary' as check_type,
    (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true) as tables_with_rls,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') as total_policies,
    (SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name IN ('get_user_yacht_id', 'can_modify_yacht_id')) as helper_functions;

-- ============================================================================
-- Test Queries (Authenticated user olarak çalıştır)
-- ============================================================================

-- NOT: Aşağıdaki query'ler authenticated user context'inde çalıştırılmalı
-- Supabase Dashboard'da farklı user'lar olarak test edebilirsin

-- Test 1: Helper function çalışıyor mu?
-- SELECT public.get_user_yacht_id() as my_yacht_id;

-- Test 2: Kendi yacht'ının data'sını görebiliyor mu?
-- SELECT COUNT(*) as trip_count FROM public.trips;

-- Test 3: Başka yacht'ın data'sını göremiyor mu?
-- SELECT COUNT(*) as other_yacht_trips 
-- FROM public.trips 
-- WHERE yacht_id != public.get_user_yacht_id();

-- Test 4: Kendi profilini görebiliyor mu?
-- SELECT COUNT(*) as my_profile FROM public.users WHERE id = auth.uid();

-- Test 5: Başkasının profilini göremiyor mu?
-- SELECT COUNT(*) as other_profiles FROM public.users WHERE id != auth.uid();

