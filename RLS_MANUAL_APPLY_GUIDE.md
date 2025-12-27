# RLS Migration'ları Manuel Uygulama Kılavuzu

Bu kılavuz, RLS migration'larını Supabase SQL Editor'den manuel olarak uygulamanız için hazırlanmıştır.

## ✅ Zaten Uygulanan Migration'lar

1. ✅ `20250115000001_rls_helper_functions` - Helper fonksiyonlar (BAŞARILI)

## 📋 Uygulanacak Migration'lar (Sırayla)

### 1. Helper Functions (✅ TAMAMLANDI)
**Dosya:** `prisma/migrations/20250115000001_rls_helper_functions/migration.sql`
- `get_user_yacht_id()` fonksiyonu
- `can_modify_yacht_id()` fonksiyonu
- **Durum:** ✅ Zaten uygulandı

### 2. RLS Enable - Core Tables
**Dosya:** Yeni oluşturulacak (aşağıda)
**İçerik:**
```sql
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yachts ENABLE ROW LEVEL SECURITY;
```

### 3. RLS Enable - Business Tables (Part 1)
**Dosya:** Yeni oluşturulacak
**İçerik:**
```sql
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marina_permission_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vessel_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crew_documents ENABLE ROW LEVEL SECURITY;
```

### 4. RLS Enable - Business Tables (Part 2)
**Dosya:** Yeni oluşturulacak
**İçerik:**
```sql
ALTER TABLE public.message_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alcohol_stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
```

### 5. RLS Enable - Related Tables
**Dosya:** Yeni oluşturulacak
**İçerik:**
```sql
ALTER TABLE public.trip_itinerary_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_tank_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_movement_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alcohol_stock_history ENABLE ROW LEVEL SECURITY;
```

### 6. RLS Enable - Messages & User Tables
**Dosya:** Yeni oluşturulacak
**İçerik:**
```sql
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_note_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;
```

### 7. Users & Yachts Policies
**Dosya:** `prisma/migrations/20250115000003_rls_users_yachts_policies/migration.sql`
- Users table policies
- Yachts table policies

### 8. Business Tables Policies
**Dosya:** `prisma/migrations/20250115000004_rls_business_tables_policies/migration.sql`
- Tüm business tablolar için policies (trips, tasks, expenses, vb.)

### 9. Related Tables - Trips
**Dosya:** `prisma/migrations/20250115000005_rls_related_tables_trips/migration.sql`
- Trip-related tablolar için policies

### 10. Related Tables - Other
**Dosya:** `prisma/migrations/20250115000006_rls_related_tables_other/migration.sql`
- Task, expense, maintenance, shopping, alcohol related policies

### 11. Related Tables - Messages
**Dosya:** `prisma/migrations/20250115000007_rls_related_tables_messages/migration.sql`
- Message-related policies

### 12. User-Specific Tables
**Dosya:** `prisma/migrations/20250115000008_rls_user_specific_tables/migration.sql`
- Notifications, user_notes policies

### 13. Sensitive Tables
**Dosya:** `prisma/migrations/20250115000009_rls_sensitive_tables/migration.sql`
- audit_logs, usage_events policies

## 🚀 Uygulama Adımları

1. **Supabase Dashboard'a git**
   - https://supabase.com/dashboard
   - Projenizi seçin

2. **SQL Editor'ü aç**
   - Sol menüden "SQL Editor"
   - "New query" butonuna tıklayın

3. **Migration'ları sırayla uygula**
   - Her migration dosyasını açın
   - İçeriği kopyalayın
   - SQL Editor'e yapıştırın
   - "Run" butonuna tıklayın (veya Cmd+Enter)
   - Başarılı olduğunu kontrol edin

4. **Doğrulama**
   - Her migration sonrası hata olmadığını kontrol edin
   - Son migration'dan sonra `scripts/verify-rls.sql` çalıştırın

## ⚠️ Önemli Notlar

- **Sıra önemli:** Migration'ları sırayla uygulayın
- **Timeout:** Eğer timeout alırsanız, migration'ı daha küçük parçalara bölün
- **Hata kontrolü:** Her migration sonrası hata mesajlarını kontrol edin
- **Backup:** Önemli veriler için backup alın

## 📝 Hızlı Referans

**Migration dosyaları konumu:**
```
helmops/prisma/migrations/
├── 20250115000001_rls_helper_functions/ ✅ (Uygulandı)
├── 20250115000003_rls_users_yachts_policies/
├── 20250115000004_rls_business_tables_policies/
├── 20250115000005_rls_related_tables_trips/
├── 20250115000006_rls_related_tables_other/
├── 20250115000007_rls_related_tables_messages/
├── 20250115000008_rls_user_specific_tables/
└── 20250115000009_rls_sensitive_tables/
```

**RLS Enable migration'ları:** Yukarıdaki adımlar 2-6'da SQL kodları var, bunları Supabase SQL Editor'de çalıştırın.

## ✅ Tamamlandıktan Sonra

1. Doğrulama scriptini çalıştırın: `scripts/verify-rls.sql`
2. Test checklist'ini uygulayın: `RLS_TESTING_CHECKLIST.md`
3. Uygulama kodunu kontrol edin

---

**İyi şanslar!** 🚀











