# RLS Migration'ları Direct Connection ile Uygulama

Direct connection kullanarak timeout sorunlarını çözebilirsiniz.

## 🚀 Yöntem 1: Supabase SQL Editor'de Direct Connection

1. **Supabase Dashboard → SQL Editor**
2. **Connection seçeneğini değiştir:**
   - SQL Editor'ün sağ üst köşesinde connection tipi seçeneği var
   - "Pooler" yerine **"Direct"** seçin
   - Veya connection string'de `pooler` yerine direct connection kullanın

3. **Migration'ları uygulayın:**
   - Artık daha uzun timeout süresi olacak
   - Birden fazla ALTER TABLE komutunu birlikte çalıştırabilirsiniz

## 🚀 Yöntem 2: psql ile Direct Connection

Eğer psql yüklüyse, direct connection string ile bağlanabilirsiniz:

```bash
# Direct connection string (pooler değil)
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?sslmode=require"
```

Sonra migration'ları uygulayın:

```bash
cd helmops
# Tüm migration'ları sırayla uygula
for file in prisma/migrations/2025011500000*/migration.sql; do
  echo "Applying: $file"
  psql "$DATABASE_URL" -f "$file"
done
```

## 🚀 Yöntem 3: Migration'ları Batch Halinde Uygulama

Direct connection ile artık birden fazla ALTER TABLE'ı birlikte çalıştırabilirsiniz. 

**Örnek - Core Tables:**
```sql
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yachts ENABLE ROW LEVEL SECURITY;
```

**Örnek - Business Tables (Part 1):**
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

## 📝 Direct Connection String Formatı

**Pooler (kısa timeout):**
```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

**Direct (uzun timeout):**
```
postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

## ✅ Önerilen Yaklaşım

1. **Supabase SQL Editor'de Direct Connection kullan**
2. **Migration'ları batch halinde uygula:**
   - Core tables (2 tablo)
   - Business tables part 1 (8 tablo)
   - Business tables part 2 (10 tablo)
   - Related tables (10 tablo)
   - Messages & User tables (8 tablo)
3. **Policies migration'larını uygula** (zaten küçükler, sorun olmaz)

## ⚠️ Not

Direct connection kullanırken:
- ✅ Daha uzun timeout
- ✅ Daha hızlı execution
- ⚠️ Connection limit daha düşük (ama migration için sorun değil)
- ⚠️ Her migration sonrası connection kapanabilir (normal)

## 🎯 Hızlı Başlangıç

1. Supabase Dashboard → SQL Editor
2. Connection tipini "Direct" olarak değiştir
3. İlk batch'i çalıştır (core tables)
4. Başarılı olursa diğer batch'leri de uygula
5. Policies migration'larını uygula

---

**Direct connection kullanmak kesinlikle daha kolay!** 🚀








