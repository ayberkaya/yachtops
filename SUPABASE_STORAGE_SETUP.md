# Supabase Storage Setup Guide

## Quick Setup

### 1. Install Dependencies

```bash
npm install @supabase/supabase-js
```

### 2. Environment Variables

Add to `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**Where to find these:**
1. Go to Supabase Dashboard → Your Project
2. Settings → API
3. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **Service Role Key** (secret!) → `SUPABASE_SERVICE_ROLE_KEY`

### 3. Run Database Migration

```bash
npx prisma migrate deploy
npx prisma generate
```

### 4. Create Buckets (Optional - Auto-created on first upload)

Buckets are created automatically on first file upload. Or create manually:

1. Supabase Dashboard → Storage
2. Create bucket for each:
   - `expense-receipts` (private)
   - `message-images` (private)
   - `vessel-documents` (private)
   - `crew-documents` (private)

### 5. Test

1. Upload a receipt → Check Supabase Storage dashboard
2. Access receipt via `/api/expenses/receipts/[id]` → Should redirect to signed URL
3. Verify signed URL works and expires after 1 hour

## Security Checklist

- ✅ `SUPABASE_SERVICE_ROLE_KEY` only in server-side code
- ✅ Never expose service role key to client
- ✅ All buckets are private
- ✅ Files require signed URLs (1 hour TTL)
- ✅ Access controlled by application permissions

## Troubleshooting

### Error: "SUPABASE_SERVICE_ROLE_KEY environment variable is not set"
- Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local`
- Restart dev server

### Error: "Failed to create bucket"
- Bucket might already exist (safe to ignore)
- Check Supabase dashboard → Storage
- Verify service role key has storage permissions

### Files not uploading
- Check Supabase Storage quotas (free plan: 1GB)
- Verify bucket exists and is accessible
- Check server logs for detailed errors

### Signed URLs not working
- Verify bucket is private (not public)
- Check service role key is correct
- Ensure file path is correct in database

