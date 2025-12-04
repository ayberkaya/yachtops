# 🔗 Link Paylaşımı - Karşı Taraf İçin Hazır Link

Bu dokümantasyon, YachtOps uygulamasını deploy edip karşı tarafa link göndermek için gereken adımları içerir.

## 🎯 Amaç

Karşı tarafa bir link gönderip, o kişinin uygulamayı hemen kullanmaya başlamasını sağlamak.

## ⚡ En Hızlı Yöntem (5 Dakika)

### Adım 1: GitHub'a Push (1 dakika)

```bash
git add .
git commit -m "Ready for deployment"
git push
```

### Adım 2: Vercel'e Deploy (2 dakika)

1. [vercel.com](https://vercel.com) → GitHub ile giriş yapın
2. "Add New Project" → Repository'nizi seçin
3. Environment Variables ekleyin (aşağıya bakın)
4. "Deploy" → Bekleyin
5. ✅ **Link hazır!**

### Adım 3: Veritabanı Kurulumu (2 dakika)

**Supabase (Ücretsiz):**
1. [supabase.com](https://supabase.com) → Yeni proje
2. Settings → Database → Connection string kopyala
3. Vercel'e `DATABASE_URL` olarak ekle

**Migration Çalıştır:**
Vercel dashboard > Functions > Run:
```bash
npx prisma migrate deploy
```

### Adım 4: Link'i Paylaşın

Karşı tarafa gönderin:
```
YachtOps uygulaması hazır! 

🔗 Link: https://yachtops.vercel.app

📱 Kullanım:
- Desktop: Linki açın, install ikonuna tıklayın
- Mobil: Linki açın, "Add to Home Screen" seçin

🔑 Test Hesapları:
- Owner: owner@yachtops.com / owner123
- Captain: captain@yachtops.com / captain123
- Crew: crew@yachtops.com / crew123
```

## 🔧 Environment Variables

Vercel deploy sırasında şunları ekleyin:

```env
DATABASE_URL=postgresql://user:pass@host:5432/yachtops
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=<openssl rand -base64 32 ile oluşturun>
```

## 📱 Karşı Taraf İçin Kullanım

### Desktop

1. Linki Chrome/Edge'de açın
2. Adres çubuğunda install ikonuna tıklayın
3. "Install" butonuna tıklayın
4. Uygulama standalone modda açılacak

### Mobil (Android)

1. Linki Chrome'da açın
2. Menüden "Add to Home Screen" seçin
3. Uygulama home screen'e eklenecek
4. Home screen'den açın

### Mobil (iOS)

1. Linki Safari'de açın
2. Paylaş butonuna tıklayın
3. "Add to Home Screen" seçin
4. Uygulama home screen'e eklenecek

## ✅ Kontrol Listesi

Deploy sonrası kontrol edin:

- [ ] Link çalışıyor
- [ ] Service worker kayıtlı (F12 > Application > Service Workers)
- [ ] Manifest yüklendi (F12 > Application > Manifest)
- [ ] Install prompt görünüyor
- [ ] Veritabanı bağlantısı çalışıyor
- [ ] Migration çalıştırıldı

## 🎉 Hazır!

Link hazır ve paylaşılabilir. Karşı taraf hemen kullanmaya başlayabilir!

**Not:** İlk açılışta migration çalıştırmanız gerekebilir. Vercel dashboard'dan Functions sekmesinden çalıştırabilirsiniz.

