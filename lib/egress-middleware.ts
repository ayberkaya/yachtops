/**
 * Middleware helper for logging API responses
 * Use this in API routes to log egress
 */

import { NextRequest, NextResponse } from "next/server";
import { egressLogger } from "./egress-logger";

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

/**
 * Wrap an API route handler to automatically log egress
 */
export function withEgressLogging<T = any>(
  handler: (request: NextRequest, ...args: any[]) => Promise<NextResponse<T>>
) {
  return async (request: NextRequest, ...args: any[]): Promise<NextResponse<T>> => {
    const route = request.nextUrl.pathname;
    const method = request.method;

    try {
      const response = await handler(request, ...args);

      // Log response if enabled
      if (egressLogger) {
        // Try to get content-length header
        const contentLength = response.headers.get('content-length');
        const contentLengthNum = contentLength ? parseInt(contentLength, 10) : undefined;

        // Clone response to read body without consuming it
        const clonedResponse = response.clone();
        try {
          const data = await clonedResponse.json();
          const estimatedBytes = estimateJsonSize(data);
          const recordCount = countRecords(data);

          egressLogger.logResponse({
            route,
            method,
            contentLength: contentLengthNum,
            estimatedBytes,
            recordCount,
            cacheHit: response.headers.get('x-cache') === 'HIT',
          });
        } catch {
          // If response is not JSON, estimate from content-length or skip
          if (contentLengthNum) {
            egressLogger.logResponse({
              route,
              method,
              contentLength: contentLengthNum,
              estimatedBytes: contentLengthNum,
            });
          }
        }
      }

      return response;
    } catch (error) {
      // Log error responses too
      if (egressLogger) {
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

