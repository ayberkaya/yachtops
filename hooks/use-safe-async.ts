"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { getUserFriendlyError } from "@/lib/api-error-handler";

interface UseSafeAsyncOptions {
  onError?: (error: Error) => void;
  onSuccess?: () => void;
  showErrorToast?: boolean;
}

/**
 * Hook for safe async operations with loading and error states
 * Prevents memory leaks and handles errors gracefully
 */
export function useSafeAsync<T extends (...args: any[]) => Promise<any>>(
  asyncFn: T,
  options: UseSafeAsyncOptions = {}
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // Cancel any pending requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const execute = useCallback(
    async (...args: Parameters<T>): Promise<ReturnType<T> | null> => {
      // Cancel previous request if still pending
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller
      abortControllerRef.current = new AbortController();

      if (!mountedRef.current) {
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await asyncFn(...args);

        if (!mountedRef.current) {
          return null;
        }

        setLoading(false);
        options.onSuccess?.();
        return result;
      } catch (err) {
        if (!mountedRef.current) {
          return null;
        }

        // Don't set error if request was aborted or cancelled
        if (
          (err instanceof Error && err.name === "AbortError") ||
          (err instanceof Error && err.message === "Request was cancelled")
        ) {
          return null;
        }

        const errorMessage = getUserFriendlyError(err);
        setError(errorMessage);
        setLoading(false);

        if (options.onError) {
          options.onError(err instanceof Error ? err : new Error(String(err)));
        }

        return null;
      }
    },
    [asyncFn, options]
  );

  const reset = useCallback(() => {
    setError(null);
    setLoading(false);
  }, []);

  return {
    execute,
    loading,
    error,
    reset,
  };
}

