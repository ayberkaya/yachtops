import "server-only";
import { unstable_cache, revalidateTag } from "next/cache";
import { dbUnscoped } from "./db";

/**
 * Server-side caching utilities for read-heavy, infrequently changing data.
 * 
 * Use these helpers for data that:
 * - Changes infrequently (expense categories, trips, users, yacht info)
 * - Is read-heavy (accessed frequently)
 * - Doesn't need real-time accuracy
 * 
 * Cache keys are automatically scoped by yachtId to ensure tenant isolation.
 * 
 * Cache invalidation uses revalidateTag for immediate updates after mutations.
 */

const DEFAULT_REVALIDATE = 60; // 60 seconds

/**
 * Cache tag helpers - consistent tag naming for revalidation
 */
export const CACHE_TAGS = {
  expenseCategories: (yachtId: string) => `expense-categories-${yachtId}`,
  trips: (yachtId: string) => `trips-${yachtId}`,
  users: (yachtId: string) => `users-${yachtId}`,
  yacht: (yachtId: string) => `yacht-${yachtId}`,
  expenses: (yachtId: string) => `expenses-${yachtId}`,
  tasks: (yachtId: string) => `tasks-${yachtId}`,
  products: (yachtId: string) => `products-${yachtId}`,
  shoppingLists: (yachtId: string) => `shopping-lists-${yachtId}`,
  inventory: (yachtId: string) => `inventory-${yachtId}`,
  maintenance: (yachtId: string) => `maintenance-${yachtId}`,
  documents: (yachtId: string) => `documents-${yachtId}`,
  cash: (yachtId: string) => `cash-${yachtId}`,
} as const;

/**
 * Cache expense categories for a yacht
 * Revalidates every 60 seconds by default
 */
export async function getCachedExpenseCategories(yachtId: string | null) {
  if (!yachtId) return [];
  
  const tag = CACHE_TAGS.expenseCategories(yachtId);
  return unstable_cache(
    async () => {
      return dbUnscoped.expenseCategory.findMany({
        where: { yachtId },
        orderBy: { name: "asc" },
      });
    },
    [tag],
    {
      revalidate: DEFAULT_REVALIDATE,
      tags: [tag],
    }
  )();
}

/**
 * Cache trips for a yacht (upcoming/active)
 * Revalidates every 60 seconds
 */
export async function getCachedTrips(yachtId: string | null, limit = 50) {
  if (!yachtId) return [];
  
  const tag = CACHE_TAGS.trips(yachtId);
  return unstable_cache(
    async () => {
      return dbUnscoped.trip.findMany({
        where: { yachtId },
        orderBy: { startDate: "desc" },
        take: limit,
        select: {
          id: true,
          name: true,
          code: true,
          startDate: true,
          endDate: true,
          status: true,
        },
      });
    },
    [`trips-${yachtId}-${limit}`],
    {
      revalidate: DEFAULT_REVALIDATE,
      tags: [tag],
    }
  )();
}

/**
 * Cache users for a yacht
 * Revalidates every 60 seconds
 */
export async function getCachedUsers(yachtId: string | null) {
  if (!yachtId) return [];
  
  const tag = CACHE_TAGS.users(yachtId);
  return unstable_cache(
    async () => {
      return dbUnscoped.user.findMany({
        where: {
          yachtId,
          active: true,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          customRoleId: true,
          customRole: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { name: "asc" },
      });
    },
    [tag],
    {
      revalidate: DEFAULT_REVALIDATE,
      tags: [tag],
    }
  )();
}

/**
 * Cache products for a yacht
 * Revalidates every 60 seconds
 */
export async function getCachedProducts(yachtId: string | null) {
  if (!yachtId) return [];
  
  const tag = CACHE_TAGS.products(yachtId);
  return unstable_cache(
    async () => {
      return dbUnscoped.product.findMany({
        where: { yachtId },
        orderBy: { name: "asc" },
      });
    },
    [tag],
    {
      revalidate: DEFAULT_REVALIDATE,
      tags: [tag],
    }
  )();
}

/**
 * Cache yacht info
 * Revalidates every 5 minutes (yacht info changes rarely)
 */
export async function getCachedYacht(yachtId: string | null) {
  if (!yachtId) return null;
  
  const tag = CACHE_TAGS.yacht(yachtId);
  return unstable_cache(
    async () => {
      return dbUnscoped.yacht.findUnique({
        where: { id: yachtId },
        select: {
          id: true,
          name: true,
          flag: true,
          length: true,
          registrationNumber: true,
        },
      });
    },
    [tag],
    {
      revalidate: 300, // 5 minutes
      tags: [tag],
    }
  )();
}

/**
 * Invalidate cache tags for a specific yacht
 * Call this after mutations that affect cached data
 * 
 * @param yachtId - Yacht ID (must be string, not null)
 * @param tags - Array of tag names to invalidate (optional, defaults to all)
 */
export function invalidateYachtCache(yachtId: string, tags?: string[]) {
  if (!yachtId) {
    throw new Error("yachtId is required for cache invalidation");
  }

  if (tags && tags.length > 0) {
    // Invalidate specific tags
    tags.forEach(tag => revalidateTag(tag, "default"));
  } else {
    // Invalidate all yacht-related caches
    Object.values(CACHE_TAGS).forEach(getTag => {
      revalidateTag(getTag(yachtId), "default");
    });
  }
}

/**
 * Invalidate expense categories cache
 */
export function invalidateExpenseCategories(yachtId: string) {
  revalidateTag(CACHE_TAGS.expenseCategories(yachtId), "default");
}

/**
 * Invalidate trips cache
 */
export function invalidateTrips(yachtId: string) {
  revalidateTag(CACHE_TAGS.trips(yachtId), "default");
}

/**
 * Invalidate users cache
 */
export function invalidateUsers(yachtId: string) {
  revalidateTag(CACHE_TAGS.users(yachtId), "default");
}

/**
 * Invalidate yacht info cache
 */
export function invalidateYacht(yachtId: string) {
  revalidateTag(CACHE_TAGS.yacht(yachtId), "default");
}

/**
 * Invalidate expenses cache
 */
export function invalidateExpenses(yachtId: string) {
  revalidateTag(CACHE_TAGS.expenses(yachtId), "default");
}

/**
 * Invalidate tasks cache
 */
export function invalidateTasks(yachtId: string) {
  revalidateTag(CACHE_TAGS.tasks(yachtId), "default");
}

/**
 * Invalidate products cache
 */
export function invalidateProducts(yachtId: string) {
  revalidateTag(CACHE_TAGS.products(yachtId), "default");
}

/**
 * Invalidate shopping lists cache
 */
export function invalidateShoppingLists(yachtId: string) {
  revalidateTag(CACHE_TAGS.shoppingLists(yachtId), "default");
}

/**
 * Invalidate inventory cache
 */
export function invalidateInventory(yachtId: string) {
  revalidateTag(CACHE_TAGS.inventory(yachtId), "default");
}

/**
 * Invalidate maintenance cache
 */
export function invalidateMaintenance(yachtId: string) {
  revalidateTag(CACHE_TAGS.maintenance(yachtId), "default");
}

/**
 * Invalidate documents cache
 */
export function invalidateDocuments(yachtId: string) {
  revalidateTag(CACHE_TAGS.documents(yachtId), "default");
}

/**
 * Get cached cash balance by currency for a yacht
 * Revalidates every 30 seconds
 */
export async function getCachedCashBalanceByCurrency(yachtId: string | null): Promise<Array<{ currency: string; balance: number }>> {
  if (!yachtId) return [];
  
  const tag = CACHE_TAGS.cash(yachtId);
  return unstable_cache(
    async () => {
      const { CashTransactionType } = await import("@prisma/client");
      
      // Fetch all non-deleted cash transactions for this yacht
      const transactions = await dbUnscoped.cashTransaction.findMany({
        where: {
          yachtId,
          deletedAt: null,
        },
        select: {
          type: true,
          amount: true,
          currency: true,
        },
      });

      // Calculate balance by currency
      const balancesByCurrency = new Map<string, number>();
      
      for (const transaction of transactions) {
        const currentBalance = balancesByCurrency.get(transaction.currency) || 0;
        if (transaction.type === CashTransactionType.DEPOSIT) {
          balancesByCurrency.set(transaction.currency, currentBalance + transaction.amount);
        } else {
          balancesByCurrency.set(transaction.currency, currentBalance - transaction.amount);
        }
      }

      // Convert to array and sort by currency
      return Array.from(balancesByCurrency.entries())
        .map(([currency, balance]) => ({ currency, balance }))
        .sort((a, b) => a.currency.localeCompare(b.currency));
    },
    [`cash-balance-${yachtId}`],
    {
      revalidate: 30, // 30 seconds
      tags: [tag],
    }
  )();
}

/**
 * Get cached recent expenses for a yacht
 * Revalidates every 30 seconds
 */
export async function getCachedRecentExpenses(yachtId: string | null, limit = 5) {
  if (!yachtId) return [];
  
  const tag = CACHE_TAGS.expenses(yachtId);
  return unstable_cache(
    async () => {
      const { ExpenseStatus } = await import("@prisma/client");
      return dbUnscoped.expense.findMany({
        where: {
          yachtId,
          deletedAt: null,
          // Hide submitted expenses from general listings until they are approved/rejected
          status: { not: ExpenseStatus.SUBMITTED },
        },
        select: {
          id: true,
          description: true,
          baseAmount: true,
          amount: true,
          currency: true,
          date: true,
          createdAt: true,
          status: true,
          createdBy: {
            select: { name: true, email: true },
          },
          category: {
            select: { name: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      });
    },
    [`recent-expenses-${yachtId}-${limit}`],
    {
      revalidate: 30, // 30 seconds
      tags: [tag],
    }
  )();
}

/**
 * Invalidate cash cache
 */
export function invalidateCash(yachtId: string) {
  revalidateTag(CACHE_TAGS.cash(yachtId), "default");
}

