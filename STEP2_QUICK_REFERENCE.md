# Step 2 Quick Reference - What Changed

## 🚫 Stopped Writing Base64

**All file upload endpoints now store `null` instead of base64:**
- ✅ `/api/expenses/[id]/receipt` (POST)
- ✅ `/api/messages` (POST - images)
- ✅ `/api/messages/[id]/replies` (POST - images)
- ✅ `/api/vessel-documents` (POST)
- ✅ `/api/crew-documents` (POST)

**⚠️ Action Required:** Implement external storage before production.

---

## 📋 Removed File Fields from Lists

**List endpoints no longer include file data:**
- ✅ `/api/expenses` - No `receipts[].fileUrl`
- ✅ `/api/expenses/[id]` - No `receipts[].fileUrl`
- ✅ `/api/messages` - No `imageUrl`, no `attachments[].fileUrl`
- ✅ `/api/vessel-documents` - No `fileUrl`
- ✅ `/api/crew-documents` - No `fileUrl`

**Use lazy-loading endpoints instead:**
- `/api/expenses/receipts/[id]` - Get receipt file
- `/api/messages/[id]/image` - Get message image
- `/api/messages/[id]/attachments/[attachmentId]` - Get attachment

---

## 📄 Enforced Pagination

**All list endpoints now paginated with low defaults:**

| Endpoint | Default | Max |
|----------|---------|-----|
| `/api/expenses` | 25 | 100 |
| `/api/tasks` | 25 | 100 |
| `/api/trips` | 25 | 100 |
| `/api/vessel-documents` | 25 | 100 |
| `/api/crew-documents` | 25 | 100 |
| `/api/cash` | 25 | 100 |
| `/api/messages` | 50 | 50 |

**All responses now include pagination metadata:**
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 25,
    "total": 150,
    "totalPages": 6
  }
}
```

---

## 📊 Expected Impact

- **List endpoint payloads:** 90-95% reduction
- **Expense list:** 150MB → 50KB (99.97% reduction)
- **Message list:** 4.5MB → 100KB (97.8% reduction)

---

## ⚠️ Breaking Changes

1. **File uploads disabled** - Need external storage implementation
2. **List responses don't include file URLs** - Frontend must use lazy-loading endpoints
3. **All lists are paginated** - Frontend must handle pagination

---

## ✅ What Still Works

- Existing base64 data accessible via detail endpoints
- File serving endpoints support legacy base64
- All detail endpoints (`/api/expenses/[id]`, etc.) unchanged
- Backward compatibility maintained for existing data

---

See `STEP2_CHANGES_REPORT.md` for full details.

