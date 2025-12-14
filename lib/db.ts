import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Create Prisma Client with proper logging
const createPrismaClient = () => {
  try {
    return new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
      // Don't fail on missing tables during initialization
      errorFormat: "pretty",
    });
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

