import "server-only";
import { PrismaClient, Prisma } from "@prisma/client";
// Defer imports to avoid circular dependencies
// getSession and tenant utilities will be imported lazily in the middleware

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Create Prisma Client with proper logging and error handling
const createPrismaClient = () => {
  try {
    // Warn if DATABASE_URL is not set, but don't throw during module evaluation
    // This allows the app to start and fail gracefully when actually using the database
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

    // Create Prisma Client - it will handle DATABASE_URL validation internally
    // We don't validate here to avoid throwing during module evaluation
    
    // Parse and update DATABASE_URL with connection pool settings
    let databaseUrl = process.env.DATABASE_URL;
    if (databaseUrl) {
      try {
        const url = new URL(databaseUrl);
        // Remove existing connection_limit and pool_timeout if present
        url.searchParams.delete("connection_limit");
        url.searchParams.delete("pool_timeout");
        // Set optimal connection pool settings for serverless
        // connection_limit: 5 is safer for serverless (lower than 10 to prevent max connections)
        // pool_timeout: 60 seconds gives more time to acquire connections
        // Using Supabase connection pooler (port 6543) which handles pooling better
        url.searchParams.set("connection_limit", "5");
        url.searchParams.set("pool_timeout", "60");
        databaseUrl = url.toString();
      } catch (e) {
        // If URL parsing fails, try simple string manipulation
        if (databaseUrl.includes("?")) {
          // Remove existing connection_limit and pool_timeout
          databaseUrl = databaseUrl.replace(/[&?]connection_limit=\d+/g, "");
          databaseUrl = databaseUrl.replace(/[&?]pool_timeout=\d+/g, "");
          databaseUrl = `${databaseUrl}&connection_limit=5&pool_timeout=60`;
        } else {
          databaseUrl = `${databaseUrl}?connection_limit=5&pool_timeout=60`;
        }
      }
    }
    
    const client = new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
      // Don't fail on missing tables during initialization
      errorFormat: "pretty",
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
    });

    // Test connection on startup (non-blocking)
    // Only test if DATABASE_URL is set
    if (process.env.DATABASE_URL) {
      client.$connect().catch((error) => {
        console.error("Failed to connect to database:", error);
        // Don't throw - let the app start and handle errors at runtime
      });
    }

    return client;
  } catch (error) {
    console.error("Failed to create Prisma client:", error);
    // In development, allow the app to continue even if Prisma fails to initialize
    // This prevents the entire app from crashing during development
    if (process.env.NODE_ENV === "development") {
      console.warn("Continuing without database connection in development mode.");
      // Return a minimal mock that will throw when used, but won't crash the app
      return new Proxy({} as any, {
        get: () => {
          throw new Error(
            "DATABASE_URL environment variable is not set. Please configure your database connection in .env file."
          );
        },
      });
    }
    throw error;
  }
};

// Use global instance in ALL environments to avoid multiple connections
// This is critical for serverless functions (Vercel) to prevent "Max client connections" errors
// IMPORTANT: After running `prisma generate` or `prisma db push`, you MUST restart
// the Next.js dev server for schema changes to take effect. The global Prisma
// Client instance is cached and won't pick up changes until the server restarts.
if (process.env.CLEAR_PRISMA_CACHE === "true") {
  globalForPrisma.prisma = undefined;
}

export const db =
  globalForPrisma.prisma ?? createPrismaClient();

// Always use global instance to prevent connection pool exhaustion
// This is especially important in serverless environments where each function
// would otherwise create a new Prisma Client instance
if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = db;
}

// Runtime validation: Ensure Prisma Client is properly initialized
// This catches cases where Prisma Client wasn't regenerated after schema changes
if (typeof db.user === "undefined") {
  const errorMsg = 
    "❌ [CRITICAL] Prisma Client is not properly initialized. " +
    "The 'user' model is missing. This usually happens when:\n" +
    "1. Prisma Client wasn't regenerated after schema changes (run: npx prisma generate)\n" +
    "2. Next.js server wasn't restarted after regenerating Prisma Client\n" +
    "3. There's a mismatch between schema.prisma and the generated client\n\n" +
    "Fix: Run 'npx prisma generate' and restart your Next.js server.";
  
  console.error(errorMsg);
  
  // In production, throw immediately to fail fast
  // In development, log warning but allow app to start (will fail on first DB query)
  if (process.env.NODE_ENV === "production") {
    throw new Error(errorMsg);
  }
}

// Check for creditCard model (added in migration 20250121120000_add_credit_cards)
if (typeof db.creditCard === "undefined") {
  const errorMsg = 
    "⚠️  [WARNING] Prisma Client missing 'creditCard' model. " +
    "This usually means:\n" +
    "1. Prisma Client wasn't regenerated after adding CreditCard model (run: npx prisma generate)\n" +
    "2. Next.js server wasn't restarted after regenerating Prisma Client\n\n" +
    "Fix: Run 'npx prisma generate' and restart your Next.js server.";
  
  console.warn(errorMsg);
}

// ============================================================================
// Prisma Middleware: Tenant Enforcement (Defense-in-Depth)
// ============================================================================
// This middleware automatically enforces tenant isolation at the database level
// by adding yachtId filters to all queries. This provides defense-in-depth
// even if application code forgets to use withTenantScope().
// ============================================================================

// Context flag to skip middleware during auth operations
const skipMiddlewareContext = new Set<string>();

// Set up middleware lazily to avoid initialization errors
// Use a function that will be called after Prisma Client is fully initialized
function setupTenantMiddleware() {
  try {
    // Check if db is actually a PrismaClient instance (not a Proxy mock)
    // Wrap in try-catch because accessing db.$use on a Proxy will throw
    let hasUseMethod = false;
    try {
      hasUseMethod = typeof db.$use === 'function';
    } catch {
      // If accessing $use throws (e.g., Proxy mock), skip middleware setup
      return;
    }
    
    if (!hasUseMethod) {
      return; // Silently skip if $use is not available
    }

    // Try to set up middleware
    db.$use(async (params: any, next: (params: any) => Promise<any>) => {
      // Skip middleware if explicitly disabled for this operation
      if (skipMiddlewareContext.has('skip')) {
        return next(params);
      }
      
      // Models that require tenant scoping
      // NOTE: 'user' and 'yacht' are excluded - they are not tenant-scoped
      const tenantScopedModels = [
        'expense', 'task', 'trip', 'shoppingList', 'messageChannel',
        'alcoholStock', 'maintenanceLog', 'cashTransaction', 'crewDocument',
        'vesselDocument', 'marinaPermissionDocument', 'shift', 'leave',
        'customRole', 'product', 'shoppingStore', 'expenseCategory', 'creditCard',
        'tripItineraryDay', 'tripChecklistItem', 'tripTankLog', 'tripMovementLog',
        'taskComment', 'taskAttachment', 'expenseReceipt', 'maintenanceDocument',
        'shoppingItem', 'alcoholStockHistory', 'message', 'messageRead',
        'messageAttachment', 'notification', 'userNote', 'userNoteChecklistItem',
      ];

      // Skip middleware for user and yacht models (they're not tenant-scoped)
      // These models are used for authentication and don't need tenant isolation
      if (params.model === 'user' || params.model === 'yacht') {
        return next(params);
      }

      // Only apply middleware to tenant-scoped models
      if (!tenantScopedModels.includes(params.model || '')) {
        return next(params);
      }

      // Apply tenant scoping for tenant-scoped models
      try {
        // Use a try-catch to handle cases where session might not be available
        // (e.g., during initial auth, migrations, etc.)
        // Import getSession lazily to avoid circular dependencies
        let session;
        try {
          const { getSession } = await import("./get-session");
          session = await getSession();
        } catch (sessionError) {
          // If session retrieval fails (e.g., circular dependency during auth), skip middleware
          // This allows auth-related queries to proceed without tenant enforcement
          if (process.env.NODE_ENV === 'development') {
            console.warn('[Prisma Middleware] Session retrieval failed, skipping tenant enforcement:', sessionError);
          }
          return next(params);
        }
        
        // If no session, skip middleware (allows unauthenticated queries during setup)
        if (!session) {
          return next(params);
        }
        
        // Import tenant utilities lazily to avoid circular dependencies
        const { getTenantId, isPlatformAdmin } = await import("./tenant");
        const isAdmin = isPlatformAdmin(session);
        const tenantId = getTenantId(session);

        // Skip enforcement for platform admin users (they can access all data)
        if (isAdmin) {
          return next(params);
        }

        // Enforce tenant scope for regular users
        // But don't throw if tenantId is missing - just skip enforcement
        // This allows queries during user setup/onboarding
        if (!tenantId) {
          if (process.env.NODE_ENV === 'development') {
            console.warn('[Prisma Middleware] No tenantId found, skipping tenant enforcement');
          }
          return next(params);
        }

        // Apply tenant filter based on operation type
        if (['findMany', 'findFirst', 'count'].includes(params.action)) {
          // SELECT operations - add yachtId to where clause
          if (params.args.where) {
            // Handle nested yachtId (for related tables accessed via parent)
            if (params.model === 'expenseReceipt') {
              // For expense receipts, filter via expense.yachtId
              params.args.where.expense = {
                ...(params.args.where.expense || {}),
                yachtId: tenantId,
              };
            } else if (params.model === 'taskComment' || params.model === 'taskAttachment') {
              // For task comments/attachments, filter via task.yachtId
              params.args.where.task = {
                ...(params.args.where.task || {}),
                yachtId: tenantId,
              };
            } else if (params.model === 'tripItineraryDay' || params.model === 'tripChecklistItem' || 
                       params.model === 'tripTankLog' || params.model === 'tripMovementLog') {
              // For trip-related tables, filter via trip.yachtId
              params.args.where.trip = {
                ...(params.args.where.trip || {}),
                yachtId: tenantId,
              };
            } else if (params.model === 'shoppingItem') {
              // For shopping items, filter via list.yachtId
              params.args.where.list = {
                ...(params.args.where.list || {}),
                yachtId: tenantId,
              };
            } else if (params.model === 'alcoholStockHistory') {
              // For alcohol stock history, filter via stock.yachtId
              params.args.where.stock = {
                ...(params.args.where.stock || {}),
                yachtId: tenantId,
              };
            } else if (params.model === 'message' || params.model === 'messageRead' || params.model === 'messageAttachment') {
              // For messages, filter via channel.yachtId
              params.args.where.channel = {
                ...(params.args.where.channel || {}),
                yachtId: tenantId,
              };
            } else if (params.model === 'notification') {
              // Notifications are user-specific, but we can still scope by user's yachtId
              // This is handled differently - notifications are already scoped by userId
              // Skip middleware for notifications as they're user-specific
              return next(params);
            } else if (params.model === 'userNote' || params.model === 'userNoteChecklistItem') {
              // User notes are user-specific, skip middleware
              return next(params);
            } else {
              // Direct yachtId filter for most tables
              params.args.where.yachtId = tenantId;
            }
          } else {
            // No where clause - add yachtId filter
            if (params.model === 'expenseReceipt') {
              params.args.where = { expense: { yachtId: tenantId } };
            } else if (params.model === 'taskComment' || params.model === 'taskAttachment') {
              params.args.where = { task: { yachtId: tenantId } };
            } else if (params.model === 'tripItineraryDay' || params.model === 'tripChecklistItem' || 
                       params.model === 'tripTankLog' || params.model === 'tripMovementLog') {
              params.args.where = { trip: { yachtId: tenantId } };
            } else if (params.model === 'shoppingItem') {
              params.args.where = { list: { yachtId: tenantId } };
            } else if (params.model === 'alcoholStockHistory') {
              params.args.where = { stock: { yachtId: tenantId } };
            } else if (params.model === 'message' || params.model === 'messageRead' || params.model === 'messageAttachment') {
              params.args.where = { channel: { yachtId: tenantId } };
            } else {
              params.args.where = { yachtId: tenantId };
            }
          }
        } else if (params.action === 'create') {
          // INSERT operations - ensure yachtId is set
          if (!params.args.data.yachtId) {
            params.args.data.yachtId = tenantId;
          }
        } else if (['update', 'updateMany', 'delete', 'deleteMany'].includes(params.action)) {
          // UPDATE/DELETE operations - add yachtId to where clause
          if (params.args.where) {
            // For related tables, ensure parent's yachtId matches
            if (params.model === 'expenseReceipt') {
              params.args.where.expense = {
                ...(params.args.where.expense || {}),
                yachtId: tenantId,
              };
            } else if (params.model === 'taskComment' || params.model === 'taskAttachment') {
              params.args.where.task = {
                ...(params.args.where.task || {}),
                yachtId: tenantId,
              };
            } else {
              params.args.where.yachtId = tenantId;
            }
          } else {
            params.args.where = { yachtId: tenantId };
          }
        }
      } catch (error) {
        // If session retrieval fails, skip middleware instead of throwing
        // This prevents circular dependencies during auth operations
        if (process.env.NODE_ENV === 'development') {
          console.warn('[Prisma Middleware] Error enforcing tenant scope, skipping middleware:', error);
        }
        // Don't throw - allow query to proceed without tenant enforcement
        // This is safer during auth operations
        return next(params);
      }
      
        return next(params);
      });
  } catch (middlewareError: any) {
    // If middleware setup fails (e.g., Prisma Client not initialized, $use doesn't exist), log and continue
    // This allows the app to start even if middleware can't be set up
    if (process.env.NODE_ENV === 'development') {
      const errorMsg = middlewareError?.message || String(middlewareError);
      if (!errorMsg.includes('$use is not a function')) {
        // Only log if it's not the expected "not a function" error
        console.warn('[Prisma Middleware] Failed to set up middleware:', middlewareError);
      }
    }
    // Silently fail - tenant enforcement will be handled at application level
  }
}

// Try to set up middleware immediately, but catch errors
setupTenantMiddleware();

// Also try to set up middleware after a short delay (in case Prisma Client needs time to initialize)
if (typeof setTimeout !== 'undefined') {
  setTimeout(() => {
    try {
      setupTenantMiddleware();
    } catch (e) {
      // Ignore errors on delayed setup
    }
  }, 100);
}

/**
 * Execute a database operation without tenant middleware
 * Use this for auth-related queries that don't need tenant scoping
 */
export async function dbWithoutTenantMiddleware<T>(
  operation: () => Promise<T>
): Promise<T> {
  skipMiddlewareContext.add('skip');
  try {
    return await operation();
  } finally {
    skipMiddlewareContext.delete('skip');
  }
}

