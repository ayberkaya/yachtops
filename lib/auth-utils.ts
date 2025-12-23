import type { UserRole } from "@prisma/client";

// Client-safe type for user (from session)
export interface SessionUser {
  id: string;
  email: string;
  name?: string | null;
  role: UserRole;
  yachtId?: string | null;
  permissions?: string | null;
}

/**
 * Check if a user can manage other users
 * Client-safe function - only checks role, no server dependencies
 */
export function canManageUsers(user: SessionUser | null): boolean {
  if (!user) return false;
  
  // SUPER_ADMIN and OWNER can manage users
  return user.role === "SUPER_ADMIN" || user.role === "OWNER";
}

/**
 * Check if a user can approve expenses
 * Client-safe function - only checks role and permissions
 */
export function canApproveExpenses(user: SessionUser | null): boolean {
  if (!user) return false;
  
  // SUPER_ADMIN, OWNER, and users with expenses.approve permission can approve
  if (user.role === "SUPER_ADMIN" || user.role === "OWNER") {
    return true;
  }
  
  // Check for expenses.approve permission
  const permissions = user.permissions ? JSON.parse(user.permissions) : [];
  return Array.isArray(permissions) && permissions.includes("expenses.approve");
}

/**
 * Check if a user has any of the specified roles
 * Client-safe function - only checks role
 */
export function hasAnyRole(user: SessionUser | null, roles: UserRole[]): boolean {
  if (!user) return false;
  return roles.includes(user.role);
}

/**
 * Check if a user can manage roles
 * Client-safe function - only checks role
 */
export function canManageRoles(user: SessionUser | null): boolean {
  if (!user) return false;
  
  // Only SUPER_ADMIN and OWNER can manage roles
  return user.role === "SUPER_ADMIN" || user.role === "OWNER";
}

