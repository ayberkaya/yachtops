import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function test() {
  console.log("Testing authorize function logic...");
  
  const email = "owner@yachtops.com";
  const password = "owner123";
  
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      yachtId: true,
      passwordHash: true,
      permissions: true,
    },
  });

  if (!user) {
    console.log("❌ User not found");
    return;
  }

  console.log("✅ User found:", user.email);

  const isValid = await bcrypt.compare(password, user.passwordHash);
  console.log("🔐 Password valid:", isValid);

  if (isValid) {
    console.log("✅ Would return user object");
    console.log("User object:", {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      yachtId: user.yachtId,
      permissions: user.permissions,
    });
  }

  await prisma.$disconnect();
}

test().catch(console.error);

