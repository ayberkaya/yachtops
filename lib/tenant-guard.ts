import "server-only";
import { Prisma } from "@prisma/client";
import type { Session } from "next-auth";
import { getTenantId, isPlatformAdmin } from "./tenant";

/**
 * Tenant scope guard utilities for Prisma queries.
 * 
 * Ensures all queries are scoped by yachtId (tenant isolation).
 * Prevents cross-vessel data leakage.
 * 
 * Usage:
 *   const where = withTenantScope(session, { status: "ACTIVE" });
 *   const items = await db.item.findMany({ where });
 */

/**
 * Overload for platform admins - returns baseWhere without yachtId requirement
 */
export function withTenantScope<T extends Record<string, any>>(
  session: Session | null,
  baseWhere: T,
  isAdmin: true
): T;

/**
 * Overload for regular users - enforces yachtId as required string
 */
export function withTenantScope<T extends Record<string, any>>(
  session: Session | null,
  baseWhere: T,
  isAdmin?: false
): T & { yachtId: string };

/**
 * Add tenant scope to a Prisma where clause
 * 
 * STRICT TENANT ISOLATION:
 * - Platform admins: Can access all data (yachtId is optional/undefined)
 * - Regular users: MUST have yachtId (throws error if missing, never returns undefined)
 * 
 * @param session - NextAuth session (can be null)
 * @param baseWhere - Base where clause to merge with tenant scope
 * @returns Merged where clause with yachtId filter
 * 
 * @throws Error if regular user lacks tenantId
 * 
 * @example
 * const where = withTenantScope(session, { status: "ACTIVE" });
 * // Regular user: Returns { yachtId: "yacht-123", status: "ACTIVE" }
 * // Admin: Returns { status: "ACTIVE" } (no yachtId)
 */
export function withTenantScope<T extends Record<string, any>>(
  session: Session | null,
  baseWhere: T = {} as T,
  isAdminOverride?: boolean
): T & { yachtId?: string } | T & { yachtId: string } {
  const tenantId = getTenantId(session);
  const isAdmin = isAdminOverride ?? isPlatformAdmin(session);

  // Platform admins can access all data (for admin panel)
  if (isAdmin) {
    return baseWhere as T & { yachtId?: string };
  }

  // Regular users MUST have tenantId - throw error if missing
  if (!tenantId) {
    throw new Error("Tenant ID required for data access. User must be assigned to a yacht.");
  }

  // For regular users, yachtId is ALWAYS a string (never undefined)
  return {
    ...baseWhere,
    yachtId: tenantId,
  } as T & { yachtId: string };
}

/**
 * Ensure a yachtId matches the tenant scope
 * 
 * @param session - NextAuth session
 * @param yachtId - Yacht ID to validate
 * @throws Error if yachtId doesn't match tenant scope
 */
export function requireTenantMatch(
  session: Session | null,
  yachtId: string | null | undefined
): void {
  const tenantId = getTenantId(session);
  const isAdmin = isPlatformAdmin(session);

  // Platform admins can access any yacht
  if (isAdmin) {
    return;
  }

  // Regular users can only access their own yacht
  if (!tenantId) {
    throw new Error("Tenant ID required");
  }

  if (yachtId !== tenantId) {
    throw new Error("Access denied: yacht ID does not match tenant scope");
  }
}

/**
 * Create a tenant-scoped where clause for soft-deleted items
 * 
 * STRICT TENANT ISOLATION:
 * - Platform admins: Can access all data (yachtId is optional)
 * - Regular users: MUST have yachtId (throws error if missing)
 * 
 * @param session - NextAuth session
 * @param includeDeleted - Whether to include soft-deleted items (default: false)
 * @returns Where clause with tenant scope and deletedAt filter
 * 
 * @throws Error if regular user lacks tenantId
 */
export function withTenantScopeAndSoftDelete(
  session: Session | null,
  includeDeleted = false
): { yachtId?: string; deletedAt: null | { not: null } } | { yachtId: string; deletedAt: null | { not: null } } {
  const tenantId = getTenantId(session);
  const isAdmin = isPlatformAdmin(session);

  if (isAdmin) {
    return {
      yachtId: undefined,
      deletedAt: includeDeleted ? { not: null } : null,
    };
  }

  // Regular users MUST have tenantId
  if (!tenantId) {
    throw new Error("Tenant ID required for data access. User must be assigned to a yacht.");
  }

  return {
    yachtId: tenantId,
    deletedAt: includeDeleted ? { not: null } : null,
  };
}

