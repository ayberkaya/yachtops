import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔍 Finding test users (helmops.com and yachtops.com)...");

  // Find test users
  const testUsers = await prisma.user.findMany({
    where: {
      OR: [
        { email: { contains: "@helmops.com" } },
        { email: { contains: "@yachtops.com" } },
      ],
    },
    include: {
      yacht: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (testUsers.length === 0) {
    console.log("✅ No test users found!");
    return;
  }

  console.log(`\n📊 Found ${testUsers.length} test user(s):\n`);

  // Group by name to find duplicates
  const usersByName = new Map<string, typeof testUsers>();
  for (const user of testUsers) {
    const name = (user.name || "").toLowerCase().trim();
    if (!name) continue;
    
    if (!usersByName.has(name)) {
      usersByName.set(name, []);
    }
    usersByName.get(name)!.push(user);
  }

  // Find duplicates by name
  const duplicates: Array<{ name: string; users: typeof testUsers }> = [];
  for (const [name, users] of usersByName.entries()) {
    if (users.length > 1) {
      duplicates.push({ name, users });
    }
  }

  if (duplicates.length === 0) {
    console.log("✅ No duplicate names found among test users!");
    console.log("\nAll test users:");
    for (const user of testUsers) {
      console.log(
        `   - ${user.email} (${user.name || "N/A"}) - Yacht: ${user.yacht?.name || "N/A"} - Created: ${user.createdAt.toISOString()}`
      );
    }
    return;
  }

  console.log(`\n📧 Found ${duplicates.length} name(s) with duplicates:\n`);

  let totalToDelete = 0;
  const usersToDelete: string[] = [];

  for (const { name, users } of duplicates) {
    console.log(`👤 ${name} (${users.length} users):`);
    for (const user of users) {
      console.log(
        `   - ID: ${user.id}, Email: ${user.email}, Yacht: ${user.yacht?.name || "N/A"}, Created: ${user.createdAt.toISOString()}`
      );
    }

    // Keep the oldest user (first created), delete the rest
    const sortedUsers = [...users].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    );
    const keepUser = sortedUsers[0];
    const deleteUsers = sortedUsers.slice(1);

    console.log(`   ✅ Keeping: ${keepUser.id} (${keepUser.email} - created ${keepUser.createdAt.toISOString()})`);
    console.log(`   ❌ Deleting: ${deleteUsers.map((u) => `${u.email} (${u.id})`).join(", ")}\n`);

    totalToDelete += deleteUsers.length;
    usersToDelete.push(...deleteUsers.map((u) => u.id));
  }

  console.log(`\n📈 Summary:`);
  console.log(`   - Duplicate names: ${duplicates.length}`);
  console.log(`   - Users to delete: ${totalToDelete}`);
  console.log(`   - Total test users: ${testUsers.length}\n`);

  if (usersToDelete.length === 0) {
    console.log("✅ No users to delete!");
    return;
  }

  // Show what will be deleted
  console.log("⚠️  This will delete the following users:");
  for (const userId of usersToDelete) {
    const user = testUsers.find((u) => u.id === userId);
    if (user) {
      console.log(`   - ${user.email} (${user.name || "N/A"}) - ${user.yacht?.name || "N/A"}`);
    }
  }

  console.log("\n🚀 Starting cleanup...");

  // Delete duplicate users
  for (const userId of usersToDelete) {
    try {
      await prisma.user.delete({
        where: { id: userId },
      });
      console.log(`✅ Deleted user: ${userId}`);
    } catch (error: any) {
      console.error(`❌ Error deleting user ${userId}:`, error.message);
    }
  }

  console.log("\n✅ Cleanup completed!");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

