# RLS Migration'larını Hızlıca Uygulama

## 🚀 Adımlar

### 1. Direct Connection String'i Al

Supabase Dashboard → Settings → Database → Connection string → **Direct connection** → **URI**

Format: `postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?sslmode=require`

### 2. Script'i Çalıştır

```bash
# helmops dizinine git
cd helmops

# Direct connection string'i set et (Supabase'den aldığın string'i buraya yapıştır)
export DIRECT_DB_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?sslmode=require"

# Script'i çalıştır
./apply-rls-migrations.sh
```

## ⚠️ Önemli

- **helmops dizininden çalıştır:** Script `cd helmops` yapmaz, siz yapmalısınız
- **Direct connection kullan:** Pooler connection timeout verir
- **Password'ü doğru yaz:** Connection string'deki `[PASSWORD]` yerine gerçek şifreyi yazın

## ✅ Başarılı Olursa

Script şunu gösterecek:
```
✅ Connection successful
📋 Applying RLS Enable migrations...
✅ RLS Enable migrations completed (X applied)
📋 Applying Policies migrations...
✅ Policies migrations completed (X applied)
🎉 All migrations applied successfully!
```

## 🐛 Sorun Olursa

**Connection failed:**
- Direct connection string kullandığınızdan emin olun
- Password'ün doğru olduğunu kontrol edin
- Supabase Dashboard'dan yeni connection string alın

**cd: no such file or directory:**
- `cd helmops` komutunu çalıştırdığınızdan emin olun
- Script'i helmops dizininden çalıştırın

---

**Kolay gelsin!** 🚀











