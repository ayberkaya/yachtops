/**
 * Comprehensive Supabase egress logging
 * Logs all database queries and API responses to identify egress sources
 * Controlled by EGRESS_DEBUG environment variable
 */

interface EgressLog {
  timestamp: number;
  type: 'query' | 'response' | 'storage';
  route?: string;
  function?: string;
  table?: string;
  operation?: string;
  selectFields?: string[];
  limit?: number;
  offset?: number;
  recordCount?: number;
  estimatedBytes?: number;
  contentLength?: number;
  bucket?: string;
  filePath?: string;
  cacheHit?: boolean;
}

class EgressLogger {
  private logs: EgressLog[] = [];
  private enabled: boolean;
  private maxLogs = 1000;
  private stats = new Map<string, { count: number; totalBytes: number }>();

  constructor() {
    // Enable if EGRESS_DEBUG env var is set OR in development mode
    this.enabled = 
      process.env.EGRESS_DEBUG === 'true' || 
      (process.env.NODE_ENV === 'development' && process.env.EGRESS_DEBUG !== 'false');
  }

  /**
   * Log a Prisma query
   */
  logQuery(options: {
    route?: string;
    function?: string;
    table: string;
    operation: string;
    selectFields?: string[];
    includeFields?: string[];
    limit?: number;
    skip?: number;
    recordCount?: number;
    estimatedBytes?: number;
  }) {
    if (!this.enabled) return;

    const log: EgressLog = {
      timestamp: Date.now(),
      type: 'query',
      route: options.route,
      function: options.function,
      table: options.table,
      operation: options.operation,
      selectFields: options.selectFields,
      limit: options.limit,
      offset: options.skip,
      recordCount: options.recordCount,
      estimatedBytes: options.estimatedBytes,
    };

    this.logs.push(log);
    this.updateStats(options.table, options.estimatedBytes || 0);

    // Keep only last N logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      const sizeStr = options.estimatedBytes 
        ? ` (~${(options.estimatedBytes / 1024).toFixed(1)}KB)` 
        : '';
      console.log(
        `[EGRESS] ${options.operation.toUpperCase()} ${options.table}${sizeStr}`,
        options.route ? `[${options.route}]` : '',
        options.limit ? `LIMIT ${options.limit}` : '',
        options.selectFields ? `SELECT ${options.selectFields.join(', ')}` : ''
      );
    }
  }

  /**
   * Log an API response
   */
  logResponse(options: {
    route: string;
    method: string;
    contentLength?: number;
    estimatedBytes?: number;
    recordCount?: number;
    cacheHit?: boolean;
  }) {
    if (!this.enabled) return;

    const log: EgressLog = {
      timestamp: Date.now(),
      type: 'response',
      route: `${options.method} ${options.route}`,
      contentLength: options.contentLength,
      estimatedBytes: options.estimatedBytes,
      recordCount: options.recordCount,
      cacheHit: options.cacheHit,
    };

    this.logs.push(log);
    this.updateStats(options.route, options.estimatedBytes || options.contentLength || 0);

    // Keep only last N logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      const sizeStr = (options.estimatedBytes || options.contentLength)
        ? ` (~${((options.estimatedBytes || options.contentLength || 0) / 1024).toFixed(1)}KB)` 
        : '';
      const cacheStr = options.cacheHit ? ' [CACHED]' : '';
      console.log(
        `[EGRESS] ${options.method} ${options.route}${sizeStr}${cacheStr}`,
        options.recordCount ? `(${options.recordCount} records)` : ''
      );
    }
  }

  /**
   * Log a storage operation
   */
  logStorage(options: {
    route?: string;
    function?: string;
    bucket: string;
    filePath: string;
    operation: 'getPublicUrl' | 'download' | 'createSignedUrl' | 'list' | 'upload';
    estimatedBytes?: number;
  }) {
    if (!this.enabled) return;

    const log: EgressLog = {
      timestamp: Date.now(),
      type: 'storage',
      route: options.route,
      function: options.function,
      bucket: options.bucket,
      filePath: options.filePath,
      operation: options.operation,
      estimatedBytes: options.estimatedBytes,
    };

    this.logs.push(log);
    this.updateStats(`storage:${options.bucket}`, options.estimatedBytes || 0);

    // Keep only last N logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      const sizeStr = options.estimatedBytes 
        ? ` (~${(options.estimatedBytes / 1024).toFixed(1)}KB)` 
        : '';
      console.log(
        `[EGRESS] STORAGE ${options.operation} ${options.bucket}/${options.filePath}${sizeStr}`,
        options.route ? `[${options.route}]` : ''
      );
    }
  }

  private updateStats(key: string, bytes: number) {
    const existing = this.stats.get(key) || { count: 0, totalBytes: 0 };
    this.stats.set(key, {
      count: existing.count + 1,
      totalBytes: existing.totalBytes + bytes,
    });
  }

  /**
   * Get top egress sources
   */
  getTopSources(limit = 10): Array<{ source: string; count: number; totalBytes: number }> {
    return Array.from(this.stats.entries())
      .map(([source, data]) => ({ source, ...data }))
      .sort((a, b) => b.totalBytes - a.totalBytes)
      .slice(0, limit);
  }

  /**
   * Get recent logs
   */
  getRecentLogs(limit = 50): EgressLog[] {
    return this.logs.slice(-limit);
  }

  /**
   * Get statistics
   */
  getStats() {
    const totalBytes = Array.from(this.stats.values()).reduce(
      (sum, stat) => sum + stat.totalBytes,
      0
    );
    const totalRequests = this.logs.length;

    return {
      totalRequests,
      totalBytes,
      totalBytesMB: (totalBytes / 1024 / 1024).toFixed(2),
      topSources: this.getTopSources(10),
      recentLogs: this.getRecentLogs(50),
    };
  }

  /**
   * Clear logs
   */
  clear() {
    this.logs = [];
    this.stats.clear();
  }
}

// Singleton instance
export const egressLogger = new EgressLogger();

