"use client";

import { useState, useCallback } from "react";

interface UseRetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  onRetry?: (attempt: number) => void;
  onMaxRetriesReached?: () => void;
}

/**
 * Hook for retrying failed operations with exponential backoff
 */
export function useRetry<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: UseRetryOptions = {}
) {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    onRetry,
    onMaxRetriesReached,
  } = options;

  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [lastError, setLastError] = useState<Error | null>(null);

  const executeWithRetry = useCallback(
    async (...args: Parameters<T>): Promise<ReturnType<T> | null> => {
      let attempt = 0;
      setLastError(null);

      while (attempt <= maxRetries) {
        try {
          setIsRetrying(attempt > 0);
          const result = await fn(...args);
          setRetryCount(0);
          setIsRetrying(false);
          return result;
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          setLastError(err);

          if (attempt < maxRetries) {
            attempt++;
            setRetryCount(attempt);
            onRetry?.(attempt);

            // Exponential backoff: delay * 2^attempt
            const delay = retryDelay * Math.pow(2, attempt - 1);
            await new Promise((resolve) => setTimeout(resolve, delay));
          } else {
            setIsRetrying(false);
            onMaxRetriesReached?.();
            return null;
          }
        }
      }

      return null;
    },
    [fn, maxRetries, retryDelay, onRetry, onMaxRetriesReached]
  );

  const reset = useCallback(() => {
    setRetryCount(0);
    setLastError(null);
    setIsRetrying(false);
  }, []);

  return {
    executeWithRetry,
    isRetrying,
    retryCount,
    lastError,
    reset,
    canRetry: retryCount < maxRetries,
  };
}

