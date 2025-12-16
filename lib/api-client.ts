/**
 * Offline-aware API client
 * Automatically queues requests when offline and syncs when online
 */

import { offlineQueue } from "./offline-queue";
import { offlineStorage } from "./offline-storage";

export interface ApiRequestOptions extends RequestInit {
  queueOnOffline?: boolean; // Queue request if offline (default: true)
  useCache?: boolean; // Use cache for GET requests (default: true for GET requests)
  cacheTTL?: number; // Cache TTL in milliseconds (default: 5 minutes)
  skipQueue?: boolean; // Skip queue even if offline (default: false)
  skipDeduplication?: boolean; // Skip request deduplication (default: false)
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
  private pendingRequests = new Map<string, Promise<ApiResponse<any>>>();

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
      useCache = undefined, // Auto-enable for GET requests
      cacheTTL = 300000, // 5 minutes default (reduced from 1 hour)
      skipQueue = false,
      skipDeduplication = false,
      ...fetchOptions
    } = options;

    const fullUrl = url.startsWith("http") ? url : `${this.baseURL}${url}`;
    const method = fetchOptions.method || "GET";
    const isGetRequest = method === "GET";
    // Auto-enable cache for GET requests unless explicitly disabled
    const shouldUseCache = useCache !== false && isGetRequest;

    // Request deduplication: if same request is already pending, return that promise
    const requestKey = skipDeduplication ? null : `${method}:${fullUrl}:${fetchOptions.body || ""}`;
    if (requestKey && this.pendingRequests.has(requestKey)) {
      return this.pendingRequests.get(requestKey)! as Promise<ApiResponse<T>>;
    }

    // Try cache first for GET requests
    if (isGetRequest && shouldUseCache) {
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

    // Create request promise
    const requestPromise = this.executeRequest<T>(fullUrl, {
      method,
      isGetRequest,
      shouldUseCache,
      cacheTTL,
      queueOnOffline,
      skipQueue,
      fetchOptions,
    });

    // Store pending request for deduplication
    if (requestKey) {
      this.pendingRequests.set(requestKey, requestPromise);
      requestPromise.finally(() => {
        this.pendingRequests.delete(requestKey);
      });
    }

    return requestPromise;
  }

  /**
   * Execute the actual request
   */
  private async executeRequest<T = any>(
    fullUrl: string,
    options: {
      method: string;
      isGetRequest: boolean;
      shouldUseCache: boolean;
      cacheTTL: number;
      queueOnOffline: boolean;
      skipQueue: boolean;
      fetchOptions: RequestInit;
    }
  ): Promise<ApiResponse<T>> {
    const {
      method,
      isGetRequest,
      shouldUseCache,
      cacheTTL,
      queueOnOffline,
      skipQueue,
      fetchOptions,
    } = options;

    // If online, try to make request (skipQueue only controls queuing fallback, not fetch)
    if (this.isOnline) {
      try {
        // Reduced timeout for mobile/slow networks: 8 seconds (was 15)
        const timeout = 8000;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
          // Ensure credentials are always included for NextAuth session
          const { credentials: _, ...restFetchOptions } = fetchOptions;
          const response = await fetch(fullUrl, {
            ...restFetchOptions,
            signal: controller.signal,
            credentials: "include", // Always include cookies for NextAuth session
            headers: {
              "Content-Type": "application/json",
              ...restFetchOptions.headers,
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
          if (isGetRequest && shouldUseCache && response.ok) {
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
          // Don't throw AbortError - it's expected when request is cancelled
          if (fetchError instanceof Error && fetchError.name === "AbortError") {
            // Silently handle abort - request was cancelled (timeout or component unmount)
            throw new Error("Request was cancelled");
          }
          throw fetchError;
        }
      } catch (error) {
        // Don't queue aborted requests
        if (error instanceof Error && error.message === "Request was cancelled") {
          throw error;
        }
        // Network error - check if we should queue
        if (!skipQueue && queueOnOffline && (method === "POST" || method === "PATCH" || method === "PUT" || method === "DELETE")) {
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

    // Offline - queue if enabled (skipQueue disables queuing)
    if (!skipQueue && queueOnOffline && (method === "POST" || method === "PATCH" || method === "PUT" || method === "DELETE")) {
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
    if (isGetRequest && shouldUseCache) {
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
