# 🚀 PWA Kurulum ve Test Rehberi

Bu dokümantasyon, YachtOps uygulamasını PWA olarak kurmak ve test etmek için gerekli tüm adımları içerir.

## 📋 Ön Koşullar

- Node.js 18+ kurulu olmalı
- npm veya yarn kurulu olmalı
- Git kurulu olmalı (projeyi klonlamak için)

## 🔧 Kurulum Adımları

### 1. Projeyi Klonlayın

```bash
git clone <repository-url>
cd yachtops
```

### 2. Bağımlılıkları Yükleyin

```bash
npm install
```

### 3. Icon Dosyalarını Oluşturun

PWA için icon dosyaları gereklidir. İki seçeneğiniz var:

#### Seçenek A: Script ile (ImageMagick gerektirir)

```bash
# ImageMagick kurulumu (macOS)
brew install imagemagick

# Icon'ları oluştur
./scripts/create-icons.sh
```

#### Seçenek B: Online Converter Kullanın

1. `public/icon.svg` dosyasını alın
2. [CloudConvert](https://cloudconvert.com/svg-to-png) veya [ConvertIO](https://convertio.co/svg-png/) kullanın
3. Şu boyutlarda PNG oluşturun:
   - 192x192px → `public/icon-192.png`
   - 512x512px → `public/icon-512.png`
4. Dosyaları `public/` klasörüne kopyalayın

#### Seçenek C: Manuel Icon Oluşturma

Hazırladığınız icon dosyalarını şu konumlara yerleştirin:
- `public/icon-192.png` (192x192px)
- `public/icon-512.png` (512x512px)

### 4. Environment Variables Ayarlayın

`.env` dosyası oluşturun:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/yachtops?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"
```

**NEXTAUTH_SECRET oluşturma:**
```bash
openssl rand -base64 32
```

### 5. Veritabanını Hazırlayın

```bash
# Migration'ları çalıştır
npx prisma migrate dev --name init

# (Opsiyonel) Seed data ekle
npm run db:seed
```

### 6. Development Modunda Çalıştırın

```bash
npm run dev
```

Uygulama `http://localhost:3000` adresinde çalışacaktır.

## 📱 PWA Olarak Test Etme

### Localhost'ta Test (Development)

1. Uygulamayı `npm run dev` ile başlatın
2. Chrome/Edge'de `http://localhost:3000` adresini açın
3. Chrome DevTools'u açın (F12)
4. **Application** sekmesine gidin:
   - **Service Workers**: Service worker'ın kayıtlı olduğunu kontrol edin
   - **Manifest**: Manifest'in yüklendiğini ve icon'ların göründüğünü kontrol edin
5. Adres çubuğunda install ikonunu kontrol edin

### Production Build ile Test

```bash
# Production build oluştur
npm run build

# Production server'ı başlat
npm start
```

### HTTPS ile Test (Production için gerekli)

PWA özellikleri production'da HTTPS gerektirir. Seçenekler:

#### A) Vercel/Netlify (Önerilen - En Kolay)

1. Projeyi GitHub'a push edin
2. [Vercel](https://vercel.com) veya [Netlify](https://netlify.com) hesabı oluşturun
3. Repository'yi bağlayın ve deploy edin
4. Otomatik HTTPS sağlanır

#### B) Kendi Sunucunuz

1. SSL sertifikası kurun (Let's Encrypt önerilir)
2. Nginx/Apache ile HTTPS yapılandırın
3. Next.js'i HTTPS ile çalıştırın

## ✅ PWA Kontrol Listesi

Test etmeden önce şunları kontrol edin:

- [ ] Icon dosyaları mevcut (`public/icon-192.png`, `public/icon-512.png`)
- [ ] Service worker dosyası mevcut (`public/sw.js`)
- [ ] Manifest dosyası doğru (`app/manifest.ts`)
- [ ] Production build yapıldı (`npm run build`)
- [ ] HTTPS aktif (production için)
- [ ] Service worker kayıtlı (DevTools > Application > Service Workers)
- [ ] Manifest yükleniyor (DevTools > Application > Manifest)
- [ ] Icon'lar görünüyor (Manifest sekmesinde)

## 🧪 Test Senaryoları

### 1. Service Worker Testi

1. Chrome DevTools > Application > Service Workers
2. Service worker'ın "activated and is running" durumunda olduğunu kontrol edin
3. "Update" butonuna tıklayarak güncellemeleri test edin
4. "Offline" checkbox'ını işaretleyerek offline modu test edin

### 2. Manifest Testi

1. Chrome DevTools > Application > Manifest
2. Manifest'in yüklendiğini kontrol edin
3. Icon'ların göründüğünü kontrol edin
4. Tüm alanların doğru doldurulduğunu kontrol edin

### 3. Install Prompt Testi

1. Uygulamayı ilk kez açın
2. Install prompt'un göründüğünü kontrol edin (sağ alt köşe)
3. "Install" butonuna tıklayın
4. Uygulamanın yüklendiğini kontrol edin

### 4. Offline Testi

1. Chrome DevTools > Network > "Offline" seçeneğini işaretleyin
2. Sayfayı yenileyin
3. Offline sayfasının göründüğünü kontrol edin (`/offline`)
4. Cache'lenmiş sayfaların çalıştığını kontrol edin

### 5. Lighthouse Testi

1. Chrome DevTools > Lighthouse sekmesi
2. "Progressive Web App" seçeneğini işaretleyin
3. "Generate report" butonuna tıklayın
4. PWA skorunun 90+ olduğunu kontrol edin

## 📲 Mobil Cihazlarda Test

### Android (Chrome)

1. Uygulamayı HTTPS üzerinden açın
2. Chrome menüsünden "Add to Home Screen" seçin
3. Uygulamanın home screen'e eklendiğini kontrol edin
4. Uygulamayı home screen'den açın
5. Standalone modda açıldığını kontrol edin

### iOS (Safari)

1. Uygulamayı Safari'de açın
2. Paylaş butonuna tıklayın
3. "Add to Home Screen" seçin
4. Uygulamanın home screen'e eklendiğini kontrol edin
5. Uygulamayı home screen'den açın

## 🐛 Sorun Giderme

### Service Worker Kayıt Edilmiyor

**Sorun:** Service worker kayıt edilmiyor veya hata veriyor

**Çözüm:**
1. HTTPS kullandığınızdan emin olun (localhost hariç)
2. Browser console'da hata mesajlarını kontrol edin
3. `public/sw.js` dosyasının erişilebilir olduğunu kontrol edin
4. Service worker'ı manuel olarak kaydetmeyi deneyin:
   ```javascript
   navigator.serviceWorker.register('/sw.js')
   ```

### Icon'lar Görünmüyor

**Sorun:** Manifest'te icon'lar görünmüyor

**Çözüm:**
1. Icon dosyalarının `public/` klasöründe olduğunu kontrol edin
2. Dosya isimlerinin doğru olduğunu kontrol edin (`icon-192.png`, `icon-512.png`)
3. Browser cache'ini temizleyin
4. Icon dosyalarının erişilebilir olduğunu kontrol edin: `http://localhost:3000/icon-192.png`

### Install Prompt Görünmüyor

**Sorun:** Install prompt görünmüyor

**Çözüm:**
1. Uygulamanın zaten yüklü olmadığını kontrol edin
2. Tarayıcının PWA desteğinin olduğunu kontrol edin (Chrome, Edge, Safari)
3. `beforeinstallprompt` event'inin tetiklendiğini console'da kontrol edin
4. Manifest'in geçerli olduğunu kontrol edin

### Offline Çalışmıyor

**Sorun:** Offline modda sayfa yüklenmiyor

**Çözüm:**
1. Service worker'ın aktif olduğunu kontrol edin
2. Cache'in dolu olduğunu kontrol edin (DevTools > Application > Cache Storage)
3. `public/sw.js` dosyasındaki cache stratejisini kontrol edin
4. Offline sayfasının (`/offline`) mevcut olduğunu kontrol edin

## 📚 Ek Kaynaklar

- [PWA Dokümantasyonu](./PWA.md) - Detaylı PWA özellikleri
- [Next.js PWA Guide](https://nextjs.org/docs/app/building-your-application/configuring/progressive-web-apps)
- [Web.dev PWA](https://web.dev/progressive-web-apps/)

## 🎯 Hızlı Başlangıç Özeti

```bash
# 1. Projeyi klonla ve bağımlılıkları yükle
git clone <repo>
cd yachtops
npm install

# 2. Icon dosyalarını oluştur (veya hazır icon'ları kopyala)
# icon-192.png ve icon-512.png dosyalarını public/ klasörüne kopyala

# 3. Environment variables ayarla
cp .env.example .env
# .env dosyasını düzenle

# 4. Veritabanını hazırla
npx prisma migrate dev
npm run db:seed

# 5. Development modunda çalıştır
npm run dev

# 6. Production build için
npm run build
npm start
```

## 📞 Destek

Sorun yaşarsanız:
1. `PWA.md` dosyasına bakın
2. Browser console'daki hata mesajlarını kontrol edin
3. Chrome DevTools > Application sekmesinden durumu kontrol edin

