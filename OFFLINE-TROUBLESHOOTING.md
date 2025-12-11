# Offline Sorun Giderme Kılavuzu

## 🔍 Sorun: Offline'da Sayfalar Açılmıyor

### Neden Oluyor?

Next.js sayfaları dinamik olarak server-side render ediliyor. Service worker sayfaları cache'leyebilir ama **sadece daha önce ziyaret edilmiş sayfalar** cache'lenir.

### Çözüm Adımları

#### 1. Service Worker'ın Aktif Olduğunu Kontrol Edin

1. Chrome DevTools'u açın (F12)
2. **Application** sekmesine gidin
3. **Service Workers** bölümüne bakın
4. Service worker'ın "activated and is running" durumunda olduğunu kontrol edin

Eğer service worker yoksa veya hata varsa:
- Sayfayı yenileyin
- Service worker'ı "Unregister" edip tekrar kaydedin
- Console'da hata mesajlarını kontrol edin

#### 2. Cache Durumunu Kontrol Edin

1. DevTools > **Application** > **Cache Storage**
2. `helmops-static-v4` cache'ini kontrol edin
3. Hangi sayfaların cache'lendiğini görün

Eğer cache boşsa:
- Sayfaları bir kez ziyaret edin (online'dayken)
- Her sayfa ziyaret edildiğinde otomatik cache'lenir

#### 3. Sayfaları Cache'lemek İçin

**Önemli:** Offline'da sayfaları görmek için, önce online'dayken o sayfaları ziyaret etmeniz gerekir.

1. Online'dayken tüm önemli sayfaları ziyaret edin:
   - `/dashboard`
   - `/dashboard/expenses`
   - `/dashboard/tasks`
   - `/dashboard/maintenance`
   - vb.

2. Her sayfa ziyaret edildiğinde otomatik olarak cache'lenir

3. Artık offline'da bu sayfaları görebilirsiniz

#### 4. Test Etme

1. **Online'dayken:**
   - Tüm önemli sayfaları ziyaret edin
   - DevTools > Application > Cache Storage'da cache'lendiğini kontrol edin

2. **Offline'a geçin:**
   - DevTools > Network > "Offline" seçeneğini işaretleyin
   - Veya WiFi'yi kapatın

3. **Sayfaları tekrar ziyaret edin:**
   - Cache'lenmiş sayfalar açılmalı
   - Cache'lenmemiş sayfalar offline sayfasına yönlendirilmeli

## 🛠️ Teknik Detaylar

### Cache Stratejisi

Navigation request'leri için **cache-first** stratejisi kullanılıyor:

1. Önce cache'e bakılır
2. Cache varsa, cache'den gösterilir (hızlı!)
3. Cache yoksa, network'ten istenir
4. Network başarılıysa, cache'e kaydedilir
5. Network başarısızsa ve offline ise, offline sayfası gösterilir

### Neden Sayfalar İlk Seferde Cache'lenmiyor?

Next.js sayfaları dinamik olduğu için:
- Her sayfa server-side render ediliyor
- İlk ziyarette cache yok
- Sayfa yüklendikten sonra cache'e kaydediliyor
- Bir sonraki ziyarette cache'den gösteriliyor

### Service Worker Versiyonu

Service worker versiyonu değiştiğinde:
- Eski cache'ler temizlenir
- Yeni cache oluşturulur
- Sayfaları tekrar ziyaret etmeniz gerekebilir

## 📝 Öneriler

### 1. İlk Kurulum

Uygulamayı ilk kez kullanırken:
1. Online'dayken tüm önemli sayfaları bir kez ziyaret edin
2. Bu sayfalar cache'lenecek
3. Artık offline'da bu sayfaları görebilirsiniz

### 2. Yeni Sayfalar Ekleme

Yeni sayfalar eklendiğinde:
- Sayfaları bir kez ziyaret edin (cache'lenir)
- Veya `PRECACHE_URLS` listesine ekleyin (`public/sw.js`)

### 3. Cache Temizleme

Cache'i temizlemek için:
1. DevTools > Application > Cache Storage
2. `helmops-static-v4` cache'ini silin
3. Sayfayı yenileyin
4. Sayfaları tekrar ziyaret edin

## 🐛 Bilinen Sorunlar

### 1. Next.js Dynamic Routes

Next.js dynamic route'ları (örn: `/dashboard/expenses/[id]`) her seferinde farklı içerik döndürebilir. Bu sayfalar cache'lenmeyebilir.

**Çözüm:** Bu sayfalar için cache kullanmayın veya query string'leri cache key'e dahil edin.

### 2. Authentication State

Eğer sayfa içeriği authentication state'e göre değişiyorsa, cache'lenen sayfa yanlış içerik gösterebilir.

**Çözüm:** Authentication gerektiren sayfalar için cache kullanmayın veya cache'i daha kısa süreli tutun.

### 3. Real-time Data

Real-time data içeren sayfalar (örn: mesajlar, bildirimler) cache'lenmemeli.

**Çözüm:** Bu sayfalar için cache kullanmayın veya cache TTL'ini kısa tutun.

## ✅ Kontrol Listesi

Offline desteğinin çalıştığını kontrol etmek için:

- [ ] Service worker kayıtlı ve aktif
- [ ] Cache storage'da sayfalar var
- [ ] Online'dayken sayfalar ziyaret edildi
- [ ] Offline'da cache'lenmiş sayfalar açılıyor
- [ ] Offline'da cache'lenmemiş sayfalar offline sayfasına yönlendiriliyor
- [ ] Form submit'ler queue'ya ekleniyor
- [ ] Online olduğunda queue sync oluyor

## 📞 Yardım

Sorun devam ederse:
1. Console'da hata mesajlarını kontrol edin
2. Service worker'ı unregister edip tekrar kaydedin
3. Cache'i temizleyip tekrar deneyin
4. Tarayıcı cache'ini temizleyin
