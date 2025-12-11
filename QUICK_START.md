# 🚀 Hızlı Başlangıç

## Database Connection String Güncelleme

`.env` dosyanızda şu satırı bulun:
```
DATABASE_URL="prisma+postgres://..."
```

Bunu şununla değiştirin:

### Seçenek 1: Supabase (Önerilen - 2 dakika)

1. https://supabase.com → Sign up (ücretsiz)
2. New Project oluştur
3. Settings → Database → Connection string → URI kopyala
4. `.env` dosyasına yapıştır

**Örnek:**
```
DATABASE_URL="postgresql://postgres.xxxxx:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"
```

### Seçenek 2: Neon (Alternatif)

1. https://neon.tech → Sign up (ücretsiz)
2. New Project oluştur
3. Connection string kopyala
4. `.env` dosyasına yapıştır

## Migration Çalıştır

```bash
cd helmops
npx prisma migrate dev --name init
```

## Test Verileri Yükle

```bash
npm run db:seed
```

## Uygulamayı Başlat

```bash
npm run dev
```

Tarayıcıda: http://localhost:3000

## Test Hesapları (seed sonrası)

- **Owner**: `owner@helmops.com` / `owner123`
- **Captain**: `captain@helmops.com` / `captain123`
- **Crew**: `crew@helmops.com` / `crew123`

