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
        error: "Girdiğiniz bilgiler geçersiz. Lütfen kontrol edip tekrar deneyin.",
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
    // Always use user-friendly error messages
    const userFriendlyMessage = getUserFriendlyError(error);
    
    return NextResponse.json(
      {
        error: userFriendlyMessage,
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
      error: "Bir hata oluştu. Lütfen tekrar deneyin. Sorun devam ederse destek ekibimizle iletişime geçin.",
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
    return "Lütfen girdiğiniz bilgileri kontrol edip tekrar deneyin.";
  }

  if (error instanceof Error) {
    const errorMsg = error.message.toLowerCase();
    
    // Database errors
    if (errorMsg.includes("prisma") || errorMsg.includes("database") || errorMsg.includes("db")) {
      return "Veritabanı hatası oluştu. Lütfen tekrar deneyin.";
    }
    
    // Network errors
    if (errorMsg.includes("network") || errorMsg.includes("fetch") || errorMsg.includes("econnrefused")) {
      return "Bağlantı hatası. İnternet bağlantınızı kontrol edip tekrar deneyin.";
    }
    
    // Timeout errors
    if (errorMsg.includes("timeout") || errorMsg.includes("timed out")) {
      return "İstek zaman aşımına uğradı. Lütfen tekrar deneyin.";
    }
    
    // Authentication errors
    if (errorMsg.includes("unauthorized") || errorMsg.includes("401") || errorMsg.includes("authentication")) {
      return "Oturumunuz sona erdi. Lütfen tekrar giriş yapın.";
    }
    
    // Permission errors
    if (errorMsg.includes("forbidden") || errorMsg.includes("403") || errorMsg.includes("permission")) {
      return "Bu işlemi gerçekleştirmek için yetkiniz bulunmuyor.";
    }
    
    // Not found errors
    if (errorMsg.includes("not found") || errorMsg.includes("404")) {
      return "Aradığınız öğe bulunamadı.";
    }
    
    // Validation errors
    if (errorMsg.includes("validation") || errorMsg.includes("invalid")) {
      return "Girdiğiniz bilgiler geçersiz. Lütfen kontrol edip tekrar deneyin.";
    }
    
    // Unique constraint errors
    if (errorMsg.includes("unique") || errorMsg.includes("duplicate") || errorMsg.includes("already exists")) {
      return "Bu bilgi zaten kullanılıyor. Lütfen farklı bir değer deneyin.";
    }
    
    // Foreign key errors
    if (errorMsg.includes("foreign key") || errorMsg.includes("constraint")) {
      return "Bu işlem başka bir kayıtla ilişkili olduğu için gerçekleştirilemiyor.";
    }
    
    // JSON parsing errors
    if (errorMsg.includes("json") || errorMsg.includes("parse")) {
      return "Gönderilen veri geçersiz. Lütfen tekrar deneyin.";
    }
    
    // File upload errors
    if (errorMsg.includes("file") || errorMsg.includes("upload") || errorMsg.includes("size")) {
      return "Dosya yükleme hatası. Dosya boyutunu ve formatını kontrol edip tekrar deneyin.";
    }
    
    // Default - never show technical error messages
    return "Bir hata oluştu. Lütfen tekrar deneyin. Sorun devam ederse destek ekibimizle iletişime geçin.";
  }

  // Unknown error types
  return "Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin. Sorun devam ederse destek ekibimizle iletişime geçin.";
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
        recoveryAction: "Check your internet connection and try again.",
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

