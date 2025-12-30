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
  console.log("🌱 Creating user...");

  // Get the first yacht (or create one if none exists)
  let yacht = await prisma.yacht.findFirst();
  
  if (!yacht) {
    console.log("⚠️  No yacht found, creating one...");
    yacht = await prisma.yacht.create({
      data: {
        name: "Default Yacht",
        flag: "",
        length: null,
        registrationNumber: null,
        notes: null,
      },
    });
  }

  console.log("✅ Using yacht:", yacht.name);

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: "koray@test.com" },
  });

  if (existingUser) {
    console.log("⚠️  User already exists, updating...");
    const passwordHash = await bcrypt.hash("koray123", 10);
    const user = await prisma.user.update({
      where: { email: "koray@test.com" },
      data: {
        passwordHash,
        name: "Koray",
        role: UserRole.CAPTAIN,
        yachtId: yacht.id,
        permissions: JSON.stringify([
          "expenses.view",
          "expenses.create",
          "expenses.approve",
          "expenses.edit",
          "trips.view",
          "trips.create",
          "trips.edit",
          "trips.delete",
          "tasks.view",
          "tasks.create",
          "tasks.edit",
          "tasks.delete",
          "users.view",
          "users.create",
          "users.edit",
          "documents.view",
          "documents.create",
          "documents.edit",
          "documents.delete",
          "shopping.view",
          "shopping.create",
          "shopping.edit",
          "shopping.delete",
          "inventory.view",
          "inventory.create",
          "inventory.edit",
          "inventory.delete",
          "maintenance.view",
          "maintenance.create",
          "maintenance.edit",
          "maintenance.delete",
          "messages.view",
          "messages.create",
          "messages.edit",
          "messages.delete",
          "performance.view",
        ]),
      },
    });
    console.log("✅ User updated:", user.email);
  } else {
    const passwordHash = await bcrypt.hash("koray123", 10);
    const user = await prisma.user.create({
      data: {
        email: "koray@test.com",
        username: "koray",
        passwordHash,
        name: "Koray",
        role: UserRole.CAPTAIN,
        yachtId: yacht.id,
        permissions: JSON.stringify([
          "expenses.view",
          "expenses.create",
          "expenses.approve",
          "expenses.edit",
          "trips.view",
          "trips.create",
          "trips.edit",
          "trips.delete",
          "tasks.view",
          "tasks.create",
          "tasks.edit",
          "tasks.delete",
          "users.view",
          "users.create",
          "users.edit",
          "documents.view",
          "documents.create",
          "documents.edit",
          "documents.delete",
          "shopping.view",
          "shopping.create",
          "shopping.edit",
          "shopping.delete",
          "inventory.view",
          "inventory.create",
          "inventory.edit",
          "inventory.delete",
          "maintenance.view",
          "maintenance.create",
          "maintenance.edit",
          "maintenance.delete",
          "messages.view",
          "messages.create",
          "messages.edit",
          "messages.delete",
          "performance.view",
        ]),
      },
    });
    console.log("✅ User created:", user.email);
  }

  console.log("\n📝 Login credentials:");
  console.log("  Email: koray@test.com");
  console.log("  Password: koray123");
  console.log("  Role: CAPTAIN");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

