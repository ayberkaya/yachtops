import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function test() {
  const user = await prisma.user.findUnique({
    where: { email: "owner@yachtops.com" },
  });

  if (!user) {
    console.log("❌ User not found");
    return;
  }

  console.log("✅ User found:", user.email);
  console.log("Hash preview:", user.passwordHash.substring(0, 30) + "...");

  const isValid = await bcrypt.compare("owner123", user.passwordHash);
  console.log("Password 'owner123' is valid:", isValid);

  // Test with new hash
  const newHash = await bcrypt.hash("owner123", 10);
  const testNew = await bcrypt.compare("owner123", newHash);
  console.log("New hash test:", testNew);

  await prisma.$disconnect();
}

test().catch(console.error);

