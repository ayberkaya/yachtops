/**
 * Script to fix missing subscription data for existing users
 * This script updates plan_id, subscription_status, and trial_ends_at for users
 * who were created before the subscription fields were properly set
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

async function fixUserSubscription(userId: string, planName: string = "Essentials") {
  try {
    console.log(`🔧 Fixing subscription data for user: ${userId}`);
    
    // Step 1: Find the plan by name
    const planData = await prisma.$queryRaw<Array<{
      id: string;
      name: string;
    }>>`
      SELECT id, name
      FROM plans
      WHERE LOWER(name) = LOWER(${planName})
      LIMIT 1
    `;

    if (!planData || planData.length === 0) {
      console.error(`❌ Plan "${planName}" not found`);
      return false;
    }

    const planId = planData[0].id;
    console.log(`✅ Found plan: "${planData[0].name}" (ID: ${planId})`);

    // Step 2: Calculate trial end date (7 days from now)
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 7);

    // Step 3: Update user subscription fields
    const result = await prisma.$executeRaw`
      UPDATE users
      SET 
        plan_id = ${planId}::uuid,
        subscription_status = 'TRIAL',
        trial_ends_at = ${trialEndsAt.toISOString()}::timestamp with time zone
      WHERE id = ${userId}
    `;

    console.log(`✅ Updated subscription data for user ${userId}`);
    console.log(`   - Plan ID: ${planId}`);
    console.log(`   - Subscription Status: TRIAL`);
    console.log(`   - Trial Ends At: ${trialEndsAt.toISOString()}`);

    return true;
  } catch (error) {
    console.error(`❌ Error fixing subscription for user ${userId}:`, error);
    return false;
  }
}

async function main() {
  const userId = process.argv[2];
  const planName = process.argv[3] || "Essentials";

  if (!userId) {
    console.error("Usage: tsx scripts/fix-user-subscription.ts <userId> [planName]");
    console.error("Example: tsx scripts/fix-user-subscription.ts 76d3ca8b-2693-4909-bff2-f42f91ead9fb Essentials");
    process.exit(1);
  }

  try {
    const success = await fixUserSubscription(userId, planName);
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

