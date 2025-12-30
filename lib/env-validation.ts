/**
 * Environment variable validation
 * Ensures required environment variables are present and valid
 */

interface EnvConfig {
  DATABASE_URL: string;
  DIRECT_URL?: string;
  NEXTAUTH_URL: string;
  NEXTAUTH_SECRET: string;
  SUPABASE_JWT_SECRET: string;
}

const requiredEnvVars: (keyof EnvConfig)[] = [
  "DATABASE_URL",
  "NEXTAUTH_URL",
  "NEXTAUTH_SECRET",
  "SUPABASE_JWT_SECRET",
];

/**
 * Validate required environment variables
 * Throws error if any are missing
 */
export function validateEnv(): void {
  const missing: string[] = [];

  for (const key of requiredEnvVars) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }

  // Validate DATABASE_URL format
  if (process.env.DATABASE_URL) {
    const ok =
      process.env.DATABASE_URL.startsWith("postgresql://") ||
      process.env.DATABASE_URL.startsWith("postgres://");
    if (!ok) {
      throw new Error("DATABASE_URL must be a PostgreSQL connection string (postgres:// or postgresql://).");
    }
  }

  // Validate NEXTAUTH_SECRET length (should be at least 32 characters)
  if (
    process.env.NEXTAUTH_SECRET &&
    process.env.NEXTAUTH_SECRET.length < 32
  ) {
    throw new Error("NEXTAUTH_SECRET must be at least 32 characters long.");
  }
}

/**
 * Get environment variable with fallback
 */
export function getEnv(key: keyof EnvConfig, fallback?: string): string {
  const value = process.env[key];
  if (!value) {
    if (fallback !== undefined) {
      return fallback;
    }
    throw new Error(`Environment variable ${key} is not set`);
  }
  return value;
}

/**
 * Check if we're in production
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * Check if we're in development
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === "development";
}

