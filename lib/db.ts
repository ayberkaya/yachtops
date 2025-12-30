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
  // Do not log secrets or noisy configuration warnings at module evaluation time.
  // Runtime failures will surface on first DB operation if DATABASE_URL is missing.

  // Parse and (optionally) update DATABASE_URL with connection pool settings.
  //
  // IMPORTANT:
  // - In serverless, aggressive per-instance pools can overwhelm Postgres.
  // - Prefer PgBouncer / Supabase pooling, and keep Prisma connection_limit modest.
  let databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl) {
    try {
      const url = new URL(databaseUrl);

      const defaultConnectionLimit =
        process.env.NODE_ENV === "production" ? "5" : "10";
      const defaultPoolTimeout =
        process.env.NODE_ENV === "production" ? "30" : "60";

      const connectionLimit =
        process.env.PRISMA_CONNECTION_LIMIT ?? (url.searchParams.get("connection_limit") ?? defaultConnectionLimit);
      const poolTimeout =
        process.env.PRISMA_POOL_TIMEOUT ?? (url.searchParams.get("pool_timeout") ?? defaultPoolTimeout);

      // Only set values if we have a concrete value (always true with fallbacks above)
      url.searchParams.set("connection_limit", connectionLimit);
      url.searchParams.set("pool_timeout", poolTimeout);

      databaseUrl = url.toString();
    } catch (e) {
      // If URL parsing fails, keep the original URL as-is.
      // (String-based manipulation here is error-prone and can corrupt secrets/params.)
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

  // Avoid eager connections in production/serverless (can amplify connection spikes on cold starts).
  // Opt-in in development only.
  if (
    process.env.NODE_ENV === "development" &&
    process.env.PRISMA_CONNECT_ON_STARTUP === "true" &&
    process.env.DATABASE_URL
  ) {
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
  'quoteDocument', 'auditLog', 'yachtInvite', 'usageEvent', 'feedback',
] as const;

// Models that are NOT tenant-scoped (used for auth/system purposes)
const NON_TENANT_SCOPED_MODELS = ['user', 'yacht', 'plan'] as const;

// Models that are user-specific (scoped by userId, not yachtId)
const USER_SCOPED_MODELS = ['notification', 'userNote', 'userNoteChecklistItem'] as const;

// Models that are nested under parent models (filtered via parent relationship yachtId).
// Also used to validate nested writes by verifying the parent entity belongs to the active tenant.
type NestedModelConfig = {
  // Path from the nested model to yachtId via relations (Prisma where shape)
  filterPath: string[];
  // Parent model delegate key to validate against on create/createMany (Prisma client lowerCamelCase)
  parentModelKey: string;
  // FK field on the nested model data pointing to the parent (e.g., "expenseId")
  parentIdField: string;
};

const NESTED_MODEL_FILTERS: Record<string, NestedModelConfig> = {
  expenseReceipt: { filterPath: ["expense", "yachtId"], parentModelKey: "expense", parentIdField: "expenseId" },
  taskComment: { filterPath: ["task", "yachtId"], parentModelKey: "task", parentIdField: "taskId" },
  taskAttachment: { filterPath: ["task", "yachtId"], parentModelKey: "task", parentIdField: "taskId" },
  tripItineraryDay: { filterPath: ["trip", "yachtId"], parentModelKey: "trip", parentIdField: "tripId" },
  tripChecklistItem: { filterPath: ["trip", "yachtId"], parentModelKey: "trip", parentIdField: "tripId" },
  tripTankLog: { filterPath: ["trip", "yachtId"], parentModelKey: "trip", parentIdField: "tripId" },
  tripMovementLog: { filterPath: ["trip", "yachtId"], parentModelKey: "trip", parentIdField: "tripId" },
  shoppingItem: { filterPath: ["list", "yachtId"], parentModelKey: "shoppingList", parentIdField: "listId" },
  alcoholStockHistory: { filterPath: ["stock", "yachtId"], parentModelKey: "alcoholStock", parentIdField: "stockId" },
  message: { filterPath: ["channel", "yachtId"], parentModelKey: "messageChannel", parentIdField: "channelId" },
  messageRead: { filterPath: ["message", "channel", "yachtId"], parentModelKey: "message", parentIdField: "messageId" },
  messageAttachment: { filterPath: ["message", "channel", "yachtId"], parentModelKey: "message", parentIdField: "messageId" },
  maintenanceDocument: { filterPath: ["maintenance", "yachtId"], parentModelKey: "maintenanceLog", parentIdField: "maintenanceId" },
  quote: { filterPath: ["workRequest", "yachtId"], parentModelKey: "workRequest", parentIdField: "workRequestId" },
  quoteDocument: { filterPath: ["quote", "workRequest", "yachtId"], parentModelKey: "quote", parentIdField: "quoteId" },
};

// ============================================================================
// Tenant Isolation Helper Functions
// ============================================================================

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function buildNestedConstraint(path: string[], tenantId: string): Record<string, unknown> {
  // Example: ['quote', 'workRequest', 'yachtId'] -> { quote: { workRequest: { yachtId: tenantId } } }
  return path.reduceRight<Record<string, unknown>>((acc, key, idx) => {
    if (idx === path.length - 1) return { [key]: tenantId };
    return { [key]: acc };
  }, {});
}

function mergeWhereWithAnd(existingWhere: unknown, constraint: Record<string, unknown>): Record<string, unknown> {
  if (!existingWhere) return constraint;
  if (!isPlainObject(existingWhere)) return { AND: [constraint] };

  const existing = existingWhere as Record<string, unknown>;
  const andValue = existing.AND;

  if (Array.isArray(andValue)) {
    return { ...existing, AND: [...andValue, constraint] };
  }

  if (isPlainObject(andValue)) {
    return { ...existing, AND: [andValue, constraint] };
  }

  return { AND: [existing, constraint] };
}

/**
 * Applies tenant filter to a where clause based on model type
 */
function applyTenantWhere(modelKey: string, where: unknown, tenantId: string): Record<string, unknown> {
  const nestedFilter = NESTED_MODEL_FILTERS[modelKey];
  const constraint = nestedFilter
    ? buildNestedConstraint(nestedFilter.filterPath, tenantId)
    : { yachtId: tenantId };

  return mergeWhereWithAnd(where, constraint);
}

/**
 * Applies tenant filter to create data (ensures yachtId is set)
 */
function applyTenantCreateData(modelKey: string, data: unknown, tenantId: string): unknown {
  // For nested models, yacht isolation is enforced via the parent relation filter.
  if (NESTED_MODEL_FILTERS[modelKey]) return data;
  if (!isPlainObject(data)) return data;

  // Always override/force yachtId. Never allow cross-tenant writes via client-provided yachtId.
  return { ...data, yachtId: tenantId };
}

function stripYachtIdFromData(data: unknown): unknown {
  if (!isPlainObject(data)) return data;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { yachtId, ...rest } = data;
  return rest;
}

async function assertNestedParentInTenant(
  config: NestedModelConfig,
  data: unknown,
  tenantId: string,
  base: PrismaClient
): Promise<void> {
  const ensureOne = async (item: unknown) => {
    if (!isPlainObject(item)) {
      throw new Error("[tenant-isolation] Invalid nested create data");
    }

    const parentId = item[config.parentIdField];
    if (typeof parentId !== "string" || parentId.length === 0) {
      throw new Error(`[tenant-isolation] Missing '${config.parentIdField}' for nested create`);
    }

    const parentDelegateUnknown = (base as unknown as Record<string, unknown>)[config.parentModelKey];
    const parentDelegate = isPlainObject(parentDelegateUnknown) ? parentDelegateUnknown : null;
    if (!parentDelegate || typeof parentDelegate.findFirst !== "function") {
      throw new Error(`[tenant-isolation] Cannot validate parent model '${config.parentModelKey}'`);
    }

    const parentWhere = applyTenantWhere(config.parentModelKey, { id: parentId }, tenantId);
    const parent = await (parentDelegate.findFirst as (a: unknown) => Promise<unknown>)({ where: parentWhere });
    if (!parent) {
      throw new Error("[tenant-isolation] Not found (or forbidden)");
    }
  };

  if (Array.isArray(data)) {
    for (const item of data) {
      // eslint-disable-next-line no-await-in-loop
      await ensureOne(item);
    }
    return;
  }

  await ensureOne(data);
}

/**
 * Gets tenant context from session
 */
async function getTenantContext(): Promise<{
  mode: "bypass" | "enforce" | "deny";
  tenantId: string | null;
}> {
  try {
    const session = await getSession();
    
    if (!session) {
      return {
        mode: "deny",
        tenantId: null,
      };
    }
    
    const isAdmin = isPlatformAdmin(session);
    const tenantId = getTenantId(session);
    
    // Platform admins can bypass tenant enforcement
    if (isAdmin) {
      return {
        mode: "bypass",
        tenantId: null,
      };
    }
    
    // Regular users must have tenantId
    if (!tenantId) {
      return { mode: "deny", tenantId: null };
    }

    return {
      mode: "enforce",
      tenantId,
    };
  } catch (error) {
    // If session retrieval fails, deny by default (fail closed).
    return {
      mode: "deny",
      tenantId: null,
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
        // Prisma provides `model` in PascalCase (e.g., "MessageChannel").
        // Prisma Client delegates are lowerCamelCase (e.g., "messageChannel").
        const modelName = model as string;
        const modelKey = modelName.charAt(0).toLowerCase() + modelName.slice(1);
        
        // Skip tenant enforcement for non-tenant-scoped models
        if (NON_TENANT_SCOPED_MODELS.includes(modelKey as (typeof NON_TENANT_SCOPED_MODELS)[number])) {
          return query(args);
        }
        
        // Skip tenant enforcement for user-scoped models
        if (USER_SCOPED_MODELS.includes(modelKey as (typeof USER_SCOPED_MODELS)[number])) {
          return query(args);
        }
        
        // Only enforce tenant isolation for tenant-scoped models
        const isNestedModel = Object.prototype.hasOwnProperty.call(NESTED_MODEL_FILTERS, modelKey);
        const isTenantScoped =
          TENANT_SCOPED_MODELS.includes(modelKey as (typeof TENANT_SCOPED_MODELS)[number]) || isNestedModel;

        if (!isTenantScoped) {
          throw new Error(
            `[tenant-isolation] Model '${modelName}' is not classified for tenant isolation. ` +
              `Add it to TENANT_SCOPED_MODELS / USER_SCOPED_MODELS / NON_TENANT_SCOPED_MODELS / NESTED_MODEL_FILTERS.`
          );
        }
        
        // Get tenant context from session
        const context = await getTenantContext();
        
        if (context.mode === "bypass") {
          return query(args);
        }
        if (context.mode === "deny" || !context.tenantId) {
          throw new Error("[tenant-isolation] Missing tenant context for tenant-scoped query");
        }

        const tenantId = context.tenantId;
        
        // Apply tenant filter based on operation type
        const delegateUnknown = (baseClient as unknown as Record<string, unknown>)[modelKey];
        const delegate = isPlainObject(delegateUnknown) ? delegateUnknown : null;
        const hasFindFirst = !!delegate && typeof delegate.findFirst === "function";
        const hasFindUnique = !!delegate && typeof delegate.findUnique === "function";

        // Operations using WhereUniqueInput cannot be safely mutated by adding yachtId.
        // We enforce tenant isolation by pre-checking ownership via findFirst(where AND tenantConstraint).
        if (operation === "findUnique" || operation === "update" || operation === "delete") {
          if (!hasFindFirst) {
            throw new Error(`[tenant-isolation] Cannot enforce unique operation for model '${modelName}' (missing delegate.findFirst)`);
          }

          const argsObj: Record<string, unknown> = isPlainObject(args) ? args : {};
          const mergedWhere = applyTenantWhere(modelKey, argsObj.where, tenantId);
          const found = await (delegate!.findFirst as (a: unknown) => Promise<unknown>)({ where: mergedWhere });
          if (!found) {
            throw new Error("[tenant-isolation] Not found (or forbidden)");
          }

          if (operation === "update") {
            const newArgs = {
              ...argsObj,
              data: stripYachtIdFromData(argsObj.data),
            };
            return query(newArgs as typeof args);
          }
          return query(args);
        }

        if (operation === 'findMany' || operation === 'findFirst' || operation === 'count') {
          const argsObj: Record<string, unknown> = isPlainObject(args) ? args : {};
          const newArgs = {
            ...argsObj,
            where: applyTenantWhere(modelKey, argsObj.where, tenantId),
          };
          return query(newArgs as typeof args);
        } else if (operation === 'create') {
          const argsObj: Record<string, unknown> = isPlainObject(args) ? args : {};
          const nestedConfig = NESTED_MODEL_FILTERS[modelKey];
          if (nestedConfig) {
            await assertNestedParentInTenant(nestedConfig, argsObj.data, tenantId, baseClient);
          }
          const newArgs = {
            ...argsObj,
            data: applyTenantCreateData(modelKey, argsObj.data, tenantId),
          };
          return query(newArgs as typeof args);
        } else if (operation === 'createMany') {
          const argsObj: Record<string, unknown> = isPlainObject(args) ? args : {};
          const data = argsObj.data;
          const nestedConfig = NESTED_MODEL_FILTERS[modelKey];
          if (nestedConfig) {
            await assertNestedParentInTenant(nestedConfig, data, tenantId, baseClient);
          }
          const newArgs = {
            ...argsObj,
            data: Array.isArray(data)
              ? data.map((item) => applyTenantCreateData(modelKey, item, tenantId))
              : applyTenantCreateData(modelKey, data, tenantId),
          };
          return query(newArgs as typeof args);
        } else if (operation === "upsert") {
          if (!hasFindFirst || !hasFindUnique) {
            throw new Error(`[tenant-isolation] Cannot enforce upsert for model '${modelName}' (missing delegate.findFirst/findUnique)`);
          }

          const argsObj: Record<string, unknown> = isPlainObject(args) ? args : {};
          const whereUnique = argsObj.where;

          const unscopedExisting = await (delegate!.findUnique as (a: unknown) => Promise<unknown>)({
            where: whereUnique,
          });

          const scopedExisting = await (delegate!.findFirst as (a: unknown) => Promise<unknown>)({
            where: applyTenantWhere(modelKey, whereUnique, tenantId),
          });

          if (unscopedExisting && !scopedExisting) {
            throw new Error("[tenant-isolation] Forbidden");
          }

          const nestedConfig = NESTED_MODEL_FILTERS[modelKey];
          if (nestedConfig) {
            await assertNestedParentInTenant(nestedConfig, argsObj.create, tenantId, baseClient);
          }

          const newArgs = {
            ...argsObj,
            create: applyTenantCreateData(modelKey, argsObj.create, tenantId),
            update: stripYachtIdFromData(argsObj.update),
          };

          return query(newArgs as typeof args);
        } else if (operation === 'updateMany' || operation === 'deleteMany') {
          const argsObj: Record<string, unknown> = isPlainObject(args) ? args : {};
          const newArgs: Record<string, unknown> = {
            ...argsObj,
          };

          newArgs.where = applyTenantWhere(modelKey, argsObj.where, tenantId);

          if (operation === "updateMany" && "data" in argsObj) {
            newArgs.data = stripYachtIdFromData(argsObj.data);
          }

          return query(newArgs as typeof args);
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
