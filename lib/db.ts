import "server-only";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Create Prisma Client with proper logging and error handling
const createPrismaClient = () => {
  try {
    // Warn if DATABASE_URL is not set, but don't throw during module evaluation
    // This allows the app to start and fail gracefully when actually using the database
    if (!process.env.DATABASE_URL) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "⚠️  DATABASE_URL environment variable is not set."
        );
        console.warn(
          "   Please set DATABASE_URL in your .env file. The app will continue but database operations will fail."
        );
      }
    }

    // Create Prisma Client - it will handle DATABASE_URL validation internally
    // We don't validate here to avoid throwing during module evaluation
    const client = new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
      // Don't fail on missing tables during initialization
      errorFormat: "pretty",
    });

    // Test connection on startup (non-blocking)
    // Only test if DATABASE_URL is set
    if (process.env.DATABASE_URL) {
      client.$connect().catch((error) => {
        console.error("Failed to connect to database:", error);
        // Don't throw - let the app start and handle errors at runtime
      });
    }

    return client;
  } catch (error) {
    console.error("Failed to create Prisma client:", error);
    // In development, allow the app to continue even if Prisma fails to initialize
    // This prevents the entire app from crashing during development
    if (process.env.NODE_ENV === "development") {
      console.warn("Continuing without database connection in development mode.");
      // Return a minimal mock that will throw when used, but won't crash the app
      return new Proxy({} as any, {
        get: () => {
          throw new Error(
            "DATABASE_URL environment variable is not set. Please configure your database connection in .env file."
          );
        },
      });
    }
    throw error;
  }
};

// Use global instance in development to avoid multiple connections
// IMPORTANT: After running `prisma generate` or `prisma db push`, you MUST restart
// the Next.js dev server for schema changes to take effect. The global Prisma
// Client instance is cached and won't pick up changes until the server restarts.
if (process.env.NODE_ENV !== "production" && process.env.CLEAR_PRISMA_CACHE === "true") {
  globalForPrisma.prisma = undefined;
}

export const db =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = db;
  }
}

// Runtime validation: Ensure Prisma Client is properly initialized
// This catches cases where Prisma Client wasn't regenerated after schema changes
if (typeof db.user === "undefined") {
  const errorMsg = 
    "❌ [CRITICAL] Prisma Client is not properly initialized. " +
    "The 'user' model is missing. This usually happens when:\n" +
    "1. Prisma Client wasn't regenerated after schema changes (run: npx prisma generate)\n" +
    "2. Next.js server wasn't restarted after regenerating Prisma Client\n" +
    "3. There's a mismatch between schema.prisma and the generated client\n\n" +
    "Fix: Run 'npx prisma generate' and restart your Next.js server.";
  
  console.error(errorMsg);
  
  // In production, throw immediately to fail fast
  // In development, log warning but allow app to start (will fail on first DB query)
  if (process.env.NODE_ENV === "production") {
    throw new Error(errorMsg);
  }
}

