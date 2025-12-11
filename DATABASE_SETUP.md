# Database Setup - Quick Guide

## 🚀 En Hızlı Yol: Supabase (Önerilen)

1. **Supabase'e git**: https://supabase.com
2. **Yeni proje oluştur** (ücretsiz)
3. **Settings → Database** bölümünden connection string'i kopyala
4. **`.env` dosyasını güncelle**:

```env
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
```

**Örnek format:**
```
postgresql://postgres:yourpassword@db.abcdefghijklmnop.supabase.co:5432/postgres
```

## Alternatif: Neon

1. **Neon'a git**: https://neon.tech
2. **Yeni proje oluştur** (ücretsiz)
3. **Connection string'i kopyala**
4. **`.env` dosyasını güncelle**

## Migration Çalıştır

Database connection string'i ayarladıktan sonra:

```bash
cd helmops
npx prisma migrate dev --name init
```

## Test Verileri Yükle (Opsiyonel)

```bash
npm run db:seed
```

## Mevcut .env Dosyasını Güncelle

Şu anki `.env` dosyanızda Prisma Accelerate formatı var. Bunu standart PostgreSQL connection string ile değiştirmeniz gerekiyor.

**Mevcut (yanlış):**
```
DATABASE_URL="prisma+postgres://..."
```

**Olması gereken:**
```
DATABASE_URL="postgresql://user:password@host:port/database"
```

