# Supabase RLS Implementation - Single Tenant Per User

Bu dokümantasyon, Supabase Row Level Security (RLS) implementasyonunu açıklar. Sistem, kullanıcıların sadece kendi yacht'larına (`yacht_id`) ait verilere erişebilmesini sağlar.

## 📁 Dosyalar

### 1. Migration Dosyası
**`prisma/migrations/20250115000000_enable_rls_single_tenant/migration.sql`**
- Tüm RLS policies'leri içerir
- Helper fonksiyonları oluşturur
- Tüm public tablolarda RLS'yi aktif eder

### 2. Dokümantasyon
- **`RLS_QUICK_START.md`**: Hızlı başlangıç kılavuzu (Türkçe)
- **`RLS_TESTING_CHECKLIST.md`**: Kapsamlı test listesi (İngilizce)
- **`RLS_IMPLEMENTATION_NOTES.md`**: Detaylı implementasyon notları (İngilizce)

### 3. Yardımcı Scriptler
- **`scripts/verify-rls.sql`**: RLS durumunu kontrol eden SQL script

## 🚀 Hızlı Başlangıç

1. **Migration'ı uygula:**
   ```bash
   cd helmops
   npx prisma migrate deploy
   ```

2. **Doğrula:**
   ```sql
   -- Supabase SQL Editor'de çalıştır
   \i scripts/verify-rls.sql
   ```

3. **Test et:**
   - `RLS_TESTING_CHECKLIST.md` dosyasındaki testleri uygula

## 🎯 Özellikler

### ✅ Yacht Isolation
- Kullanıcılar sadece kendi `yacht_id`'lerine ait verileri görebilir
- Cross-yacht erişim engellenir
- Tüm business tabloları için geçerli

### ✅ User Self-Access
- Kullanıcılar sadece kendi profilini görebilir/güncelleyebilir
- Başka kullanıcıların profillerine erişim yok

### ✅ Role-Based Restrictions
- Sadece OWNER ve CAPTAIN rolleri `yacht_id` değiştirebilir
- CREW ve diğer rolleri `yacht_id` değiştiremez

### ✅ Sensitive Data Protection
- `audit_logs`: Client erişimi yok (sadece service role)
- `usage_events`: Sadece INSERT izni (kendi user_id ile)

## 📊 Tablo Kategorileri

### 1. Business Tables (yacht_id var)
- `trips`, `tasks`, `expenses`, `cash_transactions`, vb.
- **Policy**: `yacht_id = user's yacht_id`

### 2. Related Tables (yacht_id yok, parent üzerinden)
- `trip_itinerary_days`, `task_comments`, `expense_receipts`, vb.
- **Policy**: Parent table'ın `yacht_id` kontrolü

### 3. User-Specific Tables
- `notifications`, `user_notes`
- **Policy**: `user_id = auth.uid()`

### 4. Sensitive Tables
- `audit_logs`, `usage_events`
- **Policy**: Kısıtlı erişim

## ⚠️ Önemli Notlar

### Supabase Auth Gereksinimi

RLS policies `auth.uid()` kullanır (Supabase Auth fonksiyonu). Eğer NextAuth kullanıyorsan:

**Seçenek 1: Service Role Kullan** (Hızlı)
- Tüm database işlemleri için service role key kullan
- RLS bypass edilir, uygulama kodunda tenant isolation yap

**Seçenek 2: Supabase Auth'a Geç** (Önerilen)
- NextAuth yerine Supabase Auth kullan
- Tam RLS desteği

**Seçenek 3: Hibrit**
- NextAuth ile authenticate et
- Supabase client ile database'e bağlan (JWT ile)
- RLS çalışır

### Service Role Key

**⚠️ ASLA client-side'da kullanma!**

```typescript
// ✅ Server-side (backend)
const supabase = createClient(url, serviceRoleKey)

// ❌ Client-side (frontend) - YAPMA!
const supabase = createClient(url, serviceRoleKey)
```

## 🔍 Helper Fonksiyonlar

### `get_user_yacht_id()`
- Authenticated user'ın `yacht_id`'sini döner
- Tüm policies'lerde kullanılır
- NULL dönebilir (user'ın yacht_id yoksa)

### `can_modify_yacht_id()`
- OWNER veya CAPTAIN ise `true` döner
- Diğer rolleri için `false`
- Users table UPDATE policy'sinde kullanılır

## 📝 Test Senaryoları

### Temel Testler
1. ✅ User A sadece yacht-1 verilerini görebilmeli
2. ✅ User B sadece yacht-2 verilerini görebilmeli
3. ✅ User A, User B'nin verilerini görememeli
4. ✅ User sadece kendi profilini görebilmeli
5. ✅ CREW user yacht_id değiştirememeli
6. ✅ OWNER/CAPTAIN yacht_id değiştirebilmeli

### Detaylı Testler
- `RLS_TESTING_CHECKLIST.md` dosyasına bak

## 🐛 Sorun Giderme

### "Policy violation" hatası
- User authenticated mi?
- User `public.users` tablosunda var mı?
- User'ın `yacht_id` set edilmiş mi?

### "No rows returned"
- User'ın `yacht_id` data'nın `yacht_id` ile eşleşiyor mu?
- RLS policies doğru uygulanmış mı?

### INSERT başarısız
- `yacht_id` INSERT statement'ında var mı?
- `yacht_id` user'ın `yacht_id` ile eşleşiyor mu?

## 📚 Daha Fazla Bilgi

- **Hızlı Başlangıç**: `RLS_QUICK_START.md`
- **Test Listesi**: `RLS_TESTING_CHECKLIST.md`
- **Detaylı Notlar**: `RLS_IMPLEMENTATION_NOTES.md`
- **Doğrulama Script**: `scripts/verify-rls.sql`

## ✅ Checklist

Migration uygulandıktan sonra:

- [ ] RLS tüm tablolarda aktif
- [ ] Helper fonksiyonlar oluşturuldu
- [ ] Policies doğru uygulandı
- [ ] Temel testler geçti
- [ ] Uygulama kodunda gerekli değişiklikler yapıldı
- [ ] Production'da test edildi

## 🎓 Öğrenme Kaynakları

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)

---

**Son Güncelleme**: 2025-01-15  
**Versiyon**: 1.0.0

