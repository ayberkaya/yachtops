/**
 * Test Login Script
 * Simulates a login attempt to verify the authorize function works
 */

import { db } from "../lib/db";
import { verifyPassword } from "../lib/auth-server";

async function testLogin() {
  console.log("🧪 Testing Login Flow...\n");

  const testEmail = process.env.TEST_EMAIL || "owner@helmops.com";
  const testPassword = process.env.TEST_PASSWORD || "owner123";

  try {
    // Simulate the authorize function logic
    console.log(`1️⃣ Looking up user: ${testEmail}`);
    const user = await db.user.findUnique({
      where: { email: testEmail },
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

    if (!user) {
      console.log("   ❌ User not found");
      process.exit(1);
    }

    console.log(`   ✅ User found: ${user.email} (${user.username})`);
    console.log(`   Role: ${user.role}, Active: ${user.active}`);

    if (!user.active) {
      console.log("   ❌ User is inactive");
      process.exit(1);
    }

    console.log(`\n2️⃣ Verifying password...`);
    const isValid = await verifyPassword(testPassword, user.passwordHash);

    if (!isValid) {
      console.log("   ❌ Password verification failed");
      process.exit(1);
    }

    console.log("   ✅ Password verification successful");

    console.log(`\n3️⃣ Creating user object (as authorize function would)...`);
    const userObject = {
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      role: user.role,
      yachtId: user.yachtId,
      tenantId: user.yachtId,
      permissions: user.permissions,
      rememberMe: false,
    };

    console.log("   ✅ User object created successfully");
    console.log(`   User ID: ${userObject.id}`);
    console.log(`   Role: ${userObject.role}`);

    console.log("\n✅ Login test PASSED - authorize function would succeed!");
    console.log("\n💡 Next step: Test actual login in browser at http://localhost:3000/auth/signin");
    console.log(`   Use credentials: ${testEmail} / ${testPassword}`);

    await db.$disconnect();
  } catch (error) {
    console.error("\n❌ Login test FAILED:");
    console.error(error instanceof Error ? error.message : String(error));
    if (error instanceof Error) {
      console.error("Stack:", error.stack);
    }
    process.exit(1);
  }
}

testLogin();

