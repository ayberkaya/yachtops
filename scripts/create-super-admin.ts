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

  const email = "admin@helmops.local";
  const password = "TempPass123!";
  const username = "admin";

  const passwordHash = await bcrypt.hash(password, 10);

  // Check if user already exists by email
  let existingUser = await prisma.user.findUnique({
    where: { email },
  });

  // If not found by email, check by username
  if (!existingUser) {
    existingUser = await prisma.user.findUnique({
      where: { username },
    });
  }

  if (existingUser) {
    console.log("⚠️  User already exists, updating password and role...");
    const user = await prisma.user.update({
      where: { id: existingUser.id },
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
    console.log("✅ User updated:", user.email);
  } else {
    console.log("📝 Creating new super admin user...");
    try {
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
    } catch (error: any) {
      // If username or email conflict, try to update existing user
      if (error?.code === "P2002") {
        console.log("⚠️  Conflict detected, attempting to update existing user...");
        const conflictUser = await prisma.user.findFirst({
          where: {
            OR: [
              { email },
              { username },
            ],
          },
        });
        
        if (conflictUser) {
          const user = await prisma.user.update({
            where: { id: conflictUser.id },
            data: {
              email,
              username: conflictUser.username === username ? username : `admin_${Date.now()}`,
              passwordHash,
              name: "Super Admin",
              role: UserRole.SUPER_ADMIN,
              active: true,
              yachtId: null,
            },
          });
          console.log("✅ User updated:", user.email);
        } else {
          throw error;
        }
      } else {
        throw error;
      }
    }
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
