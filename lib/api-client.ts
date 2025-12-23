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

/**
 * Special error class for cancelled requests
 * This error should be silently handled - it's expected when:
 * - Request timeout occurs
 * - Component unmounts before request completes
 * - User navigates away
 */
export class CancelledRequestError extends Error {
  constructor(message: string = "Request was cancelled") {
    super(message);
    this.name = "CancelledRequestError";
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CancelledRequestError);
    }
  }
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
            
            // Check if body is FormData - if so, don't set Content-Type (browser will set it with boundary)
            const isFormData = fetchOptions.body instanceof FormData;
            
            // Debug logging for receipt upload requests
            if (fullUrl.includes('/receipt')) {
              console.log('[Receipt Upload API Client] Request details:', {
                url: fullUrl,
                method,
                body: isFormData ? 'FormData' : (typeof fetchOptions.body === 'string' ? fetchOptions.body.substring(0, 200) : fetchOptions.body),
                bodyType: typeof fetchOptions.body,
                isFormData,
                bodyLength: typeof fetchOptions.body === 'string' ? fetchOptions.body.length : 'N/A',
                headers: restFetchOptions.headers,
              });
            }
            
            // Prepare headers - don't set Content-Type for FormData (browser handles it)
            // Convert headers to a plain object to ensure we can modify it
            const headers: Record<string, string> = {};
            
            // Copy existing headers
            if (restFetchOptions.headers) {
              if (restFetchOptions.headers instanceof Headers) {
                restFetchOptions.headers.forEach((value, key) => {
                  headers[key] = value;
                });
              } else if (Array.isArray(restFetchOptions.headers)) {
                restFetchOptions.headers.forEach(([key, value]) => {
                  headers[key] = value;
                });
              } else {
                Object.assign(headers, restFetchOptions.headers);
              }
            }
            
            // Only set Content-Type for non-FormData requests
            if (!isFormData) {
              headers["Content-Type"] = "application/json";
            }
            
            const response = await fetch(fullUrl, {
              ...restFetchOptions,
              signal: controller.signal,
              credentials: "include", // Always include cookies for NextAuth session
              headers,
            });

          clearTimeout(timeoutId);

          // Get response text first (can only be read once)
          const responseText = await response.text();
          const contentType = response.headers.get("content-type") || "";

          // Debug logging for receipt upload issues
          if (fullUrl.includes('/receipt')) {
            console.log('[Receipt Upload Debug]', {
              status: response.status,
              statusText: response.statusText,
              contentType,
              responseLength: responseText.length,
              responsePreview: responseText.substring(0, 100),
              responseFirstChars: Array.from(responseText.substring(0, 10)).map(c => `${c} (${c.charCodeAt(0)})`).join(', '),
            });
          }

          // Check if response is ok
          if (!response.ok) {
            // Try to parse error response
            let errorData: any;
            try {
              if (contentType.includes("application/json") && responseText && responseText.trim() !== '') {
                // Validate JSON before parsing
                const trimmed = responseText.trim();
                if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                  errorData = JSON.parse(trimmed);
                } else {
                  // Invalid JSON, use text as error message
                  errorData = { error: response.statusText, message: trimmed.substring(0, 200) };
                }
              } else {
                errorData = { error: response.statusText, message: responseText || 'No error message provided' };
              }
            } catch (parseError) {
              // JSON parse failed, use text as error message
              console.error('Error parsing error response:', parseError, 'Response text:', responseText);
              errorData = { 
                error: response.statusText || 'Request failed', 
                message: responseText ? responseText.substring(0, 200) : 'Invalid response format'
              };
            }

            // Throw error with response data
            const error = new Error(errorData.message || errorData.error || `Request failed with status ${response.status}`);
            (error as any).status = response.status;
            (error as any).data = errorData;
            throw error;
          }

          // Parse successful response
          let data: T;
          if (contentType.includes("application/json")) {
            // Handle empty response body
            if (!responseText || responseText.trim() === '') {
              data = {} as T;
            } else {
              try {
                const trimmed = responseText.trim();
                // Validate JSON format before parsing
                if (!trimmed.startsWith('{') && !trimmed.startsWith('[') && trimmed !== 'null') {
                  console.error('Invalid JSON response format. Expected object or array, got:', trimmed.substring(0, 100));
                  throw new Error(`Invalid JSON response: Response does not start with valid JSON token. Got: ${trimmed.substring(0, 50)}`);
                }
                data = JSON.parse(trimmed) as T;
              } catch (parseError) {
                // If JSON parsing fails, log the error and throw a more descriptive error
                console.error('JSON parse error:', parseError, 'Response text:', responseText);
                throw new Error(`Invalid JSON response: ${parseError instanceof Error ? parseError.message : String(parseError)}. Response: ${responseText.substring(0, 100)}`);
              }
            }
            
            // Instrument request (async to not block response)
            if (typeof window !== "undefined") {
              // Use setTimeout to avoid blocking
              setTimeout(() => {
                Promise.all([
                  import("./request-instrumentation").catch(() => null),
                  import("./egress-logger").catch(() => null),
                ]).then(([requestInstrumentationModule, egressLoggerModule]) => {
                  const estimatedSize = responseText.length;
                  const url = new URL(fullUrl);
                  
                  // Log to request instrumentation (existing)
                  if (requestInstrumentationModule?.requestInstrumentation) {
                    requestInstrumentationModule.requestInstrumentation.logRequest(
                      url.pathname,
                      method,
                      {
                        estimatedPayloadSize: estimatedSize,
                        operation: method,
                      }
                    );
                  }

                  // Log to egress logger (new, controlled by EGRESS_DEBUG)
                  if (egressLoggerModule?.egressLogger) {
                    try {
                      const data = JSON.parse(responseText);
                      const recordCount = Array.isArray(data) 
                        ? data.length 
                        : data?.data && Array.isArray(data.data)
                        ? data.data.length
                        : 1;
                      
                      egressLoggerModule.egressLogger.logResponse({
                        route: url.pathname,
                        method,
                        estimatedBytes: estimatedSize,
                        recordCount,
                      });
                    } catch {
                      // Not JSON, skip
                    }
                  }
                }).catch(() => {
                  // Silently fail if instrumentation fails
                });
              }, 0);
            }
          } else {
            // Non-JSON response, use text as-is
            data = responseText as any;
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
            throw new CancelledRequestError("Request was cancelled");
          }
          throw fetchError;
        }
      } catch (error) {
        // Don't queue aborted requests
        if (error instanceof CancelledRequestError) {
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
