# PWA (Progressive Web App) Setup

HelmOps uygulaması PWA desteği ile gelir. Bu dokümantasyon PWA özelliklerini ve kurulumunu açıklar.

## 📱 PWA Özellikleri

- ✅ **Offline Support**: Service worker ile offline çalışma desteği
- ✅ **Install Prompt**: Kullanıcılara uygulamayı yükleme önerisi
- ✅ **App Icons**: Modern icon desteği
- ✅ **Standalone Mode**: Tam ekran standalone mod
- ✅ **App Shortcuts**: Hızlı erişim kısayolları

## 🚀 Kurulum

### 1. Icon Dosyaları

PWA için icon dosyaları oluşturmanız gerekiyor:

- `public/icon-192.png` - 192x192px PNG icon
- `public/icon-512.png` - 512x512px PNG icon

**Icon Oluşturma:**

1. `public/icon.svg` dosyasını referans alarak PNG icon'ları oluşturun
2. Online araçlar kullanabilirsiniz:
   - [PWA Asset Generator](https://github.com/onderceylan/pwa-asset-generator)
   - [RealFaviconGenerator](https://realfavicongenerator.net/)

Veya ImageMagick ile:
```bash
# SVG'den PNG'ye dönüştürme
convert public/icon.svg -resize 192x192 public/icon-192.png
convert public/icon.svg -resize 512x512 public/icon-512.png
```

### 2. Service Worker

Service worker otomatik olarak kayıt edilir (`components/pwa/service-worker-register.tsx`).

**Özellikler:**
- Cache management
- Offline fallback
- Auto-update kontrolü

### 3. Manifest

Manifest dosyası `app/manifest.ts` içinde tanımlıdır ve otomatik olarak `/manifest` endpoint'inde sunulur.

## 🔧 Yapılandırma

### Manifest Ayarları

`app/manifest.ts` dosyasında şu ayarları değiştirebilirsiniz:

- `name`: Uygulama adı
- `short_name`: Kısa ad
- `start_url`: Başlangıç URL'i
- `theme_color`: Tema rengi
- `background_color`: Arka plan rengi

### Service Worker Cache

`public/sw.js` dosyasında cache stratejisini özelleştirebilirsiniz:

```javascript
const urlsToCache = [
  '/',
  '/auth/signin',
  '/dashboard',
  // Daha fazla sayfa ekleyin
];
```

## 📲 Test Etme

### Chrome DevTools

1. Chrome DevTools'u açın (F12)
2. "Application" sekmesine gidin
3. "Service Workers" bölümünden service worker'ı kontrol edin
4. "Manifest" bölümünden manifest'i kontrol edin

### Lighthouse

1. Chrome DevTools > Lighthouse sekmesi
2. "Progressive Web App" seçeneğini işaretleyin
3. "Generate report" butonuna tıklayın

### Mobil Test

1. HTTPS üzerinden uygulamayı açın
2. Tarayıcı menüsünden "Add to Home Screen" seçeneğini kullanın
3. Uygulamanın standalone modda açıldığını kontrol edin

## 🎨 Install Prompt

Kullanıcılara uygulamayı yükleme önerisi otomatik olarak gösterilir (`components/pwa/install-prompt.tsx`).

**Özellikler:**
- Sadece desteklenen tarayıcılarda gösterilir
- Kullanıcı reddederse 7 gün boyunca tekrar gösterilmez
- Zaten yüklüyse gösterilmez

## 🔄 Güncelleme

Service worker otomatik olarak her saat kontrol edilir ve güncellemeler uygulanır.

Manuel güncelleme için:
```javascript
navigator.serviceWorker.getRegistration().then(reg => reg?.update());
```

## 📝 Notlar

- PWA özellikleri sadece HTTPS üzerinden çalışır (localhost hariç)
- Service worker production build'de aktif olur
- Icon dosyaları oluşturulmalıdır (PNG formatında)
- Manifest dosyası otomatik olarak Next.js tarafından sunulur

## 🐛 Sorun Giderme

### Service Worker Kayıt Edilmiyor

1. HTTPS kullandığınızdan emin olun (localhost hariç)
2. Browser console'da hata mesajlarını kontrol edin
3. `public/sw.js` dosyasının erişilebilir olduğundan emin olun

### Icon'lar Görünmüyor

1. Icon dosyalarının `public/` klasöründe olduğundan emin olun
2. Dosya isimlerinin doğru olduğundan emin olun (`icon-192.png`, `icon-512.png`)
3. Manifest dosyasındaki icon path'lerini kontrol edin

### Install Prompt Gösterilmiyor

1. Uygulamanın zaten yüklü olmadığından emin olun
2. Tarayıcının PWA desteğinin olduğundan emin olun
3. `beforeinstallprompt` event'inin tetiklendiğini kontrol edin

