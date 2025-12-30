// Prisma config - Load .env file manually for CLI commands
import { defineConfig } from "prisma/config";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env file manually
try {
  const envPath = resolve(process.cwd(), ".env");
  const envFile = readFileSync(envPath, "utf-8");
  envFile.split("\n").forEach((line) => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
} catch (error) {
  // .env file not found, use existing process.env
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL || "",
    directUrl: process.env.DIRECT_URL || "",
  },
});
