import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

// Use connection string with pgbouncer compatibility for pooler connections
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

async function main() {
  console.log("🌱 Seeding database...");

  // Create a yacht
  const yacht = await prisma.yacht.upsert({
    where: { id: "yacht-1" },
    update: {},
    create: {
      id: "yacht-1",
      name: "Sea Breeze",
      flag: "Malta",
      length: 45,
      registrationNumber: "MT-12345",
      notes: "Main yacht for operations",
    },
  });

  console.log("✅ Created yacht:", yacht.name);

  // Create owner
  const ownerPassword = await bcrypt.hash("owner123", 10);
  const owner = await prisma.user.upsert({
    where: { email: "owner@helmops.com" },
    update: {
      passwordHash: ownerPassword,
      name: "John Owner",
      role: UserRole.OWNER,
      yachtId: yacht.id,
      username: "owner",
    },
    create: {
      email: "owner@helmops.com",
      passwordHash: ownerPassword,
      name: "John Owner",
      role: UserRole.OWNER,
      yachtId: yacht.id,
      username: "owner",
    },
  });

  console.log("✅ Created owner:", owner.email, "(password: owner123)");

  // Create captain
  const captainPassword = await bcrypt.hash("captain123", 10);
  const captain = await prisma.user.upsert({
    where: { email: "captain@helmops.com" },
    update: {
      passwordHash: captainPassword,
      name: "Sarah Captain",
      role: UserRole.CAPTAIN,
      yachtId: yacht.id,
      username: "captain",
    },
    create: {
      email: "captain@helmops.com",
      passwordHash: captainPassword,
      name: "Sarah Captain",
      role: UserRole.CAPTAIN,
      yachtId: yacht.id,
      username: "captain",
    },
  });

  console.log("✅ Created captain:", captain.email, "(password: captain123)");

  // Create crew member
  const crewPassword = await bcrypt.hash("crew123", 10);
  const crew = await prisma.user.upsert({
    where: { email: "crew@helmops.com" },
    update: {
      passwordHash: crewPassword,
      name: "Mike Crew",
      role: UserRole.CREW,
      yachtId: yacht.id,
      username: "crew",
    },
    create: {
      email: "crew@helmops.com",
      passwordHash: crewPassword,
      name: "Mike Crew",
      role: UserRole.CREW,
      yachtId: yacht.id,
      username: "crew",
    },
  });

  console.log("✅ Created crew:", crew.email, "(password: crew123)");

  // Create expense categories
  const categories = [
    "Fuel",
    "Marina & Port Fees",
    "Provisions",
    "Cleaning & Laundry",
    "Maintenance & Repairs",
    "Crew",
    "Tender & Toys",
    "Miscellaneous",
    "Insurance",
    "Communications & IT",
    "Safety Equipment",
    "Crew Training",
    "Guest Services",
    "Waste Disposal",
    "Dockage & Utilities",
    "Transport & Logistics",
    "Permits & Customs",
    "Fuel Additives",
  ];

  for (const categoryName of categories) {
    await prisma.expenseCategory.upsert({
      where: {
        yachtId_name: {
          yachtId: yacht.id,
          name: categoryName,
        },
      },
      update: {},
      create: {
        name: categoryName,
        yachtId: yacht.id,
      },
    });
  }

  console.log("✅ Created expense categories");

  // Create a sample trip
  const trip = await prisma.trip.create({
    data: {
      yachtId: yacht.id,
      name: "Summer Charter 2024",
      code: "SUM-2024-001",
      startDate: new Date("2024-07-01"),
      endDate: new Date("2024-07-15"),
      departurePort: "Monaco",
      arrivalPort: "Cannes",
      status: "COMPLETED",
      createdByUserId: captain.id,
    },
  });

  console.log("✅ Created trip:", trip.name);

  // Create general message channel
  const generalChannel = await prisma.messageChannel.create({
    data: {
      yachtId: yacht.id,
      name: "General",
      description: "General discussion channel for all crew members",
      isGeneral: true,
      createdByUserId: owner.id,
      members: {
        connect: [owner.id, captain.id, crew.id].map((id) => ({ id })),
      },
    },
  });

  console.log("✅ Created general message channel");

  console.log("\n🎉 Seeding completed!");
  console.log("\n📝 Test credentials:");
  console.log("  Owner:   owner@helmops.com / owner123");
  console.log("  Captain: captain@helmops.com / captain123");
  console.log("  Crew:    crew@helmops.com / crew123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

