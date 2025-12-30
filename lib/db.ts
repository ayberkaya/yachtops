import "server-only";
import { PrismaClient, Prisma } from "@prisma/client";
import { getSession } from "./get-session";
import { getTenantId, isPlatformAdmin } from "./tenant";

const globalForPrisma = globalThis as unknown as {
  prisma: ExtendedPrismaClient | undefined;
  prismaUnscoped: PrismaClient | undefined;
};

// ============================================================================
// Base Prisma Client Creation
// ============================================================================

const createBasePrismaClient = (): PrismaClient => {
  // Warn if DATABASE_URL is not set, but don't throw during module evaluation
  if (!process.env.DATABASE_URL) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "⚠️  DATABASE_URL environment variable is not set."
      );
      console.warn(
        "   Please set DATABASE_URL in your .env file. The app will continue but database operations will fail."
      );
    }
  }

  // Parse and update DATABASE_URL with connection pool settings
  let databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl) {
    try {
      const url = new URL(databaseUrl);
      url.searchParams.delete("connection_limit");
      url.searchParams.delete("pool_timeout");
      url.searchParams.set("connection_limit", "15");
      url.searchParams.set("pool_timeout", "60");
      databaseUrl = url.toString();
    } catch (e) {
      // If URL parsing fails, try simple string manipulation
      if (databaseUrl.includes("?")) {
        databaseUrl = databaseUrl.replace(/[&?]connection_limit=\d+/g, "");
        databaseUrl = databaseUrl.replace(/[&?]pool_timeout=\d+/g, "");
        databaseUrl = `${databaseUrl}&connection_limit=15&pool_timeout=60`;
      } else {
        databaseUrl = `${databaseUrl}?connection_limit=15&pool_timeout=60`;
      }
    }
  }

  const client = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    errorFormat: "pretty",
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });

  // Test connection on startup (non-blocking)
  if (process.env.DATABASE_URL) {
    client.$connect().catch((error) => {
      console.error("Failed to connect to database:", error);
    });
  }

  return client;
};

// ============================================================================
// Tenant Isolation Configuration
// ============================================================================

// Models that require tenant scoping (have yachtId field or are nested under tenant-scoped models)
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

// Models that are NOT tenant-scoped (used for auth/system purposes)
const NON_TENANT_SCOPED_MODELS = ['user', 'yacht', 'plan'] as const;

// Models that are user-specific (scoped by userId, not yachtId)
const USER_SCOPED_MODELS = ['notification', 'userNote', 'userNoteChecklistItem'] as const;

// Models that are nested under parent models (filtered via parent's yachtId)
// Format: { modelName: { parentKey: string, filterPath: string[] } }
// filterPath is an array representing the nested path to yachtId (e.g., ['expense', 'yachtId'])
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

// ============================================================================
// Tenant Isolation Helper Functions
// ============================================================================

/**
 * Applies tenant filter to a where clause based on model type
 */
function applyTenantFilter(
  model: string,
  where: any,
  tenantId: string
): any {
  // Check if this is a nested model
  const nestedFilter = NESTED_MODEL_FILTERS[model];
  
  if (nestedFilter) {
    // For nested models, build nested filter path
    // e.g., ['quote', 'workRequest', 'yachtId'] becomes { quote: { workRequest: { yachtId: tenantId } } }
    const buildNestedFilter = (path: string[], value: string, existing: any = {}): any => {
      if (path.length === 1) {
        // Last element - set the value, merging with existing if present
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
    
    const nestedWhere = buildNestedFilter(nestedFilter.filterPath, tenantId, where);
    
    return nestedWhere;
  } else {
    // Direct yachtId filter for most models
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

/**
 * Applies tenant filter to create data (ensures yachtId is set)
 */
function applyTenantCreateData(
  model: string,
  data: any,
  tenantId: string
): any {
  // For nested models, we don't set yachtId directly (it's set via parent)
  if (NESTED_MODEL_FILTERS[model]) {
    return data; // Parent relationship will ensure tenant isolation
  }
  
  // For direct models, ensure yachtId is set
  if (!data.yachtId) {
    return {
      ...data,
      yachtId: tenantId,
    };
  }
  
  return data;
}

/**
 * Gets tenant context from session
 */
async function getTenantContext(): Promise<{
  tenantId: string | null;
  isAdmin: boolean;
  shouldEnforce: boolean;
}> {
  try {
    const session = await getSession();
    
    if (!session) {
      return {
        tenantId: null,
        isAdmin: false,
        shouldEnforce: false, // No session = no enforcement (allows auth queries)
      };
    }
    
    const isAdmin = isPlatformAdmin(session);
    const tenantId = getTenantId(session);
    
    // Platform admins can bypass tenant enforcement
    if (isAdmin) {
      return {
        tenantId: null,
        isAdmin: true,
        shouldEnforce: false,
      };
    }
    
    // Regular users must have tenantId
    return {
      tenantId,
      isAdmin: false,
      shouldEnforce: !!tenantId, // Only enforce if tenantId exists
    };
  } catch (error) {
    // If session retrieval fails, don't enforce (allows auth operations)
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Prisma Extension] Session retrieval failed, skipping tenant enforcement:', error);
    }
    return {
      tenantId: null,
      isAdmin: false,
      shouldEnforce: false,
    };
  }
}

// ============================================================================
// Prisma Client Extension with Tenant Isolation
// ============================================================================

const baseClient = createBasePrismaClient();

// Create extended client with query interception
const extendedClient = baseClient.$extends({
  name: 'tenant-isolation',
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        // Convert model name to lowercase for comparison (Prisma returns PascalCase)
        const modelLower = (model as string).toLowerCase();
        
        // Skip tenant enforcement for non-tenant-scoped models
        if (NON_TENANT_SCOPED_MODELS.includes(modelLower as any)) {
          return query(args);
        }
        
        // Skip tenant enforcement for user-scoped models
        if (USER_SCOPED_MODELS.includes(modelLower as any)) {
          return query(args);
        }
        
        // Only enforce tenant isolation for tenant-scoped models
        if (!TENANT_SCOPED_MODELS.includes(modelLower as any)) {
          return query(args);
        }
        
        // Get tenant context from session
        const context = await getTenantContext();
        
        // Skip enforcement if context says so (admin, no session, etc.)
        if (!context.shouldEnforce) {
          return query(args);
        }
        
        const tenantId = context.tenantId!; // Safe to assert here since shouldEnforce is true
        
        // Apply tenant filter based on operation type
        if (operation === 'findMany' || operation === 'findFirst' || operation === 'findUnique' || operation === 'count') {
          // SELECT operations - add yachtId filter to where clause
          const newArgs = {
            ...args,
            where: applyTenantFilter(modelLower, args.where, tenantId),
          };
          return query(newArgs);
        } else if (operation === 'create') {
          // INSERT operations - ensure yachtId is set
          const newArgs = {
            ...args,
            data: applyTenantCreateData(modelLower, args.data, tenantId),
          };
          return query(newArgs);
        } else if (operation === 'createMany') {
          // Bulk INSERT - ensure yachtId is set for each item
          const newArgs = {
            ...args,
            data: Array.isArray(args.data)
              ? args.data.map((item: any) => applyTenantCreateData(modelLower, item, tenantId))
              : applyTenantCreateData(modelLower, args.data, tenantId),
          };
          return query(newArgs);
        } else if (operation === 'update' || operation === 'updateMany' || operation === 'delete' || operation === 'deleteMany') {
          // UPDATE/DELETE operations - add yachtId filter to where clause
          const newArgs = {
            ...args,
            where: applyTenantFilter(modelLower, args.where, tenantId),
          };
          return query(newArgs);
        } else if (operation === 'upsert') {
          // UPSERT operations - filter where and ensure yachtId in create/update data
          const newArgs = {
            ...args,
            where: applyTenantFilter(modelLower, args.where, tenantId),
            create: applyTenantCreateData(modelLower, args.create, tenantId),
            update: args.update ? {
              ...args.update,
              // Don't allow changing yachtId on update
              yachtId: undefined,
            } : undefined,
          };
          return query(newArgs);
        }
        
        // For any other operations, pass through without modification
        return query(args);
      },
    },
  },
}) as unknown as PrismaClient;

// Type definition for the extended client
type ExtendedPrismaClient = typeof extendedClient;

// ============================================================================
// Global Instance Management
// ============================================================================

// Use global instance in ALL environments to avoid multiple connections
// This is critical for serverless functions (Vercel) to prevent "Max client connections" errors
if (process.env.CLEAR_PRISMA_CACHE === "true") {
  globalForPrisma.prisma = undefined;
}

export const db = globalForPrisma.prisma ?? extendedClient;

// Always use global instance to prevent connection pool exhaustion
if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = db;
}

// ============================================================================
// Runtime Validation
// ============================================================================

// Runtime validation: Ensure Prisma Client is properly initialized
if (typeof db.user === "undefined") {
  const errorMsg = 
    "❌ [CRITICAL] Prisma Client is not properly initialized. " +
    "The 'user' model is missing. This usually happens when:\n" +
    "1. Prisma Client wasn't regenerated after schema changes (run: npx prisma generate)\n" +
    "2. Next.js server wasn't restarted after regenerating Prisma Client\n" +
    "3. There's a mismatch between schema.prisma and the generated client\n\n" +
    "Fix: Run 'npx prisma generate' and restart your Next.js server.";
  
  console.error(errorMsg);
  
  if (process.env.NODE_ENV === "production") {
    throw new Error(errorMsg);
  }
}

// ============================================================================
// Unscoped Client for Admin/Auth Operations
// ============================================================================

/**
 * Get an unscoped Prisma client that bypasses tenant isolation.
 * 
 * WARNING: Use this ONLY for:
 * - Authentication operations (user lookup, session creation)
 * - Platform admin operations that need to access all tenants
 * - System-level operations (migrations, setup)
 * - Cached operations (unstable_cache) where session access is not allowed
 * 
 * NEVER use this for regular application queries - always use the scoped `db` client.
 */
export const dbUnscoped = globalForPrisma.prismaUnscoped ?? baseClient;

// Always use global instance to prevent connection pool exhaustion
if (!globalForPrisma.prismaUnscoped) {
  globalForPrisma.prismaUnscoped = dbUnscoped;
}

/**
 * Execute a database operation without tenant isolation.
 * 
 * @deprecated Use `dbUnscoped` directly instead. This function is kept for backward compatibility.
 * 
 * @example
 * // Old way (deprecated):
 * await dbWithoutTenantMiddleware(async () => {
 *   return await db.user.findMany();
 * });
 * 
 * // New way (preferred):
 * await dbUnscoped.user.findMany();
 */
export async function dbWithoutTenantMiddleware<T>(
  operation: (client: PrismaClient) => Promise<T>
): Promise<T> {
  return operation(dbUnscoped);
}
