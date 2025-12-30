# 🚀 Vercel Postgres ile Deploy (Supabase Olmadan)

Bu rehber, Supabase kullanmadan Vercel Postgres ile deploy yapmanızı sağlar.

## ⚡ Adım Adım: Vercel Postgres Kurulumu

### Adım 1: Vercel'e Deploy Edin (Veritabanı Olmadan)

1. [vercel.com](https://vercel.com) → GitHub ile giriş
2. "Add New Project" → Repository'nizi seçin
3. Environment Variables ekleyin (şimdilik sadece):
   - `NEXTAUTH_SECRET` → `openssl rand -base64 32` ile oluşturun
   - `NEXTAUTH_URL` → Boş bırakın (deploy sonrası ekleyeceğiz)
4. "Deploy" → İlk deploy'u yapın (veritabanı olmadan başarısız olabilir, sorun değil)

### Adım 2: Vercel Postgres Ekleme

1. Vercel dashboard'da projenize gidin
2. "Storage" sekmesine tıklayın
3. "Create Database" butonuna tıklayın
4. "Postgres" seçin
5. "Create" butonuna tıklayın
6. 1-2 dakika içinde veritabanı hazır olacak

### Adım 3: Connection String'i Kopyalama

1. Storage sekmesinde Postgres veritabanınıza tıklayın
2. "Settings" sekmesine gidin
3. "Connection String" bölümünden connection string'i kopyalayın
4. Örnek format: `postgres://default:xxx@xxx.vercel-storage.com:5432/verceldb`

### Adım 4: Environment Variable Ekleyin

1. Vercel dashboard → Projeniz → Settings → Environment Variables
2. `DATABASE_URL` ekleyin:
   - Key: `DATABASE_URL`
   - Value: Vercel Postgres'ten kopyaladığınız connection string
   - Environment: Production, Preview, Development (hepsini seçin)
3. "Save" butonuna tıklayın

### Adım 5: Redeploy

1. "Deployments" sekmesine gidin
2. En son deployment'a tıklayın
3. "Redeploy" butonuna tıklayın
4. Veya yeni bir commit yapın (otomatik deploy başlar)

### Adım 6: Migration Çalıştırma

Deploy tamamlandıktan sonra:

**Yöntem A: Vercel CLI ile (Önerilen)**

```bash
# Vercel CLI kurulumu (eğer yoksa)
npm i -g vercel

# Environment variables'ları çek
vercel env pull .env.local

# Migration çalıştır
npx prisma migrate deploy
```

**Yöntem B: Vercel Dashboard'dan**

1. Vercel dashboard → Projeniz → Settings → Functions
2. "Run Command" bölümüne gidin
3. Şu komutu çalıştırın:
   ```bash
   npx prisma migrate deploy
   ```

### Adım 7: Seed (Opsiyonel - Test Verileri)

Migration sonrası test verileri eklemek için:

```bash
npm run db:seed
```

Veya Vercel Functions'dan:
```bash
npm run db:seed
```

## ✅ Avantajlar

- ✅ Vercel ekosisteminde (tek platform)
- ✅ Otomatik yedekleme
- ✅ Kolay kurulum (2 dakika)
- ✅ Ücretsiz tier mevcut
- ✅ Connection string otomatik sağlanır

## 📝 Notlar

- Vercel Postgres ücretsiz tier'da sınırlı kaynak sunar (küçük projeler için yeterli)
- Production için daha büyük plan gerekebilir
- Connection string otomatik olarak environment variable olarak eklenir

## 🎯 Sonuç

Vercel Postgres ile Supabase'e ihtiyaç duymadan deploy yapabilirsiniz!

