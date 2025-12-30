# Egress Logging Guide

## Overview

Comprehensive logging system for tracking Supabase egress. Logs all database queries and API responses to identify bandwidth issues.

## Environment Variables

### `EGRESS_DEBUG`
Controls whether egress logging is enabled.

- `true` - Always enabled (dev and production)
- `false` - Always disabled
- Unset - Enabled in development only

**Example:**
```bash
# .env.local
EGRESS_DEBUG=true
```

## Usage

### Server-Side (API Routes)

#### Automatic Logging (Recommended)

Use the `withEgressLogging` wrapper to automatically log all responses:

```typescript
import { withEgressLogging } from "@/lib/egress-middleware";
import { NextRequest, NextResponse } from "next/server";

export const GET = withEgressLogging(async (request: NextRequest) => {
  // Your handler code
  const data = await db.expense.findMany({ /* ... */ });
  return NextResponse.json(data);
});
```

#### Manual Logging

Log Prisma queries manually:

```typescript
import { logPrismaQuery, estimatePrismaResultSize } from "@/lib/egress-middleware";
import { egressLogger } from "@/lib/egress-logger";

export async function GET(request: NextRequest) {
  const route = request.nextUrl.pathname;
  
  const expenses = await db.expense.findMany({
    where: { yachtId },
    include: {
      receipts: { select: { id: true, fileUrl: true } },
    },
    take: 50,
  });

  // Log the query
  logPrismaQuery({
    route,
    function: "GET",
    table: "expense",
    operation: "findMany",
    selectFields: ["id", "amount", "description"],
    includeFields: ["receipts"],
    limit: 50,
    recordCount: expenses.length,
    estimatedBytes: estimatePrismaResultSize(expenses),
  });

  return NextResponse.json(expenses);
}
```

### Client-Side

Logging is automatic via `api-client.ts`. All API requests are logged when `EGRESS_DEBUG` is enabled.

## Viewing Logs

### Development Console

Logs automatically appear in the browser console (client-side) and server console (server-side) when `EGRESS_DEBUG=true` or in development mode.

**Example output:**
```
[EGRESS] GET /api/expenses (~1250.5KB)
[EGRESS] findMany expense (~1250.5KB) [/api/expenses] LIMIT 200 SELECT id, amount, description
```

### Programmatic Access

#### Server-Side

```typescript
import { egressLogger } from "@/lib/egress-logger";

// Get statistics
const stats = egressLogger.getStats();
console.log(`Total egress: ${stats.totalBytesMB} MB`);
console.log("Top sources:", stats.topSources);

// Get recent logs
const recentLogs = egressLogger.getRecentLogs(50);

// Get top sources
const topSources = egressLogger.getTopSources(10);
```

#### Client-Side

```typescript
// In browser console
import { egressLogger } from "@/lib/egress-logger";

egressLogger.getStats();
egressLogger.getTopSources(10);
egressLogger.getRecentLogs(50);
```

## Log Structure

### Query Log
```typescript
{
  timestamp: number;
  type: 'query';
  route?: string;
  function?: string;
  table: string;
  operation: string;
  selectFields?: string[];
  limit?: number;
  offset?: number;
  recordCount?: number;
  estimatedBytes?: number;
}
```

### Response Log
```typescript
{
  timestamp: number;
  type: 'response';
  route: string;
  contentLength?: number;
  estimatedBytes?: number;
  recordCount?: number;
  cacheHit?: boolean;
}
```

### Storage Log
```typescript
{
  timestamp: number;
  type: 'storage';
  route?: string;
  bucket: string;
  filePath: string;
  operation: 'getPublicUrl' | 'download' | 'createSignedUrl' | 'list' | 'upload';
  estimatedBytes?: number;
}
```

## Production Considerations

1. **Performance Impact**: Logging adds minimal overhead (~1-2ms per request)
2. **Memory Usage**: Logs are limited to last 1000 entries
3. **Privacy**: No sensitive data is logged (only sizes and metadata)
4. **Vercel Logs**: Server-side logs appear in Vercel function logs

## Diagnostics Page

A diagnostics page will be created in Step 6 to visualize egress data. For now, use the programmatic API above.

## Troubleshooting

### Logs Not Appearing

1. Check `EGRESS_DEBUG` environment variable
2. Verify you're in development mode (if `EGRESS_DEBUG` is unset)
3. Check browser/server console for errors
4. Ensure `egress-logger.ts` is imported correctly

### Performance Issues

If logging causes performance issues:
1. Set `EGRESS_DEBUG=false` temporarily
2. Reduce `maxLogs` in `egress-logger.ts`
3. Disable console logging in production

