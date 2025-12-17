# Supabase Storage Implementation Report

**Date:** 2025-01-15  
**Status:** ✅ Completed

## Summary

Implemented external file storage using Supabase Storage to eliminate base64 file data from database queries. All file uploads now go to private Supabase Storage buckets, with only metadata (bucket, path, mimeType, size) stored in the database.

## Buckets Created/Used

The following Supabase Storage buckets are created automatically on first upload:

1. **`receipts`** - Receipt images for expenses
2. **`message-images`** - Images attached to messages
3. **`message-attachments`** - File attachments to messages (future use)
4. **`vessel-documents`** - Vessel-related documents (PDFs, etc.)
5. **`crew-documents`** - Crew member documents (PDFs, etc.)
6. **`maintenance-documents`** - Maintenance-related documents (reserved for future use)

All buckets are **private** (not publicly accessible) and require signed URLs for access.

## Endpoints Modified

### Upload Endpoints (Re-enabled with Supabase Storage)

1. **`POST /api/expenses/[id]/receipt`**
   - ✅ Uploads receipt images to `receipts` bucket
   - ✅ Stores `{bucket, path, mimeType, size}` in database
   - ✅ `fileUrl` set to `null` for new uploads

2. **`POST /api/messages`**
   - ✅ Uploads message images to `message-images` bucket
   - ✅ Stores `{imageBucket, imagePath, imageMimeType, imageSize}` in database
   - ✅ `imageUrl` set to `null` for new uploads

3. **`POST /api/messages/[id]/replies`**
   - ✅ Uploads reply images to `message-images` bucket
   - ✅ Stores `{imageBucket, imagePath, imageMimeType, imageSize}` in database
   - ✅ `imageUrl` set to `null` for new uploads

4. **`POST /api/vessel-documents`**
   - ✅ Uploads documents to `vessel-documents` bucket
   - ✅ Stores `{storageBucket, storagePath, mimeType, fileSize}` in database
   - ✅ `fileUrl` set to `null` for new uploads

5. **`POST /api/crew-documents`**
   - ✅ Uploads documents to `crew-documents` bucket
   - ✅ Stores `{storageBucket, storagePath, mimeType, fileSize}` in database
   - ✅ `fileUrl` set to `null` for new uploads

### File Serving Endpoints (Updated with Signed URLs)

1. **`GET /api/expenses/receipts/[id]`**
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

### List Endpoints (Already Updated in Step 2)

- ✅ `GET /api/expenses` - No `fileUrl` in receipts
- ✅ `GET /api/messages` - No `imageUrl` or `attachments[].fileUrl`
- ✅ `GET /api/vessel-documents` - No `fileUrl`
- ✅ `GET /api/crew-documents` - No `fileUrl`

## Database Schema Changes

### New Fields Added

**ExpenseReceipt:**
- `storageBucket` (String?, nullable)
- `storagePath` (String?, nullable)
- `mimeType` (String?, nullable)
- `fileSize` (Int?, nullable)
- `fileUrl` (now nullable for new uploads)

**Message:**
- `imageBucket` (String?, nullable)
- `imagePath` (String?, nullable)
- `imageMimeType` (String?, nullable)
- `imageSize` (Int?, nullable)
- `imageUrl` (already nullable)

**MessageAttachment:**
- `storageBucket` (String?, nullable)
- `storagePath` (String?, nullable)
- `fileUrl` (now nullable for new uploads)

**VesselDocument:**
- `storageBucket` (String?, nullable)
- `storagePath` (String?, nullable)
- `mimeType` (String?, nullable)
- `fileSize` (Int?, nullable)
- `fileUrl` (now nullable for new uploads)

**CrewDocument:**
- `storageBucket` (String?, nullable)
- `storagePath` (String?, nullable)
- `mimeType` (String?, nullable)
- `fileSize` (Int?, nullable)
- `fileUrl` (now nullable for new uploads)

### Migration

Migration file created: `prisma/migrations/20250115000005_add_storage_fields/migration.sql`

**To apply:**
```bash
npx prisma migrate deploy
# or
npx prisma db push
```

## Example Stored DB Row After Upload

### ExpenseReceipt Example

```json
{
  "id": "clx123abc",
  "expenseId": "clx456def",
  "fileUrl": null,
  "storageBucket": "receipts",
  "storagePath": "receipts/1736899200000-abc123-receipt_2024_01_15.jpg",
  "mimeType": "image/jpeg",
  "fileSize": 245760,
  "uploadedAt": "2025-01-15T12:00:00Z",
  "createdByUserId": "clx789ghi",
  "deletedAt": null
}
```

### Message Example (with image)

```json
{
  "id": "clx123abc",
  "channelId": "clx456def",
  "userId": "clx789ghi",
  "content": "Check out this photo!",
  "imageUrl": null,
  "imageBucket": "message-images",
  "imagePath": "message-images/1736899200000-xyz789-photo.jpg",
  "imageMimeType": "image/jpeg",
  "imageSize": 512000,
  "createdAt": "2025-01-15T12:00:00Z"
}
```

### VesselDocument Example

```json
{
  "id": "clx123abc",
  "yachtId": "clx456def",
  "title": "Insurance Certificate",
  "fileUrl": null,
  "storageBucket": "vessel-documents",
  "storagePath": "vessel-documents/1736899200000-def456-insurance_cert.pdf",
  "mimeType": "application/pdf",
  "fileSize": 1048576,
  "expiryDate": "2026-01-15T00:00:00Z",
  "createdAt": "2025-01-15T12:00:00Z"
}
```

## Caching Implementation

### Signed URL Caching

- **TTL:** 1 hour (3600 seconds)
- **Server-side memoization:** In-memory cache with 60-second buffer before expiry
- **Cache key:** `{bucket}/{path}`
- **Automatic invalidation:** Cache expires 60 seconds before signed URL expiry

### Cache Headers

File serving endpoints return:
- **Supabase Storage files:** Redirect to signed URL (handled by Supabase CDN)
- **Legacy base64 files:** `Cache-Control: public, max-age=31536000, immutable`

## Security

### Service Role Key

- ✅ `SUPABASE_SERVICE_ROLE_KEY` used **only** in server-side code
- ✅ Never exposed to client
- ✅ Used for:
  - Creating buckets (idempotent)
  - Uploading files
  - Generating signed URLs

### Bucket Security

- ✅ All buckets are **private** (not publicly accessible)
- ✅ Files require signed URLs for access
- ✅ Signed URLs expire after 1 hour
- ✅ Access controlled by application logic (tenant/user permissions)

## Environment Variables Required

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**Important:** 
- `NEXT_PUBLIC_SUPABASE_URL` can be public (used client-side for API calls)
- `SUPABASE_SERVICE_ROLE_KEY` must be kept secret (server-side only)

## Files Created

1. **`lib/supabase-storage.ts`** - Supabase Storage utility functions
2. **`lib/file-url-helper.ts`** - Helper for generating file URLs in API responses
3. **`app/api/messages/[id]/image/route.ts`** - Message image serving endpoint
4. **`app/api/vessel-documents/[id]/file/route.ts`** - Vessel document serving endpoint
5. **`app/api/crew-documents/[id]/file/route.ts`** - Crew document serving endpoint
6. **`prisma/migrations/20250115000005_add_storage_fields/migration.sql`** - Database migration

## Files Modified

1. **`prisma/schema.prisma`** - Added storage fields to models
2. **`package.json`** - Added `@supabase/supabase-js` dependency
3. **`app/api/expenses/[id]/receipt/route.ts`** - Upload to Supabase Storage
4. **`app/api/expenses/receipts/[id]/route.ts`** - Serve with signed URLs
5. **`app/api/messages/route.ts`** - Upload images to Supabase Storage
6. **`app/api/messages/[id]/replies/route.ts`** - Upload reply images to Supabase Storage
7. **`app/api/vessel-documents/route.ts`** - Upload to Supabase Storage
8. **`app/api/crew-documents/route.ts`** - Upload to Supabase Storage

## Next Steps

1. **Run Migration:**
   ```bash
   npx prisma migrate deploy
   npx prisma generate
   ```

2. **Set Environment Variables:**
   - Add `NEXT_PUBLIC_SUPABASE_URL` to `.env.local`
   - Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local` (and Vercel)

3. **Create Buckets in Supabase Dashboard (Optional):**
   - Buckets are created automatically on first upload
   - Or create manually in Supabase Dashboard → Storage

4. **Test File Uploads:**
   - Upload a receipt → Verify in Supabase Storage
   - Upload a message image → Verify in Supabase Storage
   - Upload a document → Verify in Supabase Storage

5. **Verify Signed URLs:**
   - Access files via serving endpoints
   - Verify signed URLs work and expire after 1 hour

## Expected Egress Reduction

- **Before:** Base64 files in every database query response
- **After:** Only metadata (bucket, path) in responses, files served via CDN
- **Expected:** 95-99% reduction in uncached egress for file-related queries

## Notes

- Legacy base64 data remains accessible via fallback logic
- New uploads automatically use Supabase Storage
- No data migration required (gradual migration as files are accessed)
- All changes are backward compatible

