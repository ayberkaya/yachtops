# ⚡ Hızlı Başlangıç - YachtOps PWA

Bu rehber, YachtOps uygulamasını en hızlı şekilde çalıştırmak için gereken adımları içerir.

## 🎯 5 Dakikada Başlangıç

### 1. Projeyi İndirin ve Bağımlılıkları Yükleyin

```bash
cd yachtops
npm install
```

### 2. Icon Dosyalarını Oluşturun

```bash
# ImageMagick ile (eğer kuruluysa)
./scripts/create-icons.sh

# VEYA hazır icon dosyalarınızı kopyalayın
# public/icon-192.png ve public/icon-512.png
```

### 3. Environment Variables

`.env` dosyası oluşturun:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/yachtops?schema=public"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"
```

### 4. Veritabanı

```bash
# PostgreSQL başlatın (Docker ile)
docker run --name yachtops-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=yachtops \
  -p 5432:5432 \
  -d postgres:16

# Migration
npx prisma migrate dev --name init

# Seed (opsiyonel)
npm run db:seed
```

### 5. Çalıştırın

```bash
npm run dev
```

Uygulama `http://localhost:3000` adresinde çalışacaktır.

## 📱 PWA Testi

1. Chrome'da `http://localhost:3000` açın
2. F12 > Application > Service Workers - Kayıtlı olduğunu kontrol edin
3. Application > Manifest - Icon'ların göründüğünü kontrol edin
4. Adres çubuğunda install ikonunu kontrol edin

## ✅ Kontrol Listesi

- [ ] Icon dosyaları mevcut (`public/icon-192.png`, `public/icon-512.png`)
- [ ] `.env` dosyası oluşturuldu
- [ ] Veritabanı hazır
- [ ] Uygulama çalışıyor
- [ ] Service worker kayıtlı
- [ ] Manifest yüklendi

## 🚀 Production'a Geçiş

```bash
npm run build
npm start
```

HTTPS için Vercel/Netlify kullanın (otomatik HTTPS).

## 📚 Detaylı Dokümantasyon

- [PWA-SETUP.md](./PWA-SETUP.md) - Detaylı kurulum
- [TEST-GUIDE.md](./TEST-GUIDE.md) - Test rehberi
- [PWA.md](./PWA.md) - PWA özellikleri

