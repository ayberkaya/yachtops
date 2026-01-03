-- ============================================================================
-- Check Receipt File Sizes
-- ============================================================================
-- Bu script receipt'lerin file_size durumunu kontrol eder
-- ============================================================================

-- 1. Check how many receipts have NULL file_size
SELECT 
    COUNT(*) as "Total Receipts",
    COUNT(file_size) as "Receipts with file_size",
    COUNT(*) - COUNT(file_size) as "Receipts with NULL file_size",
    SUM(file_size) as "Total Size (bytes)",
    SUM(file_size) / (1024.0 * 1024.0) as "Total Size (MB)"
FROM expense_receipts
WHERE deleted_at IS NULL;

-- 2. Check receipts with storage but no file_size
SELECT 
    COUNT(*) as "Receipts with storage but NULL file_size"
FROM expense_receipts
WHERE deleted_at IS NULL
  AND storage_bucket IS NOT NULL
  AND storage_path IS NOT NULL
  AND file_size IS NULL;

-- 3. Sample receipts with storage but no file_size
SELECT 
    id,
    expense_id,
    storage_bucket,
    storage_path,
    file_size,
    uploaded_at
FROM expense_receipts
WHERE deleted_at IS NULL
  AND storage_bucket IS NOT NULL
  AND storage_path IS NOT NULL
  AND file_size IS NULL
LIMIT 10;

-- 4. Check receipts by yacht
SELECT 
    e.yacht_id,
    y.name as yacht_name,
    COUNT(er.id) as total_receipts,
    COUNT(er.file_size) as receipts_with_size,
    COUNT(er.id) - COUNT(er.file_size) as receipts_without_size,
    SUM(er.file_size) as total_size_bytes,
    SUM(er.file_size) / (1024.0 * 1024.0) as total_size_mb
FROM expense_receipts er
JOIN expenses e ON e.id = er.expense_id
JOIN yachts y ON y.id = e.yacht_id
WHERE er.deleted_at IS NULL
  AND e.deleted_at IS NULL
GROUP BY e.yacht_id, y.name
ORDER BY total_receipts DESC;

