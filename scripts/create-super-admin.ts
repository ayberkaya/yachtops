import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

async function main() {
  console.log("🌱 Creating/updating super admin user...");

  const email = "admin@yachtops.local";
  const password = "TempPass123!";
  const username = "admin";

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  const passwordHash = await bcrypt.hash(password, 10);

  if (existingUser) {
    console.log("⚠️  User already exists, updating password and role...");
    const user = await prisma.user.update({
      where: { email },
      data: {
        passwordHash,
        role: UserRole.SUPER_ADMIN,
        username,
        active: true,
        yachtId: null, // Super admin doesn't need a yacht
      },
    });
    console.log("✅ User updated:", user.email);
  } else {
    console.log("📝 Creating new super admin user...");
    const user = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
        name: "Super Admin",
        role: UserRole.SUPER_ADMIN,
        active: true,
        yachtId: null, // Super admin doesn't need a yacht
      },
    });
    console.log("✅ User created:", user.email);
  }

  console.log("\n📝 Super Admin Login credentials:");
  console.log(`  Email: ${email}`);
  console.log(`  Password: ${password}`);
  console.log(`  Role: SUPER_ADMIN`);
  console.log("\n✅ Super admin user is ready!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
