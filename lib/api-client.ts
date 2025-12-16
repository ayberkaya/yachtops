/**
 * Offline-aware API client
 * Automatically queues requests when offline and syncs when online
 */

import { offlineQueue } from "./offline-queue";
import { offlineStorage } from "./offline-storage";

export interface ApiRequestOptions extends RequestInit {
  queueOnOffline?: boolean; // Queue request if offline (default: true)
  useCache?: boolean; // Use cache for GET requests (default: false)
  cacheTTL?: number; // Cache TTL in milliseconds (default: 1 hour)
  skipQueue?: boolean; // Skip queue even if offline (default: false)
}

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Headers;
  fromCache?: boolean;
  queued?: boolean;
}

class ApiClient {
  private baseURL: string = "";

  /**
   * Set base URL
   */
  setBaseURL(url: string): void {
    this.baseURL = url;
  }

  /**
   * Check if online
   */
  get isOnline(): boolean {
    return offlineQueue.online;
  }

  /**
   * Get pending queue count
   */
  async getPendingCount(): Promise<number> {
    return offlineQueue.getPendingCount();
  }

  /**
   * Check if syncing
   */
  get isSyncing(): boolean {
    return offlineQueue.syncing;
  }

  /**
   * Generate cache key from URL and options
   */
  private getCacheKey(url: string, options: RequestInit): string {
    const method = options.method || "GET";
    const body = options.body ? JSON.stringify(options.body) : "";
    return `${method}:${url}:${body}`;
  }

  /**
   * Make API request
   */
  async request<T = any>(
    url: string,
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const {
      queueOnOffline = true,
      useCache = false,
      cacheTTL = 3600000, // 1 hour
      skipQueue = false,
      ...fetchOptions
    } = options;

    const fullUrl = url.startsWith("http") ? url : `${this.baseURL}${url}`;
    const method = fetchOptions.method || "GET";
    const isGetRequest = method === "GET";

    // Try cache first for GET requests
    if (isGetRequest && useCache) {
      const cacheKey = this.getCacheKey(fullUrl, fetchOptions);
      const cached = await offlineStorage.getCache<T>(cacheKey);
      if (cached) {
        return {
          data: cached,
          status: 200,
          statusText: "OK",
          headers: new Headers(),
          fromCache: true,
        };
      }
    }

    // If online, try to make request
    if (this.isOnline && !skipQueue) {
      try {
        // Add timeout to fetch requests (30 seconds default)
        const timeout = 30000;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
          const response = await fetch(fullUrl, {
            ...fetchOptions,
            signal: controller.signal,
            credentials: "include", // Include cookies for NextAuth session
            headers: {
              "Content-Type": "application/json",
              ...fetchOptions.headers,
            },
          });

          clearTimeout(timeoutId);

          // Check if response is ok
          if (!response.ok) {
            // Try to parse error response
            let errorData: any;
            try {
              const contentType = response.headers.get("content-type");
              if (contentType && contentType.includes("application/json")) {
                errorData = await response.json();
              } else {
                errorData = { error: response.statusText };
              }
            } catch {
              errorData = { error: response.statusText };
            }

            // Throw error with response data
            const error = new Error(errorData.message || errorData.error || `Request failed with status ${response.status}`);
            (error as any).status = response.status;
            (error as any).data = errorData;
            throw error;
          }

          const contentType = response.headers.get("content-type");
          let data: T;

          if (contentType && contentType.includes("application/json")) {
            data = await response.json();
          } else {
            data = (await response.text()) as any;
          }

          // Cache successful GET responses
          if (isGetRequest && useCache && response.ok) {
            const cacheKey = this.getCacheKey(fullUrl, fetchOptions);
            await offlineStorage.setCache(cacheKey, data, cacheTTL);
          }

          return {
            data,
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
          };
        } catch (fetchError) {
          clearTimeout(timeoutId);
          throw fetchError;
        }
      } catch (error) {
        // Network error - check if we should queue
        if (queueOnOffline && !skipQueue && (method === "POST" || method === "PATCH" || method === "PUT" || method === "DELETE")) {
          // Queue the request
          const headers: Record<string, string> = {};
          if (fetchOptions.headers) {
            Object.entries(fetchOptions.headers).forEach(([key, value]) => {
              headers[key] = String(value);
            });
          }

          const body = fetchOptions.body
            ? typeof fetchOptions.body === "string"
              ? fetchOptions.body
              : JSON.stringify(fetchOptions.body)
            : null;

          const queueId = await offlineQueue.enqueue(fullUrl, method, headers, body);

          return {
            data: null as any,
            status: 202, // Accepted
            statusText: "Queued",
            headers: new Headers(),
            queued: true,
          };
        }

        // Re-throw if not queued
        throw error;
      }
    }

    // Offline - queue if enabled
    if (queueOnOffline && !skipQueue && (method === "POST" || method === "PATCH" || method === "PUT" || method === "DELETE")) {
      const headers: Record<string, string> = {};
      if (fetchOptions.headers) {
        Object.entries(fetchOptions.headers).forEach(([key, value]) => {
          headers[key] = String(value);
        });
      }

      const body = fetchOptions.body
        ? typeof fetchOptions.body === "string"
          ? fetchOptions.body
          : JSON.stringify(fetchOptions.body)
        : null;

      const queueId = await offlineQueue.enqueue(fullUrl, method, headers, body);

      return {
        data: null as any,
        status: 202, // Accepted
        statusText: "Queued",
        headers: new Headers(),
        queued: true,
      };
    }

    // For GET requests when offline, try cache
    if (isGetRequest && useCache) {
      const cacheKey = this.getCacheKey(fullUrl, fetchOptions);
      const cached = await offlineStorage.getCache<T>(cacheKey);
      if (cached) {
        return {
          data: cached,
          status: 200,
          statusText: "OK (Cached)",
          headers: new Headers(),
          fromCache: true,
        };
      }
    }

    // No cache, offline, and can't queue - throw error
    throw new Error("Network request failed and no offline fallback available");
  }

  /**
   * GET request
   */
  async get<T = any>(url: string, options: ApiRequestOptions = {}): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...options, method: "GET" });
  }

  /**
   * POST request
   */
  async post<T = any>(
    url: string,
    data?: any,
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(url, {
      ...options,
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PATCH request
   */
  async patch<T = any>(
    url: string,
    data?: any,
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(url, {
      ...options,
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T = any>(
    url: string,
    data?: any,
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(url, {
      ...options,
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T = any>(url: string, options: ApiRequestOptions = {}): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...options, method: "DELETE" });
  }

  /**
   * Sync queue
   */
  async sync(options?: Parameters<typeof offlineQueue.sync>[0]): Promise<void> {
    return offlineQueue.sync(options);
  }

  /**
   * Subscribe to sync status changes
   */
  onSyncChange(listener: () => void): () => void {
    return offlineQueue.onSyncChange(listener);
  }
}

// Singleton instance
export const apiClient = new ApiClient();

// Set base URL if in browser
if (typeof window !== "undefined") {
  apiClient.setBaseURL("");
}
