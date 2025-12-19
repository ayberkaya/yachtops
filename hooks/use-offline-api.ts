/**
 * React hook for offline-aware API calls
 * Provides easy-to-use API methods with automatic offline queue support
 */

import { useState, useCallback } from "react";
import { apiClient, ApiResponse, CancelledRequestError } from "@/lib/api-client";

export interface UseOfflineApiOptions {
  queueOnOffline?: boolean;
  useCache?: boolean;
  cacheTTL?: number;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
  onQueued?: () => void;
}

export interface UseOfflineApiReturn {
  // State
  isLoading: boolean;
  error: Error | null;
  isQueued: boolean;
  isOnline: boolean;

  // Methods
  get: <T = any>(url: string, options?: UseOfflineApiOptions) => Promise<T | null>;
  post: <T = any>(url: string, data?: any, options?: UseOfflineApiOptions) => Promise<T | null>;
  patch: <T = any>(url: string, data?: any, options?: UseOfflineApiOptions) => Promise<T | null>;
  put: <T = any>(url: string, data?: any, options?: UseOfflineApiOptions) => Promise<T | null>;
  delete: <T = any>(url: string, options?: UseOfflineApiOptions) => Promise<T | null>;
  request: <T = any>(url: string, options?: RequestInit & UseOfflineApiOptions) => Promise<T | null>;
  
  // Utilities
  reset: () => void;
  sync: () => Promise<void>;
}

export function useOfflineAPI(): UseOfflineApiReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isQueued, setIsQueued] = useState(false);

  const handleRequest = useCallback(
    async <T = any>(
      requestFn: () => Promise<ApiResponse<T>>,
      options: UseOfflineApiOptions = {}
    ): Promise<T | null> => {
      setIsLoading(true);
      setError(null);
      setIsQueued(false);

      try {
        const response = await requestFn();

        if (response.queued) {
          setIsQueued(true);
          options.onQueued?.();
          return null;
        }

        if (response.status >= 200 && response.status < 300) {
          options.onSuccess?.(response.data);
          return response.data;
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (err) {
        // Silently handle cancelled requests - they're expected
        if (err instanceof CancelledRequestError) {
          setIsLoading(false);
          return null;
        }
        
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        options.onError?.(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const get = useCallback(
    <T = any>(url: string, options: UseOfflineApiOptions = {}): Promise<T | null> => {
      return handleRequest(
        () => apiClient.get<T>(url, options),
        options
      );
    },
    [handleRequest]
  );

  const post = useCallback(
    <T = any>(url: string, data?: any, options: UseOfflineApiOptions = {}): Promise<T | null> => {
      return handleRequest(
        () => apiClient.post<T>(url, data, options),
        options
      );
    },
    [handleRequest]
  );

  const patch = useCallback(
    <T = any>(url: string, data?: any, options: UseOfflineApiOptions = {}): Promise<T | null> => {
      return handleRequest(
        () => apiClient.patch<T>(url, data, options),
        options
      );
    },
    [handleRequest]
  );

  const put = useCallback(
    <T = any>(url: string, data?: any, options: UseOfflineApiOptions = {}): Promise<T | null> => {
      return handleRequest(
        () => apiClient.put<T>(url, data, options),
        options
      );
    },
    [handleRequest]
  );

  const deleteMethod = useCallback(
    <T = any>(url: string, options: UseOfflineApiOptions = {}): Promise<T | null> => {
      return handleRequest(
        () => apiClient.delete<T>(url, options),
        options
      );
    },
    [handleRequest]
  );

  const request = useCallback(
    <T = any>(url: string, options: RequestInit & UseOfflineApiOptions = {}): Promise<T | null> => {
      const { onSuccess, onError, onQueued, ...apiOptions } = options;
      return handleRequest(
        () => apiClient.request<T>(url, apiOptions),
        { onSuccess, onError, onQueued }
      );
    },
    [handleRequest]
  );

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setIsQueued(false);
  }, []);

  const sync = useCallback(async () => {
    await apiClient.sync();
  }, []);

  return {
    isLoading,
    error,
    isQueued,
    isOnline: apiClient.isOnline,
    get,
    post,
    patch,
    put,
    delete: deleteMethod,
    request,
    reset,
    sync,
  };
}
