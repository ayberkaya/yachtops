import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

async function main() {
  console.log("🌱 Seeding plans...");

  // ESSENTIAL Plan - Giriş seviyesi
  const essentialPlan = await prisma.plan.upsert({
    where: { name: "ESSENTIAL" },
    update: {
      features: ["module:logbook", "module:calendar", "module:documents_basic"],
      limits: {
        max_users: 3,
        storage_mb: 2048,
        max_vessels: 1,
      },
      monthlyPrice: 29.99,
      annualPrice: 299.99, // ~2 ay indirim
      currency: "USD",
      active: true,
    },
    create: {
      name: "ESSENTIAL",
      features: ["module:logbook", "module:calendar", "module:documents_basic"],
      limits: {
        max_users: 3,
        storage_mb: 2048,
        max_vessels: 1,
      },
      monthlyPrice: 29.99,
      annualPrice: 299.99,
      currency: "USD",
      active: true,
    },
  });

  console.log("✅ Created/Updated ESSENTIAL plan:", essentialPlan.name);

  // PROFESSIONAL Plan - Standart operasyon
  const professionalPlan = await prisma.plan.upsert({
    where: { name: "PROFESSIONAL" },
    update: {
      features: [
        "module:logbook",
        "module:calendar",
        "module:documents_full",
        "module:maintenance",
        "module:inventory",
        "module:finance",
        "feature:offline_sync",
      ],
      limits: {
        max_users: 20,
        storage_mb: 51200, // 50 GB
        max_vessels: 1,
      },
      monthlyPrice: 99.99,
      annualPrice: 999.99, // ~2 ay indirim
      currency: "USD",
      active: true,
    },
    create: {
      name: "PROFESSIONAL",
      features: [
        "module:logbook",
        "module:calendar",
        "module:documents_full",
        "module:maintenance",
        "module:inventory",
        "module:finance",
        "feature:offline_sync",
      ],
      limits: {
        max_users: 20,
        storage_mb: 51200,
        max_vessels: 1,
      },
      monthlyPrice: 99.99,
      annualPrice: 999.99,
      currency: "USD",
      active: true,
    },
  });

  console.log("✅ Created/Updated PROFESSIONAL plan:", professionalPlan.name);

  // ENTERPRISE Plan - Filo yönetimi
  const enterprisePlan = await prisma.plan.upsert({
    where: { name: "ENTERPRISE" },
    update: {
      features: [
        "ALL_FEATURES",
        "module:fleet_dashboard",
        "feature:api_access",
        "feature:white_label",
      ],
      limits: {
        max_users: 9999,
        storage_mb: 1048576, // 1 TB
        max_vessels: 999,
      },
      monthlyPrice: 499.99,
      annualPrice: 4999.99, // ~2 ay indirim
      currency: "USD",
      active: true,
    },
    create: {
      name: "ENTERPRISE",
      features: [
        "ALL_FEATURES",
        "module:fleet_dashboard",
        "feature:api_access",
        "feature:white_label",
      ],
      limits: {
        max_users: 9999,
        storage_mb: 1048576,
        max_vessels: 999,
      },
      monthlyPrice: 499.99,
      annualPrice: 4999.99,
      currency: "USD",
      active: true,
    },
  });

  console.log("✅ Created/Updated ENTERPRISE plan:", enterprisePlan.name);

  console.log("\n🎉 Plan seeding completed!");
  console.log("\n📦 Plans created:");
  console.log("  ESSENTIAL:   $29.99/month or $299.99/year");
  console.log("  PROFESSIONAL: $99.99/month or $999.99/year");
  console.log("  ENTERPRISE:  $499.99/month or $4999.99/year");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding plans:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

