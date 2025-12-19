/**
 * Auth Diagnostic Script
 * Tests the login flow to identify failure points
 */

import { db } from "../lib/db";
import { verifyPassword } from "../lib/auth-server";
import { auth } from "../lib/auth-config";

async function diagnoseAuth() {
  console.log("🔍 Starting Auth Diagnostics...\n");

  // 1. Check environment variables
  console.log("1️⃣ Checking Environment Variables:");
  const requiredEnvVars = ["DATABASE_URL", "NEXTAUTH_SECRET", "NEXTAUTH_URL"];
  const missing: string[] = [];
  
  for (const key of requiredEnvVars) {
    const value = process.env[key];
    if (!value) {
      missing.push(key);
      console.log(`   ❌ ${key}: MISSING`);
    } else {
      const displayValue = key === "DATABASE_URL" 
        ? `${value.substring(0, 30)}...` 
        : key === "NEXTAUTH_SECRET"
        ? `${value.substring(0, 10)}... (${value.length} chars)`
        : value;
      console.log(`   ✅ ${key}: ${displayValue}`);
    }
  }

  if (missing.length > 0) {
    console.log(`\n❌ Missing required environment variables: ${missing.join(", ")}`);
    process.exit(1);
  }

  // 2. Test database connection
  console.log("\n2️⃣ Testing Database Connection:");
  try {
    await db.$connect();
    console.log("   ✅ Database connection successful");
  } catch (error) {
    console.log("   ❌ Database connection failed:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  // 3. Test User table access
  console.log("\n3️⃣ Testing User Table Access:");
  try {
    const userCount = await db.user.count();
    console.log(`   ✅ User table accessible (${userCount} users found)`);
    
    if (userCount === 0) {
      console.log("   ⚠️  WARNING: No users found in database!");
    }
  } catch (error) {
    console.log("   ❌ User table access failed:", error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.message.includes("relation") && error.message.includes("does not exist")) {
      console.log("   💡 HINT: User table might not exist. Run migrations: npx prisma migrate deploy");
    }
    if (error instanceof Error && error.message.includes("permission denied")) {
      console.log("   💡 HINT: RLS policies might be blocking access. Check RLS configuration.");
    }
    process.exit(1);
  }

  // 4. Test user lookup by email
  console.log("\n4️⃣ Testing User Lookup:");
  const testEmail = process.env.TEST_EMAIL || "owner@helmops.com";
  console.log(`   Testing with email: ${testEmail}`);
  
  try {
    const user = await db.user.findUnique({
      where: { email: testEmail },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        role: true,
        active: true,
        passwordHash: true,
      },
    });

    if (!user) {
      console.log("   ❌ User not found by email");
      console.log("   💡 HINT: User might not exist or RLS is blocking the query");
      
      // Try to find any user
      const anyUser = await db.user.findFirst({
        select: { email: true, username: true },
      });
      if (anyUser) {
        console.log(`   ℹ️  Found user in DB: ${anyUser.email} (but query by email failed - likely RLS issue)`);
      }
    } else {
      console.log(`   ✅ User found: ${user.email} (${user.username})`);
      console.log(`      Role: ${user.role}, Active: ${user.active}`);
    }
  } catch (error) {
    console.log("   ❌ User lookup failed:", error instanceof Error ? error.message : String(error));
    console.log("   Stack:", error instanceof Error ? error.stack : String(error));
    process.exit(1);
  }

  // 5. Test password verification (if user exists)
  console.log("\n5️⃣ Testing Password Verification:");
  try {
    const user = await db.user.findUnique({
      where: { email: testEmail },
      select: { passwordHash: true },
    });

    if (!user) {
      console.log("   ⚠️  Skipping (user not found)");
    } else {
      const testPassword = process.env.TEST_PASSWORD || "owner123";
      const isValid = await verifyPassword(testPassword, user.passwordHash);
      if (isValid) {
        console.log("   ✅ Password verification successful");
      } else {
        console.log("   ❌ Password verification failed");
        console.log("   💡 HINT: Password might be incorrect or hash format changed");
      }
    }
  } catch (error) {
    console.log("   ❌ Password verification test failed:", error instanceof Error ? error.message : String(error));
  }

  // 6. Test NextAuth authorize function
  console.log("\n6️⃣ Testing NextAuth Authorize Function:");
  try {
    // Simulate authorize call
    const testCredentials = {
      email: testEmail,
      password: process.env.TEST_PASSWORD || "owner123",
      rememberMe: "false",
    };

    // Import the authorize function logic
    const identifier = testCredentials.email;
    const user = await db.user.findUnique({
      where: { email: identifier },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        role: true,
        yachtId: true,
        passwordHash: true,
        permissions: true,
        active: true,
      },
    });

    const resolvedUser = user || await db.user.findUnique({
      where: { username: identifier },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        role: true,
        yachtId: true,
        passwordHash: true,
        permissions: true,
        active: true,
      },
    });

    if (!resolvedUser) {
      console.log("   ❌ User not found in authorize function");
    } else if (!resolvedUser.active) {
      console.log("   ❌ User is inactive");
    } else {
      const isValid = await verifyPassword(testCredentials.password, resolvedUser.passwordHash);
      if (isValid) {
        console.log("   ✅ Authorize function would succeed");
      } else {
        console.log("   ❌ Password invalid in authorize function");
      }
    }
  } catch (error) {
    console.log("   ❌ Authorize function test failed:", error instanceof Error ? error.message : String(error));
    console.log("   Stack:", error instanceof Error ? error.stack : String(error));
  }

  // 7. Check RLS status
  console.log("\n7️⃣ Checking RLS Status:");
  try {
    const rlsStatus = await db.$queryRaw<Array<{ schemaname: string; tablename: string; rowsecurity: boolean }>>`
      SELECT schemaname, tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' AND tablename = 'users'
    `;
    
    if (rlsStatus.length > 0) {
      const isEnabled = rlsStatus[0].rowsecurity;
      console.log(`   ${isEnabled ? "⚠️" : "✅"} RLS is ${isEnabled ? "ENABLED" : "DISABLED"} on users table`);
      if (isEnabled) {
        console.log("   💡 HINT: RLS is enabled. If policies use auth.uid() and you're using NextAuth,");
        console.log("      queries will fail. Check RLS policies or use service role key.");
      }
    } else {
      console.log("   ⚠️  Could not check RLS status (table might not exist)");
    }
  } catch (error) {
    console.log("   ⚠️  Could not check RLS status:", error instanceof Error ? error.message : String(error));
  }

  console.log("\n✅ Diagnostics complete!");
  await db.$disconnect();
}

diagnoseAuth().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

