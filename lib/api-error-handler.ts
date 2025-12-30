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
  canRetry?: boolean;
  recoveryAction?: string;
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
        error: "Some fields are invalid. Please review and try again.",
        canRetry: false,
        recoveryAction: "Fix the highlighted fields and submit again.",
        // Only include technical details in development mode
        ...(process.env.NODE_ENV === "development" && {
          message: "The provided data is invalid",
          details: error.issues,
        }),
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
    const reassuring = getReassuringError(error);
    
    return NextResponse.json(
      {
        error: reassuring.message || defaultMessage,
        canRetry: reassuring.canRetry,
        recoveryAction: reassuring.recoveryAction,
        // Only include technical details in development mode
        ...(process.env.NODE_ENV === "development" && {
          message: error.message,
          ...(error.stack && { details: { stack: error.stack } }),
        }),
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
      error: "Something went wrong. Please try again.",
      canRetry: true,
      recoveryAction: "Try again. If it keeps failing, contact support.",
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
          error: "Gönderilen veri geçersiz. Lütfen tekrar deneyin.",
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      ),
    };
  }
}

/**
 * Get user-friendly error message for client-side display
 * Always returns user-friendly messages, never technical details
 */
export function getUserFriendlyError(error: unknown): string {
  if (error instanceof z.ZodError) {
    return "Please check the fields and try again.";
  }

  if (error instanceof Error) {
    const errorMsg = error.message.toLowerCase();
    
    // Database errors
    if (errorMsg.includes("prisma") || errorMsg.includes("database") || errorMsg.includes("db")) {
      return "Database error. Please try again.";
    }
    
    // Network errors
    if (errorMsg.includes("network") || errorMsg.includes("fetch") || errorMsg.includes("econnrefused")) {
      return "Network error. Check your connection and try again.";
    }
    
    // Timeout errors
    if (errorMsg.includes("timeout") || errorMsg.includes("timed out")) {
      return "Request timed out. Please try again.";
    }
    
    // Authentication errors
    if (errorMsg.includes("unauthorized") || errorMsg.includes("401") || errorMsg.includes("authentication")) {
      return "Your session expired. Please sign in again.";
    }
    
    // Permission errors
    if (errorMsg.includes("forbidden") || errorMsg.includes("403") || errorMsg.includes("permission")) {
      return "You don’t have permission to do that.";
    }
    
    // Not found errors
    if (errorMsg.includes("not found") || errorMsg.includes("404")) {
      return "The requested item wasn’t found.";
    }
    
    // Validation errors
    if (errorMsg.includes("validation") || errorMsg.includes("invalid")) {
      return "Some fields are invalid. Please review and try again.";
    }
    
    // Unique constraint errors
    if (errorMsg.includes("unique") || errorMsg.includes("duplicate") || errorMsg.includes("already exists")) {
      return "That value is already in use. Please try a different one.";
    }
    
    // Foreign key errors
    if (errorMsg.includes("foreign key") || errorMsg.includes("constraint")) {
      return "This can’t be completed because it’s linked to another record.";
    }
    
    // JSON parsing errors
    if (errorMsg.includes("json") || errorMsg.includes("parse")) {
      return "Invalid request payload. Please try again.";
    }
    
    // File upload errors
    if (errorMsg.includes("file") || errorMsg.includes("upload") || errorMsg.includes("size")) {
      return "File upload failed. Check the file size/format and try again.";
    }
    
    // Default - never show technical error messages
    return "Something went wrong. Please try again.";
  }

  // Unknown error types
  return "Unexpected error. Please try again.";
}

/**
 * Get reassuring error message with recovery guidance
 */
export function getReassuringError(error: unknown, action?: string): {
  message: string;
  canRetry: boolean;
  recoveryAction?: string;
} {
  const baseMessage = getUserFriendlyError(error);
  
  if (error instanceof Error) {
    // Network errors - can retry
    if (error.message.includes("network") || error.message.includes("fetch") || error.message.includes("timeout")) {
      return {
        message: baseMessage,
        canRetry: true,
        recoveryAction: "Check your connection and try again.",
      };
    }
    
    // Auth errors - need to sign in
    if (error.message.includes("unauthorized") || error.message.includes("401")) {
      return {
        message: baseMessage,
        canRetry: false,
        recoveryAction: "Please sign in again to continue.",
      };
    }
    
    // Permission errors - cannot retry
    if (error.message.includes("forbidden") || error.message.includes("403")) {
      return {
        message: baseMessage,
        canRetry: false,
        recoveryAction: "Contact your administrator if you believe you should have access.",
      };
    }
  }
  
  // Default - can retry
  return {
    message: baseMessage,
    canRetry: true,
    recoveryAction: action ? `Try ${action} again.` : "Please try again.",
  };
}

