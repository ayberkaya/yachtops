# 📱 YachtOps PWA - Kullanıcı Rehberi

Bu dokümantasyon, YachtOps uygulamasını PWA olarak kullanmak isteyen kullanıcılar için hazırlanmıştır.

## 🎯 PWA Nedir?

Progressive Web App (PWA), web uygulamalarının mobil uygulamalar gibi çalışmasını sağlayan teknolojidir. YachtOps'u cihazınıza yükleyerek:

- ✅ İnternet bağlantısı olmadan çalışabilirsiniz (offline mod)
- ✅ Uygulamayı home screen'e ekleyebilirsiniz
- ✅ Tam ekran modda kullanabilirsiniz
- ✅ Daha hızlı yüklenir ve çalışır

## 📲 Uygulamayı Yükleme

### Desktop (Windows/Mac/Linux)

**Chrome/Edge:**
1. YachtOps uygulamasını tarayıcıda açın
2. Adres çubuğunda install ikonuna tıklayın
3. "Install" butonuna tıklayın
4. Uygulama yüklenecek ve standalone modda açılacaktır

**Alternatif:**
- Menüden "Install YachtOps" seçeneğini kullanın

### Android

**Chrome:**
1. YachtOps uygulamasını Chrome'da açın
2. Menüden "Add to Home Screen" seçin
3. Uygulama home screen'e eklenecektir
4. Home screen'den uygulamayı açın

**Otomatik Prompt:**
- Uygulamayı ilk açtığınızda otomatik olarak yükleme önerisi görünebilir
- "Install" butonuna tıklayarak yükleyebilirsiniz

### iOS (iPhone/iPad)

**Safari:**
1. YachtOps uygulamasını Safari'de açın
2. Paylaş butonuna (kare içinde ok) tıklayın
3. "Add to Home Screen" seçeneğini seçin
4. Uygulama adını düzenleyip "Add" butonuna tıklayın
5. Uygulama home screen'e eklenecektir

## 🚀 İlk Kullanım

### Giriş Yapma

1. Uygulamayı açın
2. Email ve şifrenizi girin
3. "Sign In" butonuna tıklayın

**Test Hesapları (eğer seed data kullanıldıysa):**
- Owner: `owner@yachtops.com` / `owner123`
- Captain: `captain@yachtops.com` / `captain123`
- Crew: `crew@yachtops.com` / `crew123`

### Offline Mod

YachtOps offline modda da çalışabilir:

1. Uygulamayı bir kez açın (internet bağlantısıyla)
2. Sayfalar cache'lenecektir
3. İnternet bağlantısı kesildiğinde bile uygulamayı kullanabilirsiniz
4. Offline modda bazı özellikler sınırlı olabilir

## 🔄 Güncellemeler

Uygulama otomatik olarak güncellenir:

- Service worker her saat kontrol eder
- Yeni versiyon bulunduğunda otomatik güncellenir
- Sayfayı yenilediğinizde güncellemeler uygulanır

**Manuel Güncelleme:**
- Uygulamayı kapatıp tekrar açın
- Veya tarayıcı cache'ini temizleyin

## 🎨 Özellikler

### Standalone Mod

Uygulama yüklendikten sonra:
- Tam ekran modda açılır
- Tarayıcı çubuğu görünmez
- Native uygulama gibi görünür ve çalışır

### Hızlı Erişim

Uygulama kısayolları:
- **Expenses**: Hızlı erişim için expenses sayfasına gider
- **Tasks**: Hızlı erişim için tasks sayfasına gider

### Offline Çalışma

- Daha önce ziyaret ettiğiniz sayfalar offline'da çalışır
- Offline sayfası görüntülenir (yeni sayfalar için)
- İnternet bağlantısı geri geldiğinde otomatik senkronize olur

## 🐛 Sorun Giderme

### Uygulama Yüklenmiyor

**Çözüm:**
- HTTPS kullandığınızdan emin olun (localhost hariç)
- Tarayıcının PWA desteğini kontrol edin
- Cache'i temizleyip tekrar deneyin

### Offline Mod Çalışmıyor

**Çözüm:**
- Uygulamayı bir kez internet bağlantısıyla açın
- Service worker'ın aktif olduğunu kontrol edin
- Sayfaları bir kez ziyaret edin (cache için)

### Güncellemeler Görünmüyor

**Çözüm:**
- Uygulamayı kapatıp tekrar açın
- Tarayıcı cache'ini temizleyin
- Service worker'ı manuel olarak güncelleyin

## 📞 Destek

Sorun yaşarsanız:
1. Tarayıcı console'unu kontrol edin (F12)
2. Uygulama yöneticisine bildirin
3. Teknik dokümantasyona bakın

## ✅ Avantajlar

PWA kullanmanın avantajları:

- 🚀 **Hızlı**: Cache sayesinde daha hızlı yüklenir
- 📱 **Mobil**: Mobil cihazlarda native uygulama gibi çalışır
- 💾 **Offline**: İnternet olmadan da çalışır
- 🔄 **Güncel**: Otomatik güncellenir
- 💰 **Ücretsiz**: App Store'dan indirmeye gerek yok

## 🎉 Başarılı Kurulum

Uygulama başarıyla yüklendiğinde:

✅ Home screen'de görünür
✅ Standalone modda açılır
✅ Offline çalışır
✅ Otomatik güncellenir

Keyifli kullanımlar! 🚢

