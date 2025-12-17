# RLS Migration'ı Uygulama Kılavuzu

Migration dosyası çok büyük olduğu için (1416 satır) Supabase'de timeout hatası alabilirsiniz. Bu durumda migration'ı **Supabase SQL Editor**'den manuel olarak uygulamanız gerekiyor.

## 🚀 Hızlı Yöntem: Supabase SQL Editor

### Adımlar:

1. **Supabase Dashboard'a git**
   - https://supabase.com/dashboard
   - Projenizi seçin

2. **SQL Editor'ü aç**
   - Sol menüden "SQL Editor" seçin
   - "New query" butonuna tıklayın

3. **Migration dosyasını aç**
   - Dosya yolu: `helmops/prisma/migrations/20250115000000_enable_rls_single_tenant/migration.sql`
   - Dosyanın tüm içeriğini kopyalayın

4. **SQL Editor'e yapıştır**
   - Kopyaladığınız SQL'i SQL Editor'e yapıştırın
   - **Önemli**: Tüm içeriği yapıştırdığınızdan emin olun

5. **Çalıştır**
   - "Run" butonuna tıklayın
   - Veya `Cmd+Enter` (Mac) / `Ctrl+Enter` (Windows/Linux)

6. **Sonuçları kontrol et**
   - Başarılı olursa: "Success. No rows returned" mesajı görürsünüz
   - Hata varsa: Hata mesajını kontrol edin

## ✅ Doğrulama

Migration uygulandıktan sonra doğrulama yapın:

```sql
-- RLS aktif mi?
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

Veya `scripts/verify-rls.sql` dosyasını SQL Editor'de çalıştırın.

## ⚠️ Sorun Giderme

### Timeout Hatası

Eğer Supabase SQL Editor'de de timeout alırsanız:

1. **Migration'ı parçalara bölün:**
   - Önce helper fonksiyonları (satır 21-47)
   - Sonra RLS enable (satır 54-97)
   - Son olarak policies'leri (satır 100+)

2. **Veya daha küçük batch'ler halinde uygulayın:**
   - Her seferinde 5-10 tablo için policies oluşturun

### "Function already exists" Hatası

Helper fonksiyonlar zaten varsa, bu normal. Migration devam edecektir.

### "Policy already exists" Hatası

Policy zaten varsa, önce silin:

```sql
DROP POLICY IF EXISTS "policy_name" ON public.table_name;
```

Sonra migration'ı tekrar çalıştırın.

## 📝 Alternatif: Prisma Migrate (Küçük Migration'lar için)

Eğer migration'ı parçalara böldüyseniz, Prisma migrate kullanabilirsiniz:

```bash
cd helmops
npx prisma migrate deploy
```

Ama büyük migration'lar için Supabase SQL Editor önerilir.

## 🎯 Sonraki Adımlar

1. ✅ Migration uygulandı
2. ✅ Doğrulama yapıldı
3. 📋 Test checklist'ini uygula: `RLS_TESTING_CHECKLIST.md`
4. 🔍 Uygulama kodunu kontrol et (gerekirse güncelle)

## 💡 İpuçları

- **Backup alın**: Migration öncesi database backup'ı alın
- **Test ortamında dene**: Önce test/staging'de deneyin
- **Monitor et**: Migration sonrası uygulama loglarını kontrol edin
- **Rollback planı**: Sorun olursa rollback için hazır olun (RLS_IMPLEMENTATION_NOTES.md'de var)

---

**Not**: Migration dosyası `prisma/migrations/20250115000000_enable_rls_single_tenant/migration.sql` konumunda.

