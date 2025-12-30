# Security & Architecture Audit Report
**Date:** 2025-01-21  
**Auditor:** Senior SaaS Architect & Security Specialist  
**Target:** Production-Ready B2B Yacht Management System

---

## Executive Summary

**VERDICT: ⚠️ NOT PRODUCTION-READY**

This codebase has **critical security vulnerabilities** that could lead to **data breaches** and **cross-tenant data leakage**. While there are good architectural foundations (offline support, file storage migration), the multi-tenancy security model is fundamentally broken due to a mismatch between authentication systems and RLS policies.

**Critical Issues:**
1. 🔴 **RLS policies use Supabase Auth (`auth.uid()`) but app uses NextAuth** - RLS is effectively disabled
2. 🔴 **Application-layer tenant filtering is the ONLY protection** - Single bug = data breach
3. 🟡 **No client-side image compression** - Storage abuse risk
4. 🟡 **Incomplete offline sync** - File uploads fail offline
5. 🟢 **Good database indexing** - Most foreign keys indexed

---

## 1. Security & Multi-Tenancy (CRITICAL FAILURES)

### 🔴 CRITICAL: RLS Policies Are Not Enforced

**Issue:** Your RLS policies use `auth.uid()` (Supabase Auth), but your application uses NextAuth. This means:

1. **RLS policies never execute** - They check `auth.uid()` which is NULL for NextAuth users
2. **Service role key bypasses RLS** - All database operations use service role key
3. **Application code is the ONLY security layer** - One bug = data breach

**Evidence:**
```typescript
// lib/db.ts - Uses Prisma with DATABASE_URL (service role)
export const db = globalForPrisma.prisma ?? createPrismaClient();

// lib/supabase-storage.ts - Uses service role key
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// RLS policies in migration.sql use auth.uid()
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (id = auth.uid()); -- This NEVER matches NextAuth users!
```

**Impact:**
- **User from Yacht A CAN read/write data for Yacht B** if application code has a bug
- **No defense-in-depth** - Database layer provides zero protection
- **Compliance risk** - GDPR violations if cross-tenant data leaks

**Current Protection (Application Layer Only):**
```typescript
// lib/tenant-guard.ts - This is your ONLY protection
export function withTenantScope(session: Session | null, baseWhere: T) {
  const tenantId = getTenantId(session);
  if (!tenantId) {
    throw new Error("Tenant ID required");
  }
  return { ...baseWhere, yachtId: tenantId };
}
```

**Risk Assessment:**
- **Likelihood:** HIGH - One missed `withTenantScope()` call = breach
- **Impact:** CRITICAL - Complete tenant data leakage
- **CVSS Score:** 9.1 (Critical)

---

### 🟡 MEDIUM: Inconsistent Tenant Guard Usage

**Issue:** Not all API routes consistently use `withTenantScope()`. While most routes use `resolveTenantOrResponse()`, there are edge cases:

**Evidence:**
```typescript
// app/api/expenses/route.ts - ✅ GOOD
const expenses = await db.expense.findMany({
  where: withTenantScope(scopedSession, baseWhere),
});

// But what if a developer forgets this pattern?
// No database-level enforcement to catch it!
```

**Recommendation:**
- Create a Prisma middleware that automatically adds `yachtId` filter
- Add ESLint rule to detect direct `db.*` calls without tenant scope
- Add runtime checks in development mode

---

### 🟡 MEDIUM: Admin Override Risk

**Issue:** Platform admins can access all data, but the scoping mechanism could be bypassed:

```typescript
// lib/api-tenant.ts
if (admin && requestedTenantId) {
  scopedSession = { ...session, user: { ...session.user, yachtId: tenantId } };
}
```

**Risk:** If admin session is compromised, attacker can access all tenants.

**Recommendation:**
- Require explicit `?tenantId=` parameter for admin operations
- Log all admin cross-tenant access
- Add IP whitelist for admin operations (optional)

---

## 2. Offline-First Architecture (PARTIAL IMPLEMENTATION)

### ✅ GOOD: Offline Queue Infrastructure

**Status:** Well-implemented offline queue system using IndexedDB.

**Evidence:**
- `lib/offline-queue.ts` - Comprehensive queue manager
- `lib/api-client.ts` - Automatic queuing on offline
- `lib/offline-storage.ts` - Persistent IndexedDB storage
- Service Worker background sync support

**Strengths:**
- ✅ Queue persists across app restarts
- ✅ Automatic sync on connection restore
- ✅ Retry mechanism with backoff
- ✅ UI indicators for offline/sync status

---

### 🔴 CRITICAL: File Uploads Fail Offline

**Issue:** File uploads (receipts, documents, images) cannot be queued offline. They require immediate network connection.

**Evidence:**
```typescript
// components/expenses/expense-form.tsx:216
if (receiptFiles.length > 0 && result?.id && !response.queued) {
  // Upload each receipt file - NO OFFLINE SUPPORT
  for (const file of receiptFiles) {
    const receiptResponse = await fetch(`/api/expenses/${result.id}/receipt`, {
      method: "POST",
      body: receiptFormData,
    });
  }
}
```

**Impact:**
- Users cannot upload receipts while offline
- Expense creation succeeds, but receipts are lost
- Poor UX for maritime environment (frequent offline periods)

**Recommendation:**
- Store files in IndexedDB when offline
- Queue file uploads separately
- Sync files when online (after expense is synced)

---

### 🟡 MEDIUM: Incomplete Component Migration

**Issue:** Not all components use `apiClient` for offline support.

**Evidence from OFFLINE-SYNC-VALIDATION.md:**
```
⚠️ Needs Migration:
- components/tasks/task-form.tsx - Uses direct fetch()
- components/expenses/pending-expenses-list.tsx - Uses direct fetch()
- components/inventory/alcohol-stock-view.tsx - Uses direct fetch()
- components/shifts/shift-management.tsx - Uses direct fetch()
```

**Impact:**
- These components fail when offline
- Inconsistent UX across the app

---

### 🟡 MEDIUM: No Optimistic Updates

**Issue:** UI doesn't show changes immediately when offline. Users must wait for sync.

**Recommendation:**
- Implement optimistic updates using TanStack Query
- Show local changes immediately
- Revert on sync failure

---

## 3. Storage & Performance (MODERATE ISSUES)

### 🟡 MEDIUM: No Client-Side Image Compression

**Issue:** Images are uploaded at full size without compression, leading to:
- Slow uploads on poor connections
- Storage abuse risk
- Higher costs

**Evidence:**
```typescript
// app/api/expenses/[id]/receipt/route.ts:74
storageMetadata = await uploadFile(
  STORAGE_BUCKETS.RECEIPTS,
  filePath,
  file, // Original file, no compression
  { contentType: file.type || 'image/jpeg' }
);
```

**Current Limits:**
- Images: 5MB max (file-upload-security.ts)
- Documents: 10MB max
- Storage bucket: 50MB max (supabase-storage.ts)

**Recommendation:**
- Use `browser-image-compression` library
- Compress images to max 1MB before upload
- Maintain quality for receipts (80-85% JPEG quality)

**Code Snippet:**
```typescript
import imageCompression from 'browser-image-compression';

async function compressImage(file: File): Promise<File> {
  const options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: 'image/jpeg',
    initialQuality: 0.85,
  };
  return await imageCompression(file, options);
}
```

---

### ✅ GOOD: File Validation

**Status:** Comprehensive file validation exists.

**Evidence:**
- `lib/file-upload-security.ts` - Validates size, MIME type, file name
- Path traversal protection
- File extension whitelist

**Strengths:**
- ✅ Size limits enforced
- ✅ MIME type validation
- ✅ Filename sanitization
- ✅ Path traversal prevention

---

### 🟡 MEDIUM: Storage Bucket Security

**Issue:** Buckets are created automatically if missing, but bucket policies aren't explicitly set.

**Evidence:**
```typescript
// lib/supabase-storage.ts:76
await supabase.storage.createBucket(bucket, {
  public: false, // ✅ Good - private buckets
  fileSizeLimit: 50 * 1024 * 1024,
});
```

**Recommendation:**
- Verify bucket policies in Supabase Dashboard
- Ensure RLS policies on storage buckets (if Supabase supports it)
- Add bucket existence check before upload (fail fast)

---

### ✅ GOOD: Signed URL Caching

**Status:** Signed URLs are cached to reduce API calls.

**Evidence:**
```typescript
// lib/supabase-storage.ts:149
const cached = signedUrlCache.get(cacheKey);
if (cached && cached.expiresAt > Date.now()) {
  return cached.url;
}
```

---

## 4. Database Optimization (MOSTLY GOOD)

### ✅ EXCELLENT: Foreign Key Indexes

**Status:** Comprehensive foreign key indexes added in migration `20250120000001_add_foreign_key_indexes`.

**Evidence:**
- 47 indexes added for foreign keys
- Covers all major relationships
- Improves DELETE/CASCADE performance

**Strengths:**
- ✅ All foreign keys indexed
- ✅ Composite indexes for common queries
- ✅ Performance indexes on frequently queried columns

---

### 🟡 MEDIUM: Potential N+1 Query Issues

**Issue:** Some queries use `include` with nested relations, which could cause N+1 problems.

**Evidence:**
```typescript
// app/api/expenses/route.ts:116
const expenses = await db.expense.findMany({
  include: {
    createdBy: { select: { id: true, name: true, email: true } },
    approvedBy: { select: { id: true, name: true, email: true } },
    category: { select: { id: true, name: true } },
    trip: { select: { id: true, name: true } },
    receipts: { where: { deletedAt: null }, select: { id: true } },
  },
});
```

**Analysis:**
- ✅ Uses `select` to limit fields (good)
- ✅ Single query with joins (no N+1 here)
- ⚠️ But if receipts are fetched separately later, N+1 could occur

**Recommendation:**
- Monitor query performance in production
- Use Prisma query logging to detect N+1
- Consider DataLoader pattern for batch loading

---

### ✅ GOOD: Pagination Enforced

**Status:** Pagination is enforced with reasonable defaults.

**Evidence:**
```typescript
// app/api/expenses/route.ts:57
const limit = Math.min(parseInt(searchParams.get("limit") || "25", 10), 100);
```

**Strengths:**
- ✅ Default limit: 25 (reasonable)
- ✅ Max limit: 100 (prevents abuse)
- ✅ Always returns paginated response

---

### 🟡 MEDIUM: Missing Indexes on Some Queries

**Issue:** Some query patterns might benefit from additional composite indexes.

**Recommendation:**
- Monitor slow queries in production
- Add indexes based on actual query patterns
- Consider partial indexes for soft-deleted items

**Example:**
```sql
-- If frequently querying active expenses by date
CREATE INDEX idx_expenses_yacht_status_date 
ON expenses(yacht_id, status, date) 
WHERE deleted_at IS NULL;
```

---

## Refactoring Plan

### Phase 1: CRITICAL Security Fixes (Week 1)

#### 1.1 Fix RLS Enforcement

**Option A: Migrate to Supabase Auth (RECOMMENDED)**
- Replace NextAuth with Supabase Auth
- Update all authentication flows
- RLS policies will work automatically
- **Effort:** 2-3 weeks
- **Risk:** Medium (requires testing all auth flows)

**Option B: Hybrid Approach (FASTER)**
- Keep NextAuth for UI/auth flows
- Sync user IDs to Supabase Auth (`auth.users` table)
- Use Supabase client with JWT for database queries
- RLS policies will work
- **Effort:** 1 week
- **Risk:** Low (minimal changes)

**Option C: Application-Level Enforcement (TEMPORARY)**
- Add Prisma middleware to enforce `yachtId` on all queries
- Add ESLint rules to detect unsafe queries
- Add runtime checks in development
- **Effort:** 2-3 days
- **Risk:** High (not true defense-in-depth)

**Recommendation:** Start with Option B (Hybrid), then migrate to Option A later.

#### 1.2 Add Prisma Middleware for Tenant Enforcement

```typescript
// lib/db.ts
db.$use(async (params, next) => {
  // Automatically add yachtId filter to all queries
  if (params.model && ['expense', 'task', 'trip', ...].includes(params.model)) {
    const session = await getSession();
    const tenantId = getTenantId(session);
    if (tenantId && !isPlatformAdmin(session)) {
      if (params.args.where) {
        params.args.where.yachtId = tenantId;
      } else {
        params.args.where = { yachtId: tenantId };
      }
    }
  }
  return next(params);
});
```

#### 1.3 Add ESLint Rule

```javascript
// eslint.config.mjs
rules: {
  'no-direct-db-access': 'error', // Custom rule to detect db.* calls without tenant scope
}
```

---

### Phase 2: Offline File Uploads (Week 2)

#### 2.1 Implement Offline File Storage

```typescript
// lib/offline-file-storage.ts
export async function storeFileOffline(file: File, expenseId: string): Promise<string> {
  const fileId = generateId();
  await offlineStorage.set(`file:${fileId}`, {
    file: await fileToArrayBuffer(file),
    expenseId,
    fileName: file.name,
    mimeType: file.type,
    timestamp: Date.now(),
  });
  return fileId;
}
```

#### 2.2 Queue File Uploads

```typescript
// lib/offline-queue.ts - Add file upload support
async enqueueFileUpload(fileId: string, expenseId: string): Promise<void> {
  await offlineStorage.addToQueue(
    `/api/expenses/${expenseId}/receipt`,
    'POST',
    { 'Content-Type': 'multipart/form-data' },
    { fileId } // Reference to IndexedDB file
  );
}
```

#### 2.3 Update Expense Form

```typescript
// components/expenses/expense-form.tsx
if (receiptFiles.length > 0) {
  if (offlineQueue.online) {
    // Upload immediately
  } else {
    // Store files offline, queue uploads
    for (const file of receiptFiles) {
      const fileId = await storeFileOffline(file, expense.id);
      await offlineQueue.enqueueFileUpload(fileId, expense.id);
    }
  }
}
```

---

### Phase 3: Image Compression (Week 2-3)

#### 3.1 Add Compression Library

```bash
npm install browser-image-compression
```

#### 3.2 Create Compression Utility

```typescript
// lib/image-compression.ts
import imageCompression from 'browser-image-compression';

export async function compressImage(file: File): Promise<File> {
  const options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: 'image/jpeg',
    initialQuality: 0.85,
  };
  
  try {
    return await imageCompression(file, options);
  } catch (error) {
    console.error('Image compression failed:', error);
    return file; // Fallback to original
  }
}
```

#### 3.3 Update Upload Components

```typescript
// components/expenses/expense-form.tsx
const compressedFiles = await Promise.all(
  receiptFiles.map(file => compressImage(file))
);
```

---

### Phase 4: Complete Offline Migration (Week 3-4)

#### 4.1 Migrate Remaining Components

- `components/tasks/task-form.tsx`
- `components/expenses/pending-expenses-list.tsx`
- `components/inventory/alcohol-stock-view.tsx`
- `components/shifts/shift-management.tsx`

#### 4.2 Add Optimistic Updates

```typescript
// Use TanStack Query with optimistic updates
const mutation = useMutation({
  mutationFn: createExpense,
  onMutate: async (newExpense) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['expenses'] });
    
    // Snapshot previous value
    const previous = queryClient.getQueryData(['expenses']);
    
    // Optimistically update
    queryClient.setQueryData(['expenses'], (old) => [...old, newExpense]);
    
    return { previous };
  },
  onError: (err, newExpense, context) => {
    // Rollback on error
    queryClient.setQueryData(['expenses'], context.previous);
  },
});
```

---

## Code Snippets for Critical Fixes

### RLS Policy Helper Function (For Hybrid Approach)

```sql
-- Create function to get user ID from NextAuth session
CREATE OR REPLACE FUNCTION get_user_id_from_session()
RETURNS UUID AS $$
DECLARE
  user_id UUID;
BEGIN
  -- Get user ID from JWT token or session
  -- This requires Supabase Auth integration
  SELECT id INTO user_id FROM auth.users 
  WHERE email = current_setting('app.current_user_email', true);
  
  RETURN user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS policies to use this function
CREATE POLICY "expenses_select_tenant" ON public.expenses
  FOR SELECT USING (
    yacht_id = (
      SELECT yacht_id FROM public.users 
      WHERE id = get_user_id_from_session()
    )
  );
```

### Prisma Middleware for Tenant Enforcement

```typescript
// lib/db.ts
import { Prisma } from '@prisma/client';
import { getSession } from './get-session';
import { getTenantId, isPlatformAdmin } from './tenant';

// Add middleware after Prisma client creation
db.$use(async (params, next) => {
  // Only apply to models with yachtId
  const tenantScopedModels = [
    'expense', 'task', 'trip', 'shoppingList', 'messageChannel',
    'alcoholStock', 'maintenanceLog', 'cashTransaction', 'crewDocument',
    'vesselDocument', 'marinaPermissionDocument', 'shift', 'leave',
    'customRole', 'product', 'shoppingStore', 'expenseCategory', 'creditCard'
  ];

  if (tenantScopedModels.includes(params.model || '')) {
    const session = await getSession();
    const isAdmin = isPlatformAdmin(session);
    const tenantId = getTenantId(session);

    // Enforce tenant scope for non-admin users
    if (!isAdmin && tenantId) {
      if (params.action === 'findMany' || params.action === 'findFirst' || params.action === 'count') {
        // Add yachtId to where clause
        if (params.args.where) {
          params.args.where.yachtId = tenantId;
        } else {
          params.args.where = { yachtId: tenantId };
        }
      } else if (params.action === 'create') {
        // Ensure yachtId is set
        if (!params.args.data.yachtId) {
          params.args.data.yachtId = tenantId;
        }
      } else if (params.action === 'update' || params.action === 'updateMany') {
        // Add yachtId to where clause
        if (params.args.where) {
          params.args.where.yachtId = tenantId;
        } else {
          params.args.where = { yachtId: tenantId };
        }
      } else if (params.action === 'delete' || params.action === 'deleteMany') {
        // Add yachtId to where clause
        if (params.args.where) {
          params.args.where.yachtId = tenantId;
        } else {
          params.args.where = { yachtId: tenantId };
        }
      }
    }
  }

  return next(params);
});
```

### Optimized Upload Component with Compression

```typescript
// components/expenses/receipt-upload.tsx
'use client';

import { useState } from 'react';
import { compressImage } from '@/lib/image-compression';
import { offlineQueue } from '@/lib/offline-queue';
import { storeFileOffline } from '@/lib/offline-file-storage';

export function ReceiptUpload({ expenseId }: { expenseId: string }) {
  const [uploading, setUploading] = useState(false);

  async function handleFileUpload(file: File) {
    setUploading(true);
    
    try {
      // Compress image
      const compressedFile = await compressImage(file);
      
      if (offlineQueue.online) {
        // Upload immediately
        const formData = new FormData();
        formData.append('file', compressedFile);
        
        const response = await fetch(`/api/expenses/${expenseId}/receipt`, {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) throw new Error('Upload failed');
      } else {
        // Store offline and queue
        const fileId = await storeFileOffline(compressedFile, expenseId);
        await offlineQueue.enqueueFileUpload(fileId, expenseId);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      // Show error to user
    } finally {
      setUploading(false);
    }
  }

  return (
    <input
      type="file"
      accept="image/*"
      onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) handleFileUpload(file);
      }}
      disabled={uploading}
    />
  );
}
```

---

## Testing Checklist

### Security Testing

- [ ] **Cross-Tenant Access Test**
  - Create User A (yacht-1) and User B (yacht-2)
  - As User A, try to access yacht-2 data via API
  - Verify 404/403 errors
  - Try direct database queries (should fail with RLS)

- [ ] **RLS Policy Test**
  - Connect as different users via Supabase client
  - Verify each user only sees their yacht's data
  - Test INSERT/UPDATE/DELETE operations

- [ ] **Admin Override Test**
  - As admin, verify can access all tenants
  - Verify admin operations are logged
  - Test admin cannot accidentally modify wrong tenant

### Offline Testing

- [ ] **Offline Expense Creation**
  - Disable network
  - Create expense with receipts
  - Verify expense is queued
  - Verify receipts are stored offline
  - Re-enable network
  - Verify sync succeeds

- [ ] **Offline File Upload**
  - Disable network
  - Upload receipt
  - Verify file is stored in IndexedDB
  - Re-enable network
  - Verify file uploads successfully

- [ ] **Sync Conflict Handling**
  - Create expense offline
  - Modify same expense from another device
  - Re-enable network
  - Verify conflict resolution

### Performance Testing

- [ ] **Image Compression**
  - Upload 5MB image
  - Verify compressed size < 1MB
  - Verify image quality is acceptable

- [ ] **Query Performance**
  - Test expense list with 1000+ expenses
  - Verify pagination works
  - Check query execution time < 100ms

- [ ] **N+1 Query Detection**
  - Enable Prisma query logging
  - Load expense list
  - Verify no N+1 queries

---

## Conclusion

**Current State:** The codebase has good foundations (offline infrastructure, file storage migration, database indexing) but **critical security vulnerabilities** that make it **NOT production-ready** for a paid B2B product.

**Primary Risk:** Cross-tenant data leakage due to RLS policies not being enforced.

**Recommended Action:** 
1. **IMMEDIATE:** Implement Prisma middleware for tenant enforcement (Phase 1.2)
2. **SHORT-TERM:** Migrate to hybrid auth approach (Phase 1.1 Option B)
3. **MEDIUM-TERM:** Complete offline file uploads (Phase 2)
4. **ONGOING:** Add image compression and complete component migration

**Timeline to Production-Ready:** 3-4 weeks with focused effort.

---

**Signed:**  
Senior SaaS Architect & Security Auditor  
*"Security is not a feature, it's a requirement."*

