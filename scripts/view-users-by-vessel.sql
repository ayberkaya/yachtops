-- ============================================================================
-- Vessel'lara Göre Kullanıcıları Görüntüleme
-- ============================================================================
-- Supabase SQL Editor'de çalıştırabilirsiniz
-- ============================================================================

-- 1. Tüm vessel'ları ve kullanıcı sayılarını göster
SELECT 
    y.id as vessel_id,
    y.name as vessel_name,
    y.flag,
    COUNT(u.id) as user_count
FROM public.yachts y
LEFT JOIN public.users u ON u.yacht_id = y.id
GROUP BY y.id, y.name, y.flag
ORDER BY y.name;

-- 2. Belirli bir vessel'ın tüm kullanıcılarını göster
-- VESSEL_ID'yi değiştirin:
SELECT 
    u.id,
    u.email,
    u.name,
    u.username,
    u.role,
    u.active,
    u.created_at,
    y.name as vessel_name
FROM public.users u
JOIN public.yachts y ON y.id = u.yacht_id
WHERE u.yacht_id = 'VESSEL_ID_BURAYA'  -- Buraya vessel ID yazın
ORDER BY u.created_at DESC;

-- 3. Vessel adına göre kullanıcıları göster
-- VESSEL_NAME'i değiştirin:
SELECT 
    u.id,
    u.email,
    u.name,
    u.username,
    u.role,
    u.active,
    u.created_at,
    y.name as vessel_name
FROM public.users u
JOIN public.yachts y ON y.id = u.yacht_id
WHERE y.name ILIKE '%VESSEL_NAME_BURAYA%'  -- Buraya vessel adı yazın
ORDER BY u.created_at DESC;

-- 4. Tüm kullanıcıları vessel'lara göre gruplandırılmış göster
SELECT 
    y.name as vessel_name,
    y.flag,
    u.email,
    u.name as user_name,
    u.role,
    u.active,
    u.created_at
FROM public.yachts y
LEFT JOIN public.users u ON u.yacht_id = y.id
ORDER BY y.name, u.created_at DESC;

-- 5. Vessel başına kullanıcı sayısı (detaylı)
SELECT 
    y.id as vessel_id,
    y.name as vessel_name,
    y.flag,
    COUNT(u.id) as total_users,
    COUNT(CASE WHEN u.role = 'OWNER' THEN 1 END) as owners,
    COUNT(CASE WHEN u.role = 'CAPTAIN' THEN 1 END) as captains,
    COUNT(CASE WHEN u.role = 'CREW' THEN 1 END) as crew,
    COUNT(CASE WHEN u.active = true THEN 1 END) as active_users,
    COUNT(CASE WHEN u.active = false THEN 1 END) as inactive_users
FROM public.yachts y
LEFT JOIN public.users u ON u.yacht_id = y.id
GROUP BY y.id, y.name, y.flag
ORDER BY total_users DESC, y.name;

-- 6. Vessel'ı olmayan kullanıcıları bul (SUPER_ADMIN gibi)
SELECT 
    u.id,
    u.email,
    u.name,
    u.username,
    u.role,
    u.active,
    u.created_at
FROM public.users u
WHERE u.yacht_id IS NULL
ORDER BY u.created_at DESC;

