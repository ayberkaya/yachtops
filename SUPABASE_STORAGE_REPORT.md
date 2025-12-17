# Supabase Storage Implementation - Final Report

**Date:** 2025-01-15  
**Status:** ✅ Implementation Complete

## Executive Summary

Successfully implemented Supabase Storage for all file uploads, eliminating base64 file data from database queries. Files are now stored in private Supabase Storage buckets with only metadata (bucket, path, mimeType, size) stored in the database.

## Buckets Created/Used

The following Supabase Storage buckets are automatically created on first upload:

| Bucket Name | Purpose | Privacy |
|-------------|---------|---------|
| `receipts` | Receipt images for expenses | Private |
| `message-images` | Images attached to messages/replies | Private |
| `message-attachments` | File attachments to messages (reserved) | Private |
| `vessel-documents` | Vessel-related documents (PDFs, etc.) | Private |
| `crew-documents` | Crew member documents (PDFs, etc.) | Private |
| `maintenance-documents` | Maintenance documents (reserved) | Private |

**All buckets are private** - files require signed URLs for access (1 hour TTL).

## Endpoints Changed

### Upload Endpoints (5 endpoints)

1. **`POST /api/expenses/[id]/receipt`**
   - ✅ Uploads to `receipts` bucket
   - ✅ Stores: `{storageBucket, storagePath, mimeType, fileSize}`
   - ✅ `fileUrl` = `null` for new uploads

2. **`POST /api/messages`**
   - ✅ Uploads to `message-images` bucket
   - ✅ Stores: `{imageBucket, imagePath, imageMimeType, imageSize}`
   - ✅ `imageUrl` = `null` for new uploads

3. **`POST /api/messages/[id]/replies`**
   - ✅ Uploads to `message-images` bucket
   - ✅ Stores: `{imageBucket, imagePath, imageMimeType, imageSize}`
   - ✅ `imageUrl` = `null` for new uploads

4. **`POST /api/vessel-documents`**
   - ✅ Uploads to `vessel-documents` bucket
   - ✅ Stores: `{storageBucket, storagePath, mimeType, fileSize}`
   - ✅ `fileUrl` = `null` for new uploads

5. **`POST /api/crew-documents`**
   - ✅ Uploads to `crew-documents` bucket
   - ✅ Stores: `{storageBucket, storagePath, mimeType, fileSize}`
   - ✅ `fileUrl` = `null` for new uploads

### File Serving Endpoints (4 endpoints)

1. **`GET /api/expenses/receipts/[id]`** (Updated)
   - ✅ Generates signed URL if `storageBucket`/`storagePath` exist
   - ✅ Falls back to legacy `fileUrl` (base64) if present
   - ✅ 1 hour TTL with server-side caching

2. **`GET /api/messages/[id]/image`** (NEW)
   - ✅ Generates signed URL if `imageBucket`/`imagePath` exist
   - ✅ Falls back to legacy `imageUrl` (base64) if present
   - ✅ 1 hour TTL with server-side caching

3. **`GET /api/vessel-documents/[id]/file`** (NEW)
   - ✅ Generates signed URL if `storageBucket`/`storagePath` exist
   - ✅ Falls back to legacy `fileUrl` (base64) if present
   - ✅ 1 hour TTL with server-side caching

4. **`GET /api/crew-documents/[id]/file`** (NEW)
   - ✅ Generates signed URL if `storageBucket`/`storagePath` exist
   - ✅ Falls back to legacy `fileUrl` (base64) if present
   - ✅ 1 hour TTL with server-side caching

## Example Stored DB Row After Upload

### ExpenseReceipt

```json
{
  "id": "clx123abc456",
  "expenseId": "clx789def012",
  "fileUrl": null,
  "storageBucket": "receipts",
  "storagePath": "receipts/1736899200000-abc123-receipt_2024_01_15.jpg",
  "mimeType": "image/jpeg",
  "fileSize": 245760,
  "uploadedAt": "2025-01-15T12:00:00.000Z",
  "createdByUserId": "clx345ghi678",
  "deletedAt": null
}
```

**Key Points:**
- `fileUrl` is `null` (no base64)
- `storageBucket` = `"receipts"`
- `storagePath` = unique path with timestamp and random ID
- `mimeType` and `fileSize` stored for metadata

### Message (with image)

```json
{
  "id": "clx456jkl789",
  "channelId": "clx012mno345",
  "userId": "clx678pqr901",
  "content": "Check out this photo!",
  "imageUrl": null,
  "imageBucket": "message-images",
  "imagePath": "message-images/1736899200000-xyz789-photo.jpg",
  "imageMimeType": "image/jpeg",
  "imageSize": 512000,
  "createdAt": "2025-01-15T12:00:00.000Z"
}
```

**Key Points:**
- `imageUrl` is `null` (no base64)
- `imageBucket` = `"message-images"`
- `imagePath` = unique path
- Image metadata stored separately

### VesselDocument

```json
{
  "id": "clx789stu012",
  "yachtId": "clx345vwx678",
  "title": "Insurance Certificate 2025",
  "fileUrl": null,
  "storageBucket": "vessel-documents",
  "storagePath": "vessel-documents/1736899200000-def456-insurance_cert.pdf",
  "mimeType": "application/pdf",
  "fileSize": 1048576,
  "expiryDate": "2026-01-15T00:00:00.000Z",
  "createdAt": "2025-01-15T12:00:00.000Z"
}
```

## Caching Implementation

### Signed URL Caching

- **TTL:** 1 hour (3600 seconds)
- **Server-side memoization:** In-memory Map cache
- **Cache key format:** `{bucket}/{path}`
- **Expiry buffer:** 60 seconds before actual signed URL expiry
- **Automatic cleanup:** Cache entries expire naturally

**Example cache entry:**
```typescript
{
  "receipts/receipts/1736899200000-abc123-receipt.jpg": {
    url: "https://...supabase.co/storage/v1/object/sign/...",
    expiresAt: 1736902800000 // 1 hour - 60 seconds
  }
}
```

## Security Implementation

### Service Role Key Usage

- ✅ **ONLY** used in server-side code (`lib/supabase-storage.ts`)
- ✅ **NEVER** exposed to client
- ✅ Used for:
  - Creating buckets (idempotent operation)
  - Uploading files to private buckets
  - Generating signed URLs for file access

### File Access Control

- ✅ All buckets are **private** (not publicly accessible)
- ✅ Files require **signed URLs** for access
- ✅ Signed URLs expire after **1 hour**
- ✅ Access controlled by application logic:
  - Tenant isolation (yachtId checks)
  - User permissions
  - Channel membership (for messages)

## Files Created

1. **`lib/supabase-storage.ts`** (213 lines)
   - Supabase client initialization
   - File upload function
   - Signed URL generation with caching
   - File deletion helper
   - File existence check
   - Unique path generation

2. **`lib/file-url-helper.ts`** (67 lines)
   - Helper for generating file URLs in API responses
   - Returns signedUrl or {bucket, path} for client requests

3. **`app/api/messages/[id]/image/route.ts`** (NEW, 109 lines)
   - Lazy-loading endpoint for message images
   - Supports Supabase Storage and legacy base64

4. **`app/api/vessel-documents/[id]/file/route.ts`** (NEW, 105 lines)
   - Lazy-loading endpoint for vessel documents
   - Supports Supabase Storage and legacy base64

5. **`app/api/crew-documents/[id]/file/route.ts`** (NEW, 115 lines)
   - Lazy-loading endpoint for crew documents
   - Supports Supabase Storage and legacy base64

6. **`prisma/migrations/20250115000005_add_storage_fields/migration.sql`**
   - Adds storage fields to all file models
   - Creates indexes for storage lookups

## Files Modified

1. **`prisma/schema.prisma`**
   - Added storage fields to: ExpenseReceipt, Message, MessageAttachment, VesselDocument, CrewDocument
   - Made `fileUrl` nullable for new uploads

2. **`package.json`**
   - Added `@supabase/supabase-js: ^2.45.4`

3. **`app/api/expenses/[id]/receipt/route.ts`**
   - Uploads to Supabase Storage instead of base64
   - Stores metadata only

4. **`app/api/expenses/receipts/[id]/route.ts`**
   - Generates signed URLs with fallback to base64

5. **`app/api/messages/route.ts`**
   - Uploads images to Supabase Storage
   - Stores metadata only

6. **`app/api/messages/[id]/replies/route.ts`**
   - Uploads reply images to Supabase Storage
   - Stores metadata only

7. **`app/api/vessel-documents/route.ts`**
   - Uploads to Supabase Storage
   - Stores metadata only

8. **`app/api/crew-documents/route.ts`**
   - Uploads to Supabase Storage
   - Stores metadata only

## Environment Variables Required

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**Security Notes:**
- `NEXT_PUBLIC_SUPABASE_URL` - Can be public (used for API calls)
- `SUPABASE_SERVICE_ROLE_KEY` - **MUST BE SECRET** (server-side only)

## Migration Steps

1. **Install dependency:**
   ```bash
   npm install @supabase/supabase-js
   ```

2. **Set environment variables:**
   - Add to `.env.local` and Vercel

3. **Run database migration:**
   ```bash
   npx prisma migrate deploy
   npx prisma generate
   ```

4. **Verify buckets (optional):**
   - Buckets are auto-created on first upload
   - Or create manually in Supabase Dashboard → Storage

## Expected Egress Reduction

### Before Implementation:
- Expense list with receipts: ~150MB per request (200 expenses × 2 receipts × 375KB)
- Message list with images: ~4.5MB per request (100 messages × 30% images × 150KB)
- Document lists: ~5-10MB per list

### After Implementation:
- Expense list: ~50KB per request (only metadata, no file data)
- Message list: ~100KB per request (only metadata, no image data)
- Document lists: ~25KB per list (only metadata)

**Overall Reduction:** **99%+ for file-related queries**

## Testing Checklist

- [ ] Upload receipt → Verify in Supabase Storage dashboard
- [ ] Access receipt via `/api/expenses/receipts/[id]` → Should redirect to signed URL
- [ ] Verify signed URL works and expires after 1 hour
- [ ] Upload message image → Verify in Supabase Storage
- [ ] Access message image via `/api/messages/[id]/image` → Should redirect to signed URL
- [ ] Upload vessel document → Verify in Supabase Storage
- [ ] Access document via `/api/vessel-documents/[id]/file` → Should redirect to signed URL
- [ ] Verify legacy base64 files still work (fallback)
- [ ] Check server logs for any errors
- [ ] Verify signed URL caching (check cache hits in logs)

## Notes

- ✅ All changes are backward compatible
- ✅ Legacy base64 data remains accessible via fallback
- ✅ New uploads automatically use Supabase Storage
- ✅ No data migration required (gradual migration as files are accessed)
- ✅ Service role key is server-side only (never exposed to client)
- ✅ Signed URLs cached server-side to reduce Supabase API calls

## Next Steps

1. Monitor Supabase Storage usage in dashboard
2. Verify egress reduction in Supabase metrics
3. Consider migrating existing base64 data to storage (optional, future work)
4. Update frontend components to use lazy-loading endpoints (if not already done)

