# Duplicate Channels Fix

## Sorun
Communication bölümünde aynı isimde birden fazla grup oluşturulabiliyordu. Özellikle "General" isimli channel'lar otomatik oluşturulurken duplicate'lar oluşabiliyordu.

## Çözüm

### 1. Database Schema Güncellemesi
- `MessageChannel` modeline `@@unique([yachtId, name])` constraint'i eklendi
- Artık aynı yacht'ta aynı isimde birden fazla channel oluşturulamaz

### 2. Kod Güncellemeleri
- **Channel oluşturma endpoint'i** (`app/api/channels/route.ts`): Duplicate kontrolü eklendi
- **Signup endpoint'i** (`app/api/auth/signup/route.ts`): General channel oluşturulmadan önce kontrol ediliyor
- **Seed script** (`prisma/seed.ts`): General channel oluşturulmadan önce kontrol ediliyor

### 3. Cleanup Script
- `scripts/cleanup-duplicate-channels.ts`: Mevcut duplicate'ları temizlemek için script oluşturuldu
- Her yacht+name kombinasyonu için en eski channel'ı tutar, diğerlerini siler

## Uygulama Adımları

### 1. Mevcut Duplicate'ları Temizle
```bash
npm run cleanup-duplicate-channels
```

Bu script:
- Tüm duplicate channel'ları bulur
- Her grup için en eski channel'ı tutar
- Diğer duplicate'ları siler (mesajları cascade delete ile silinir)

### 2. Migration'ı Uygula
```bash
npx prisma migrate deploy
```

veya development için:
```bash
npx prisma migrate dev
```

Migration:
- Önce mevcut duplicate'ları temizler
- Sonra unique constraint'i ekler

### 3. Prisma Client'ı Güncelle
```bash
npx prisma generate
```

## Test

1. Aynı isimde channel oluşturmayı deneyin - hata almalısınız
2. General channel'ı silmeyi deneyin - hata almalısınız (zaten korumalı)
3. Yeni kullanıcı kaydı yapın - sadece bir General channel oluşturulmalı

## Notlar

- Unique constraint database seviyesinde koruma sağlar
- Mevcut duplicate'lar cleanup script ile temizlenebilir
- General channel'lar silinemez (zaten korumalı)
- Migration duplicate'ları otomatik temizler

