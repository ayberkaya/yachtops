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
  const email = process.argv[2] || "owner@helmops.com";
  const password = process.argv[3] || "owner123";
  const name = process.argv[4] || "Owner";
  const vesselName = process.argv[5] || "Test Yacht";
  const vesselFlag = process.argv[6] || "TR";
  const username = email.split("@")[0];

  console.log(`🌱 Creating/updating owner user: ${email}...`);

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
    
    // Check if user has a yacht, if not create one
    let yacht = existingUser.yachtId 
      ? await prisma.yacht.findUnique({ where: { id: existingUser.yachtId } })
      : null;
    
    if (!yacht) {
      console.log("📝 Creating new yacht for user...");
      yacht = await prisma.yacht.create({
        data: {
          name: vesselName,
          flag: vesselFlag,
        },
      });
    }

    const user = await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        email,
        username,
        passwordHash,
        name,
        role: UserRole.OWNER,
        active: true,
        yachtId: yacht.id,
      },
    });
    console.log("✅ User updated:", user.email);
    console.log(`   Yacht: ${yacht.name} (${yacht.flag})`);
  } else {
    console.log("📝 Creating new owner user...");
    
    // Create yacht first
    const yacht = await prisma.yacht.create({
      data: {
        name: vesselName,
        flag: vesselFlag,
      },
    });
    
    try {
      const user = await prisma.user.create({
        data: {
          email,
          username,
          passwordHash,
          name,
          role: UserRole.OWNER,
          active: true,
          yachtId: yacht.id,
        },
      });
      console.log("✅ User created:", user.email);
      console.log(`   Yacht: ${yacht.name} (${yacht.flag})`);
      
      // Create default expense categories for the vessel
      const defaultCategories = [
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

      await Promise.all(
        defaultCategories.map((categoryName) =>
          prisma.expenseCategory.upsert({
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
          })
        )
      );
      console.log("✅ Default expense categories created");
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
          let yacht = conflictUser.yachtId 
            ? await prisma.yacht.findUnique({ where: { id: conflictUser.yachtId } })
            : null;
          
          if (!yacht) {
            yacht = await prisma.yacht.create({
              data: {
                name: vesselName,
                flag: vesselFlag,
              },
            });
          }

          const user = await prisma.user.update({
            where: { id: conflictUser.id },
            data: {
              email,
              username: conflictUser.username === username ? username : `owner_${Date.now()}`,
              passwordHash,
              name,
              role: UserRole.OWNER,
              active: true,
              yachtId: yacht.id,
            },
          });
          console.log("✅ User updated:", user.email);
          console.log(`   Yacht: ${yacht.name} (${yacht.flag})`);
        } else {
          throw error;
        }
      } else {
        throw error;
      }
    }
  }

  console.log("\n📝 Owner Login credentials:");
  console.log(`  Email: ${email}`);
  console.log(`  Password: ${password}`);
  console.log(`  Role: OWNER`);
  console.log(`  Vessel: ${vesselName} (${vesselFlag})`);
  console.log("\n✅ Owner user is ready!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

