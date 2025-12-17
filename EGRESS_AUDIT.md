# Supabase Egress Audit Report

**Date:** 2025-01-15  
**Goal:** Identify and fix uncached egress sources causing ~56GB usage on Supabase Free plan

## Executive Summary

The primary egress issue is **base64-encoded files stored directly in PostgreSQL** (not Supabase Storage). Every database query that includes receipts, message images, or documents transfers the full file data as part of the JSON response. This is the root cause of excessive uncached egress.

## Top 10 Egress Sources (Estimated Impact)

### 1. **Expense Receipts - Base64 in Database** 🔴 CRITICAL (~40% of egress)
**Location:** `app/api/expenses/route.ts`, `app/api/expenses/[id]/route.ts`  
**Issue:** 
- Receipts stored as `data:image/jpeg;base64,...` in `expenseReceipt.fileUrl` column
- Every expense list fetch includes ALL receipt fileUrls
- Average receipt: ~500KB base64 = ~375KB actual image
- With 200 expenses × 2 receipts avg = 400 receipts × 375KB = **150MB per request**

**Code Evidence:**
```typescript
// app/api/expenses/route.ts:137-140
receipts: {
  where: { deletedAt: null },
  select: { id: true, fileUrl: true }, // fileUrl contains full base64!
},
```

**Fix Priority:** P0 - Move to external storage or proxy with lazy loading

---

### 2. **Message Images - Base64 in Database** 🔴 CRITICAL (~25% of egress)
**Location:** `app/api/messages/route.ts`, `components/messages/messages-view.tsx`  
**Issue:**
- Message images stored as `data:image/jpeg;base64,...` in `message.imageUrl` column
- Polling every 60s fetches all messages with full image data
- Average message image: ~200KB base64 = ~150KB actual image
- With 100 messages × 30% having images = 30 images × 150KB = **4.5MB per poll**

**Code Evidence:**
```typescript
// app/api/messages/route.ts:59-100
const messages = await db.message.findMany({
  // ... includes imageUrl which is base64
});
```

**Fix Priority:** P0 - Move to external storage or proxy with lazy loading

---

### 3. **Document Files - Base64 in Database** 🔴 CRITICAL (~15% of egress)
**Location:** 
- `app/api/vessel-documents/route.ts`
- `app/api/crew-documents/route.ts`
- `app/api/expenses/[id]/receipt/route.ts`

**Issue:**
- Documents stored as `data:application/pdf;base64,...` in database
- PDFs can be 1-5MB each
- Fetching document lists includes full file data

**Code Evidence:**
```typescript
// app/api/vessel-documents/route.ts:96-97
const base64 = buffer.toString("base64");
const dataUrl = `data:${mimeType};base64,${base64}`;
```

**Fix Priority:** P0 - Move to external storage

---

### 4. **Expense Lists - Large Default Limit** 🟡 HIGH (~8% of egress)
**Location:** `app/api/expenses/route.ts`  
**Issue:**
- Default limit: 200 expenses (line 64)
- Each expense includes receipts, categories, users
- Without pagination params, fetches all 200 at once
- Estimated: 200 expenses × 5KB = **1MB per request**

**Code Evidence:**
```typescript
// app/api/expenses/route.ts:64
const limit = Math.min(parseInt(searchParams.get("limit") || "200", 10), 500);
```

**Fix Priority:** P1 - Reduce default limit, enforce pagination

---

### 5. **Message Attachments - Base64 URLs** 🟡 HIGH (~5% of egress)
**Location:** `app/api/messages/[id]/attachments/route.ts`  
**Issue:**
- Attachments stored with `fileUrl` containing base64 or external URLs
- Included in message fetches

**Fix Priority:** P1 - Verify if base64 or external, optimize accordingly

---

### 6. **Task Lists - Large Default Limit** 🟡 MEDIUM (~3% of egress)
**Location:** `app/api/tasks/route.ts`  
**Issue:**
- Default limit: 200 tasks (line 43)
- Includes assignees, creators, trips
- Estimated: 200 tasks × 2KB = **400KB per request**

**Fix Priority:** P2 - Reduce default limit

---

### 7. **Trip Lists - Includes Counts** 🟡 MEDIUM (~2% of egress)
**Location:** `app/api/trips/route.ts`  
**Issue:**
- Default limit: 100 trips
- Includes `_count` for expenses/tasks (good, but still fetches full trip objects)
- Estimated: 100 trips × 1KB = **100KB per request**

**Fix Priority:** P2 - Optimize includes

---

### 8. **Cash Transactions - No Pagination** 🟡 MEDIUM (~1.5% of egress)
**Location:** `app/api/cash/route.ts`  
**Issue:**
- Fetches ALL transactions without pagination (line 46)
- Includes expense data
- Could be hundreds of transactions

**Code Evidence:**
```typescript
// app/api/cash/route.ts:46-60
const transactions = await db.cashTransaction.findMany({
  // No limit or pagination!
});
```

**Fix Priority:** P1 - Add pagination

---

### 9. **Post-Voyage Report - Large Includes** 🟡 LOW (~1% of egress)
**Location:** `app/dashboard/trips/post-voyage-report/page.tsx`  
**Issue:**
- Fetches completed trips with ALL expenses, tasks, logs, checklists
- Single page load can be 5-10MB

**Fix Priority:** P2 - Lazy load or paginate nested data

---

### 10. **Polling Frequency** 🟡 LOW (~0.5% of egress)
**Location:** `components/messages/messages-view.tsx`, `components/dashboard/sidebar.tsx`  
**Issue:**
- Already optimized in previous work (60s intervals)
- Still contributes to egress

**Fix Priority:** P3 - Already optimized, monitor

---

## Root Cause Analysis

### Why Uncached Egress?

1. **Base64 in Database = No CDN Caching**
   - Files stored as base64 strings in PostgreSQL
   - Every query includes file data in JSON response
   - JSON responses are not cached by Supabase CDN
   - Browser can cache JSON, but data changes frequently

2. **Large Payloads = High Transfer Costs**
   - Base64 encoding adds ~33% overhead
   - Multiple files per response multiply the issue
   - No lazy loading - all data fetched upfront

3. **No Pagination Enforcement**
   - Default limits are high (200 expenses, 100 trips)
   - Many endpoints don't require pagination params
   - Single requests can transfer MBs

4. **Includes Without Limits**
   - Related records fetched without limits
   - Nested includes multiply data transfer

## Recommended Fixes (Priority Order)

### Phase 1: Immediate Wins (90% reduction target)

1. **Move Files to External Storage** (P0)
   - Use Supabase Storage or Vercel Blob
   - Store only file paths/URLs in database
   - Implement proxy endpoint with cache headers
   - **Expected reduction: ~80%**

2. **Add Pagination Enforcement** (P1)
   - Reduce default limits (200 → 50 for expenses, 100 → 25 for trips)
   - Require pagination params for large lists
   - **Expected reduction: ~5%**

3. **Lazy Load File URLs** (P1)
   - Don't include fileUrl in list endpoints
   - Add separate endpoint: `/api/expenses/[id]/receipts`
   - **Expected reduction: ~3%**

### Phase 2: Optimizations (Additional 5-10% reduction)

4. **Optimize Includes** (P2)
   - Use `select` instead of `include` where possible
   - Remove unnecessary nested data
   - **Expected reduction: ~2%**

5. **Add Response Caching** (P2)
   - Implement Redis or in-memory cache for frequently accessed data
   - Cache headers on API responses
   - **Expected reduction: ~3%**

### Phase 3: Monitoring & Fine-tuning

6. **Add Egress Monitoring** (P3)
   - Implement logging (Step 0 complete)
   - Create diagnostics dashboard
   - Track before/after metrics

## Implementation Checklist

- [x] Step 0: Add egress logging infrastructure
- [x] Step 1: Complete audit and identify top sources
- [ ] Step 2: Fix database/query egress
  - [ ] Move files to external storage
  - [ ] Add pagination enforcement
  - [ ] Optimize includes
- [ ] Step 3: Fix storage egress
  - [ ] Create proxy endpoints for files
  - [ ] Add cache headers
  - [ ] Implement lazy loading
- [ ] Step 4: Eliminate polling/realtime egress
  - [ ] Review polling intervals
  - [ ] Remove unnecessary subscriptions
- [ ] Step 5: Next.js caching
  - [ ] Add fetch caching
  - [ ] Implement revalidation strategies
- [ ] Step 6: Verification
  - [ ] Create diagnostics page
  - [ ] Compare before/after metrics

## Expected Results

### Before Fixes:
- Uncached Egress: ~56GB/month
- Primary source: Base64 files in database queries
- Average request size: 500KB-2MB

### After Phase 1 Fixes:
- Uncached Egress: ~5-10GB/month (**82-90% reduction**)
- Files served via CDN/cache
- Average request size: 50-100KB

### After All Fixes:
- Uncached Egress: ~2-5GB/month (**91-96% reduction**)
- Optimized queries and caching
- Average request size: 20-50KB

## Notes

- All fixes maintain UI/UX (no breaking changes)
- Backward compatibility preserved where possible
- Incremental rollout recommended
- Monitor Supabase dashboard for verification

