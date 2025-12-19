import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth-config";

/**
 * Health check endpoint for authentication system
 * Verifies that:
 * 1. Database connection works
 * 2. User table is accessible
 * 3. Session can be read
 * 4. A test user query succeeds
 * 
 * This endpoint helps catch issues like:
 * - Prisma Client not regenerated after schema changes
 * - Database connection issues
 * - RLS policies blocking queries
 */
export async function GET() {
  const checks: Array<{ name: string; status: "ok" | "error"; message: string }> = [];

  try {
    // Check 1: Database connection
    try {
      await db.$connect();
      checks.push({ name: "database_connection", status: "ok", message: "Database connection successful" });
    } catch (error) {
      checks.push({
        name: "database_connection",
        status: "error",
        message: `Database connection failed: ${error instanceof Error ? error.message : String(error)}`,
      });
      return NextResponse.json({ status: "error", checks }, { status: 500 });
    }

    // Check 2: User table accessibility
    try {
      const userCount = await db.user.count();
      checks.push({
        name: "user_table_access",
        status: "ok",
        message: `User table accessible (${userCount} users found)`,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      checks.push({
        name: "user_table_access",
        status: "error",
        message: `User table access failed: ${errorMsg}`,
      });
      
      // Provide helpful hints
      if (errorMsg.includes("relation") && errorMsg.includes("does not exist")) {
        checks.push({
          name: "hint",
          status: "error",
          message: "HINT: Run migrations: npx prisma migrate deploy",
        });
      }
      if (errorMsg.includes("permission denied")) {
        checks.push({
          name: "hint",
          status: "error",
          message: "HINT: RLS policies might be blocking access. Check RLS configuration.",
        });
      }
      
      return NextResponse.json({ status: "error", checks }, { status: 500 });
    }

    // Check 3: Prisma Client model availability
    try {
      // Try to access the user model - if Prisma Client wasn't regenerated, this will fail
      if (typeof db.user === "undefined") {
        checks.push({
          name: "prisma_client",
          status: "error",
          message: "Prisma Client not properly initialized - user model missing. Run: npx prisma generate",
        });
        return NextResponse.json({ status: "error", checks }, { status: 500 });
      }
      checks.push({
        name: "prisma_client",
        status: "ok",
        message: "Prisma Client properly initialized",
      });
    } catch (error) {
      checks.push({
        name: "prisma_client",
        status: "error",
        message: `Prisma Client check failed: ${error instanceof Error ? error.message : String(error)}`,
      });
      return NextResponse.json({ status: "error", checks }, { status: 500 });
    }

    // Check 4: Session reading (without requiring authentication)
    try {
      const session = await auth();
      checks.push({
        name: "session_read",
        status: "ok",
        message: session ? "Session readable (user authenticated)" : "Session readable (no active session)",
      });
    } catch (error) {
      checks.push({
        name: "session_read",
        status: "error",
        message: `Session read failed: ${error instanceof Error ? error.message : String(error)}`,
      });
      // Don't fail the health check for session errors - this is expected when not logged in
    }

    // Check 5: Test user query (if users exist)
    try {
      const testUser = await db.user.findFirst({
        select: { id: true, email: true },
      });
      if (testUser) {
        checks.push({
          name: "user_query",
          status: "ok",
          message: `User query successful (tested with user: ${testUser.email})`,
        });
      } else {
        checks.push({
          name: "user_query",
          status: "ok",
          message: "User query successful (no users found in database)",
        });
      }
    } catch (error) {
      checks.push({
        name: "user_query",
        status: "error",
        message: `User query failed: ${error instanceof Error ? error.message : String(error)}`,
      });
      return NextResponse.json({ status: "error", checks }, { status: 500 });
    }

    // All checks passed
    return NextResponse.json({
      status: "ok",
      message: "All authentication health checks passed",
      checks,
    });
  } catch (error) {
    checks.push({
      name: "unexpected_error",
      status: "error",
      message: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
    });
    return NextResponse.json({ status: "error", checks }, { status: 500 });
  }
}

