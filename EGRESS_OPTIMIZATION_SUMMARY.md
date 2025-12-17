# Supabase Egress Optimizasyonu - Özet

**Tarih:** 2025-01-15  
**Durum:** ✅ Tamamlandı

## Problem

Supabase Free plan'da **56GB uncached egress** kullanımı (5GB limit aşıldı). Gerçek kullanıcı sayısı neredeyse sıfır, bu yüzden kod/konfigürasyon sorunu.

## Çözüm - 4 Adım

### ✅ Adım 0: Logging Altyapısı
- Tüm Supabase çağrılarını loglayan sistem
- `EGRESS_DEBUG` env flag ile kontrol
- Server ve client-side logging

### ✅ Adım 1: Audit
- Kod tabanında tüm egress kaynakları tespit edildi
- Top 10 sorun belirlendi
- `EGRESS_AUDIT.md` oluşturuldu

### ✅ Adım 2: Database/Query Optimizasyonu
- Base64 dosyalar list endpoint'lerinden kaldırıldı
- Pagination zorunlu hale getirildi (default: 25)
- Yeni base64 yazımı durduruldu

### ✅ Adım 3: Supabase Storage Implementasyonu
- Tüm dosya upload'ları Supabase Storage'a taşındı
- Sadece metadata (bucket, path, mimeType, size) database'de
- Signed URL'ler ile dosya erişimi (1 saat TTL, cache'li)

## Beklenen Sonuç

**Önce:**
- Expense listesi: ~150MB (base64 dosyalarla)
- Message listesi: ~4.5MB (base64 görsellerle)

**Sonra:**
- Expense listesi: ~50KB (sadece metadata)
- Message listesi: ~100KB (sadece metadata)

**Toplam Egress Azalması: %90-99**

## Yapılması Gerekenler

### 1. Environment Variables (Vercel'de)
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 2. Database Migration
```bash
cd helmops
npx prisma migrate deploy
npx prisma generate
```

### 3. Test
- Receipt upload test et
- Message image upload test et
- Document upload test et
- Signed URL'lerin çalıştığını doğrula

## Bucket'lar

Otomatik oluşturulacak:
- `expense-receipts` - Receipt görselleri
- `message-images` - Mesaj görselleri
- `vessel-documents` - Vessel dokümanları
- `crew-documents` - Crew dokümanları

## Güvenlik

- ✅ Service role key sadece server-side
- ✅ Tüm bucket'lar private
- ✅ Signed URL'ler 1 saat geçerli
- ✅ Access control uygulama seviyesinde

## Dokümantasyon

- `EGRESS_AUDIT.md` - Detaylı audit raporu
- `SUPABASE_STORAGE_REPORT.md` - Storage implementasyon raporu
- `SUPABASE_STORAGE_SETUP.md` - Kurulum rehberi
- `STEP2_CHANGES_REPORT.md` - Adım 2 değişiklikleri

