/**
 * Simple in-memory cache for API responses
 * For production, consider using Redis or similar
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class APICache {
  private cache = new Map<string, CacheEntry<any>>();
  private defaultTTL = 60 * 1000; // 1 minute default

  set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  clear(): void {
    this.cache.clear();
  }

  delete(key: string): void {
    this.cache.delete(key);
  }
}

export const apiCache = new APICache();

/**
 * Generate cache key from request parameters
 */
export function generateCacheKey(
  baseKey: string,
  params: Record<string, any>
): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return `${baseKey}?${sortedParams}`;
}

