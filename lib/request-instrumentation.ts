/**
 * Request instrumentation for monitoring Supabase egress
 * Logs all API requests in development mode to identify bandwidth issues
 */

interface RequestLog {
  endpoint: string;
  method: string;
  timestamp: number;
  estimatedPayloadSize?: number;
  operation?: string;
  table?: string;
}

class RequestInstrumentation {
  private logs: RequestLog[] = [];
  private enabled = process.env.NODE_ENV === "development";
  private maxLogs = 1000;

  logRequest(
    endpoint: string,
    method: string,
    options?: {
      estimatedPayloadSize?: number;
      operation?: string;
      table?: string;
    }
  ) {
    if (!this.enabled) return;

    this.logs.push({
      endpoint,
      method,
      timestamp: Date.now(),
      estimatedPayloadSize: options?.estimatedPayloadSize,
      operation: options?.operation,
      table: options?.table,
    });

    // Keep only last N logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  getTopEndpoints(limit = 10): Array<{ endpoint: string; count: number; totalSize: number }> {
    const counts = new Map<string, { count: number; totalSize: number }>();

    for (const log of this.logs) {
      const key = `${log.method} ${log.endpoint}`;
      const existing = counts.get(key) || { count: 0, totalSize: 0 };
      counts.set(key, {
        count: existing.count + 1,
        totalSize: existing.totalSize + (log.estimatedPayloadSize || 0),
      });
    }

    return Array.from(counts.entries())
      .map(([endpoint, data]) => ({ endpoint, ...data }))
      .sort((a, b) => b.totalSize - a.totalSize)
      .slice(0, limit);
  }

  getTopTables(limit = 10): Array<{ table: string; count: number; totalSize: number }> {
    const counts = new Map<string, { count: number; totalSize: number }>();

    for (const log of this.logs) {
      if (!log.table) continue;
      const existing = counts.get(log.table) || { count: 0, totalSize: 0 };
      counts.set(log.table, {
        count: existing.count + 1,
        totalSize: existing.totalSize + (log.estimatedPayloadSize || 0),
      });
    }

    return Array.from(counts.entries())
      .map(([table, data]) => ({ table, ...data }))
      .sort((a, b) => b.totalSize - a.totalSize)
      .slice(0, limit);
  }

  getStats() {
    const totalRequests = this.logs.length;
    const totalSize = this.logs.reduce((sum, log) => sum + (log.estimatedPayloadSize || 0), 0);
    const uniqueEndpoints = new Set(this.logs.map((log) => `${log.method} ${log.endpoint}`)).size;

    return {
      totalRequests,
      totalSize,
      uniqueEndpoints,
      topEndpoints: this.getTopEndpoints(10),
      topTables: this.getTopTables(10),
    };
  }

  clear() {
    this.logs = [];
  }

  // Log to console in development
  logStats() {
    if (!this.enabled) return;

    const stats = this.getStats();
    console.group("📊 Request Statistics (Last 1000 requests)");
    console.log(`Total Requests: ${stats.totalRequests}`);
    console.log(`Estimated Total Size: ${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Unique Endpoints: ${stats.uniqueEndpoints}`);
    console.group("Top 5 Endpoints by Bandwidth:");
    stats.topEndpoints.slice(0, 5).forEach((item, idx) => {
      console.log(
        `${idx + 1}. ${item.endpoint}: ${item.count} requests, ${(item.totalSize / 1024 / 1024).toFixed(2)} MB`
      );
    });
    console.groupEnd();
    console.group("Top 5 Tables by Bandwidth:");
    stats.topTables.slice(0, 5).forEach((item, idx) => {
      console.log(
        `${idx + 1}. ${item.table}: ${item.count} requests, ${(item.totalSize / 1024 / 1024).toFixed(2)} MB`
      );
    });
    console.groupEnd();
    console.groupEnd();
  }
}

export const requestInstrumentation = new RequestInstrumentation();

// Auto-log stats every 5 minutes in development
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  setInterval(() => {
    requestInstrumentation.logStats();
  }, 5 * 60 * 1000);
}

