import { PrismaClient } from "@prisma/client";

// Create unscoped Prisma client for test setup
const dbUnscoped = new PrismaClient({
  log: ["error"],
  errorFormat: "pretty",
});

// ============================================================================
// Test Prisma Client with Manual Tenant Context
// ============================================================================

/**
 * Creates a Prisma client with manual tenant context (for testing)
 */
function createTestPrismaClient(tenantId: string | null) {
  const baseClient = new PrismaClient({
    log: ["error"],
    errorFormat: "pretty",
  });

  // Tenant-scoped models (same as in lib/db.ts)
  const TENANT_SCOPED_MODELS = [
    'expense', 'task', 'trip', 'shoppingList', 'messageChannel',
    'alcoholStock', 'maintenanceLog', 'cashTransaction', 'crewDocument',
    'vesselDocument', 'marinaPermissionDocument', 'shift', 'leave',
    'customRole', 'product', 'shoppingStore', 'expenseCategory', 'creditCard',
    'tripItineraryDay', 'tripChecklistItem', 'tripTankLog', 'tripMovementLog',
    'taskComment', 'taskAttachment', 'expenseReceipt', 'maintenanceDocument',
    'shoppingItem', 'alcoholStockHistory', 'message', 'messageRead',
    'messageAttachment', 'calendarEvent', 'workRequest', 'vendor', 'quote',
    'quoteDocument', 'auditLog', 'yachtInvite',
  ] as const;

  const NON_TENANT_SCOPED_MODELS = ['user', 'yacht', 'plan'] as const;
  const USER_SCOPED_MODELS = ['notification', 'userNote', 'userNoteChecklistItem'] as const;

  const NESTED_MODEL_FILTERS: Record<string, { parentKey: string; filterPath: string[] }> = {
    expenseReceipt: { parentKey: 'expense', filterPath: ['expense', 'yachtId'] },
    taskComment: { parentKey: 'task', filterPath: ['task', 'yachtId'] },
    taskAttachment: { parentKey: 'task', filterPath: ['task', 'yachtId'] },
    tripItineraryDay: { parentKey: 'trip', filterPath: ['trip', 'yachtId'] },
    tripChecklistItem: { parentKey: 'trip', filterPath: ['trip', 'yachtId'] },
    tripTankLog: { parentKey: 'trip', filterPath: ['trip', 'yachtId'] },
    tripMovementLog: { parentKey: 'trip', filterPath: ['trip', 'yachtId'] },
    shoppingItem: { parentKey: 'list', filterPath: ['list', 'yachtId'] },
    alcoholStockHistory: { parentKey: 'stock', filterPath: ['stock', 'yachtId'] },
    message: { parentKey: 'channel', filterPath: ['channel', 'yachtId'] },
    messageRead: { parentKey: 'channel', filterPath: ['channel', 'yachtId'] },
    messageAttachment: { parentKey: 'channel', filterPath: ['channel', 'yachtId'] },
    maintenanceDocument: { parentKey: 'maintenance', filterPath: ['maintenance', 'yachtId'] },
    quote: { parentKey: 'workRequest', filterPath: ['workRequest', 'yachtId'] },
    quoteDocument: { parentKey: 'quote', filterPath: ['quote', 'workRequest', 'yachtId'] },
  };

  function applyTenantFilter(model: string, where: any, tenantId: string): any {
    const nestedFilter = NESTED_MODEL_FILTERS[model];
    
    if (nestedFilter) {
      const buildNestedFilter = (path: string[], value: string, existing: any = {}): any => {
        if (path.length === 1) {
          const existingValue = existing[path[0]];
          if (existingValue && typeof existingValue === 'object' && !Array.isArray(existingValue)) {
            return {
              ...existing,
              [path[0]]: {
                ...existingValue,
                yachtId: value,
              },
            };
          }
          return {
            ...existing,
            [path[0]]: value,
          };
        }
        
        const [first, ...rest] = path;
        const existingNested = existing[first] || {};
        return {
          ...existing,
          [first]: buildNestedFilter(rest, value, existingNested),
        };
      };
      
      return buildNestedFilter(nestedFilter.filterPath, tenantId, where);
    } else {
      if (where) {
        return {
          ...where,
          yachtId: tenantId,
        };
      } else {
        return {
          yachtId: tenantId,
        };
      }
    }
  }

  function applyTenantCreateData(model: string, data: any, tenantId: string): any {
    if (NESTED_MODEL_FILTERS[model]) {
      return data;
    }
    
    if (!data.yachtId) {
      return {
        ...data,
        yachtId: tenantId,
      };
    }
    
    return data;
  }

  return baseClient.$extends({
    name: 'test-tenant-isolation',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          // Convert model name to lowercase for comparison (Prisma returns PascalCase)
          const modelLower = (model as string).toLowerCase();
          
          // Skip tenant enforcement for non-tenant-scoped models
          if (NON_TENANT_SCOPED_MODELS.includes(modelLower as any)) {
            return query(args);
          }
          
          if (USER_SCOPED_MODELS.includes(modelLower as any)) {
            return query(args);
          }
          
          if (!TENANT_SCOPED_MODELS.includes(modelLower as any)) {
            return query(args);
          }
          
          // If no tenantId provided, skip enforcement (allows setup operations)
          if (!tenantId) {
            return query(args);
          }
          
          // Apply tenant filter based on operation type
          if (operation === 'findMany' || operation === 'findFirst' || operation === 'findUnique' || operation === 'count') {
            const newArgs = {
              ...args,
              where: applyTenantFilter(modelLower, args.where, tenantId),
            };
            return query(newArgs);
          } else if (operation === 'create') {
            const newArgs = {
              ...args,
              data: applyTenantCreateData(modelLower, args.data, tenantId),
            };
            return query(newArgs);
          } else if (operation === 'createMany') {
            const newArgs = {
              ...args,
              data: Array.isArray(args.data)
                ? args.data.map((item: any) => applyTenantCreateData(modelLower, item, tenantId))
                : applyTenantCreateData(modelLower, args.data, tenantId),
            };
            return query(newArgs);
          } else if (operation === 'update' || operation === 'updateMany' || operation === 'delete' || operation === 'deleteMany') {
            const newArgs = {
              ...args,
              where: applyTenantFilter(modelLower, args.where, tenantId),
            };
            return query(newArgs);
          } else if (operation === 'upsert') {
            const newArgs = {
              ...args,
              where: applyTenantFilter(modelLower, args.where, tenantId),
              create: applyTenantCreateData(modelLower, args.create, tenantId),
              update: args.update ? {
                ...args.update,
                yachtId: undefined,
              } : undefined,
            };
            return query(newArgs);
          }
          
          return query(args);
        },
      },
    },
  }) as unknown as PrismaClient;
}

// ============================================================================
// Test Functions
// ============================================================================

async function getOrCreateYachts() {
  // Try to find existing yachts
  const existingYachts = await dbUnscoped.yacht.findMany({
    take: 2,
    orderBy: { createdAt: 'desc' },
  });

  let yachtA, yachtB;

  if (existingYachts.length >= 2) {
    yachtA = existingYachts[0];
    yachtB = existingYachts[1];
    console.log(`✓ Using existing yachts: "${yachtA.name}" (${yachtA.id}) and "${yachtB.name}" (${yachtB.id})`);
  } else {
    // Create test yachts
    yachtA = await dbUnscoped.yacht.create({
      data: {
        name: "Test Yacht A",
        settings: {},
        features: {},
      },
    });
    console.log(`✓ Created test yacht A: "${yachtA.name}" (${yachtA.id})`);

    yachtB = await dbUnscoped.yacht.create({
      data: {
        name: "Test Yacht B",
        settings: {},
        features: {},
      },
    });
    console.log(`✓ Created test yacht B: "${yachtB.name}" (${yachtB.id})`);
  }

  return { yachtA, yachtB };
}

async function getOrCreateUsers(yachtAId: string, yachtBId: string) {
  // Try to find existing users for these yachts
  let userA = await dbUnscoped.user.findFirst({
    where: { yachtId: yachtAId },
  });

  let userB = await dbUnscoped.user.findFirst({
    where: { yachtId: yachtBId },
  });

  if (!userA) {
    userA = await dbUnscoped.user.create({
      data: {
        email: `test-user-a-${Date.now()}@test.com`,
        username: `test-user-a-${Date.now()}`,
        passwordHash: "test-hash",
        name: "Test User A",
        role: "ADMIN",
        yachtId: yachtAId,
      },
    });
    console.log(`✓ Created test user A: ${userA.email}`);
  } else {
    console.log(`✓ Using existing user A: ${userA.email}`);
  }

  if (!userB) {
    userB = await dbUnscoped.user.create({
      data: {
        email: `test-user-b-${Date.now()}@test.com`,
        username: `test-user-b-${Date.now()}`,
        passwordHash: "test-hash",
        name: "Test User B",
        role: "ADMIN",
        yachtId: yachtBId,
      },
    });
    console.log(`✓ Created test user B: ${userB.email}`);
  } else {
    console.log(`✓ Using existing user B: ${userB.email}`);
  }

  return { userA, userB };
}

async function getOrCreateExpenseCategory(yachtId: string, userId: string) {
  let category = await dbUnscoped.expenseCategory.findFirst({
    where: { yachtId },
  });

  if (!category) {
    category = await dbUnscoped.expenseCategory.create({
      data: {
        yachtId,
        name: "Test Category",
      },
    });
    console.log(`✓ Created expense category for yacht ${yachtId}`);
  }

  return category;
}

async function testTaskIsolation(yachtAId: string, yachtBId: string, userId: string) {
  console.log("\n📋 Testing Task Isolation...");
  
  const dbA = createTestPrismaClient(yachtAId);
  const dbB = createTestPrismaClient(yachtBId);

  // Create a task in Yacht A context (extension should automatically set yachtId)
  const taskA = await dbA.task.create({
    data: {
      title: "Test Task from Yacht A",
      description: "This task should only be visible to Yacht A",
      status: "TODO",
      priority: "NORMAL",
      type: "GENERAL",
      createdByUserId: userId,
    },
  });
  console.log(`✓ Created task in Yacht A context: ${taskA.id}`);

  // Try to find the task from Yacht A context (should succeed)
  const foundInA = await dbA.task.findFirst({
    where: { id: taskA.id },
  });

  if (!foundInA) {
    throw new Error("❌ FAILED: Yacht A cannot see its own task!");
  }
  console.log(`✓ Yacht A can see its own task: "${foundInA.title}"`);

  // Try to find the task from Yacht B context (should fail)
  const foundInB = await dbB.task.findFirst({
    where: { id: taskA.id },
  });

  if (foundInB) {
    throw new Error(
      `❌ SECURITY BREACH: Yacht B can see Yacht A's task! Task ID: ${taskA.id}, Title: "${foundInB.title}"`
    );
  }
  console.log(`✓ Yacht B cannot see Yacht A's task (correct isolation)`);

  // Cleanup
  await dbUnscoped.task.delete({ where: { id: taskA.id } });
  console.log(`✓ Cleaned up test task`);

  await dbA.$disconnect();
  await dbB.$disconnect();
}

async function testExpenseIsolation(yachtAId: string, yachtBId: string, userId: string, categoryId: string) {
  console.log("\n💰 Testing Expense Isolation...");
  
  const dbA = createTestPrismaClient(yachtAId);
  const dbB = createTestPrismaClient(yachtBId);

  // Create an expense in Yacht A context (extension should automatically set yachtId)
  const expenseA = await dbA.expense.create({
    data: {
      date: new Date(),
      description: "Test Expense from Yacht A",
      amount: 100.50,
      currency: "EUR",
      paymentMethod: "CASH",
      paidBy: "VESSEL",
      status: "DRAFT",
      categoryId,
      createdByUserId: userId,
    },
  });
  console.log(`✓ Created expense in Yacht A context: ${expenseA.id}`);

  // Try to find the expense from Yacht A context (should succeed)
  const foundInA = await dbA.expense.findFirst({
    where: { id: expenseA.id },
  });

  if (!foundInA) {
    throw new Error("❌ FAILED: Yacht A cannot see its own expense!");
  }
  console.log(`✓ Yacht A can see its own expense: "${foundInA.description}"`);

  // Try to find the expense from Yacht B context (should fail)
  const foundInB = await dbB.expense.findFirst({
    where: { id: expenseA.id },
  });

  if (foundInB) {
    throw new Error(
      `❌ SECURITY BREACH: Yacht B can see Yacht A's expense! Expense ID: ${expenseA.id}, Description: "${foundInB.description}"`
    );
  }
  console.log(`✓ Yacht B cannot see Yacht A's expense (correct isolation)`);

  // Cleanup
  await dbUnscoped.expense.delete({ where: { id: expenseA.id } });
  console.log(`✓ Cleaned up test expense`);

  await dbA.$disconnect();
  await dbB.$disconnect();
}

// ============================================================================
// Main Test Runner
// ============================================================================

async function main() {
  console.log("🔒 Starting Tenant Isolation Verification Test\n");
  console.log("=" .repeat(60));

  try {
    // Setup: Get or create test yachts and users
    const { yachtA, yachtB } = await getOrCreateYachts();
    const { userA } = await getOrCreateUsers(yachtA.id, yachtB.id);
    
    // Get or create expense category for Yacht A
    const categoryA = await getOrCreateExpenseCategory(yachtA.id, userA.id);

    // Run isolation tests
    await testTaskIsolation(yachtA.id, yachtB.id, userA.id);
    await testExpenseIsolation(yachtA.id, yachtB.id, userA.id, categoryA.id);

    console.log("\n" + "=".repeat(60));
    console.log("✅ ALL TESTS PASSED: Tenant isolation is working correctly!");
    console.log("=".repeat(60));
    
    process.exit(0);
  } catch (error) {
    console.error("\n" + "=".repeat(60));
    console.error("❌ TEST FAILED:");
    console.error(error instanceof Error ? error.message : String(error));
    console.error("=".repeat(60));
    
    if (error instanceof Error && error.stack) {
      console.error("\nStack trace:");
      console.error(error.stack);
    }
    
    process.exit(1);
  } finally {
    await dbUnscoped.$disconnect();
  }
}

// Run the test
main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});

