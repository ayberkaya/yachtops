# 🚂 Railway ile Deploy (En Kolay Yöntem)

Railway, PostgreSQL veritabanını çok kolay bir şekilde sağlar. Supabase veya Vercel Postgres'e gerek yok!

## ⚡ 5 Dakikada Hazır

### Adım 1: Railway Hesabı Oluşturun

1. [railway.app](https://railway.app) → "Start a New Project"
2. GitHub ile giriş yapın (en kolay)
3. Hesap oluşturulur

### Adım 2: PostgreSQL Veritabanı Oluşturun

1. Railway dashboard'da "New Project" butonuna tıklayın
2. "Empty Project" seçin
3. "+ New" butonuna tıklayın
4. "Database" seçin
5. "Add PostgreSQL" seçin
6. 30 saniye içinde veritabanı hazır!

### Adım 3: Connection String'i Kopyalayın

1. PostgreSQL servisinize tıklayın
2. "Variables" sekmesine gidin
3. `DATABASE_URL` değişkenini bulun
4. Değerini kopyalayın (otomatik oluşturulmuş)

**Örnek format:**
```
postgresql://postgres:password@containers-us-west-xxx.railway.app:5432/railway
```

### Adım 4: Vercel'e Environment Variable Ekleyin

1. Vercel dashboard → Projeniz → Settings → Environment Variables
2. `DATABASE_URL` ekleyin:
   - Key: `DATABASE_URL`
   - Value: Railway'den kopyaladığınız connection string
   - Environment: Production, Preview, Development (hepsini seçin)
3. "Save" butonuna tıklayın

### Adım 5: Redeploy

1. Vercel dashboard → Deployments
2. En son deployment'a tıklayın
3. "Redeploy" butonuna tıklayın

### Adım 6: Migration Çalıştırma

**Yöntem A: Railway Terminal (Kolay)**

1. Railway dashboard → PostgreSQL servisinize tıklayın
2. "Data" sekmesine gidin
3. "Query" butonuna tıklayın
4. Veya "Connect" butonundan connection bilgilerini alın

**Yöntem B: Local'den Migration**

```bash
# Railway connection string'i local .env'e ekleyin
DATABASE_URL="postgresql://postgres:password@containers-us-west-xxx.railway.app:5432/railway"

# Migration çalıştırın
npx prisma migrate deploy
```

**Yöntem C: Vercel CLI ile**

```bash
# Vercel CLI kurulumu (eğer yoksa)
npm i -g vercel

# Environment variables'ları çek
vercel env pull .env.local

# Migration çalıştır
npx prisma migrate deploy
```

## ✅ Avantajlar

- ✅ Çok kolay kurulum (2 dakika)
- ✅ Ücretsiz tier (500 saat/ay)
- ✅ Otomatik connection string
- ✅ Kolay yönetim
- ✅ Otomatik yedekleme

## 📝 Notlar

- Railway ücretsiz tier'da aylık 500 saat sunar
- Connection string otomatik olarak oluşturulur
- Veritabanı Railway'de kalıcı olarak saklanır

## 🎯 Sonuç

Railway ile Supabase'e veya Vercel Postgres'e gerek kalmadan deploy yapabilirsiniz!

