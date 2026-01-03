# Ölçeklenebilirlik Analizi - Expense & Receipt Sistemi

**Tarih:** 2025-01-23  
**Durum:** Mevcut durum analizi ve öneriler

## Mevcut Durum

### ✅ İyi Olanlar

1. **Database Optimizasyonu:**
   - ✅ Pagination zorunlu (default: 25, max: 100)
   - ✅ Indexing: `yachtId`, `status`, `date`, `deletedAt` kombinasyonları
   - ✅ Soft delete (`deletedAt`) ile veri korunuyor
   - ✅ Tenant isolation (`yachtId`) ile veri ayrımı

2. **Storage Optimizasyonu:**
   - ✅ Supabase Storage kullanılıyor (database'de base64 yok)
   - ✅ Sadece metadata (bucket, path, mimeType, size) database'de
   - ✅ Signed URL'ler ile güvenli erişim (1 saat TTL)
   - ✅ Otomatik image compression (1-2MB'a kadar)

3. **Query Optimizasyonu:**
   - ✅ List endpoint'lerinde receipt fileUrl'leri kaldırıldı
   - ✅ Cache headers (30 saniye)
   - ✅ Selective field loading (`select` kullanımı)

### ⚠️ Potansiyel Sorunlar

1. **Database Row Limits:**
   - **Mevcut:** Limit yok (PostgreSQL teorik limit: ~2.1 milyar row)
   - **Sorun:** Binlerce yat × yıllık binlerce expense = milyonlarca row
   - **Etki:** Query performansı düşebilir, index boyutları artabilir

2. **Storage Quota:**
   - **Mevcut:** Supabase plan limitleri (Free: 1GB, Pro: 100GB, Team: 1TB)
   - **Hesaplama:**
     - Ortalama receipt: 1-2MB (compress edilmiş)
     - 1000 yat × 100 expense/yıl × 2 receipt/expense = 200,000 receipt
     - 200,000 × 1.5MB = **300GB** (Pro plan limitini aşar)
   - **Sorun:** Storage quota aşılabilir

3. **Query Performance:**
   - **Mevcut:** Index'ler var ama yıllık veri artışı ile yavaşlayabilir
   - **Sorun:** `COUNT` query'leri yavaşlayabilir (pagination için)
   - **Etki:** List sayfaları yavaş açılabilir

4. **Archive/Cleanup Stratejisi Yok:**
   - **Mevcut:** Eski expense'ler silinmiyor (soft delete var ama archive yok)
   - **Sorun:** 5-10 yıllık veri birikebilir
   - **Etki:** Database ve storage büyümesi

## Öneriler

### 1. Archive Stratejisi (Öncelik: Yüksek)

**Hedef:** 2+ yıllık expense'leri archive et

**Implementasyon:**
```typescript
// lib/expense-archive.ts
export async function archiveOldExpenses(yachtId: string, olderThanYears: number = 2) {
  const cutoffDate = new Date();
  cutoffDate.setFullYear(cutoffDate.getFullYear() - olderThanYears);

  // 1. Archive expenses to separate table or S3
  // 2. Keep only metadata in main table
  // 3. Move receipts to cold storage (S3 Glacier veya Supabase Archive)
}
```

**Faydalar:**
- Database boyutu kontrol altında
- Active query'ler hızlı kalır
- Storage maliyeti düşer (cold storage daha ucuz)

### 2. Database Partitioning (Öncelik: Orta)

**Hedef:** Expense tablosunu yıl bazlı partition'lara böl

**Implementasyon:**
```sql
-- PostgreSQL Partitioning
CREATE TABLE expenses_2023 PARTITION OF expenses
  FOR VALUES FROM ('2023-01-01') TO ('2024-01-01');

CREATE TABLE expenses_2024 PARTITION OF expenses
  FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
```

**Faydalar:**
- Query performansı artar (sadece ilgili partition taranır)
- Index boyutları küçülür
- Maintenance kolaylaşır

### 3. Storage Monitoring & Alerts (Öncelik: Yüksek)

**Hedef:** Storage kullanımını izle ve uyar

**Implementasyon:**
```typescript
// lib/storage-monitor.ts
export async function checkStorageQuota(yachtId: string) {
  const receipts = await db.expenseReceipt.aggregate({
    where: {
      expense: { yachtId },
      deletedAt: null,
    },
    _sum: { fileSize: true },
  });

  const totalSizeGB = (receipts._sum.fileSize || 0) / (1024 * 1024 * 1024);
  
  if (totalSizeGB > 50) { // 50GB threshold
    // Send alert to admin
  }
}
```

### 4. Receipt Cleanup Job (Öncelik: Orta)

**Hedef:** Soft-deleted receipt'leri ve storage'dan sil

**Implementasyon:**
```typescript
// lib/receipt-cleanup.ts
export async function cleanupDeletedReceipts() {
  // 1. Find receipts deleted > 30 days ago
  // 2. Delete from Supabase Storage
  // 3. Hard delete from database
}
```

### 5. Lazy Loading for Receipts (Öncelik: Düşük)

**Hedef:** Receipt'leri sadece gerektiğinde yükle

**Mevcut Durum:** ✅ Zaten var (signed URL'ler ile)

### 6. Database Index Optimization (Öncelik: Orta)

**Mevcut Index'ler:**
```prisma
@@index([deletedAt])
@@index([yachtId, status, deletedAt])
@@index([yachtId, date, deletedAt])
@@index([createdByUserId, status])
@@index([isReimbursable, isReimbursed])
@@index([yachtId, isReimbursable, isReimbursed, deletedAt])
```

**Öneri:** Composite index'ler iyi, ama yıl bazlı query'ler için:
```prisma
@@index([yachtId, date, status, deletedAt]) // Date range queries için
```

## Kapasite Hesaplamaları

### Senaryo 1: Küçük Ölçek (10-50 Yat)
- **Expense/Yıl:** 50 yat × 100 expense = 5,000 expense/yıl
- **Receipt/Yıl:** 5,000 × 2 = 10,000 receipt/yıl
- **Storage/Yıl:** 10,000 × 1.5MB = 15GB/yıl
- **5 Yıl:** 75GB (Pro plan yeterli)
- **Sonuç:** ✅ Mevcut yapı yeterli

### Senaryo 2: Orta Ölçek (100-500 Yat)
- **Expense/Yıl:** 500 yat × 100 expense = 50,000 expense/yıl
- **Receipt/Yıl:** 50,000 × 2 = 100,000 receipt/yıl
- **Storage/Yıl:** 100,000 × 1.5MB = 150GB/yıl
- **5 Yıl:** 750GB (Team plan gerekli)
- **Sonuç:** ⚠️ Archive stratejisi gerekli

### Senaryo 3: Büyük Ölçek (1000+ Yat)
- **Expense/Yıl:** 1,000 yat × 100 expense = 100,000 expense/yıl
- **Receipt/Yıl:** 100,000 × 2 = 200,000 receipt/yıl
- **Storage/Yıl:** 200,000 × 1.5MB = 300GB/yıl
- **5 Yıl:** 1.5TB (Team plan limitini aşar)
- **Sonuç:** 🔴 Archive + Cold Storage gerekli

## Acil Aksiyonlar

1. **Storage Monitoring Ekle** (1-2 gün)
   - Storage kullanımını izle
   - Quota uyarıları ekle

2. **Archive Stratejisi Planla** (1 hafta)
   - 2+ yıllık verileri archive et
   - Cold storage entegrasyonu

3. **Database Partitioning** (2-3 gün)
   - Yıl bazlı partition'lar
   - Migration script'i

4. **Cleanup Job** (1 gün)
   - Soft-deleted receipt'leri temizle
   - Cron job ekle

## Uzun Vadeli Çözümler

1. **S3 Glacier veya Supabase Archive** entegrasyonu
2. **Read Replicas** (query performansı için)
3. **CDN** (signed URL'ler için)
4. **Data Warehouse** (analytics için)

## Sonuç

**Mevcut Durum:** ✅ Küçük-orta ölçek için yeterli  
**Büyük Ölçek İçin:** ⚠️ Archive ve monitoring gerekli  
**Kritik Eksikler:** Archive stratejisi, storage monitoring

**Önerilen Timeline:**
- **Hemen:** Storage monitoring
- **1 Ay İçinde:** Archive stratejisi
- **3 Ay İçinde:** Database partitioning
- **6 Ay İçinde:** Cold storage entegrasyonu

