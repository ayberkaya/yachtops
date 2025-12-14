import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Create Prisma Client with proper logging and error handling
const createPrismaClient = () => {
  try {
    // Validate DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      throw new Error(
        "DATABASE_URL environment variable is not set. Please configure your database connection."
      );
    }

    const client = new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
      // Don't fail on missing tables during initialization
      errorFormat: "pretty",
    });

    // Test connection on startup (non-blocking)
    client.$connect().catch((error) => {
      console.error("Failed to connect to database:", error);
      // Don't throw - let the app start and handle errors at runtime
    });

    return client;
  } catch (error) {
    console.error("Failed to create Prisma client:", error);
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

