# 🔧 Migration Çalıştırma Rehberi

Deploy sonrası veritabanı migration'ını çalıştırmanız gerekiyor.

## ⚡ Hızlı Yöntem: Vercel CLI ile

### Adım 1: Vercel CLI Kurulumu

```bash
npm install -g vercel
```

### Adım 2: Vercel'e Login

```bash
vercel login
```

### Adım 3: Projeye Bağlan

```bash
cd helmops
vercel link
```

Projenizi seçin.

### Adım 4: Environment Variables'ları Çek

```bash
vercel env pull .env.local
```

Bu komut Vercel'deki environment variables'ları `.env.local` dosyasına indirir.

### Adım 5: Migration Çalıştır

```bash
npx prisma migrate deploy
```

Bu komut migration'ları production veritabanına uygular.

### Adım 6: Seed (Opsiyonel - Test Verileri)

```bash
npm run db:seed
```

Bu komut test kullanıcıları oluşturur:
- Owner: `owner@helmops.com` / `owner123`
- Captain: `captain@helmops.com` / `captain123`
- Crew: `crew@helmops.com` / `crew123`

## ✅ Kontrol

Migration başarılı olduktan sonra:

1. Linki açın: `https://helmops-10ckxe3gl-ayberkayas-projects.vercel.app`
2. Sign in sayfasına gidin
3. Test hesaplarıyla giriş yapmayı deneyin

## 🐛 Sorun Giderme

### Migration Başarısız Oluyor

- `.env.local` dosyasında `DATABASE_URL`'in doğru olduğundan emin olun
- Supabase veritabanının erişilebilir olduğundan emin olun
- Connection string'in doğru formatında olduğundan emin olun

### Prisma Client Hatası

```bash
npx prisma generate
```

Sonra tekrar migration çalıştırın.

