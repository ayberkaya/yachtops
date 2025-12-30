# 🧪 HelmOps PWA Test Rehberi

Bu rehber, HelmOps uygulamasını PWA olarak test etmek için adım adım talimatlar içerir.

## 🎯 Test Senaryosu

Bu rehberi takip ederek uygulamayı kendi cihazınıza indirip test edebilirsiniz.

## 📋 Ön Hazırlık

### 1. Gerekli Dosyalar

Projeyi aldığınızda şu dosyaların mevcut olduğundan emin olun:

- ✅ `public/icon-192.png` - 192x192px icon
- ✅ `public/icon-512.png` - 512x512px icon
- ✅ `public/sw.js` - Service worker dosyası
- ✅ `app/manifest.ts` - Manifest dosyası
- ✅ `.env` - Environment variables (örnek: `.env.example`)

### 2. Sistem Gereksinimleri

- Node.js 18 veya üzeri
- npm veya yarn
- Modern web tarayıcı (Chrome, Edge, Safari)
- İnternet bağlantısı (ilk kurulum için)

## 🚀 Kurulum Adımları

### Adım 1: Projeyi İndirin

```bash
# Git ile klonlayın veya ZIP olarak indirin
git clone <repository-url>
cd helmops
```

### Adım 2: Bağımlılıkları Yükleyin

```bash
npm install
```

Bu işlem birkaç dakika sürebilir.

### Adım 3: Icon Dosyalarını Kontrol Edin

```bash
# Icon dosyalarının varlığını kontrol edin
ls -la public/icon*.png
```

Eğer icon dosyaları yoksa:

**Seçenek A:** Script ile oluşturun (ImageMagick gerektirir)
```bash
./scripts/create-icons.sh
```

**Seçenek B:** Hazır icon dosyalarınızı kopyalayın
```bash
# icon-192.png ve icon-512.png dosyalarını public/ klasörüne kopyalayın
cp /path/to/your/icon-192.png public/
cp /path/to/your/icon-512.png public/
```

### Adım 4: Environment Variables Ayarlayın

`.env` dosyası oluşturun:

```bash
cp .env.example .env
```

`.env` dosyasını düzenleyin:

```env
# Database Connection
DATABASE_URL="postgresql://user:password@localhost:5432/helmops?schema=public"

# NextAuth Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"
```

**NEXTAUTH_SECRET oluşturma:**
```bash
openssl rand -base64 32
```

### Adım 5: Veritabanını Hazırlayın

**PostgreSQL Kurulumu:**

macOS (Homebrew):
```bash
brew install postgresql@16
brew services start postgresql@16
createdb helmops
```

Linux:
```bash
sudo apt-get install postgresql postgresql-contrib
sudo -u postgres createdb helmops
```

Docker:
```bash
docker run --name helmops-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=helmops \
  -p 5432:5432 \
  -d postgres:16
```

**Migration ve Seed:**
```bash
# Migration'ları çalıştır
npx prisma migrate dev --name init

# (Opsiyonel) Test verileri ekle
npm run db:seed
```

Seed sonrası test kullanıcıları:
- Owner: `owner@helmops.com` / `owner123`
- Captain: `captain@helmops.com` / `captain123`
- Crew: `crew@helmops.com` / `crew123`

### Adım 6: Uygulamayı Başlatın

**Development Modu:**
```bash
npm run dev
```

Uygulama `http://localhost:3000` adresinde çalışacaktır.

**Production Modu (Test için):**
```bash
npm run build
npm start
```

## 📱 PWA Test Adımları

### Test 1: Service Worker Kontrolü

1. Uygulamayı tarayıcıda açın (`http://localhost:3000`)
2. **F12** ile Developer Tools'u açın
3. **Application** sekmesine gidin
4. Sol menüden **Service Workers** seçin
5. Service worker'ın "activated and is running" durumunda olduğunu kontrol edin

✅ **Başarılı:** Service worker kayıtlı ve çalışıyor
❌ **Başarısız:** Console'da hata mesajlarını kontrol edin

### Test 2: Manifest Kontrolü

1. Developer Tools > **Application** > **Manifest**
2. Manifest'in yüklendiğini kontrol edin
3. Icon'ların göründüğünü kontrol edin
4. Tüm alanların doldurulduğunu kontrol edin

✅ **Başarılı:** Manifest yüklendi ve icon'lar görünüyor
❌ **Başarısız:** Icon dosyalarının `public/` klasöründe olduğunu kontrol edin

### Test 3: Install Prompt

1. Uygulamayı ilk kez açın (veya cache'i temizleyin)
2. Sağ alt köşede install prompt'un göründüğünü kontrol edin
3. "Install" butonuna tıklayın
4. Yükleme işlemini tamamlayın

✅ **Başarılı:** Uygulama yüklendi ve standalone modda açıldı
❌ **Başarısız:** Tarayıcının PWA desteğini kontrol edin

### Test 4: Offline Modu

1. Developer Tools > **Network** sekmesi
2. "Offline" checkbox'ını işaretleyin
3. Sayfayı yenileyin (F5)
4. Offline sayfasının göründüğünü kontrol edin

✅ **Başarılı:** Offline sayfası görünüyor
❌ **Başarısız:** Service worker'ın aktif olduğunu kontrol edin

### Test 5: Lighthouse PWA Skoru

1. Developer Tools > **Lighthouse** sekmesi
2. "Progressive Web App" seçeneğini işaretleyin
3. "Generate report" butonuna tıklayın
4. PWA skorunu kontrol edin

✅ **Başarılı:** PWA skoru 90+
❌ **Başarısız:** Eksik özellikleri kontrol edin

## 📲 Mobil Cihazda Test

### Android (Chrome)

1. Bilgisayarınızda uygulamayı çalıştırın
2. Aynı WiFi ağına bağlı Android cihazınızdan erişin:
   - Bilgisayarınızın IP adresini bulun: `ipconfig` (Windows) veya `ifconfig` (Mac/Linux)
   - Android'de: `http://<bilgisayar-ip>:3000` adresini açın
3. Chrome menüsünden **"Add to Home Screen"** seçin
4. Uygulamanın home screen'e eklendiğini kontrol edin
5. Home screen'den uygulamayı açın
6. Standalone modda açıldığını kontrol edin

### iOS (Safari)

1. Bilgisayarınızda uygulamayı çalıştırın
2. Aynı WiFi ağına bağlı iOS cihazınızdan erişin:
   - iOS'ta: `http://<bilgisayar-ip>:3000` adresini açın
3. Safari'de paylaş butonuna tıklayın
4. **"Add to Home Screen"** seçin
5. Uygulamanın home screen'e eklendiğini kontrol edin
6. Home screen'den uygulamayı açın

## 🌐 Production Deployment (HTTPS Gerekli)

PWA özelliklerinin tam çalışması için HTTPS gereklidir. En kolay yöntem:

### Vercel Deployment

1. Projeyi GitHub'a push edin
2. [Vercel](https://vercel.com) hesabı oluşturun
3. "New Project" > GitHub repository'nizi seçin
4. Environment variables ekleyin:
   - `DATABASE_URL`
   - `NEXTAUTH_URL` (Vercel URL'iniz)
   - `NEXTAUTH_SECRET`
5. "Deploy" butonuna tıklayın
6. Otomatik HTTPS sağlanır

### Netlify Deployment

1. Projeyi GitHub'a push edin
2. [Netlify](https://netlify.com) hesabı oluşturun
3. "New site from Git" > GitHub repository'nizi seçin
4. Build settings:
   - Build command: `npm run build`
   - Publish directory: `.next`
5. Environment variables ekleyin
6. "Deploy site" butonuna tıklayın

## ✅ Test Kontrol Listesi

Test tamamlandığında şunları kontrol edin:

- [ ] Service worker kayıtlı ve çalışıyor
- [ ] Manifest yüklendi ve icon'lar görünüyor
- [ ] Install prompt görünüyor ve çalışıyor
- [ ] Uygulama standalone modda açılıyor
- [ ] Offline mod çalışıyor
- [ ] Lighthouse PWA skoru 90+
- [ ] Mobil cihazda yüklenebiliyor
- [ ] Mobil cihazda standalone modda çalışıyor

## 🐛 Yaygın Sorunlar ve Çözümleri

### Sorun: Service Worker Kayıt Edilmiyor

**Çözüm:**
- HTTPS kullandığınızdan emin olun (localhost hariç)
- Browser cache'ini temizleyin
- `public/sw.js` dosyasının erişilebilir olduğunu kontrol edin

### Sorun: Icon'lar Görünmüyor

**Çözüm:**
- Icon dosyalarının `public/` klasöründe olduğunu kontrol edin
- Dosya isimlerinin doğru olduğunu kontrol edin
- Browser cache'ini temizleyin

### Sorun: Install Prompt Görünmüyor

**Çözüm:**
- Uygulamanın zaten yüklü olmadığını kontrol edin
- Tarayıcının PWA desteğini kontrol edin
- Manifest'in geçerli olduğunu kontrol edin

## 📞 Yardım

Sorun yaşarsanız:

1. `PWA-SETUP.md` dosyasına bakın
2. Browser console'daki hata mesajlarını kontrol edin
3. Chrome DevTools > Application sekmesinden durumu kontrol edin

## 🎉 Başarılı Test

Tüm testler başarılı olduğunda:

✅ PWA tam olarak çalışıyor
✅ Uygulama cihazlara yüklenebilir
✅ Offline mod çalışıyor
✅ Production'a hazır

