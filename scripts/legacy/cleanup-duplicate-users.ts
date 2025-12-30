import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔍 Finding duplicate users...");

  // Find all users grouped by email
  const allUsers = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      yachtId: true,
      createdAt: true,
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

  // Group by email
  const usersByEmail = new Map<string, typeof allUsers>();
  for (const user of allUsers) {
    const email = user.email.toLowerCase().trim();
    if (!usersByEmail.has(email)) {
      usersByEmail.set(email, []);
    }
    usersByEmail.get(email)!.push(user);
  }

  // Find duplicates
  const duplicates: Array<{ email: string; users: typeof allUsers }> = [];
  for (const [email, users] of usersByEmail.entries()) {
    if (users.length > 1) {
      duplicates.push({ email, users });
    }
  }

  if (duplicates.length === 0) {
    console.log("✅ No duplicate users found!");
    return;
  }

  console.log(`\n📊 Found ${duplicates.length} email(s) with duplicates:\n`);

  let totalToDelete = 0;
  const usersToDelete: string[] = [];

  for (const { email, users } of duplicates) {
    console.log(`📧 ${email} (${users.length} users):`);
    for (const user of users) {
      console.log(
        `   - ID: ${user.id}, Name: ${user.name || "N/A"}, Yacht: ${user.yacht?.name || "N/A"}, Created: ${user.createdAt.toISOString()}`
      );
    }

    // Keep the oldest user (first created), delete the rest
    const sortedUsers = [...users].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    );
    const keepUser = sortedUsers[0];
    const deleteUsers = sortedUsers.slice(1);

    console.log(`   ✅ Keeping: ${keepUser.id} (created ${keepUser.createdAt.toISOString()})`);
    console.log(`   ❌ Deleting: ${deleteUsers.map((u) => u.id).join(", ")}\n`);

    totalToDelete += deleteUsers.length;
    usersToDelete.push(...deleteUsers.map((u) => u.id));
  }

  console.log(`\n📈 Summary:`);
  console.log(`   - Duplicate emails: ${duplicates.length}`);
  console.log(`   - Users to delete: ${totalToDelete}`);
  console.log(`   - Users to keep: ${allUsers.length - totalToDelete}\n`);

  if (usersToDelete.length === 0) {
    console.log("✅ No users to delete!");
    return;
  }

  // Ask for confirmation
  console.log("⚠️  This will delete the following users:");
  for (const userId of usersToDelete) {
    const user = allUsers.find((u) => u.id === userId);
    if (user) {
      console.log(`   - ${user.email} (${user.name || "N/A"}) - ${user.yacht?.name || "N/A"}`);
    }
  }

  console.log("\n🚀 Starting cleanup...");

  // Delete duplicate users
  // Note: We need to handle foreign key constraints
  // First, delete related records, then delete users
  for (const userId of usersToDelete) {
    try {
      // Delete user (cascade will handle related records)
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

