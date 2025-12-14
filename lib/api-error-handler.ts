/**
 * Standardized API error handling utilities
 * Ensures consistent error responses and user-friendly messages
 */

import { NextResponse } from "next/server";
import { z } from "zod";

export interface ApiErrorResponse {
  error: string;
  message?: string;
  details?: unknown;
  timestamp?: string;
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  error: unknown,
  defaultMessage: string = "An error occurred",
  status: number = 500
): NextResponse<ApiErrorResponse> {
  // Handle Zod validation errors
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      {
        error: "Invalid input",
        message: "The provided data is invalid",
        details: error.issues,
        timestamp: new Date().toISOString(),
      },
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Handle known Error instances
  if (error instanceof Error) {
    const isDevelopment = process.env.NODE_ENV === "development";
    
    return NextResponse.json(
      {
        error: status >= 500 ? "Internal server error" : defaultMessage,
        message: isDevelopment ? error.message : undefined,
        ...(isDevelopment && error.stack
          ? { details: { stack: error.stack } }
          : {}),
        timestamp: new Date().toISOString(),
      },
      {
        status,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Handle unknown error types
  return NextResponse.json(
    {
      error: "Internal server error",
      message: defaultMessage,
      timestamp: new Date().toISOString(),
    },
    {
      status: 500,
      headers: { "Content-Type": "application/json" },
    }
  );
}

/**
 * Wrap an API route handler with error handling
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: T
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await handler(...args);
    } catch (error) {
      console.error("API route error:", error);
      return createErrorResponse(error);
    }
  }) as T;
}

/**
 * Safe JSON parsing with error handling
 */
export async function safeJsonParse<T = unknown>(
  request: Request
): Promise<{ success: true; data: T } | { success: false; error: NextResponse }> {
  try {
    const data = await request.json();
    return { success: true, data: data as T };
  } catch (error) {
    return {
      success: false,
      error: NextResponse.json(
        {
          error: "Invalid request body",
          message: "The request body must be valid JSON",
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      ),
    };
  }
}

/**
 * Get user-friendly error message for client-side display
 */
export function getUserFriendlyError(error: unknown): string {
  if (error instanceof z.ZodError) {
    return "Please check your input and try again.";
  }

  if (error instanceof Error) {
    // Don't expose technical error messages in production
    if (process.env.NODE_ENV === "production") {
      // Map common error messages to user-friendly ones
      if (error.message.includes("network") || error.message.includes("fetch")) {
        return "Network error. Please check your connection and try again.";
      }
      if (error.message.includes("timeout")) {
        return "Request timed out. Please try again.";
      }
      if (error.message.includes("unauthorized") || error.message.includes("401")) {
        return "You are not authorized to perform this action.";
      }
      if (error.message.includes("forbidden") || error.message.includes("403")) {
        return "You don't have permission to perform this action.";
      }
      if (error.message.includes("not found") || error.message.includes("404")) {
        return "The requested resource was not found.";
      }
      return "An error occurred. Please try again.";
    }
    return error.message;
  }

  return "An unexpected error occurred. Please try again.";
}

