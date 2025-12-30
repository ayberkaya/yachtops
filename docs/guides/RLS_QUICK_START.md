# RLS Quick Start Guide

Hızlı başlangıç kılavuzu - Supabase RLS implementasyonu için.

## 🚀 Hızlı Kurulum

### 1. Migration'ı Uygula

```bash
cd helmops
npx prisma migrate deploy
```

Veya Supabase Dashboard'dan:
1. Supabase Dashboard → SQL Editor
2. `helmops/prisma/migrations/20250115000000_enable_rls_single_tenant/migration.sql` dosyasını aç
3. İçeriği kopyala-yapıştır
4. Execute

### 2. Doğrulama

```sql
-- RLS aktif mi kontrol et
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = true
ORDER BY tablename;

-- Helper fonksiyonlar var mı?
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('get_user_yacht_id', 'can_modify_yacht_id');
```

### 3. Test Et

```sql
-- Authenticated user olarak
SELECT public.get_user_yacht_id(); -- yacht_id dönmeli
SELECT COUNT(*) FROM public.trips; -- Sadece kendi yacht'ının trip'leri
```

## ⚠️ Önemli Notlar

### Supabase Auth vs NextAuth

**Mevcut Durum**: Kod NextAuth kullanıyor, ama RLS `auth.uid()` gerektiriyor (Supabase Auth).

**Seçenekler:**

1. **Service Role Kullan** (Hızlı çözüm)
   - Tüm database işlemleri için service role key kullan
   - RLS bypass edilir, uygulama kodunda tenant isolation yap

2. **Supabase Auth'a Geç** (Önerilen)
   - NextAuth yerine Supabase Auth kullan
   - Tam RLS desteği

3. **Hibrit Yaklaşım**
   - NextAuth ile authenticate et
   - Supabase client ile database'e bağlan (JWT token ile)
   - RLS çalışır

### Service Role Key

**Asla client-side'da kullanma!** Sadece backend/server-side için.

```typescript
// ✅ Doğru - Server-side
const supabase = createClient(url, serviceRoleKey)

// ❌ Yanlış - Client-side
const supabase = createClient(url, serviceRoleKey) // Client'ta!
```

## 📋 Temel Testler

### 1. Yacht Isolation Test

```sql
-- User A (yacht_id = 'yacht-1') olarak
SELECT COUNT(*) FROM public.trips; -- Sadece yacht-1 trip'leri

-- User B (yacht_id = 'yacht-2') olarak  
SELECT COUNT(*) FROM public.trips; -- Sadece yacht-2 trip'leri
```

### 2. User Self-Access Test

```sql
-- Kendi profilini görebilmeli
SELECT * FROM public.users WHERE id = auth.uid(); -- 1 row

-- Başkasının profilini görememeli
SELECT * FROM public.users WHERE id != auth.uid(); -- 0 rows
```

### 3. Yacht ID Değiştirme Test

```sql
-- CREW user olarak
UPDATE public.users SET yacht_id = 'yacht-2' WHERE id = auth.uid();
-- ❌ Başarısız olmalı

-- OWNER/CAPTAIN olarak
UPDATE public.users SET yacht_id = 'yacht-2' WHERE id = auth.uid();
-- ✅ Başarılı olmalı
```

## 🔧 Sorun Giderme

### "Policy violation" hatası

1. User authenticated mi? (`auth.uid()` NULL değil mi?)
2. User `public.users` tablosunda var mı?
3. User'ın `yacht_id` set edilmiş mi?

### "No rows returned" ama data var

1. User'ın `yacht_id` data'nın `yacht_id` ile eşleşiyor mu?
2. RLS policies doğru uygulanmış mı?
3. Helper function çalışıyor mu?

### INSERT başarısız

1. `yacht_id` INSERT statement'ında var mı?
2. `yacht_id` user'ın `yacht_id` ile eşleşiyor mu?
3. `WITH CHECK` clause doğru mu?

## 📚 Detaylı Dokümantasyon

- **RLS_TESTING_CHECKLIST.md**: Kapsamlı test listesi
- **RLS_IMPLEMENTATION_NOTES.md**: Detaylı implementasyon notları
- **migration.sql**: Tüm RLS policies

## 🎯 Sonraki Adımlar

1. ✅ Migration'ı uygula
2. ✅ Test et (checklist kullan)
3. ✅ Uygulama kodunu güncelle (gerekirse)
4. ✅ Production'da monitor et
5. ⚠️ Supabase Auth'a geçiş planla (opsiyonel)

## 💡 İpuçları

- **Development**: Service role kullan, RLS'yi bypass et
- **Production**: Anon key kullan, RLS aktif olsun
- **Performance**: `yacht_id` üzerinde index'ler olduğundan emin ol
- **Security**: Service role key'i asla expose etme

