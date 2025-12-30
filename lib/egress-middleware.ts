/**
 * Middleware helper for logging API responses
 * Use this in API routes to log egress
 */

import { NextRequest, NextResponse } from "next/server";
import { egressLogger } from "./egress-logger";
import { getSession } from "./get-session";
import { dbUnscoped } from "./db";

/**
 * Estimate response size from JSON data
 */
function estimateJsonSize(data: any): number {
  try {
    const json = JSON.stringify(data);
    return new Blob([json]).size;
  } catch {
    return 0;
  }
}

/**
 * Count records in response (handles arrays and paginated responses)
 */
function countRecords(data: any): number {
  if (Array.isArray(data)) {
    return data.length;
  }
  if (data?.data && Array.isArray(data.data)) {
    return data.data.length;
  }
  if (data?.pagination?.total) {
    return data.pagination.total;
  }
  return 1; // Single object
}

function isEgressDebugEnabled(): boolean {
  return (
    process.env.EGRESS_DEBUG === "true" ||
    (process.env.NODE_ENV === "development" && process.env.EGRESS_DEBUG !== "false")
  );
}

function getEgressSampleRate(): number {
  const raw = process.env.EGRESS_SAMPLE_RATE ?? "0.1";
  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n)) return 0.1;
  return Math.min(1, Math.max(0, n));
}

/**
 * Wrap an API route handler to automatically log egress
 */
export function withEgressLogging<TArgs extends unknown[]>(
  handler: (request: NextRequest, ...args: TArgs) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: TArgs): Promise<NextResponse> => {
    const route = request.nextUrl.pathname;
    const method = request.method;

    try {
      const response = await handler(request, ...args);

      const persistEnabled = process.env.EGRESS_TRACKING === "true";
      const debugEnabled = isEgressDebugEnabled();

      // Avoid response cloning / JSON parsing unless debug/persist is enabled.
      if (debugEnabled || persistEnabled) {
        const contentLength = response.headers.get("content-length");
        const contentLengthNum = contentLength ? parseInt(contentLength, 10) : undefined;

        let estimatedBytes: number | undefined = contentLengthNum;
        let recordCount: number | undefined;

        // If we don't have content-length, try to estimate from JSON (best-effort).
        if (!estimatedBytes) {
          const clonedResponse = response.clone();
          try {
            const data = await clonedResponse.json();
            estimatedBytes = estimateJsonSize(data);
            recordCount = countRecords(data);
          } catch {
            // ignore
          }
        }

        // Dev/debug: log in-memory stats
        egressLogger.logResponse({
          route,
          method,
          contentLength: contentLengthNum,
          estimatedBytes,
          recordCount,
          cacheHit: response.headers.get("x-cache") === "HIT",
        });

        // Persist (sampled) into UsageEvent for observability across deployments.
        if (persistEnabled && Math.random() < getEgressSampleRate()) {
          try {
            const session = await getSession();
            const userId = session?.user?.id;
            if (userId) {
              await dbUnscoped.usageEvent.create({
                data: {
                  userId,
                  yachtId: session?.user?.yachtId ?? null,
                  eventType: "action",
                  page: route,
                  action: "egress",
                  metadata: {
                    method,
                    status: response.status,
                    bytes: estimatedBytes ?? null,
                    recordCount: recordCount ?? null,
                  },
                },
              });
            }
          } catch {
            // no-op
          }
        }
      }

      return response;
    } catch (error) {
      // Log error responses too
      if (isEgressDebugEnabled()) {
        egressLogger.logResponse({
          route,
          method,
          estimatedBytes: 0,
        });
      }
      throw error;
    }
  };
}

/**
 * Helper to log a Prisma query
 */
export function logPrismaQuery(options: {
  route: string;
  function: string;
  table: string;
  operation: string;
  selectFields?: string[];
  includeFields?: string[];
  limit?: number;
  skip?: number;
  recordCount?: number;
  estimatedBytes?: number;
}) {
  egressLogger.logQuery(options);
}

/**
 * Estimate bytes for a Prisma result
 * This is a rough estimate based on common field sizes
 */
export function estimatePrismaResultSize(
  records: any[],
  fields?: string[]
): number {
  if (!records || records.length === 0) return 0;

  // Rough estimate: average record size
  const sampleRecord = records[0];
  const sampleJson = JSON.stringify(sampleRecord);
  const avgRecordSize = new Blob([sampleJson]).size;
  
  return avgRecordSize * records.length;
}

