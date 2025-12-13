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
  const existingOwner = await prisma.user.findUnique({
    where: { email: "owner@helmops.com" },
  });
  
  // Check for duplicate by name (case-insensitive)
  const existingOwnerByName = await prisma.user.findFirst({
    where: {
      name: { equals: "John Owner", mode: "insensitive" },
      email: { not: "owner@helmops.com" },
    },
  });
  
  if (existingOwnerByName) {
    console.log(`⚠️  Warning: User with name "John Owner" already exists with email ${existingOwnerByName.email}`);
    console.log(`   Skipping owner creation to avoid duplicate.`);
  }
  
  const existingOwnerByUsername = await prisma.user.findUnique({
    where: { username: "owner" },
  });
  
  // If username is taken by different user, update that user's username first
  if (existingOwnerByUsername && existingOwnerByUsername.email !== "owner@helmops.com") {
    await prisma.user.update({
      where: { username: "owner" },
      data: { username: `owner_${Date.now()}` },
    });
  }
  
  const owner = existingOwner
    ? await prisma.user.update({
        where: { email: "owner@helmops.com" },
        data: {
          passwordHash: ownerPassword,
          name: "John Owner",
          role: UserRole.OWNER,
          yachtId: yacht.id,
          username: "owner",
        },
      })
    : existingOwnerByName
    ? null
    : await prisma.user.create({
        data: {
          email: "owner@helmops.com",
          passwordHash: ownerPassword,
          name: "John Owner",
          role: UserRole.OWNER,
          yachtId: yacht.id,
          username: "owner",
        },
      });
  
  if (!owner) {
    console.log("⚠️  Skipped creating owner (duplicate name exists)");
  }

  if (owner) {
    console.log("✅ Created owner:", owner.email, "(password: owner123)");
  }

  // Create captain
  const captainPassword = await bcrypt.hash("captain123", 10);
  const existingCaptain = await prisma.user.findUnique({
    where: { email: "captain@helmops.com" },
  });
  
  // Check for duplicate by name (case-insensitive)
  const existingCaptainByName = await prisma.user.findFirst({
    where: {
      name: { equals: "Sarah Captain", mode: "insensitive" },
      email: { not: "captain@helmops.com" },
    },
  });
  
  if (existingCaptainByName) {
    console.log(`⚠️  Warning: User with name "Sarah Captain" already exists with email ${existingCaptainByName.email}`);
    console.log(`   Skipping captain creation to avoid duplicate.`);
  }
  
  const existingCaptainByUsername = await prisma.user.findUnique({
    where: { username: "captain" },
  });
  
  if (existingCaptainByUsername && existingCaptainByUsername.email !== "captain@helmops.com") {
    await prisma.user.update({
      where: { username: "captain" },
      data: { username: `captain_${Date.now()}` },
    });
  }
  
  const captain = existingCaptain
    ? await prisma.user.update({
        where: { email: "captain@helmops.com" },
        data: {
          passwordHash: captainPassword,
          name: "Sarah Captain",
          role: UserRole.CAPTAIN,
          yachtId: yacht.id,
          username: "captain",
        },
      })
    : existingCaptainByName
    ? null
    : await prisma.user.create({
        data: {
          email: "captain@helmops.com",
          passwordHash: captainPassword,
          name: "Sarah Captain",
          role: UserRole.CAPTAIN,
          yachtId: yacht.id,
          username: "captain",
        },
      });
  
  if (!captain) {
    console.log("⚠️  Skipped creating captain (duplicate name exists)");
  }

  if (captain) {
    console.log("✅ Created captain:", captain.email, "(password: captain123)");
  }

  // Create crew member
  const crewPassword = await bcrypt.hash("crew123", 10);
  const existingCrew = await prisma.user.findUnique({
    where: { email: "crew@helmops.com" },
  });
  
  // Check for duplicate by name (case-insensitive)
  const existingCrewByName = await prisma.user.findFirst({
    where: {
      name: { equals: "Mike Crew", mode: "insensitive" },
      email: { not: "crew@helmops.com" },
    },
  });
  
  if (existingCrewByName) {
    console.log(`⚠️  Warning: User with name "Mike Crew" already exists with email ${existingCrewByName.email}`);
    console.log(`   Skipping crew creation to avoid duplicate.`);
  }
  
  const existingCrewByUsername = await prisma.user.findUnique({
    where: { username: "crew" },
  });
  
  if (existingCrewByUsername && existingCrewByUsername.email !== "crew@helmops.com") {
    await prisma.user.update({
      where: { username: "crew" },
      data: { username: `crew_${Date.now()}` },
    });
  }
  
  const crew = existingCrew
    ? await prisma.user.update({
        where: { email: "crew@helmops.com" },
        data: {
          passwordHash: crewPassword,
          name: "Mike Crew",
          role: UserRole.CREW,
          yachtId: yacht.id,
          username: "crew",
        },
      })
    : existingCrewByName
    ? null
    : await prisma.user.create({
        data: {
          email: "crew@helmops.com",
          passwordHash: crewPassword,
          name: "Mike Crew",
          role: UserRole.CREW,
          yachtId: yacht.id,
          username: "crew",
        },
      });
  
  if (!crew) {
    console.log("⚠️  Skipped creating crew (duplicate name exists)");
  }

  if (crew) {
    console.log("✅ Created crew:", crew.email, "(password: crew123)");
  }

  // Create super admin
  const adminPassword = await bcrypt.hash("TempPass123!", 10);
  const existingAdmin = await prisma.user.findUnique({
    where: { email: "admin@yachtops.local" },
  });
  const existingAdminByUsername = await prisma.user.findUnique({
    where: { username: "admin" },
  });
  
  if (existingAdminByUsername && existingAdminByUsername.email !== "admin@yachtops.local") {
    await prisma.user.update({
      where: { username: "admin" },
      data: { username: `admin_${Date.now()}` },
    });
  }
  
  const admin = existingAdmin
    ? await prisma.user.update({
        where: { email: "admin@yachtops.local" },
        data: {
          passwordHash: adminPassword,
          name: "Super Admin",
          role: UserRole.SUPER_ADMIN,
          username: "admin",
          active: true,
          yachtId: null, // Super admin doesn't need a yacht
        },
      })
    : await prisma.user.create({
        data: {
          email: "admin@yachtops.local",
          passwordHash: adminPassword,
          name: "Super Admin",
          role: UserRole.SUPER_ADMIN,
          username: "admin",
          active: true,
          yachtId: null, // Super admin doesn't need a yacht
        },
      });

  console.log("✅ Created super admin:", admin.email, "(password: TempPass123!)");

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
      createdByUserId: captain?.id || null,
    },
  });

  console.log("✅ Created trip:", trip.name);

  // Create general message channel (only if we have users)
  if (owner || captain || crew) {
    const memberIds = [owner, captain, crew].filter(Boolean).map((u) => u!.id);
    if (memberIds.length > 0) {
      const generalChannel = await prisma.messageChannel.create({
        data: {
          yachtId: yacht.id,
          name: "General",
          description: "General discussion channel for all crew members",
          isGeneral: true,
          createdByUserId: owner?.id || captain?.id || crew?.id || null,
          members: {
            connect: memberIds.map((id) => ({ id })),
          },
        },
      });
      console.log("✅ Created general message channel");
    }
  }

  console.log("\n🎉 Seeding completed!");
  console.log("\n📝 Test credentials:");
  console.log("  Super Admin: admin@yachtops.local / TempPass123!");
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

