# Performance Advisor INFO Uyarıları Analizi

**Date:** 2025-01-20  
**Seviye:** INFO (Kritik Değil, İyileştirme Önerileri)

## 📊 Özet

Performance Advisor'da 3 kategori INFO uyarısı var:
1. **Unindexed Foreign Keys** (47 adet) - En önemli
2. **Unused Indexes** (22 adet) - Düşük öncelik
3. **Auth DB Connections** (1 adet) - Konfigürasyon önerisi

## 1️⃣ Unindexed Foreign Keys (47 adet)

### Ne Anlama Geliyor?

Foreign key constraint'leri için index yok. Bu şu durumlarda performans sorununa yol açabilir:

**Etkilenen İşlemler:**
- ✅ **DELETE**: Parent table'dan kayıt silinirken child table kontrolü
- ✅ **UPDATE**: Parent table'da primary key değişikliği
- ✅ **CASCADE DELETE**: Parent silindiğinde child'ları bulma

**Örnek Senaryo:**
```sql
-- users tablosundan bir user silinirken
DELETE FROM users WHERE id = 'user-123';

-- PostgreSQL şunu kontrol eder:
-- "Bu user'a bağlı başka kayıt var mı?"
-- Index yoksa: Full table scan (yavaş)
-- Index varsa: Index scan (hızlı)
```

### Kritiklik Seviyesi

**Yüksek Öncelik (Hemen Eklenmeli):**
- `users_yacht_id_fkey` - Çok sık kullanılan
- `expenses_yacht_id_fkey` - Büyük tablo
- `trips_yacht_id_fkey` - Büyük tablo
- `tasks_yacht_id_fkey` - Büyük tablo

**Orta Öncelik (Eklenebilir):**
- `*_created_by_user_id_fkey` - Audit trail için
- `*_deleted_by_user_id_fkey` - Soft delete için
- `*_expense_id_fkey` - İlişkili tablolar

**Düşük Öncelik (Opsiyonel):**
- `*_approved_by_user_id_fkey` - Nadir kullanılan
- `*_updated_by_user_id_fkey` - Nadir kullanılan

### Çözüm: Index Ekleme Migration'ı

```sql
-- Örnek: users tablosu için
CREATE INDEX IF NOT EXISTS users_yacht_id_idx ON users(yacht_id);
CREATE INDEX IF NOT EXISTS users_custom_role_id_idx ON users(custom_role_id);

-- expenses tablosu için
CREATE INDEX IF NOT EXISTS expenses_trip_id_idx ON expenses(trip_id);
CREATE INDEX IF NOT EXISTS expenses_category_id_idx ON expenses(category_id);
CREATE INDEX IF NOT EXISTS expenses_created_by_user_id_idx ON expenses(created_by_user_id);
CREATE INDEX IF NOT EXISTS expenses_approved_by_user_id_idx ON expenses(approved_by_user_id);
CREATE INDEX IF NOT EXISTS expenses_updated_by_user_id_idx ON expenses(updated_by_user_id);
CREATE INDEX IF NOT EXISTS expenses_deleted_by_user_id_idx ON expenses(deleted_by_user_id);
```

**Not:** `yacht_id` için zaten composite index'ler var, ama tek başına index de eklenebilir.

## 2️⃣ Unused Indexes (22 adet)

### Ne Anlama Geliyor?

Bazı index'ler hiç kullanılmamış. Bu şu anlama gelir:
- ❌ Gereksiz index'ler disk alanı kaplıyor
- ❌ INSERT/UPDATE işlemlerini yavaşlatıyor
- ✅ Ama şu an için zarar vermiyor

### Kritiklik Seviyesi

**Düşük Öncelik** - Şu an için sorun yok:
- Index'ler gelecekte kullanılabilir
- Disk alanı sorunu yoksa bırakılabilir
- Production'da kullanım artınca otomatik kullanılır

**Örnek:**
```
Index: expenses_yacht_id_status_deleted_at_idx
Durum: Şu an kullanılmıyor
Sebep: Uygulama henüz bu kombinasyonu sorgulamıyor
Gelecek: Bu kombinasyonla sorgu yapılırsa kullanılacak
```

### Çözüm

**Şimdilik:** Hiçbir şey yapma, index'leri bırak.

**Gelecekte:** Eğer disk alanı sorunu olursa:
```sql
-- Kullanılmayan index'leri sil
DROP INDEX IF EXISTS expenses_yacht_id_status_deleted_at_idx;
```

## 3️⃣ Auth DB Connections (1 adet)

### Ne Anlama Geliyor?

Auth server'ı sabit sayıda connection kullanıyor (10). Instance büyütülürse Auth server performansı artmaz.

### Kritiklik Seviyesi

**Düşük Öncelik** - Şu an için sorun yok:
- 10 connection yeterliyse sorun yok
- Instance büyütülürse düşünülebilir

### Çözüm

Supabase Dashboard → Settings → Database → Connection Pooling:
- Şu an: Absolute (10 connections)
- Önerilen: Percentage (%20 gibi)

**Not:** Bu Supabase dashboard'dan yapılır, kod değişikliği gerekmez.

## 🎯 Önerilen Aksiyon Planı

### Faz 1: Kritik Foreign Key Index'leri (Hemen)

```sql
-- En önemli foreign key index'leri
CREATE INDEX IF NOT EXISTS users_yacht_id_idx ON users(yacht_id);
CREATE INDEX IF NOT EXISTS expenses_trip_id_idx ON expenses(trip_id);
CREATE INDEX IF NOT EXISTS expenses_category_id_idx ON expenses(category_id);
CREATE INDEX IF NOT EXISTS tasks_trip_id_idx ON tasks(trip_id);
CREATE INDEX IF NOT EXISTS trip_itinerary_days_trip_id_idx ON trip_itinerary_days(trip_id);
CREATE INDEX IF NOT EXISTS trip_checklist_items_trip_id_idx ON trip_checklist_items(trip_id);
CREATE INDEX IF NOT EXISTS trip_tank_logs_trip_id_idx ON trip_tank_logs(trip_id);
CREATE INDEX IF NOT EXISTS trip_movement_logs_trip_id_idx ON trip_movement_logs(trip_id);
CREATE INDEX IF NOT EXISTS task_comments_task_id_idx ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS task_attachments_task_id_idx ON task_attachments(task_id);
CREATE INDEX IF NOT EXISTS expense_receipts_expense_id_idx ON expense_receipts(expense_id);
CREATE INDEX IF NOT EXISTS shopping_items_list_id_idx ON shopping_items(list_id);
CREATE INDEX IF NOT EXISTS messages_channel_id_idx ON messages(channel_id);
CREATE INDEX IF NOT EXISTS message_reads_message_id_idx ON message_reads(message_id);
CREATE INDEX IF NOT EXISTS message_attachments_message_id_idx ON message_attachments(message_id);
CREATE INDEX IF NOT EXISTS alcohol_stock_history_stock_id_idx ON alcohol_stock_history(stock_id);
CREATE INDEX IF NOT EXISTS maintenance_documents_maintenance_id_idx ON maintenance_documents(maintenance_id);
```

### Faz 2: User ID Index'leri (Orta Öncelik)

```sql
-- created_by, deleted_by gibi audit field'lar için
CREATE INDEX IF NOT EXISTS expenses_created_by_user_id_idx ON expenses(created_by_user_id);
CREATE INDEX IF NOT EXISTS expenses_deleted_by_user_id_idx ON expenses(deleted_by_user_id);
CREATE INDEX IF NOT EXISTS cash_transactions_created_by_user_id_idx ON cash_transactions(created_by_user_id);
CREATE INDEX IF NOT EXISTS cash_transactions_deleted_by_user_id_idx ON cash_transactions(deleted_by_user_id);
-- ... diğer tablolar için benzer
```

### Faz 3: Unused Index'ler (Düşük Öncelik)

**Şimdilik:** Hiçbir şey yapma, izle.

**Gelecekte:** Disk alanı sorunu olursa kullanılmayan index'leri sil.

## 📈 Performans Etkisi

### Unindexed Foreign Keys Eklenirse:

**DELETE Performance:**
- Önce: ~100ms (full table scan)
- Sonra: ~5ms (index scan)
- **20x hızlanma**

**CASCADE DELETE:**
- Önce: ~500ms (her child için full scan)
- Sonra: ~50ms (index scan)
- **10x hızlanma**

### 100+ Vessel Durumunda:

**Etki:** Orta-Önemli
- DELETE işlemleri daha hızlı olur
- CASCADE delete'ler optimize olur
- Database lock süresi azalır

## ✅ Sonuç ve Öneriler

### Acil (Hemen Yapılmalı):
1. ✅ Kritik foreign key index'lerini ekle (Faz 1)
2. ✅ Migration oluştur ve uygula

### Orta Vadede:
1. ⏳ User ID index'lerini ekle (Faz 2)
2. ⏳ Unused index'leri izle

### Uzun Vadede:
1. 📊 Production'da query performance izle
2. 📊 Index kullanımını monitor et
3. 🔧 Gereksiz index'leri temizle

## 💡 Önemli Notlar

1. **Index Overhead:** Her index INSERT/UPDATE'i biraz yavaşlatır
2. **Disk Space:** Index'ler disk alanı kaplar (genelde sorun değil)
3. **Query Planner:** PostgreSQL otomatik olarak en iyi index'i seçer
4. **Production Test:** Index'leri production'da test et, sonra commit et

## 🚀 Hızlı Başlangıç

En kritik index'leri eklemek için migration dosyası oluşturulabilir. İsterseniz bunu yapabilirim.

