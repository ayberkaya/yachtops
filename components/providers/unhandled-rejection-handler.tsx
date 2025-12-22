"use client";

import { useEffect } from "react";
import { CancelledRequestError } from "@/lib/api-client";

/**
 * Global handler for unhandled promise rejections
 * Filters out CancelledRequestError which is expected and should be silent
 */
export function UnhandledRejectionHandler() {
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason;

      // Silently handle CancelledRequestError - it's expected when:
      // - Request timeout occurs
      // - Component unmounts before request completes
      // - User navigates away
      if (
        error instanceof CancelledRequestError ||
        (error instanceof Error && error.name === "CancelledRequestError") ||
        (error instanceof Error && error.message === "Request was cancelled")
      ) {
        event.preventDefault(); // Prevent the error from being logged
        return;
      }

      // Also handle AbortError which might not be wrapped
      if (error instanceof Error && error.name === "AbortError") {
        event.preventDefault();
        return;
      }

      // Let other errors propagate normally
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  return null;
}

