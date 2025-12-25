# psql ile RLS Migration'larını Uygulama

## 📋 Adım 1: Direct Connection String'i Al

1. **Supabase Dashboard'a git**
   - https://supabase.com/dashboard
   - Projenizi seçin

2. **Settings → Database**
   - Sol menüden "Settings" → "Database"

3. **Connection string'i kopyala**
   - "Connection string" bölümüne git
   - **"Direct connection"** seçeneğini seç
   - **"URI"** formatını seç
   - Connection string'i kopyala
   - Format şöyle olmalı: `postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?sslmode=require`

## 🚀 Adım 2: Script'i Çalıştır

```bash
cd helmops

# Direct connection string'i set et
export DIRECT_DB_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?sslmode=require"

# Script'i çalıştır
./apply-rls-migrations.sh
```

## 🔧 Alternatif: Manuel Uygulama

Eğer script çalışmazsa, migration'ları tek tek uygulayabilirsiniz:

```bash
cd helmops

# Direct connection string'i set et
export DIRECT_DB_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?sslmode=require"

# RLS Enable migration'ları
for file in prisma/migrations/20250115000002*/migration.sql; do
  echo "Applying: $file"
  psql "$DIRECT_DB_URL" -f "$file"
done

# Policies migration'ları
for file in prisma/migrations/2025011500000[3-9]*/migration.sql; do
  echo "Applying: $file"
  psql "$DIRECT_DB_URL" -f "$file"
done
```

## ⚠️ Önemli Notlar

- **Direct connection kullan:** Pooler connection timeout verir
- **Password'ü doğru yaz:** Connection string'deki `[PASSWORD]` yerine gerçek şifreyi yazın
- **Project ref'i kontrol et:** `[PROJECT-REF]` yerine projenizin gerçek ref'ini yazın

## ✅ Doğrulama

Migration'lar tamamlandıktan sonra:

```bash
# Supabase SQL Editor'de çalıştır
psql "$DIRECT_DB_URL" -f scripts/verify-rls.sql
```

Veya Supabase SQL Editor'den `scripts/verify-rls.sql` dosyasını çalıştırın.

## 🐛 Sorun Giderme

### "could not translate host name" hatası
- Connection string'deki hostname'i kontrol edin
- Direct connection string kullandığınızdan emin olun

### "Tenant or user not found" hatası
- Password'ün doğru olduğundan emin olun
- Project ref'in doğru olduğundan emin olun

### "connection timeout" hatası
- Direct connection kullandığınızdan emin olun (pooler değil)
- Network bağlantınızı kontrol edin

---

**Not:** Direct connection string'i Supabase Dashboard'dan almak en güvenli yöntemdir.








