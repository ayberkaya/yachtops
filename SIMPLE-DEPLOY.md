# ⚡ Basit Deploy - Link Paylaşımı

Karşı tarafa link göndermek için en basit yöntem.

## 🎯 3 Adımda Link Hazır

### 1. GitHub'a Push Edin

```bash
git add .
git commit -m "Ready for deployment"
git push
```

### 2. Vercel'e Deploy Edin

1. [vercel.com](https://vercel.com) → "Sign Up" (GitHub ile giriş)
2. "Add New Project" → GitHub repo'nuzu seçin
3. Environment Variables ekleyin:
   - `DATABASE_URL` → Supabase/Neon'dan alın (ücretsiz)
   - `NEXTAUTH_URL` → Otomatik doldurulur
   - `NEXTAUTH_SECRET` → `openssl rand -base64 32` ile oluşturun
4. "Deploy" → 2 dakika bekle
5. ✅ **Link hazır!** Örnek: `https://yachtops.vercel.app`

### 3. Link'i Paylaşın

Karşı tarafa gönderin:
```
YachtOps uygulaması hazır! 
Link: https://yachtops.vercel.app

Kullanım:
- Desktop: Linki açın, install ikonuna tıklayın
- Mobil: Linki açın, "Add to Home Screen" seçin
```

## 🗄️ Ücretsiz Veritabanı (2 Dakika)

### Supabase (Önerilen)

1. [supabase.com](https://supabase.com) → "Start your project"
2. Yeni proje oluşturun
3. Settings → Database → Connection string kopyalayın
4. Vercel'e `DATABASE_URL` olarak ekleyin

### Neon (Alternatif)

1. [neon.tech](https://neon.tech) → "Sign Up"
2. Yeni proje oluşturun
3. Connection string kopyalayın
4. Vercel'e `DATABASE_URL` olarak ekleyin

## ✅ Deploy Sonrası

1. Linki açın
2. Migration çalıştırın (Vercel dashboard > Functions > Run):
   ```bash
   npx prisma migrate deploy
   ```
3. Seed çalıştırın (opsiyonel):
   ```bash
   npm run db:seed
   ```

## 📱 Kullanım

**Karşı taraf için:**

1. Linki açın
2. Install ikonuna tıklayın (veya "Add to Home Screen")
3. Uygulamayı kullanmaya başlayın!

**Test Hesapları (seed sonrası):**
- Owner: `owner@yachtops.com` / `owner123`
- Captain: `captain@yachtops.com` / `captain123`
- Crew: `crew@yachtops.com` / `crew123`

## 🎉 Hazır!

Link hazır ve paylaşılabilir. Karşı taraf hemen kullanmaya başlayabilir!

