# 🔧 Migration Sorun Giderme

## Sorun: Prepared Statement Hatası

Bu hata genellikle Supabase connection pooling ile ilgili bir sorundur.

## Çözüm 1: Direct Connection Kullanın

Supabase'de "Connection string" yerine "Direct connection" kullanın:

1. Supabase dashboard → Settings → Database
2. "Connection string" bölümünde "Direct connection" seçin
3. Connection string'i kopyalayın (port 5432)
4. Vercel'de `DATABASE_URL` olarak güncelleyin

## Çözüm 2: Veritabanını Reset Edin (Development için)

**⚠️ DİKKAT: Bu tüm verileri siler!**

1. Supabase dashboard → Settings → Database
2. "Reset database" butonuna tıklayın
3. Onaylayın
4. Yeni migration oluşturun

## Çözüm 3: Migration'ı Manuel Oluşturun

```bash
# Migration klasörünü temizle (zaten yaptık)
rm -rf prisma/migrations/*

# Yeni migration oluştur
npx prisma migrate dev --name init

# Production'a deploy et
npx prisma migrate deploy
```

## Çözüm 4: Prisma DB Push Kullanın (Development için)

Migration yerine schema'yı direkt push edebilirsiniz:

```bash
npx prisma db push
```

Bu komut migration oluşturmadan schema'yı direkt veritabanına uygular.

